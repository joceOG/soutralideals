/**

 * DASH-8E.1 / 8E.2 — Capacités professionnelles (source de vérité = profils réels, read-only).

 * capabilities[] = profils exists && canOperate (strictement opérationnels).

 */

import mongoose from 'mongoose';

import Utilisateur from '../models/utilisateurModel.js';

import prestataireModel from '../models/prestataireModel.js';

import freelanceModel from '../models/freelanceModel.js';

import vendeurModel from '../models/vendeurModel.js';



export const PROFESSIONAL_CAPABILITY_LABELS = ['Prestataire', 'Freelance', 'Vendeur'];

export const LEGACY_PROFESSIONAL_ROLES = ['Prestataire', 'Freelance', 'Vendeur'];

export const ACCOUNT_ACCESS_ROLES = ['Admin', 'Client'];



export class CapabilitiesUserNotFoundError extends Error {

  constructor() {

    super('Utilisateur non trouvé');

    this.status = 404;

    this.code = 'USER_NOT_FOUND';

  }

}



export class CapabilitiesInvalidIdError extends Error {

  constructor() {

    super('Identifiant utilisateur invalide');

    this.status = 400;

    this.code = 'USER_ID_INVALID';

  }

}



function assertObjectId(utilisateurId) {

  if (

    !utilisateurId ||

    !mongoose.Types.ObjectId.isValid(String(utilisateurId)) ||

    String(new mongoose.Types.ObjectId(String(utilisateurId))) !== String(utilisateurId)

  ) {

    throw new CapabilitiesInvalidIdError();

  }

}



function normalizePrestataireProfile(doc) {

  if (!doc) {

    return { exists: false, id: null, status: null, canOperate: false, hasConflict: false };

  }

  const raw = doc.status || 'incomplete';

  let status = 'pending';

  if (raw === 'active') status = 'active';

  else if (raw === 'rejected') status = 'rejected';

  else if (raw === 'suspended') status = 'suspended';

  else if (raw === 'incomplete' || raw === 'pending') status = 'pending';



  const canOperate =
    status === 'active' && doc.verifier === true && doc.ownerSelfPaused !== true;

  return { exists: true, id: doc._id, status, canOperate, hasConflict: false };

}



function normalizeFreelanceProfile(doc) {

  if (!doc) {

    return { exists: false, id: null, status: null, canOperate: false, hasConflict: false };

  }

  const raw = (doc.status || 'pending').toLowerCase();

  let status = 'pending';

  if (raw === 'active') status = 'active';

  else if (raw === 'rejected') status = 'rejected';

  else if (raw === 'suspended') status = 'suspended';

  else status = 'pending';



  const account = doc.accountStatus || 'Pending';

  const canOperate = status === 'active' && account === 'Active';

  return { exists: true, id: doc._id, status, canOperate, hasConflict: false };

}



function normalizeVendeurProfile(doc) {

  if (!doc) {

    return { exists: false, id: null, status: null, canOperate: false, hasConflict: false };

  }

  const raw = (doc.status || 'pending').toLowerCase();

  let status = 'pending';

  if (raw === 'active') status = 'active';

  else if (raw === 'rejected') status = 'rejected';

  else if (raw === 'suspended') status = 'suspended';

  else status = 'pending';



  const account = doc.accountStatus || 'Pending';

  const verified = doc.verificationDocuments?.isVerified === true;

  const canOperate = status === 'active' && account === 'Active' && verified;

  return { exists: true, id: doc._id, status, canOperate, hasConflict: false };

}



function resolveFromCandidates(docs, normalizeFn, profileTypeLabel) {

  if (!docs.length) {

    return { profile: normalizeFn(null), inconsistency: null };

  }

  if (docs.length > 1) {

    const base = normalizeFn(docs[0]);

    return {

      profile: {

        ...base,

        exists: true,

        canOperate: false,

        hasConflict: true,

      },

      inconsistency: {

        code: 'MULTIPLE_PROFILES_OF_SAME_TYPE',

        profileType: profileTypeLabel,

      },

    };

  }

  return { profile: normalizeFn(docs[0]), inconsistency: null };

}



/** Capacité listée uniquement si profil opérationnel (exists + canOperate, sans conflit). */

function capabilityFromProfile(label, profile) {

  if (!profile.exists || !profile.canOperate || profile.hasConflict) return null;

  return label;

}



async function loadProfilePair(Model, uid, select) {

  return Model.find({ utilisateur: uid }).select(select).limit(2).lean();

}



