/**
 * DASH-8E.3B.1 — Création Commande dérivée des Articles (intégrité serveur).
 */
import mongoose from 'mongoose';
import articleModel from '../models/articleModel.js';
import commandeModel from '../models/commandeModel.js';
import vendeurModel from '../models/vendeurModel.js';
import { resolveProfessionalCapabilities } from './professionalCapabilitiesService.js';

export const ORDER_CREATE_ALLOWED_TOP_LEVEL = Object.freeze([
  'articles',
  'infoCommande',
  'dateLivraison',
]);

export const ORDER_CREATE_FORBIDDEN_TOP_LEVEL = Object.freeze([
  'utilisateur',
  'userId',
  'client',
  'vendeur',
  'prix',
  'prixArticle',
  'montant',
  'montantTotal',
  'montantNet',
  'frais',
  'commission',
  'statusCommande',
  'statut',
  'paiement',
  'paymentStatus',
  'beneficiaire',
  'numeroTransaction',
  'datePaie',
  'paiementInfo',
  'prixArticles',
  'prixLivraison',
  'prixTotal',
  'role',
]);

const LINE_ALLOWED_KEYS = new Set(['articleId', 'article', 'quantite']);
const MAX_LINE_QUANTITY = 999;
const INITIAL_ORDER_STATUS = 'En cours';

