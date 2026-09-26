import mongoose from 'mongoose';
import Notification from '../models/notificationModel.js';
import FieldRecensement from '../models/fieldRecensementModel.js';

// Fonction utilitaire pour importer un modèle de manière sécurisée
async function importModel(modelPath) {
  try {
    const module = await import(modelPath);
    return module.default;
  } catch (error) {
    console.warn(`⚠️ Modèle ${modelPath} non disponible:`, error.message);
    return null;
  }
}

/**
 * @swagger
 * /admin/dashboard/summary:
 *   get:
 *     tags: [Admin]
 *     summary: 📊 Synthèse du dashboard admin
 *     description: Récupère les compteurs réels et les données récentes pour le dashboard admin
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Synthèse récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DashboardSummary'
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non autorisé (admin requis)
 *       500:
 *         description: Erreur serveur
 */

export const getDashboardSummary = async (req, res) => {
  try {
    // Vérification que l'utilisateur est admin (le middleware authRole le fait déjà)
    if (!req.utilisateur || req.utilisateur.role?.toUpperCase() !== 'ADMIN') {
      return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    }

    // Importer les modèles de manière sécurisée
    const Utilisateur = await importModel('../models/utilisateurModel.js');
    const Prestataire = await importModel('../models/prestataireModel.js');
    const Freelance = await importModel('../models/freelanceModel.js');
    const Vendeur = await importModel('../models/vendeurModel.js');
    const Service = await importModel('../models/serviceModel.js');
    const Categorie = await importModel('../models/categorieModel.js');
    const Article = await importModel('../models/articleModel.js');
    const FreelanceService = await importModel('../models/freelanceServiceModel.js');
    const Commande = await importModel('../models/commandeModel.js');
    const Prestation = await importModel('../models/prestationModel.js');
    const Promotion = await importModel('../models/promotionModel.js');

    // Vérifier que les modèles essentiels existent
    if (!Utilisateur || !Prestataire || !Service || !Categorie || !Article) {
      return res.status(500).json({
        error: 'Configuration incomplète du serveur',
        message: 'Certains modèles essentiels sont manquants'
      });
    }

    // ── Compteurs + pending + récents en parallèle ────────────────────────────
    const [
      usersCount,
      clientsOnlyCount,
      providersCount,
      freelancersCount,
      sellersCount,
      servicesCount,
      categoriesCount,
      articlesCount,
      notificationsUnreadCount,
      pendingProvidersCount,
      pendingFreelancersCount,
      pendingSellersCount,
      pendingFieldRecensementsCount,
      recentElements,
      geoDistributionRaw,
      geoVendeurRaw,
    ] = await Promise.all([
      // Tous comptes — KPI global
      Utilisateur.countDocuments({}),
      // Clients purs (rôle=Client) — utilisé dans le donut pour éviter chevauchement
      Utilisateur.countDocuments({ role: 'Client' }),
      Prestataire.countDocuments({}),
      Freelance ? Freelance.countDocuments({}) : 0,
      Vendeur ? Vendeur.countDocuments({}) : 0,
      Service.countDocuments({}),
      Categorie.countDocuments({}),
      Article.countDocuments({}),

      Notification.countDocuments({ destinataire: req.utilisateur._id, lu: false }),

      Prestataire.countDocuments({ status: { $in: ['pending', 'en_attente', 'pending_review'] } }),
      Freelance ? Freelance.countDocuments({ status: { $in: ['pending', 'en_attente', 'pending_review'] } }) : 0,
      Vendeur ? Vendeur.countDocuments({ status: { $in: ['pending', 'en_attente', 'pending_review'] } }) : 0,
      FieldRecensement.countDocuments({ reviewStatus: { $in: ['pending_review', 'needs_correction'] } }),

      getRecentElements(req.utilisateur._id),

      // Top localisations prestataires (champ texte)
      Prestataire.aggregate([
        { $match: { localisation: { $exists: true, $nin: [null, ''] } } },
        { $group: { _id: '$localisation', total: { $sum: 1 }, verified: { $sum: { $cond: ['$verifier', 1, 0] } } } },
        { $sort: { total: -1 } },
        { $limit: 12 },
      ]),

      // Top villes vendeurs (champ businessAddress.city)
      Vendeur
        ? Vendeur.aggregate([
          { $match: { 'businessAddress.city': { $exists: true, $nin: [null, ''] } } },
          { $group: { _id: '$businessAddress.city', total: { $sum: 1 } } },
          { $sort: { total: -1 } },
          { $limit: 12 },
        ])
        : Promise.resolve([]),
    ]);

    const pendingTotal = pendingProvidersCount + pendingFreelancersCount + pendingSellersCount + pendingFieldRecensementsCount;

    // ── Compteurs optionnels séquentiels ──────────────────────────────────────
    const freelanceServiceCount = FreelanceService ? await FreelanceService.countDocuments({}) : null;
    const ordersCount = Commande ? await Commande.countDocuments({}) : null;
    const prestationsCount = Prestation ? await Prestation.countDocuments({}) : null;
    const promotionsCount = Promotion ? await Promotion.countDocuments({}) : null;

    // ── Points géographiques prestataires ─────────────────────────────────────
    const geoPoints = await Prestataire
      .find({
        'localisationmaps.latitude': { $exists: true, $nin: [null, 0] },
        'localisationmaps.longitude': { $exists: true, $nin: [null, 0] },
      })
      .limit(300)
      .select('localisationmaps localisation verifier')
      .lean();

    const CI_LAT_MIN = 4.0, CI_LAT_MAX = 10.9;
    const CI_LNG_MIN = -8.9, CI_LNG_MAX = -2.2;

    const mappedGeoPoints = geoPoints
      .filter(p => {
        const lat = p.localisationmaps?.latitude;
        const lng = p.localisationmaps?.longitude;
        return lat && lng &&
          lat >= CI_LAT_MIN && lat <= CI_LAT_MAX &&
          lng >= CI_LNG_MIN && lng <= CI_LNG_MAX;
      })
      .map(p => ({
        lat: p.localisationmaps.latitude,
        lng: p.localisationmaps.longitude,
        zone: p.localisation || 'Inconnue',
        verified: !!p.verifier,
        type: 'provider',
      }));

    // ── Points géographiques vendeurs ──────────────────────────────────────────
    const geoVendeurPoints = Vendeur ? await Vendeur
      .find({
        'businessAddress.coordinates.latitude': { $exists: true, $nin: [null, 0] },
        'businessAddress.coordinates.longitude': { $exists: true, $nin: [null, 0] },
      })
      .limit(200)
      .select('businessAddress.coordinates businessAddress.city')
      .lean() : [];

    const mappedVendeurGeo = geoVendeurPoints
      .filter(v => {
        const lat = v.businessAddress?.coordinates?.latitude;
        const lng = v.businessAddress?.coordinates?.longitude;
        return lat && lng &&
          lat >= CI_LAT_MIN && lat <= CI_LAT_MAX &&
          lng >= CI_LNG_MIN && lng <= CI_LNG_MAX;
      })
      .map(v => ({
        lat: v.businessAddress.coordinates.latitude,
        lng: v.businessAddress.coordinates.longitude,
        zone: v.businessAddress.city || 'Inconnue',
        type: 'seller',
      }));

    // ── Normalisation des zones géographiques ─────────────────────────────────
    // Supprime les doublons de mots, les "À définir", casse incohérente
    const normalizeZone = (raw) => {
      if (!raw || typeof raw !== 'string') return null;
      const s = raw.trim();
      if (!s || /^à définir$/i.test(s) || /^[0-9.,\s-]+$/.test(s)) return null;
      // Supprimer les segments "à définir" ou "À Définir" dans une chaîne plus longue
      const cleaned = s
        .replace(/à définir,?\s*/gi, '')
        .replace(/,\s*à définir/gi, '')
        .trim();
      if (!cleaned) return null;
      // Supprimer les mots dupliqués consécutifs (ex: "Abidjan Abidjan")
      return cleaned.replace(/\b(\w+)\s+\1\b/gi, '$1').trim() || null;
    };

    // Fusion top zones : prestataires + vendeurs avec normalisation
    const zonesMap = {};
    geoDistributionRaw.forEach(r => {
      const label = normalizeZone(r._id);
      if (!label) return;
      zonesMap[label] = (zonesMap[label] || 0) + (r.total || 0);
    });
    geoVendeurRaw.forEach(r => {
      const label = normalizeZone(r._id);
      if (!label) return;
      zonesMap[label] = (zonesMap[label] || 0) + (r.total || 0);
    });
    const topLocations = Object.entries(zonesMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([zone, total]) => ({ zone, total }));

    // ── Construction de la réponse ────────────────────────────────────────────
    const response = {
      generatedAt: new Date().toISOString(),
      counts: {
        users: usersCount,     // Tous comptes (KPI général)
        providers: providersCount,
        freelancers: freelancersCount,
        sellers: sellersCount,
        services: servicesCount,
        categories: categoriesCount,
        articles: articlesCount,
      },
      pending: {
        providers: pendingProvidersCount,
        freelancers: pendingFreelancersCount,
        sellers: pendingSellersCount,
        fieldRecensements: pendingFieldRecensementsCount,
        total: pendingTotal,
      },
      notifications: { unread: notificationsUnreadCount },
      recent: recentElements,
      // Donut : populations mutuellement exclusives
      // clients = comptes rôle=Client seulement (ni Admin, ni Prestataire, ni Freelance, ni Vendeur)
      profileDistribution: [
        { type: 'clients', label: 'Clients', count: clientsOnlyCount },
        { type: 'providers', label: 'Prestataires', count: providersCount },
        { type: 'freelancers', label: 'Freelances', count: freelancersCount },
        { type: 'sellers', label: 'Vendeurs', count: sellersCount },
      ].filter(p => p.count > 0),
      geo: {
        points: [...mappedGeoPoints, ...mappedVendeurGeo],
        topLocations,
      },
    };

    if (freelanceServiceCount !== null) response.counts.freelanceServices = freelanceServiceCount;
    if (ordersCount !== null) response.counts.orders = ordersCount;
    if (prestationsCount !== null) response.counts.prestations = prestationsCount;
    if (promotionsCount !== null) response.counts.promotions = promotionsCount;

    // Garde-fou contrat
    if (!response.counts || typeof response.pending?.total !== 'number') {
      console.error('❌ Contrat DashboardSummary invalide avant envoi:', response);
      return res.status(500).json({
        error: 'Erreur interne : contrat de réponse invalide',
        message: 'Le serveur a construit une réponse incomplète (counts ou pending.total manquant).',
      });
    }

    res.status(200).json(response);
  } catch (error) {
    console.error('❌ Erreur getDashboardSummary:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération de la synthèse',
      message: error.message,
    });
  }
};