export async function resolveProfessionalCapabilities(utilisateurId, options = {}) {

  assertObjectId(utilisateurId);



  const user = await Utilisateur.findById(utilisateurId).select('role').lean();

  if (!user) throw new CapabilitiesUserNotFoundError();



  const legacyRole = user.role;

  const accountRole = legacyRole === 'Admin' ? 'Admin' : 'Client';

  const uid = new mongoose.Types.ObjectId(String(utilisateurId));



  const [prestataireDocs, freelanceDocs, vendeurDocs] = await Promise.all([

    loadProfilePair(prestataireModel, uid, '_id status verifier ownerSelfPaused'),

    loadProfilePair(freelanceModel, uid, '_id status accountStatus'),

    loadProfilePair(vendeurModel, uid, '_id status accountStatus verificationDocuments.isVerified'),

  ]);



  const prestResolved = resolveFromCandidates(prestataireDocs, normalizePrestataireProfile, 'Prestataire');

  const freeResolved = resolveFromCandidates(freelanceDocs, normalizeFreelanceProfile, 'Freelance');

  const vendResolved = resolveFromCandidates(vendeurDocs, normalizeVendeurProfile, 'Vendeur');



  const prestataireP = prestResolved.profile;

  const freelanceP = freeResolved.profile;

  const vendeurP = vendResolved.profile;



  const profilesInternal = {

    prestataire: prestataireP,

    freelance: freelanceP,

    vendeur: vendeurP,

  };



  const capabilities = [

    capabilityFromProfile('Prestataire', prestataireP),

    capabilityFromProfile('Freelance', freelanceP),

    capabilityFromProfile('Vendeur', vendeurP),

  ].filter(Boolean);



  const inconsistencies = [];

  for (const inc of [prestResolved.inconsistency, freeResolved.inconsistency, vendResolved.inconsistency]) {

    if (inc) inconsistencies.push(inc);

  }



  if (LEGACY_PROFESSIONAL_ROLES.includes(legacyRole)) {

    const key =

      legacyRole === 'Prestataire'

        ? 'prestataire'

        : legacyRole === 'Freelance'

          ? 'freelance'

          : 'vendeur';

    if (!profilesInternal[key].exists) {

      inconsistencies.push('LEGACY_ROLE_WITHOUT_PROFILE');

    }

  }



  const stripId = (p) => ({

    exists: p.exists,

    status: p.status,

    canOperate: p.canOperate,

  });



  return {

    accountRole,

    legacyRole,

    capabilities,

    profiles: {

      prestataire: stripId(prestataireP),

      freelance: stripId(freelanceP),

      vendeur: stripId(vendeurP),

    },

    profilesInternal,

    inconsistencies,

  };

}



function normalizePublicInconsistencies(list) {

  return list.map((item) => {

    if (typeof item === 'string') return item;

    if (item && typeof item === 'object' && item.code) {

      return { code: item.code, profileType: item.profileType };

    }

    return item;

  });

}



export function toPublicCapabilitiesPayload(resolved) {

  const payload = {

    accountRole: resolved.accountRole,

    capabilities: resolved.capabilities,

    profiles: resolved.profiles,

    inconsistencies: normalizePublicInconsistencies(resolved.inconsistencies),

  };

  if (LEGACY_PROFESSIONAL_ROLES.includes(resolved.legacyRole)) {

    payload.legacyRole = resolved.legacyRole;

  }

  return payload;

}



export function toAdminCapabilitiesPayload(resolved) {

  return {

    accountRole: resolved.accountRole,

    legacyRole: resolved.legacyRole,

    capabilities: resolved.capabilities,

    profiles: {

      prestataire: {

        exists: resolved.profilesInternal.prestataire.exists,

        status: resolved.profilesInternal.prestataire.status,

        canOperate: resolved.profilesInternal.prestataire.canOperate,

        id: resolved.profilesInternal.prestataire.id

          ? String(resolved.profilesInternal.prestataire.id)

          : null,

      },

      freelance: {

        exists: resolved.profilesInternal.freelance.exists,

        status: resolved.profilesInternal.freelance.status,

        canOperate: resolved.profilesInternal.freelance.canOperate,

        id: resolved.profilesInternal.freelance.id

          ? String(resolved.profilesInternal.freelance.id)

          : null,

      },

      vendeur: {

        exists: resolved.profilesInternal.vendeur.exists,

        status: resolved.profilesInternal.vendeur.status,

        canOperate: resolved.profilesInternal.vendeur.canOperate,

        id: resolved.profilesInternal.vendeur.id

          ? String(resolved.profilesInternal.vendeur.id)

          : null,

      },

    },

    inconsistencies: normalizePublicInconsistencies(resolved.inconsistencies),

  };

}



export function isProfessionalAccountRole(role) {

  return LEGACY_PROFESSIONAL_ROLES.includes(role);

}



export function isAllowedAccountRoleForWrite(role) {

  return ACCOUNT_ACCESS_ROLES.includes(role);

}


