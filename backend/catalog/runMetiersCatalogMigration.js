/**
 * Moteur de migration catalogue Métiers — idempotent, journalisé.
 * Aucune fusion destructive. Ambiguïtés : skip + A_REVOIR.
 */
import {
  A_REVOIR,
  CATEGORY_ADD,
  CATEGORY_TRIM,
  ORPHAN_IDS,
  ORPHAN_POLICY,
  PROPOSALS,
  RENAMES,
  SHORTCUTS,
  VOCAB_BY_CURRENT_NAME,
  proposalShouldCreate,
} from './metiersCatalogPlan.js';
import { isMetiersGroupName, normalizeCatalogText, uniqueStrings } from '../utils/catalogText.js';

export function sameStringList(a, b) {
  const na = uniqueStrings(a);
  const nb = uniqueStrings(b);
  if (na.length !== nb.length) return false;
  const set = new Set(na.map(normalizeCatalogText));
  return nb.every((x) => set.has(normalizeCatalogText(x)));
}

export function serviceMatchesNames(svc, names) {
  const wanted = (names || []).map(normalizeCatalogText).filter(Boolean);
  if (!wanted.length) return false;
  const n = normalizeCatalogText(svc.nomservice);
  if (wanted.includes(n)) return true;
  return (svc.aliases || []).some((a) => wanted.includes(normalizeCatalogText(a)));
}

export function findUniqueService(services, names) {
  const hits = services.filter((s) => serviceMatchesNames(s, names));
  if (hits.length === 1) return { service: hits[0], ambiguous: false };
  if (hits.length > 1) return { service: null, ambiguous: true, hits };
  return { service: null, ambiguous: false, hits: [] };
}

function fieldAbsent(doc, key) {
  return doc[key] === undefined;
}

function snapshotFields(doc, keys) {
  const out = {};
  for (const k of keys) {
    if (fieldAbsent(doc, k)) out[k] = { absent: true };
    else out[k] = doc[k];
  }
  return out;
}