/** Périodes autorisées pour l’évolution dashboard (query `period`). */
export const ALLOWED_EVOLUTION_PERIODS = Object.freeze(['30d', '3m', '6m', '12m']);

/** Timezone Mongo `$dateToString` — documentée pour l’admin. */
export const EVOLUTION_AGGREGATION_TIMEZONE = 'UTC';

/** Aligné sur getDashboardSummary / donut — comptes Utilisateur avec role Client uniquement. */
export const EVOLUTION_CLIENT_USER_ROLE = 'Client';

function formatEvolutionMonthLabelUTC(date) {
  const raw = date.toLocaleDateString('fr-FR', {
    month: 'short',
    year: 'numeric',
    timeZone: EVOLUTION_AGGREGATION_TIMEZONE,
  });
  const parts = raw.replace('.', '').split(' ');
  if (parts.length >= 2) {
    const month = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    return `${month}. ${parts[parts.length - 1]}`;
  }
  return raw;
}

function formatEvolutionDayLabelUTC(date) {
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    timeZone: EVOLUTION_AGGREGATION_TIMEZONE,
  });
}

function buildEvolutionBuckets(period) {
  const now = new Date();
  const end = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    23,
    59,
    59,
    999,
  ));

  if (period === '30d') {
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - 29);
    start.setUTCHours(0, 0, 0, 0);
    const buckets = [];
    for (let i = 0; i < 30; i += 1) {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + i);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
      buckets.push({ key, label: formatEvolutionDayLabelUTC(d) });
    }
    return { period, granularity: 'day', start, end, buckets };
  }

  const monthCount = period === '3m' ? 3 : period === '6m' ? 6 : 12;
  const anchor = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
  const buckets = [];
  for (let i = monthCount - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    buckets.push({ key, label: formatEvolutionMonthLabelUTC(d) });
  }
  const startParts = buckets[0].key.split('-');
  const start = new Date(Date.UTC(
    Number(startParts[0]),
    Number(startParts[1]) - 1,
    1,
    0,
    0,
    0,
    0,
  ));
  return { period, granularity: 'month', start, end, buckets };
}

