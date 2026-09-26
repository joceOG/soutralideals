import mongoose from 'mongoose';
import Paiement from '../models/paiementModel.js';

/** Liste blanche — seuls champs exposés au dashboard admin (lecture seule). */
export const PAIEMENT_ADMIN_PUBLIC_FIELDS = [
  '_id',
  'numeroTransaction',
  'payeur',
  'beneficiaire',
  'typeObjet',
  'objetId',
  'montantOriginal',
  'montantFrais',
  'montantNet',
  'devise',
  'methodePaiement',
  'statut',
  'dateInitiation',
  'dateValidation',
  'description',
  'fournisseurPaiement',
  'commissionPlateforme',
  'tauxCommission',
  'numeroRecu',
  'createdAt',
  'updatedAt',
];

const PAIEMENT_SELECT = PAIEMENT_ADMIN_PUBLIC_FIELDS.join(' ');

const POPULATE_USER = 'nom prenom';

const ALLOWED_STATUTS = new Set([
  'INITIE',
  'EN_ATTENTE',
  'EN_COURS',
  'VALIDE',
  'ECHEC',
  'ANNULE',
  'REMBOURSE',
  'LITIGE',
]);

const ALLOWED_METHODES = new Set([
  'CARTE_VISA',
  'CARTE_MASTERCARD',
  'MOBILE_MONEY_MTN',
  'MOBILE_MONEY_ORANGE',
  'MOBILE_MONEY_MOOV',
  'PAYPAL',
  'VIREMENT_BANCAIRE',
  'ESPECES',
  'WALLET_PLATEFORME',
]);

function pickPublicPaiement(doc) {
  if (!doc || typeof doc !== 'object') return doc;
  const out = {};
  for (const key of PAIEMENT_ADMIN_PUBLIC_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(doc, key)) {
      out[key] = doc[key];
    }
  }
  return out;
}

function buildListFilter(query) {
  const filter = {};
  if (query.statut !== undefined && String(query.statut).trim() !== '') {
    const s = String(query.statut).trim();
    if (!ALLOWED_STATUTS.has(s)) {
      return { error: 'Filtre statut invalide.', status: 400 };
    }
    filter.statut = s;
  }
  if (query.methodePaiement !== undefined && String(query.methodePaiement).trim() !== '') {
    const m = String(query.methodePaiement).trim();
    if (!ALLOWED_METHODES.has(m)) {
      return { error: 'Filtre méthode de paiement invalide.', status: 400 };
    }
    filter.methodePaiement = m;
  }
  return { filter };
}

/**
 * GET /api/paiements — liste paginée (lecture seule, admin).
 */
export const listPaiementsAdmin = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const built = buildListFilter(req.query);
    if (built.error) {
      return res.status(built.status).json({ error: built.error });
    }

    const [rows, total] = await Promise.all([
      Paiement.find(built.filter)
        .select(PAIEMENT_SELECT)
        .sort({ dateInitiation: -1 })
        .skip(skip)
        .limit(limit)
        .populate('payeur', POPULATE_USER)
        .populate('beneficiaire', POPULATE_USER)
        .lean(),
      Paiement.countDocuments(built.filter),
    ]);

    res.status(200).json({
      paiements: rows.map(pickPublicPaiement),
      total,
      page,
      limit,
    });
  } catch (err) {
    console.error('listPaiementsAdmin:', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/**
 * GET /api/paiements/stats — agrégats dashboard (lecture seule, admin).
 */
export const getPaiementsStatsAdmin = async (req, res) => {
  try {
    const [totalPaiements, montantAgg, valides, echecs, commissionAgg, statsMethodes] =
      await Promise.all([
        Paiement.countDocuments(),
        Paiement.aggregate([{ $group: { _id: null, total: { $sum: '$montantNet' } } }]),
        Paiement.countDocuments({ statut: 'VALIDE' }),
        Paiement.countDocuments({ statut: 'ECHEC' }),
        Paiement.aggregate([
          { $group: { _id: null, total: { $sum: '$commissionPlateforme' } } },
        ]),
        Paiement.getStatsMethodes(),
      ]);

    const montantTotal = Number(montantAgg[0]?.total ?? 0);
    const commissionTotale = Number(commissionAgg[0]?.total ?? 0);

    const statsParMethode = (statsMethodes || []).map((row) => ({
      methode: row._id,
      count: Number(row.count) || 0,
      montant: Number(row.totalMontant) || 0,
    }));

    res.status(200).json({
      totalPaiements: Number(totalPaiements) || 0,
      montantTotal: Number.isFinite(montantTotal) ? montantTotal : 0,
      paiementsValides: Number(valides) || 0,
      paiementsEnEchec: Number(echecs) || 0,
      commissionTotale: Number.isFinite(commissionTotale) ? commissionTotale : 0,
      statsParMethode,
    });
  } catch (err) {
    console.error('getPaiementsStatsAdmin:', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/**
 * GET /api/paiements/:id — détail minimal (admin).
 */
export const getPaiementByIdAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Identifiant invalide' });
    }

    const paiement = await Paiement.findById(id)
      .select(PAIEMENT_SELECT)
      .populate('payeur', POPULATE_USER)
      .populate('beneficiaire', POPULATE_USER)
      .lean();

    if (!paiement) {
      return res.status(404).json({ error: 'Paiement non trouvé' });
    }

    res.status(200).json(pickPublicPaiement(paiement));
  } catch (err) {
    console.error('getPaiementByIdAdmin:', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};
