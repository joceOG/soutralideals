import { classifyKycStoredValue } from './kycAccess.js';

function vdPresent(doc, key) {
  const v = doc?.verificationDocuments?.[key];
  return v != null && v !== '';
}

function legacyKycDetected(doc) {
  const vd = doc?.verificationDocuments;
  if (!vd) return false;
  for (const k of ['cni1', 'cni2', 'selfie', 'businessLicense', 'taxDocument']) {
    if (classifyKycStoredValue(vd[k]) === 'legacy_http_url') return true;
  }
  return false;
}

export function presentVendeurPendingListItem(doc) {
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  const u = plain.utilisateur;

  return {
    _id: plain._id,
    identite: {
      nom: u?.nom ?? '',
      prenom: u?.prenom ?? '',
      telephone: u?.telephone,
    },
    boutique: {
      shopName: plain.shopName,
      businessType: plain.businessType,
      businessCategories: Array.isArray(plain.businessCategories)
        ? plain.businessCategories.slice(0, 5)
        : [],
    },
    businessAddress: plain.businessAddress?.city
      ? { city: plain.businessAddress.city }
      : undefined,
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
      businessLicensePresent: vdPresent(plain, 'businessLicense'),
      taxDocumentPresent: vdPresent(plain, 'taxDocument'),
      shopLogoPresent: Boolean(plain.shopLogo),
      legacyDocumentDetected: legacyKycDetected(plain),
    },
  };
}

export function assertVendeurPendingListHasNoDocumentLeak(jsonValue) {
  const blob = JSON.stringify(jsonValue);
  const forbidden = [/res\.cloudinary\.com/i, /cld:auth:/i, /secure_url/i, /public_id/i];
  for (const re of forbidden) {
    if (re.test(blob)) throw new Error(`Fuite détectée (${re})`);
  }
}