async function aggregateCreatedAtCounts(Model, start, end, granularity, extraMatch = null) {
  if (!Model) {
    return new Map();
  }
  const dateFormat = granularity === 'day' ? '%Y-%m-%d' : '%Y-%m';
  const match = {
    createdAt: { $gte: start, $lte: end },
  };
  if (extraMatch && typeof extraMatch === 'object') {
    Object.assign(match, extraMatch);
  }
  const rows = await Model.aggregate([
    {
      $match: match,
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: dateFormat,
            date: '$createdAt',
            timezone: EVOLUTION_AGGREGATION_TIMEZONE,
          },
        },
        count: { $sum: 1 },
      },
    },
  ]);
  const map = new Map();
  for (const row of rows) {
    if (row?._id) {
      map.set(String(row._id), toSafeNavigationCount(row.count));
    }
  }
  return map;
}

function seriesFromBuckets(buckets, countMap) {
  return buckets.map((b) => countMap.get(b.key) ?? 0);
}

/**
 * Évolution temporelle des créations (clients, prestataires, freelances, vendeurs).
 * GET /api/admin/dashboard/evolution?period=12m
 */
export const getDashboardEvolution = async (req, res) => {
  try {
    if (!req.utilisateur || req.utilisateur.role?.toUpperCase() !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs' });
    }

    const periodRaw = String(req.query.period ?? '12m').trim();
    if (!ALLOWED_EVOLUTION_PERIODS.includes(periodRaw)) {
      return res.status(400).json({
        success: false,
        error: 'Période invalide',
        allowed: [...ALLOWED_EVOLUTION_PERIODS],
      });
    }

    const { period, granularity, start, end, buckets } = buildEvolutionBuckets(periodRaw);

    const Utilisateur = await importModel('../models/utilisateurModel.js');
    const Prestataire = await importModel('../models/prestataireModel.js');
    const Freelance = await importModel('../models/freelanceModel.js');
    const Vendeur = await importModel('../models/vendeurModel.js');

    const [clientsMap, prestMap, freeMap, vendMap] = await Promise.all([
      aggregateCreatedAtCounts(Utilisateur, start, end, granularity, {
        role: EVOLUTION_CLIENT_USER_ROLE,
      }),
      aggregateCreatedAtCounts(Prestataire, start, end, granularity),
      aggregateCreatedAtCounts(Freelance, start, end, granularity),
      aggregateCreatedAtCounts(Vendeur, start, end, granularity),
    ]);

    const series = {
      clients: seriesFromBuckets(buckets, clientsMap),
      prestataires: seriesFromBuckets(buckets, prestMap),
      freelances: seriesFromBuckets(buckets, freeMap),
      vendeurs: seriesFromBuckets(buckets, vendMap),
    };

    const bucketCount = buckets.length;
    for (const key of Object.keys(series)) {
      if (series[key].length !== bucketCount) {
        throw new Error(`Série ${key} incohérente avec les buckets`);
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        period,
        granularity,
        buckets,
        series,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('❌ Erreur getDashboardEvolution:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de l’évolution',
      message: error.message,
    });
  }
};

/** Entier ≥ 0 pour les compteurs de navigation admin. */
function toSafeNavigationCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

/**
 * Compteurs légers pour les pastilles de la sidebar admin (sans KPI catalogue).
 */
export const getNavigationSummary = async (req, res) => {
  try {
    if (!req.utilisateur || req.utilisateur.role?.toUpperCase() !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs' });
    }

    const Commande = await importModel('../models/commandeModel.js');
    const Prestation = await importModel('../models/prestationModel.js');
    const Paiement = await importModel('../models/paiementModel.js');

    const countTasks = [
      FieldRecensement.countDocuments({
        reviewStatus: { $in: ['pending_review', 'needs_correction'] },
      }),
      Commande
        ? Commande.countDocuments({ statusCommande: 'En cours' })
        : Promise.resolve(0),
      Prestation
        ? Prestation.countDocuments({ statut: 'EN_ATTENTE' })
        : Promise.resolve(0),
      Paiement
        ? Paiement.countDocuments({
          statut: { $in: ['ECHEC', 'LITIGE', 'EN_ATTENTE'] },
        })
        : Promise.resolve(0),
      Notification.countDocuments({
        destinataire: req.utilisateur._id,
        lu: false,
      }),
    ];

    const [
      recensementsPending,
      ordersPending,
      prestationsPending,
      paymentsAttention,
      notificationsUnread,
    ] = await Promise.all(countTasks);

    const data = {
      recensementsPending: toSafeNavigationCount(recensementsPending),
      ordersPending: toSafeNavigationCount(ordersPending),
      prestationsPending: toSafeNavigationCount(prestationsPending),
      paymentsAttention: toSafeNavigationCount(paymentsAttention),
      notificationsUnread: toSafeNavigationCount(notificationsUnread),
      updatedAt: new Date().toISOString(),
    };

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('❌ Erreur getNavigationSummary:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des compteurs de navigation',
      message: error.message,
    });
  }
};

