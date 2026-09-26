/**
 * DASH-8E.3A.1 — Résolution d'identité pour import prestataires (sans takeover non vérifié).
 */
import crypto from 'node:crypto';
import Utilisateur from '../models/utilisateurModel.js';
import Categorie from '../models/categorieModel.js';
import Service from '../models/serviceModel.js';
import { matchFieldRecensementUser } from './fieldRecensementUserMatcher.js';
import {
  assertObjectId,
  roleForNewAccountFromImportOrRecensement,
} from './professionalProfileIntegrityService.js';
import { canonicalizePhone, isInternationalInput } from '../utils/phone.js';

export const IMPORT_USER_SOURCE = 'import';

/**
 * Décision de rattachement import (lecture seule sur les comptes existants).
 * @param {{ telephone?: string, utilisateurId?: string, actorIsAdmin?: boolean }} input
 */
export async function resolveImportUtilisateurIdentity(input = {}) {
  const { telephone, utilisateurId, actorIsAdmin = false } = input;

  if (utilisateurId && actorIsAdmin && assertObjectId(utilisateurId)) {
    const explicit = await Utilisateur.findById(utilisateurId)
      .select('_id role isActive telephoneVerified deactivatedAt activationStatus')
      .lean();
    if (!explicit || explicit.isActive === false) {
      return conflictEntry(
        'IMPORT_IDENTITY_REVIEW_REQUIRED',
        'Identifiant utilisateur fourni invalide ou non éligible.',
      );
    }
    return { action: 'attach', utilisateurId: explicit._id, utilisateur: explicit };
  }

  const phoneRaw =
    telephone && String(telephone).trim() && telephone !== 'Non renseigné'
      ? String(telephone).trim()
      : null;

  if (!phoneRaw) {
    return { action: 'create_stub', telephone: null };
  }

  const match = await matchFieldRecensementUser({
    telephone: phoneRaw,
    defaultCountry: 'CI',
  });

  if (match.status === 'verified_match' && match.matchedUtilisateurId) {
    const u = await Utilisateur.findById(match.matchedUtilisateurId)
      .select('_id role isActive telephoneVerified')
      .lean();
    if (!u || u.isActive === false) {
      return conflictEntry(
        'IMPORT_IDENTITY_REVIEW_REQUIRED',
        'Compte non éligible au rattachement automatique.',
      );
    }
    return { action: 'attach', utilisateurId: u._id, utilisateur: u };
  }

  if (match.status === 'unverified_signal') {
    return conflictEntry(
      'IMPORT_IDENTITY_REVIEW_REQUIRED',
      'Un compte utilisant ce téléphone existe sans vérification suffisante.',
    );
  }

  if (match.status === 'ambiguous' || match.status === 'conflict') {
    return conflictEntry(
      'IMPORT_IDENTITY_REVIEW_REQUIRED',
      'Correspondance utilisateur ambiguë — revue manuelle requise.',
    );
  }

  if (match.status === 'blocked_candidate') {
    return conflictEntry(
      'IMPORT_IDENTITY_REVIEW_REQUIRED',
      'Compte non éligible au rattachement automatique.',
    );
  }

  let e164 = phoneRaw;
  try {
    const opts = isInternationalInput(phoneRaw) ? {} : { defaultCountry: 'CI' };
    e164 = canonicalizePhone(phoneRaw, opts).e164;
  } catch {
    return conflictEntry(
      'IMPORT_IDENTITY_REVIEW_REQUIRED',
      'Numéro de téléphone invalide pour création de compte.',
    );
  }

  return { action: 'create_stub', telephone: e164 };
}

function conflictEntry(code, message) {
  return { action: 'reject', code, message };
}

/**
 * Stub Client inactif pour import (champs réellement persistés dans le schéma).
 */
export async function createImportStubUtilisateur({ nom, telephone }) {
  const secret = crypto.randomBytes(32).toString('base64url');
  const tel =
    telephone && String(telephone).trim()
      ? telephone
      : `temp_import_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const user = new Utilisateur({
    nom: nom || 'Import',
    prenom: '',
    telephone: tel,
    password: secret,
    role: roleForNewAccountFromImportOrRecensement(),
    isActive: false,
    telephoneVerified: false,
    activationStatus: 'pending_claim',
    source: IMPORT_USER_SOURCE,
  });
  await user.save();
  return user;
}

/**
 * Catégorie / service pour une ligne — sans création de catégorie placeholder.
 */
export async function resolveImportServiceCatalogForRow(row) {
  const catIdRaw = row.categorieId || process.env.IMPORT_PRESTATAIRE_CATEGORIE_ID;
  if (!catIdRaw || !assertObjectId(String(catIdRaw))) {
    return {
      ok: false,
      code: 'IMPORT_CATEGORY_CONFIGURATION_REQUIRED',
      message:
        'Catégorie d’import non configurée (categorieId sur la ligne ou IMPORT_PRESTATAIRE_CATEGORIE_ID).',
    };
  }
  const categorie = await Categorie.findById(catIdRaw).select('_id nomcategorie groupe').lean();
  if (!categorie) {
    return {
      ok: false,
      code: 'IMPORT_CATEGORY_CONFIGURATION_REQUIRED',
      message: 'Catégorie d’import introuvable.',
    };
  }
  const metier = row.metier?.trim() || 'Service général';
  let service = await Service.findOne({
    nomservice: metier,
    categorie: categorie._id,
  });
  if (!service) {
    service = new Service({
      nomservice: metier,
      prixmoyen: '0',
      categorie: categorie._id,
    });
    await service.save();
  }
  return { ok: true, categorie, service };
}
