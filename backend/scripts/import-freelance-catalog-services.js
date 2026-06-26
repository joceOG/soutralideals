import { config } from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import mongoose from 'mongoose';
import connect from '../database/connex.js';
import '../models/groupeModel.js';
import Categorie from '../models/categorieModel.js';
import Service from '../models/serviceModel.js';

config();

const DEFAULT_INPUT = path.resolve(process.cwd(), 'scripts/data/freelance-services-catalog.txt');
const DEFAULT_GROUP_LOCK = 'Freelance';

function normalizeKey(value) {
  return (value ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, 'et')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function parseTags(rawTags) {
  if (!rawTags) return [];
  const cleaned = rawTags.trim();
  if (!cleaned.startsWith('[') || !cleaned.endsWith(']')) return [];
  return cleaned
    .slice(1, -1)
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function parseCatalogLine(line) {
  const clean = line.trim();
  if (!clean) return null;

  // Ignore section headers and helper lines
  if (/^bloc\s+\d+/i.test(clean)) return null;
  if (/^\d+\.\s+[A-Za-zÀ-ÿ].*$/i.test(clean) && !clean.includes('|')) return null;
  if (!clean.includes('|')) return null;

  // Remove optional numeric prefix: "31. Service | Cat | [tags]"
  const withoutPrefix = clean.replace(/^\d+\.\s*/, '');
  const parts = withoutPrefix.split('|').map((p) => p.trim());
  if (parts.length < 2) return null;

  const serviceName = parts[0];
  const categoryName = parts[1];
  const tags = parseTags(parts[2]);

  if (!serviceName || !categoryName) return null;

  return { serviceName, categoryName, tags };
}

async function loadCatalog(inputPath) {
  const content = await fs.readFile(inputPath, 'utf8');
  return content
    .split(/\r?\n/)
    .map(parseCatalogLine)
    .filter(Boolean);
}

async function main() {
  const inputPath = process.argv[2]
    ? path.resolve(process.cwd(), process.argv[2])
    : DEFAULT_INPUT;

  console.log(`📥 Lecture du catalogue: ${inputPath}`);

  const rows = await loadCatalog(inputPath);
  if (!rows.length) {
    throw new Error('Aucune ligne de service valide trouvée dans le fichier.');
  }

  await connect();

  const groupLockArg = process.argv[3] ?? DEFAULT_GROUP_LOCK;
  const normalizedGroupLock = normalizeKey(groupLockArg);

  const categoriesRaw = await Categorie.find({})
    .select('_id nomcategorie groupe')
    .populate({ path: 'groupe', select: 'nomgroupe' })
    .lean();

  const categories = categoriesRaw.filter((c) => {
    const groupName = c?.groupe?.nomgroupe ?? '';
    return normalizeKey(groupName) === normalizedGroupLock;
  });

  if (!categories.length) {
    throw new Error(
      `Aucune catégorie trouvée pour le groupe verrouillé "${groupLockArg}".`,
    );
  }

  const categoryMap = new Map(categories.map((c) => [normalizeKey(c.nomcategorie), c]));

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const missingCategories = new Set();

  for (const row of rows) {
    const normalizedCategory = normalizeKey(row.categoryName);
    const category = categoryMap.get(normalizedCategory);

    if (!category) {
      missingCategories.add(row.categoryName);
      skipped += 1;
      continue;
    }

    const existing = await Service.findOne({
      nomservice: row.serviceName,
      categorie: new mongoose.Types.ObjectId(category._id),
    });

    if (!existing) {
      await Service.create({
        nomservice: row.serviceName,
        categorie: category._id,
        tags: row.tags,
      });
      created += 1;
      continue;
    }

    const nextTags = row.tags ?? [];
    const oldTags = existing.tags ?? [];
    const hasTagChange = JSON.stringify(oldTags) !== JSON.stringify(nextTags);
    if (hasTagChange) {
      existing.tags = nextTags;
      await existing.save();
      updated += 1;
    }
  }

  console.log('\n✅ Import terminé');
  console.log(`- Lignes valides: ${rows.length}`);
  console.log(`- Groupe verrouillé: ${groupLockArg}`);
  console.log(`- Catégories disponibles dans ce groupe: ${categories.length}`);
  console.log(`- Créés: ${created}`);
  console.log(`- Mis à jour: ${updated}`);
  console.log(`- Ignorés: ${skipped}`);
  if (missingCategories.size > 0) {
    console.log('\n⚠️ Catégories introuvables côté backend:');
    for (const name of [...missingCategories].sort()) {
      console.log(`  - ${name}`);
    }
  }

  await mongoose.connection.close();
}

main().catch(async (error) => {
  console.error('❌ Échec import catalogue:', error.message);
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  process.exit(1);
});