/**
 * Récupère les éléments récents (derniers 7 jours)
 */
async function getRecentElements(userId) {
  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Récupérer les modèles dynamiquement
    const Utilisateur = (await import('../models/utilisateurModel.js')).default;
    const Prestataire = (await import('../models/prestataireModel.js')).default;
    const Freelance = (await import('../models/freelanceModel.js')).default;
    const Vendeur = (await import('../models/vendeurModel.js')).default;
    const FieldRecensement = await importModel('../models/fieldRecensementModel.js');

    // Récupérer les éléments récents en parallèle
    const [
      recentUsers,
      recentProviders,
      recentFreelancers,
      recentSellers,
      recentFieldRecensements
    ] = await Promise.all([
      Utilisateur.find({
        createdAt: { $gte: oneWeekAgo }
      })
        .sort({ createdAt: -1 })
        .limit(2)
        .select('nom prenom email role createdAt')
        .lean(),

      Prestataire.find({
        createdAt: { $gte: oneWeekAgo }
      })
        .sort({ createdAt: -1 })
        .limit(2)
        .select('nom prenom entreprise service status createdAt')
        .lean(),

      Freelance.find({
        createdAt: { $gte: oneWeekAgo }
      })
        .sort({ createdAt: -1 })
        .limit(2)
        .select('nom prenom competence status createdAt')
        .lean(),

      Vendeur.find({
        createdAt: { $gte: oneWeekAgo }
      })
        .sort({ createdAt: -1 })
        .limit(2)
        .select('nom prenom boutique status createdAt')
        .lean(),

      FieldRecensement ? FieldRecensement.find({
        reviewStatus: { $in: ['pending_review', 'needs_correction'] },
      })
        .sort({ createdAt: -1 })
        .limit(2)
        .select('person.prenom person.nom professionalType reviewStatus createdAt')
        .lean() : []
    ]);

    // Transformer les résultats en format standard
    const allRecent = [
      ...recentUsers.map(item => ({
        id: item._id.toString(),
        type: 'user',
        label: `${item.nom} ${item.prenom}`,
        subLabel: item.email || item.role,
        status: item.role,
        createdAt: item.createdAt.toISOString()
      })),
      ...recentProviders.map(item => ({
        id: item._id.toString(),
        type: 'provider',
        label: item.entreprise || `${item.nom} ${item.prenom}`,
        subLabel: item.service || 'Prestataire',
        status: item.status,
        createdAt: item.createdAt.toISOString()
      })),
      ...recentFreelancers.map(item => ({
        id: item._id.toString(),
        type: 'freelancer',
        label: `${item.nom} ${item.prenom}`,
        subLabel: item.competence || 'Freelance',
        status: item.status,
        createdAt: item.createdAt.toISOString()
      })),
      ...recentSellers.map(item => ({
        id: item._id.toString(),
        type: 'seller',
        label: item.boutique || `${item.nom} ${item.prenom}`,
        subLabel: 'Vendeur',
        status: item.status,
        createdAt: item.createdAt.toISOString()
      })),
      ...recentFieldRecensements.map(item => ({
        id: item._id.toString(),
        type: 'field_recensement',
        label: `${item.person?.prenom ?? ''} ${item.person?.nom ?? ''}`.trim() || 'Recensement',
        subLabel: item.professionalType || 'Recensement terrain',
        status: item.reviewStatus,
        createdAt: item.createdAt.toISOString()
      }))
    ];

    // Trier par date et limiter à 8 éléments maximum
    return allRecent
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 8);

  } catch (error) {
    console.error('❌ Erreur getRecentElements:', error);
    return [];
  }
}