export class OrderCreationError extends Error {
  constructor(code, httpStatus, message) {
    super(message);
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

function roundMoneyFcfa(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return NaN;
  return Math.round(n);
}

export function assertOrderCreatePayloadShape(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new OrderCreationError(
      'INVALID_ORDER_PAYLOAD',
      400,
      'Corps de requête invalide.',
    );
  }

  for (const key of ORDER_CREATE_FORBIDDEN_TOP_LEVEL) {
    if (body[key] !== undefined) {
      throw new OrderCreationError(
        'ORDER_FIELD_FORBIDDEN',
        400,
        'Champ non autorisé à la création de commande.',
      );
    }
  }

  for (const key of Object.keys(body)) {
    if (!ORDER_CREATE_ALLOWED_TOP_LEVEL.includes(key)) {
      throw new OrderCreationError(
        'ORDER_FIELD_FORBIDDEN',
        400,
        'Champ non autorisé à la création de commande.',
      );
    }
  }
}

/**
 * @param {unknown} rawLines
 * @returns {Map<string, number>}
 */
export function aggregateOrderLineQuantities(rawLines) {
  if (!Array.isArray(rawLines) || rawLines.length === 0) {
    throw new OrderCreationError(
      'INVALID_ORDER_PAYLOAD',
      400,
      'Au moins un article est requis.',
    );
  }

  const map = new Map();

  for (const line of rawLines) {
    if (!line || typeof line !== 'object' || Array.isArray(line)) {
      throw new OrderCreationError(
        'INVALID_ORDER_PAYLOAD',
        400,
        'Ligne article invalide.',
      );
    }

    for (const key of Object.keys(line)) {
      if (!LINE_ALLOWED_KEYS.has(key)) {
        throw new OrderCreationError(
          'ORDER_FIELD_FORBIDDEN',
          400,
          'Champ non autorisé sur une ligne article.',
        );
      }
    }

    const rawId = line.articleId ?? line.article;
    if (rawId == null || String(rawId).trim() === '') {
      throw new OrderCreationError(
        'INVALID_ORDER_PAYLOAD',
        400,
        'Identifiant article requis.',
      );
    }

    const idStr = String(rawId).trim();
    if (!mongoose.Types.ObjectId.isValid(idStr)) {
      throw new OrderCreationError(
        'INVALID_ARTICLE_ID',
        400,
        'Identifiant article invalide.',
      );
    }

    const qtyRaw = line.quantite;
    if (qtyRaw === undefined || qtyRaw === null || qtyRaw === '') {
      throw new OrderCreationError(
        'INVALID_ORDER_QUANTITY',
        400,
        'Quantité invalide.',
      );
    }

    const qty = Number(qtyRaw);
    if (!Number.isFinite(qty) || !Number.isInteger(qty) || qty <= 0) {
      throw new OrderCreationError(
        'INVALID_ORDER_QUANTITY',
        400,
        'Quantité invalide.',
      );
    }
    if (qty > MAX_LINE_QUANTITY) {
      throw new OrderCreationError(
        'INVALID_ORDER_QUANTITY',
        400,
        'Quantité excessive.',
      );
    }

    const canon = String(new mongoose.Types.ObjectId(idStr));
    map.set(canon, (map.get(canon) || 0) + qty);
  }

  return map;
}

function assertInfoCommande(info) {
  if (!info || typeof info !== 'object') {
    throw new OrderCreationError(
      'INVALID_ORDER_PAYLOAD',
      400,
      'Informations de livraison requises.',
    );
  }
  const addresse = info.addresse ?? info.adresse;
  const { ville, telephone, codePostal, pays } = info;
  if (!addresse || !ville || !telephone || !codePostal || !pays) {
    throw new OrderCreationError(
      'INVALID_ORDER_PAYLOAD',
      400,
      'Adresse, ville, téléphone, code postal et pays requis.',
    );
  }
  return {
    addresse: String(addresse).trim(),
    ville: String(ville).trim(),
    telephone: String(telephone).trim(),
    codePostal: String(codePostal).trim(),
    pays: String(pays).trim(),
  };
}

async function assertVendorAvailableForCheckout(vendeurId) {
  const vendeur = await vendeurModel.findById(vendeurId).lean();
  if (!vendeur) {
    throw new OrderCreationError(
      'VENDOR_NOT_AVAILABLE',
      409,
      'Cette boutique n\'accepte pas de nouvelles commandes.',
    );
  }

  const dupCount = await vendeurModel.countDocuments({ utilisateur: vendeur.utilisateur });
  if (dupCount > 1) {
    throw new OrderCreationError(
      'VENDOR_NOT_AVAILABLE',
      409,
      'Cette boutique n\'accepte pas de nouvelles commandes.',
    );
  }

  const caps = await resolveProfessionalCapabilities(vendeur.utilisateur);
  const v = caps.profilesInternal?.vendeur;
  if (
    caps.inconsistencies?.some((i) => i?.profileType === 'Vendeur') ||
    !v?.exists ||
    !v.canOperate ||
    String(v.id) !== String(vendeur._id)
  ) {
    throw new OrderCreationError(
      'VENDOR_NOT_AVAILABLE',
      409,
      'Cette boutique n\'accepte pas de nouvelles commandes.',
    );
  }

  return vendeur;
}

async function rollbackStock(decrements) {
  for (const { articleId, qty } of decrements) {
    await articleModel.updateOne({ _id: articleId }, { $inc: { quantiteArticle: qty } });
  }
}

async function applyStockDecrements(lineEntries) {
  const applied = [];
  for (const { articleId, qty } of lineEntries) {
    const updated = await articleModel.findOneAndUpdate(
      { _id: articleId, quantiteArticle: { $gte: qty } },
      { $inc: { quantiteArticle: -qty } },
      { new: true },
    );
    if (!updated) {
      await rollbackStock(applied);
      throw new OrderCreationError(
        'INSUFFICIENT_STOCK',
        409,
        'Stock insuffisant pour un ou plusieurs articles.',
      );
    }
    applied.push({ articleId, qty });
  }
  return applied;
}

function parseOptionalDeliveryDate(raw) {
  if (raw === undefined || raw === null || raw === '') {
    return undefined;
  }
  const s = String(raw).trim();
  let d;
  // Date calendaire sans heure : midi UTC (évite décalage jour pour l’Afrique de l’Ouest)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    d = new Date(`${s}T12:00:00.000Z`);
  } else {
    d = new Date(s);
  }
  if (Number.isNaN(d.getTime())) {
    throw new OrderCreationError(
      'INVALID_ORDER_PAYLOAD',
      400,
      'Date de livraison invalide.',
    );
  }
  return d;
}

/**
 * Ligne commande exposée API (snapshot + traçabilité).
 * @param {object} line
 */
export function normalizePublicOrderLine(line) {
  if (!line) {
    return {
      articleId: null,
      nom: '',
      quantite: 0,
      prix: 0,
      image: null,
    };
  }
  const ref = line.article ?? line.articleId;
  let articleId = null;
  if (ref != null && ref !== '') {
    articleId = String(ref);
  }
  return {
    articleId,
    nom: line.nom,
    quantite: line.quantite,
    prix: line.prix,
    image: line.image ?? null,
  };
}

/**
 * @param {import('mongoose').Document} commandeDoc
 */