export async function runMetiersCatalogMigration({
  apply = false,
  mongoose,
  Groupe,
  Categorie,
  Service,
  runId = `run_${Date.now()}`,
  persistJournal,
}) {
  const operations = [];
  const createdIds = [];
  const failed = [];
  const noops = [];
  const skipped = [];

  async function commit(op) {
    operations.push(op);
    if (typeof persistJournal === 'function') {
      await persistJournal({ runId, apply, operations, createdIds, failed, noops, skipped });
    }
  }

  const groupes = await Groupe.find().lean();
  const metiersGroupe = groupes.find((g) => isMetiersGroupName(g.nomgroupe));
  if (!metiersGroupe) {
    throw new Error('Groupe Métiers introuvable');
  }
  const categories = await Categorie.find({ groupe: metiersGroupe._id }).lean();
  const catByName = new Map(
    categories.map((c) => [normalizeCatalogText(c.nomcategorie), c]),
  );

  for (const row of CATEGORY_ADD) {
    const key = normalizeCatalogText(row.nomcategorie);
    if (catByName.has(key)) {
      noops.push({ type: 'category-add', nomcategorie: row.nomcategorie });
      continue;
    }
    const op = {
      type: 'category-add',
      after: { nomcategorie: row.nomcategorie, groupe: String(metiersGroupe._id) },
      status: apply ? 'applied' : 'planned',
    };
    try {
      if (apply) {
        const created = await Categorie.create({
          nomcategorie: row.nomcategorie,
          groupe: metiersGroupe._id,
        });
        op.id = String(created._id);
        createdIds.push(String(created._id));
        const lean = created.toObject ? created.toObject() : created;
        categories.push(lean);
        catByName.set(key, lean);
      } else {
        // Référence symbolique : en dry-run, la catégorie n'est pas écrite en base
        // mais elle est rendue visible aux proposals dépendantes pour qu'elles
        // apparaissent comme « planned » plutôt que skipped.
        // L'ID symbolique commence par « planned: » — jamais un vrai ObjectId.
        const symbolic = {
          _id: `planned:${key}`,
          nomcategorie: row.nomcategorie,
          groupe: metiersGroupe._id,
          _planned: true,
        };
        catByName.set(key, symbolic);
      }
      await commit(op);
    } catch (err) {
      failed.push({ ...op, status: 'failed', error: err.message });
      await commit({ ...op, status: 'failed', error: err.message });
    }
  }

  const reloadServices = async () =>
    Service.find({ categorie: { $in: categories.map((c) => c._id) } }).lean();

  let services = await reloadServices();

  for (const row of CATEGORY_TRIM) {
    const cat = categories.find((c) =>
      c.nomcategorie === row.current
      || c.nomcategorie === row.proposed
      || normalizeCatalogText(c.nomcategorie) === normalizeCatalogText(row.proposed)
      || normalizeCatalogText(c.nomcategorie) === normalizeCatalogText(row.current),
    );
    if (!cat) {
      skipped.push({ type: 'category-trim', current: row.current, reason: 'introuvable' });
      continue;
    }
    if (cat.nomcategorie === row.proposed) {
      noops.push({ type: 'category-trim', id: String(cat._id) });
      continue;
    }
    const op = {
      type: 'category-trim',
      id: String(cat._id),
      before: { nomcategorie: cat.nomcategorie },
      after: { nomcategorie: row.proposed },
      status: apply ? 'applied' : 'planned',
    };
    try {
      if (apply) {
        await Categorie.updateOne({ _id: cat._id }, { $set: { nomcategorie: row.proposed } });
        cat.nomcategorie = row.proposed;
        catByName.set(normalizeCatalogText(row.proposed), cat);
      }
      await commit(op);
    } catch (err) {
      failed.push({ ...op, status: 'failed', error: err.message });
      await commit({ ...op, status: 'failed', error: err.message });
    }
  }

  for (const row of RENAMES) {
    const found = findUniqueService(services, [row.current, row.proposed]);
    if (found.ambiguous) {
      skipped.push({ type: 'rename', current: row.current, reason: 'ambigu' });
      continue;
    }
    if (!found.service) {
      skipped.push({ type: 'rename', current: row.current, reason: 'introuvable' });
      continue;
    }
    const svc = found.service;
    const aliases = uniqueStrings([...(svc.aliases || []), row.current, row.proposed]);
    if (svc.nomservice === row.proposed && sameStringList(svc.aliases || [], aliases)) {
      noops.push({ type: 'rename', id: String(svc._id) });
      continue;
    }
    const op = {
      type: 'rename',
      id: String(svc._id),
      before: snapshotFields(svc, ['nomservice', 'aliases']),
      after: { nomservice: row.proposed, aliases },
      status: apply ? 'applied' : 'planned',
    };
    try {
      if (apply) {
        await Service.updateOne({ _id: svc._id }, { $set: { nomservice: row.proposed, aliases } });
        svc.nomservice = row.proposed;
        svc.aliases = aliases;
      }
      await commit(op);
    } catch (err) {
      failed.push({ ...op, status: 'failed', error: err.message });
      await commit({ ...op, status: 'failed', error: err.message });
    }
  }

  if (apply) services = await reloadServices();

  for (const [currentName, vocab] of Object.entries(VOCAB_BY_CURRENT_NAME)) {
    const rename = RENAMES.find((r) => r.current === currentName);
    const names = [currentName, rename?.proposed].filter(Boolean);
    const found = findUniqueService(services, names);
    if (found.ambiguous) {
      skipped.push({ type: 'vocab', current: currentName, reason: 'ambigu' });
      continue;
    }
    if (!found.service) {
      skipped.push({ type: 'vocab', current: currentName, reason: 'introuvable' });
      continue;
    }
    const svc = found.service;
    const aliases = uniqueStrings([...(svc.aliases || []), ...(vocab.aliases || [])]);
    const needs = uniqueStrings([...(svc.needs || []), ...(vocab.needs || [])]);
    if (sameStringList(svc.aliases || [], aliases) && sameStringList(svc.needs || [], needs)) {
      noops.push({ type: 'vocab', id: String(svc._id) });
      continue;
    }
    const op = {
      type: 'vocab',
      id: String(svc._id),
      before: snapshotFields(svc, ['aliases', 'needs']),
      after: { aliases, needs },
      status: apply ? 'applied' : 'planned',
    };
    try {
      if (apply) {
        await Service.updateOne({ _id: svc._id }, { $set: { aliases, needs } });
        svc.aliases = aliases;
        svc.needs = needs;
      }
      await commit(op);
    } catch (err) {
      failed.push({ ...op, status: 'failed', error: err.message });
      await commit({ ...op, status: 'failed', error: err.message });
    }
  }

  for (const sc of SHORTCUTS) {
    const rename = RENAMES.find((r) => r.current === sc.currentName);
    const found = findUniqueService(services, [sc.currentName, rename?.proposed]);
    if (found.ambiguous) {
      skipped.push({ type: 'shortcut', current: sc.currentName, reason: 'ambigu' });
      continue;
    }
    if (!found.service) {
      skipped.push({ type: 'shortcut', current: sc.currentName, reason: 'introuvable' });
      continue;
    }
    const svc = found.service;
    if (svc.shortcutRank === sc.rank) {
      noops.push({ type: 'shortcut', id: String(svc._id), rank: sc.rank });
      continue;
    }
    const op = {
      type: 'shortcut',
      id: String(svc._id),
      before: snapshotFields(svc, ['shortcutRank']),
      after: { shortcutRank: sc.rank },
      status: apply ? 'applied' : 'planned',
    };
    try {
      if (apply) {
        await Service.updateOne({ _id: svc._id }, { $set: { shortcutRank: sc.rank } });
        svc.shortcutRank = sc.rank;
      }
      await commit(op);
    } catch (err) {
      failed.push({ ...op, status: 'failed', error: err.message });
      await commit({ ...op, status: 'failed', error: err.message });
    }
  }

  for (const p of PROPOSALS) {
    if (!proposalShouldCreate(p)) {
      skipped.push({ type: 'proposal', n: p.n, title: p.title, action: p.action, note: p.note });
      continue;
    }
    const existingKey = await Service.findOne({ catalogKey: p.catalogKey }).lean();
    if (existingKey) {
      noops.push({ type: 'add', catalogKey: p.catalogKey, id: String(existingKey._id) });
      continue;
    }
    const cat = catByName.get(normalizeCatalogText(p.category));
    if (!cat) {
      skipped.push({ type: 'proposal-add', n: p.n, title: p.title, reason: `catégorie introuvable: ${p.category}` });
      continue;
    }
    const dupName = findUniqueService(services, [p.title]);
    if (dupName.ambiguous) {
      skipped.push({ type: 'proposal-add', n: p.n, title: p.title, reason: 'nom ambigu' });
      continue;
    }
    if (dupName.service) {
      skipped.push({
        type: 'proposal-add',
        n: p.n,
        title: p.title,
        reason: 'equivalent-sans-catalogKey',
        id: String(dupName.service._id),
      });
      continue;
    }
    const op = {
      type: 'add',
      catalogKey: p.catalogKey,
      title: p.title,
      categoryId: String(cat._id),
      // Présent uniquement en dry-run quand la catégorie cible est elle-même
      // planifiée (pas encore écrite en base) — permet la détection de dérive.
      ...(cat._planned && { dependsOnPlannedCategory: cat.nomcategorie }),
      after: {
        nomservice: p.title,
        categorie: String(cat._id),
        catalogKey: p.catalogKey,
        aliases: p.aliases || [],
        needs: p.needs || [],
      },
      status: apply ? 'applied' : 'planned',
    };
    try {
      if (apply) {
        const created = await Service.create({
          nomservice: p.title,
          categorie: cat._id,
          catalogKey: p.catalogKey,
          aliases: p.aliases || [],
          needs: p.needs || [],
        });
        op.id = String(created._id);
        createdIds.push(String(created._id));
        services.push(created.toObject ? created.toObject() : created);
      }
      await commit(op);
    } catch (err) {
      failed.push({ ...op, status: 'failed', error: err.message });
      await commit({ ...op, status: 'failed', error: err.message });
    }
  }

  return {
    runId,
    apply,
    operations,
    createdIds,
    failed,
    noops,
    skipped,
    aRevoir: A_REVOIR,
    orphanPolicy: ORPHAN_POLICY,
    orphanIds: ORPHAN_IDS,
    counts: {
      operations: operations.filter((o) => o.status === 'applied' || o.status === 'planned').length,
      applied: operations.filter((o) => o.status === 'applied').length,
      planned: operations.filter((o) => o.status === 'planned').length,
      noops: noops.length,
      skipped: skipped.length,
      failed: failed.length,
      created: createdIds.length,
    },
  };
}

