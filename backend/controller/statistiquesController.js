/**
 * DASH-7C — Statistiques dashboard admin (MongoDB, agrégations, sans PII).
 */
import {
  ALLOWED_STATISTIQUES_PERIODES,
  resolveStatistiquesRange,
  safeCount,
  safeAmount,
  computeEvolution,
  PAIEMENT_REVENU_STATUTS,
  CLIENT_ROLE,
} from '../utils/statistiquesPeriod.js';

async function importModel(modelPath) {
  try {
    const mod = await import(modelPath);
    return mod.default ?? mod;
  } catch {
    return null;
  }
}

const COMMANDE_EXCLUDED = 'Annulée';
const TIMEZONE = 'Africa/Abidjan';

const METHODE_LABELS = Object.freeze({
  CARTE_VISA: 'Carte Visa',
  CARTE_MASTERCARD: 'Carte Mastercard',
  MOBILE_MONEY_MTN: 'Mobile Money MTN',
  MOBILE_MONEY_ORANGE: 'Mobile Money Orange',
  MOBILE_MONEY_MOOV: 'Mobile Money Moov',
  PAYPAL: 'PayPal',
  VIREMENT_BANCAIRE: 'Virement bancaire',
  ESPECES: 'Espèces',
  WALLET_PLATEFORME: 'Wallet plateforme',
});

function labelMethode(code) {
  const key = String(code ?? '');
  return METHODE_LABELS[key] || key || 'Inconnu';
}

function parseRangeFromQuery(req, res) {
  const explicit = req.query.periode !== undefined && String(req.query.periode).trim() !== '';
  const periodeRaw = explicit ? String(req.query.periode).trim() : '30j';

  const resolved = resolveStatistiquesRange(
    periodeRaw,
    req.query.dateDebut,
    req.query.dateFin,
  );

  if (resolved === null) {
    res.status(400).json({
      success: false,
      error: 'Période invalide',
      allowed: [...ALLOWED_STATISTIQUES_PERIODES],
    });
    return null;
  }
  if (resolved.error) {
    res.status(400).json({ success: false, error: resolved.error });
    return null;
  }
  return resolved;
}

function assertAdmin(req, res) {
  if (!req.utilisateur || req.utilisateur.role?.toUpperCase() !== 'ADMIN') {
    res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs' });
    return false;
  }
  return true;
}

async function countClientsRange(Utilisateur, start, end) {
  if (!Utilisateur) return 0;
  return safeCount(
    await Utilisateur.countDocuments({
      role: CLIENT_ROLE,
      createdAt: { $gte: start, $lte: end },
    }),
  );
}

async function countCommandesRange(Commande, start, end) {
  if (!Commande) return 0;
  return safeCount(
    await Commande.countDocuments({
      dateCreation: { $gte: start, $lte: end },
      statusCommande: { $ne: COMMANDE_EXCLUDED },
    }),
  );
}

async function countPrestationsRange(Prestation, start, end) {
  if (!Prestation) return 0;
  return safeCount(
    await Prestation.countDocuments({
      dateCommande: { $gte: start, $lte: end },
      statut: { $ne: 'ANNULEE' },
    }),
  );
}

function paiementDatePipelineStages(start, end) {
  return [
    { $match: { statut: { $in: PAIEMENT_REVENU_STATUTS } } },
    {
      $addFields: {
        effDate: { $ifNull: ['$dateValidation', '$dateInitiation'] },
      },
    },
    { $match: { effDate: { $gte: start, $lte: end } } },
  ];
}

async function sumChiffreAffairesRange(Paiement, start, end) {
  if (!Paiement) return 0;
  const rows = await Paiement.aggregate([
    ...paiementDatePipelineStages(start, end),
    { $group: { _id: null, total: { $sum: '$montantNet' } } },
  ]);
  return safeAmount(rows[0]?.total ?? 0);
}

function attachEvolutionFields(payload, key, current, previous, monetary = false) {
  const { value, status } = computeEvolution(current, previous, { monetary });
  payload[`evolution${key}`] = value;
  payload[`evolution${key}Status`] = status;
}

/**
 * GET /api/statistiques/generales?periode=30j
 * totalUtilisateurs = inscriptions Clients (role Client) sur la période.
 */