export function formatPublicCommandeResponse(commandeDoc) {
  const o = commandeDoc.toObject ? commandeDoc.toObject() : commandeDoc;
  const vendeurPub = o.vendeur && typeof o.vendeur === 'object'
    ? { _id: o.vendeur._id, shopName: o.vendeur.shopName }
    : o.vendeur
      ? { _id: o.vendeur }
      : undefined;

  return {
    success: true,
    _id: o._id,
    utilisateur: o.utilisateur,
    statusCommande: o.statusCommande,
    articles: (o.articles || []).map((a) => normalizePublicOrderLine(a)),
    prixArticles: o.prixArticles,
    prixLivraison: o.prixLivraison,
    prixTotal: o.prixTotal,
    infoCommande: o.infoCommande,
    dateLivraison: o.dateLivraison,
    dateCreation: o.dateCreation,
    vendeur: vendeurPub,
  };
}

/**
 * @param {{ utilisateurId: import('mongoose').Types.ObjectId, body: object }} input
 */
export async function createOrderFromClientPayload(input) {
  const { utilisateurId, body } = input;

  assertOrderCreatePayloadShape(body);
  const infoCommande = assertInfoCommande(body.infoCommande);
  const qtyByArticle = aggregateOrderLineQuantities(body.articles);
  const articleIds = [...qtyByArticle.keys()];

  const articles = await articleModel.find({ _id: { $in: articleIds } }).lean();
  if (articles.length !== articleIds.length) {
    throw new OrderCreationError(
      'ARTICLE_NOT_FOUND',
      404,
      'Un ou plusieurs articles sont introuvables.',
    );
  }

  const byId = new Map(articles.map((a) => [String(a._id), a]));

  const vendorIds = new Set();
  const lineEntries = [];
  const snapshotLines = [];
  let subtotal = 0;

  for (const [articleId, qty] of qtyByArticle.entries()) {
    const art = byId.get(articleId);
    if (!art?.vendeur) {
      throw new OrderCreationError(
        'VENDOR_NOT_AVAILABLE',
        409,
        'Cette boutique n\'accepte pas de nouvelles commandes.',
      );
    }
    vendorIds.add(String(art.vendeur));

    if (art.quantiteArticle < qty) {
      throw new OrderCreationError(
        'INSUFFICIENT_STOCK',
        409,
        'Stock insuffisant pour un ou plusieurs articles.',
      );
    }

    const unitPrice = roundMoneyFcfa(art.prixArticle);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new OrderCreationError(
        'INVALID_ORDER_PAYLOAD',
        400,
        'Prix article invalide en catalogue.',
      );
    }

    const lineTotal = roundMoneyFcfa(unitPrice * qty);
    if (!Number.isFinite(lineTotal) || lineTotal < 0) {
      throw new OrderCreationError(
        'INVALID_ORDER_PAYLOAD',
        400,
        'Total ligne invalide.',
      );
    }

    subtotal += lineTotal;
    lineEntries.push({ articleId: art._id, qty });
    snapshotLines.push({
      article: art._id,
      nom: art.nomArticle,
      quantite: qty,
      prix: unitPrice,
      image: art.photoArticle,
    });
  }

  if (vendorIds.size !== 1) {
    throw new OrderCreationError(
      'MULTI_VENDOR_ORDER_NOT_SUPPORTED',
      409,
      'Les articles d\'une commande doivent appartenir à la même boutique.',
    );
  }

  const vendeurId = [...vendorIds][0];
  const vendeur = await assertVendorAvailableForCheckout(vendeurId);

  const prixArticles = roundMoneyFcfa(subtotal);
  if (!Number.isFinite(prixArticles) || prixArticles < 0) {
    throw new OrderCreationError(
      'INVALID_ORDER_PAYLOAD',
      400,
      'Sous-total invalide.',
    );
  }

  // BLOCKED-BUSINESS : pas de politique livraison centralisée pour Commande — 0 FCFA
  const prixLivraison = 0;
  const prixTotal = roundMoneyFcfa(prixArticles + prixLivraison);

  const dateLivraison = parseOptionalDeliveryDate(body.dateLivraison);

  const stockRollback = await applyStockDecrements(lineEntries);

  try {
    const commande = new commandeModel({
      utilisateur: utilisateurId,
      vendeur: vendeur._id,
      infoCommande,
      articles: snapshotLines,
      prixArticles,
      prixLivraison,
      prixTotal,
      statusCommande: INITIAL_ORDER_STATUS,
      dateLivraison,
    });

    await commande.save();
    await commande.populate('vendeur', 'shopName');
    return commande;
  } catch (err) {
    await rollbackStock(stockRollback);
    throw err;
  }
}
