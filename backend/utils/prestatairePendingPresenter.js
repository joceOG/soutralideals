import {
  classifyKycStoredValue,
  KYC_FIELD_NAMES,
} from './kycAccess.js';

function kycPresence(doc, field) {
  const v = doc?.[field];
  return v != null && v !== '';
}

function legacyDetected(doc) {
  for (const f of KYC_FIELD_NAMES) {
    if (classifyKycStoredValue(doc?.[f]) === 'legacy_http_url') return true;
  }
  return false;
}

/**
 * DASH-8A.1 — Liste modération sans URL, ref Cloudinary ni PII KYC inutile.
 */
export function presentPrestatairePendingListItem(doc) {
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  const u = plain.utilisateur;
  const s = plain.service;

  return {
    _id: plain._id,
    identite: {
      nom: u?.nom ?? '',
      prenom: u?.prenom ?? '',
      telephone: u?.telephone ?? undefined,
    },
    service: {
      _id: s?._id,
      nom: s?.nomservice ?? '',
    },
    localisation: plain.localisation ?? '',
    prixprestataire: plain.prixprestataire,
    status: plain.status ?? 'pending',
    source: plain.source,
    recenseur: plain.recenseur
      ? {
          _id: plain.recenseur._id,
          nom: plain.recenseur.nom,
          prenom: plain.recenseur.prenom,
        }
      : undefined,
    dateRecensement: plain.dateRecensement,
    createdAt: plain.createdAt,
    kyc: {
      cniRectoPresent: kycPresence(plain, 'cni1'),
      cniVersoPresent: kycPresence(plain, 'cni2'),
      selfiePresent: kycPresence(plain, 'selfie'),
      assurancePresent: kycPresence(plain, 'attestationAssurance'),
      legacyDocumentDetected: legacyDetected(plain),
    },
  };
}

/** Assertions tests — aucune fuite documentaire dans la sérialisation JSON. */
export function assertPendingListHasNoDocumentLeak(jsonValue) {
  const blob = JSON.stringify(jsonValue);
  const forbidden = [
    /res\.cloudinary\.com/i,
    /cld:auth:/i,
    /secure_url/i,
    /public_id/i,
    /uploads\//i,
  ];
  for (const re of forbidden) {
    if (re.test(blob)) {
      throw new Error(`Fuite détectée (motif ${re})`);
    }
  }
}