export const getGenerales = async (req, res) => {
  try {
    if (!assertAdmin(req, res)) return;
    const range = parseRangeFromQuery(req, res);
    if (!range) return;

    const { start, end, prevStart, prevEnd, periode } = range;
    const Utilisateur = await importModel('../models/utilisateurModel.js');
    const Commande = await importModel('../models/commandeModel.js');
    const Prestation = await importModel('../models/prestationModel.js');
    const Paiement = await importModel('../models/paiementModel.js');

    const [
      totalUtilisateurs,
      totalCommandes,
      totalPrestations,
      chiffreAffaires,
      prevUtilisateurs,
      prevCommandes,
      prevPrestations,
      prevCA,
    ] = await Promise.all([
      countClientsRange(Utilisateur, start, end),
      countCommandesRange(Commande, start, end),
      countPrestationsRange(Prestation, start, end),
      sumChiffreAffairesRange(Paiement, start, end),
      countClientsRange(Utilisateur, prevStart, prevEnd),
      countCommandesRange(Commande, prevStart, prevEnd),
      countPrestationsRange(Prestation, prevStart, prevEnd),
      sumChiffreAffairesRange(Paiement, prevStart, prevEnd),
    ]);

    const body = {
      totalUtilisateurs,
      totalCommandes,
      totalPrestations,
      chiffreAffaires,
      periode,
      generatedAt: new Date().toISOString(),
    };
    attachEvolutionFields(body, 'Utilisateurs', totalUtilisateurs, prevUtilisateurs);
    attachEvolutionFields(body, 'Commandes', totalCommandes, prevCommandes);
    attachEvolutionFields(body, 'Prestations', totalPrestations, prevPrestations);
    attachEvolutionFields(body, 'CA', chiffreAffaires, prevCA, true);
    return res.status(200).json(body);
  } catch (error) {
    console.error('❌ getGenerales:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors du calcul des statistiques générales',
    });
  }
};

function chooseGranularity(periode, spanDays) {
  if (periode === '7j' || periode === '30j') return 'day';
  if (spanDays <= 31) return 'day';
  return 'month';
}

function dateFormatForGranularity(granularity) {
  return granularity === 'day' ? '%Y-%m-%d' : '%Y-%m';
}

function buildBucketKeys(start, end, granularity) {
  const keys = [];
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const endDate = new Date(end);
  if (granularity === 'day') {
    while (cur <= endDate) {
      keys.push(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }
    return keys;
  }
  cur.setDate(1);
  while (cur <= endDate) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    keys.push(`${y}-${m}`);
    cur.setMonth(cur.getMonth() + 1);
  }
  return keys;
}

async function aggregateByBucket(Model, dateField, start, end, granularity, extraMatch = {}) {
  if (!Model) return new Map();
  const fmt = dateFormatForGranularity(granularity);
  const match = {
    [dateField]: { $gte: start, $lte: end },
    ...extraMatch,
  };
  const rows = await Model.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          $dateToString: { format: fmt, date: `$${dateField}`, timezone: TIMEZONE },
        },
        count: { $sum: 1 },
      },
    },
  ]);
  const map = new Map();
  for (const row of rows) {
    if (row?._id) map.set(String(row._id), safeCount(row.count));
  }
  return map;
}

async function aggregateCAByBucket(Paiement, start, end, granularity) {
  if (!Paiement) return new Map();
  const fmt = dateFormatForGranularity(granularity);
  const rows = await Paiement.aggregate([
    { $match: { statut: { $in: PAIEMENT_REVENU_STATUTS } } },
    {
      $addFields: {
        effDate: { $ifNull: ['$dateValidation', '$dateInitiation'] },
      },
    },
    { $match: { effDate: { $gte: start, $lte: end } } },
    {
      $group: {
        _id: {
          $dateToString: { format: fmt, date: '$effDate', timezone: TIMEZONE },
        },
        total: { $sum: '$montantNet' },
      },
    },
  ]);
  const map = new Map();
  for (const row of rows) {
    if (row?._id) map.set(String(row._id), safeAmount(row.total));
  }
  return map;
}

/**
 * GET /api/statistiques/temporelles
 */