export async function rollbackPartial({ lastRun, Service, Categorie, apply = true }) {
  const conflicts = [];
  const restored = [];
  const keptCreations = lastRun.createdIds || [];
  const reversed = [...(lastRun.operations || [])].filter((o) => o.status === 'applied').reverse();

  for (const op of reversed) {
    if (op.type === 'add' || op.type === 'category-add') {
      continue;
    }
    const Model = op.type === 'category-trim' ? Categorie : Service;
    const doc = await Model.findById(op.id).lean();
    if (!doc) {
      conflicts.push({ id: op.id, type: op.type, reason: 'document_absent' });
      continue;
    }
    for (const [field, afterVal] of Object.entries(op.after || {})) {
      const current = doc[field];
      const matchesAfter = Array.isArray(afterVal)
        ? sameStringList(current || [], afterVal)
        : current === afterVal;
      if (!matchesAfter) {
        conflicts.push({
          id: op.id,
          field,
          reason: 'valeur_courante_differente_de_appliquee',
        });
        continue;
      }
      const before = op.before?.[field];
      if (apply) {
        if (before && before.absent) {
          await Model.updateOne({ _id: op.id }, { $unset: { [field]: 1 } });
        } else if (before !== undefined) {
          await Model.updateOne({ _id: op.id }, { $set: { [field]: before } });
        }
      }
      restored.push({ id: op.id, field });
    }
  }

  return {
    kind: 'retour_arriere_partiel',
    restored,
    conflicts,
    keptCreations,
    note: 'Les documents créés (catalogKey) sont conservés.',
  };
}

export function mergeJournal(existing, entry) {
  const doc = existing && typeof existing === 'object' ? existing : { version: 2, applied: [], dryRuns: [] };
  if (!Array.isArray(doc.applied)) doc.applied = [];
  if (!Array.isArray(doc.dryRuns)) doc.dryRuns = [];
  doc.version = 2;
  const target = entry.apply ? doc.applied : doc.dryRuns;
  const idx = target.findIndex((r) => r.runId && r.runId === entry.runId);
  const stamped = { ...entry, at: entry.at || new Date().toISOString() };
  if (idx >= 0) target[idx] = { ...target[idx], ...stamped };
  else target.push(stamped);
  return doc;
}
