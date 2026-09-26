import { classifyKycStoredValue } from './kycAccess.js';

function vdPresent(doc, key) {
  const v = doc?.verificationDocuments?.[key];
  return v != null && v !== '';
}

function legacyKycDetected(doc) {
  const vd = doc?.verificationDocuments;
  if (!vd) return false;
  for (const k of ['cni1', 'cni2', 'selfie']) {
    if (classifyKycStoredValue(vd[k]) === 'legacy_http_url') return true;
  }
  return false;
}

export function presentFreelancePendingListItem(doc) {
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  const u = plain.utilisateur;

  return {
    _id: plain._id,
    identite: {
      nom: u?.nom ?? '',
      prenom: u?.prenom ?? '',
      telephone: u?.telephone,
    },
    name: plain.name,
    job: plain.job,
    category: plain.category,
    location: plain.location,
    hourlyRate: plain.hourlyRate,
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
      cniRectoPresent: vdPresent(plain, 'cni1'),
      cniVersoPresent: vdPresent(plain, 'cni2'),
      selfiePresent: vdPresent(plain, 'selfie'),
      profilePhotoPresent: Boolean(plain.imagePath),
      legacyDocumentDetected: legacyKycDetected(plain),
    },
  };
}

export function assertFreelancePendingListHasNoDocumentLeak(jsonValue) {
  const blob = JSON.stringify(jsonValue);
  const forbidden = [/res\.cloudinary\.com/i, /cld:auth:/i, /secure_url/i, /public_id/i];
  for (const re of forbidden) {
    if (re.test(blob)) throw new Error(`Fuite détectée (${re})`);
  }
}