export const getTemporelles = async (req, res) => {
  try {
    if (!assertAdmin(req, res)) return;
    const range = parseRangeFromQuery(req, res);
    if (!range) return;

    const { start, end, periode } = range;
    const spanDays = Math.max(1, Math.ceil((end - start) / (24 * 60 * 60 * 1000)));
    const granularity = chooseGranularity(periode, spanDays);
    const bucketKeys = buildBucketKeys(start, end, granularity);

    const Utilisateur = await importModel('../models/utilisateurModel.js');
    const Commande = await importModel('../models/commandeModel.js');
    const Prestation = await importModel('../models/prestationModel.js');
    const Paiement = await importModel('../models/paiementModel.js');

    const [clientsMap, commandesMap, prestationsMap, caMap] = await Promise.all([
      aggregateByBucket(Utilisateur, 'createdAt', start, end, granularity, { role: CLIENT_ROLE }),
      aggregateByBucket(Commande, 'dateCreation', start, end, granularity, {
        statusCommande: { $ne: COMMANDE_EXCLUDED },
      }),
      aggregateByBucket(Prestation, 'dateCommande', start, end, granularity, {
        statut: { $ne: 'ANNULEE' },
      }),
      aggregateCAByBucket(Paiement, start, end, granularity),
    ]);

    const series = bucketKeys.map((period) => ({
      period,
      utilisateurs: clientsMap.get(period) ?? 0,
      commandes: commandesMap.get(period) ?? 0,
      prestations: prestationsMap.get(period) ?? 0,
      chiffreAffaires: caMap.get(period) ?? 0,
    }));

    return res.status(200).json(series);
  } catch (error) {
    console.error('❌ getTemporelles:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors du calcul des statistiques temporelles',
    });
  }
};

/**
 * GET /api/statistiques/categories
 * nombreCommandes = prestations non annulées sur la période (dateCommande).
 * chiffreAffaires = paiements VALIDE PRESTATION sur la période.
 * servicesActifsCatalogue = inventaire catalogue actuel (hors filtre période).
 */
export const getCategories = async (req, res) => {
  try {
    if (!assertAdmin(req, res)) return;
    const range = parseRangeFromQuery(req, res);
    if (!range) return;
    const { start, end } = range;

    const Service = await importModel('../models/serviceModel.js');
    const Prestation = await importModel('../models/prestationModel.js');
    const Paiement = await importModel('../models/paiementModel.js');
    const Categorie = await importModel('../models/categorieModel.js');

    if (!Service || !Categorie) {
      return res.status(200).json([]);
    }

    const categories = await Categorie.find({}).select('nomcategorie').lean();
    const nameById = new Map(categories.map((c) => [String(c._id), c.nomcategorie || 'Sans nom']));

    const serviceCounts = await Service.aggregate([
      { $group: { _id: '$categorie', nombreServices: { $sum: 1 } } },
    ]);

    const prestationByCat = Prestation
      ? await Prestation.aggregate([
        {
          $match: {
            statut: { $ne: 'ANNULEE' },
            service: { $exists: true },
            dateCommande: { $gte: start, $lte: end },
          },
        },
        {
          $lookup: {
            from: 'services',
            localField: 'service',
            foreignField: '_id',
            as: 'svc',
          },
        },
        { $unwind: '$svc' },
        { $group: { _id: '$svc.categorie', nombreCommandes: { $sum: 1 } } },
      ])
      : [];

    const caByCat = Paiement
      ? await Paiement.aggregate([
        ...paiementDatePipelineStages(start, end),
        {
          $match: {
            typeObjet: 'PRESTATION',
            objetId: { $exists: true },
          },
        },
        {
          $lookup: {
            from: 'prestations',
            localField: 'objetId',
            foreignField: '_id',
            as: 'p',
          },
        },
        { $unwind: '$p' },
        {
          $lookup: {
            from: 'services',
            localField: 'p.service',
            foreignField: '_id',
            as: 'svc',
          },
        },
        { $unwind: '$svc' },
        {
          $group: {
            _id: '$svc.categorie',
            chiffreAffaires: { $sum: '$montantNet' },
          },
        },
      ])
      : [];

    const prestMap = new Map(prestationByCat.map((r) => [String(r._id), safeCount(r.nombreCommandes)]));
    const caMap = new Map(caByCat.map((r) => [String(r._id), safeAmount(r.chiffreAffaires)]));

    const merged = new Map();
    for (const row of serviceCounts) {
      const id = String(row._id);
      merged.set(id, {
        categorie: nameById.get(id) || 'Sans catégorie',
        servicesActifsCatalogue: safeCount(row.nombreServices),
        nombreCommandes: prestMap.get(id) ?? 0,
        chiffreAffaires: caMap.get(id) ?? 0,
      });
    }
    for (const [id, count] of prestMap) {
      if (!merged.has(id)) {
        merged.set(id, {
          categorie: nameById.get(id) || 'Sans catégorie',
          servicesActifsCatalogue: 0,
          nombreCommandes: count,
          chiffreAffaires: caMap.get(id) ?? 0,
        });
      }
    }

    const result = [...merged.values()].sort((a, b) => b.chiffreAffaires - a.chiffreAffaires);
    return res.status(200).json(result);
  } catch (error) {
    console.error('❌ getCategories:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors du calcul des statistiques par catégorie',
    });
  }
};

