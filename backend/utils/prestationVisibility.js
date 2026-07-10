const SENSITIVE_PRESTATION_FIELDS = [
  'adresse',
  'ville',
  'codePostal',
  'localisation',
  'telephoneUrgence',
  'notesClient',
  'notesPrestataire',
  'referencePaiement',
];

function trimUserPublic(user) {
  if (!user || typeof user !== 'object') return user;
  return {
    _id: user._id,
    nom: user.nom,
    prenom: user.prenom,
    photoProfil: user.photoProfil,
  };
}

/** Masque les données sensibles d'une prestation pour les lecteurs non autorisés. */
export function toPublicPrestation(prestation) {
  const out = prestation?.toObject ? prestation.toObject() : { ...prestation };
  for (const field of SENSITIVE_PRESTATION_FIELDS) {
    delete out[field];
  }
  if (out.utilisateur) out.utilisateur = trimUserPublic(out.utilisateur);
  if (out.prestataire?.utilisateur) {
    out.prestataire = {
      ...out.prestataire,
      utilisateur: trimUserPublic(out.prestataire.utilisateur),
    };
  }
  return out;
}

/** Formate une prestation selon les droits du lecteur. */
export async function formatPrestationResponse(req, prestationDoc, canAccessFn) {
  if (!prestationDoc) return null;
  if (req.utilisateur && (await canAccessFn(req, prestationDoc))) {
    return prestationDoc.toObject ? prestationDoc.toObject() : prestationDoc;
  }
  return toPublicPrestation(prestationDoc);
}