/**
 * @swagger
 * components:
 *   schemas:
 *     DashboardSummary:
 *       type: object
 *       required:
 *         - generatedAt
 *         - counts
 *         - pending
 *         - notifications
 *         - recent
 *       properties:
 *         generatedAt:
 *           type: string
 *           format: date-time
 *           description: Date de génération de la synthèse
 *           example: "2024-01-15T10:30:00.000Z"
 *         counts:
 *           type: object
 *           description: Compteurs réels des entités
 *           properties:
 *             users:
 *               type: integer
 *               description: Nombre total d'utilisateurs
 *             providers:
 *               type: integer
 *               description: Nombre total de prestataires
 *             freelancers:
 *               type: integer
 *               description: Nombre total de freelances
 *             sellers:
 *               type: integer
 *               description: Nombre total de vendeurs
 *             shops:
 *               type: integer
 *               description: Nombre total de boutiques (optionnel)
 *             services:
 *               type: integer
 *               description: Nombre total de services
 *             categories:
 *               type: integer
 *               description: Nombre total de catégories
 *             articles:
 *               type: integer
 *               description: Nombre total d'articles
 *             orders:
 *               type: integer
 *               description: Nombre total de commandes (optionnel)
 *             prestations:
 *               type: integer
 *               description: Nombre total de prestations (optionnel)
 *         pending:
 *           type: object
 *           description: Éléments en attente de validation
 *           properties:
 *             providers:
 *               type: integer
 *               description: Prestataires en attente
 *             freelancers:
 *               type: integer
 *               description: Freelances en attente
 *             sellers:
 *               type: integer
 *               description: Vendeurs en attente
 *             fieldRecensements:
 *               type: integer
 *               description: Recensements terrain en attente
 *             total:
 *               type: integer
 *               description: Total des éléments en attente
 *         notifications:
 *           type: object
 *           description: Notifications de l'utilisateur connecté
 *           properties:
 *             unread:
 *               type: integer
 *               description: Nombre de notifications non lues
 *         recent:
 *           type: array
 *           description: Éléments récents (derniers 7 jours)
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 description: ID de l'élément
 *               type:
 *                 type: string
 *                 description: Type d'élément (user, provider, freelancer, seller, field_recensement)
 *               label:
 *                 type: string
 *                 description: Label d'affichage
 *               subLabel:
 *                 type: string
 *                 description: Sous-label d'affichage
 *               status:
 *                 type: string
 *                 description: Statut de l'élément
 *               createdAt:
 *                 type: string
 *                 format: date-time
 *                 description: Date de création
 */