/**
 * GET /api/statistiques/paiements — paiements VALIDE sur la période.
 */
export const getPaiements = async (req, res) => {
  try {
    if (!assertAdmin(req, res)) return;
    const range = parseRangeFromQuery(req, res);
    if (!range) return;
    const { start, end } = range;

    const Paiement = await importModel('../models/paiementModel.js');
    if (!Paiement) {
      return res.status(200).json([]);
    }

    const rows = await Paiement.aggregate([
      ...paiementDatePipelineStages(start, end),
      {
        $group: {
          _id: '$methodePaiement',
          nombre: { $sum: 1 },
          montant: { $sum: '$montantNet' },
        },
      },
      { $sort: { montant: -1 } },
    ]);

    const totalMontant = rows.reduce((acc, r) => acc + safeAmount(r.montant), 0);
    const result = rows.map((r) => {
      const montant = safeAmount(r.montant);
      const nombre = safeCount(r.nombre);
      const methode = labelMethode(r._id);
      const pourcentage = totalMontant > 0
        ? Math.round((montant / totalMontant) * 1000) / 10
        : 0;
      return { methode, name: methode, nombre, montant, pourcentage };
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('❌ getPaiements:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors du calcul des statistiques de paiement',
    });
  }
};

/**
 * GET /api/statistiques/geographiques
 * utilisateurs = clients distincts ayant passé commande dans la ville.
 * commandes = commandes non annulées.
 * chiffreAffaires = paiements VALIDE type COMMANDE liés à la commande (ville).
 */
export const getGeographiques = async (req, res) => {
  try {
    if (!assertAdmin(req, res)) return;
    const range = parseRangeFromQuery(req, res);
    if (!range) return;
    const { start, end } = range;

    const Commande = await importModel('../models/commandeModel.js');
    const Paiement = await importModel('../models/paiementModel.js');

    if (!Commande) {
      return res.status(200).json([]);
    }

    const commandeRows = await Commande.aggregate([
      {
        $match: {
          statusCommande: { $ne: COMMANDE_EXCLUDED },
          'infoCommande.ville': { $exists: true, $nin: [null, ''] },
          dateCreation: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: '$infoCommande.ville',
          commandes: { $sum: 1 },
          utilisateurs: { $addToSet: '$utilisateur' },
        },
      },
      {
        $project: {
          ville: '$_id',
          commandes: 1,
          utilisateurs: { $size: '$utilisateurs' },
        },
      },
    ]);

    const caRows = Paiement
      ? await Paiement.aggregate([
        ...paiementDatePipelineStages(start, end),
        {
          $match: {
            typeObjet: 'COMMANDE',
            objetId: { $exists: true },
          },
        },
        {
          $lookup: {
            from: 'commandes',
            localField: 'objetId',
            foreignField: '_id',
            as: 'c',
          },
        },
        { $unwind: '$c' },
        {
          $match: {
            'c.infoCommande.ville': { $exists: true, $nin: [null, ''] },
            'c.dateCreation': { $gte: start, $lte: end },
          },
        },
        {
          $group: {
            _id: '$c.infoCommande.ville',
            chiffreAffaires: { $sum: '$montantNet' },
          },
        },
      ])
      : [];

    const caMap = new Map(caRows.map((r) => [String(r._id), safeAmount(r.chiffreAffaires)]));

    const result = commandeRows
      .map((r) => ({
        ville: String(r.ville),
        utilisateurs: safeCount(r.utilisateurs),
        commandes: safeCount(r.commandes),
        chiffreAffaires: caMap.get(String(r.ville)) ?? 0,
      }))
      .sort((a, b) => b.commandes - a.commandes)
      .slice(0, 15);

    return res.status(200).json(result);
  } catch (error) {
    console.error('❌ getGeographiques:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors du calcul des statistiques géographiques',
    });
  }
};
