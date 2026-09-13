/**
 * R3-02 — Constantes alignées sur le backend Field Recensement V1.
 * Source : fieldRecensementAdminReasons.js / AdminModerationService FIELDS_BY_TYPE.
 */

export const ADMIN_REASON_CODES = [
  'PHOTO_UNCLEAR',
  'IDENTITY_INCOMPLETE',
  'PHONE_INVALID',
  'LOCATION_INCOMPLETE',
  'BUSINESS_INCOMPLETE',
  'SERVICE_WRONG',
  'CATEGORY_WRONG',
  'DUPLICATE_SUSPECTED',
  'FRAUD_SUSPECTED',
  'CONSENT_INVALID',
  'DATA_INVALID',
  'OTHER',
] as const;

export const REJECT_REASON_CODES = [
  ...ADMIN_REASON_CODES,
  'OUT_OF_SCOPE',
  'AGENT_ERROR',
] as const;

export const SUSPEND_REASON_CODES = [
  'POLICY_VIOLATION',
  'FRAUD_SUSPECTED',
  'QUALITY_ISSUE',
  'LEGAL_REQUEST',
  'USER_REQUEST',
  'DATA_INVALID',
  'OTHER',
] as const;

export const REACTIVATE_REASON_CODES = [
  'ISSUE_RESOLVED',
  'FALSE_POSITIVE',
  'ADMIN_REVIEW_OK',
  'OTHER',
] as const;

export const MAX_CORRECTION_MESSAGE_LEN = 1000;
export const MAX_CORRECTION_FIELDS = 20;

const COMMON_FIELDS = [
  'person.nom',
  'person.prenoms',
  'person.telephone',
  'person.whatsapp',
  'person.email',
  'location.adresse',
  'location.commune',
  'location.quartier',
  'location.zonesIntervention',
  'location.latitude',
  'location.longitude',
  'location.accuracyMeters',
  'profilePhoto',
  'consent',
] as const;

export const CORRECTION_FIELDS_BY_TYPE: Record<string, readonly string[]> = {
  prestataire: [
    ...COMMON_FIELDS,
    'business.serviceId',
    'business.description',
    'business.tarifDeclareMin',
    'business.tarifDeclareMax',
    'business.horairesTexte',
    'business.devise',
    'business.disponibilite',
  ],
  freelance: [
    ...COMMON_FIELDS,
    'business.displayName',
    'business.jobTitle',
    'business.categoryId',
    'business.skills',
    'business.hourlyRate',
    'business.bio',
    'business.horairesTexte',
  ],
  vendeur: [
    ...COMMON_FIELDS,
    'business.shopName',
    'business.shopDescription',
    'business.businessType',
    'business.businessCategoryIds',
    'business.productTypeLabels',
  ],
};

export type ModerationActionKind =
  | 'requestCorrection'
  | 'reject'
  | 'approve'
  | 'publish'
  | 'suspend'
  | 'reactivate';

export const REASON_LABELS: Record<string, string> = {
  PHOTO_UNCLEAR: 'Photo floue / illisible',
  IDENTITY_INCOMPLETE: 'Identité incomplète',
  PHONE_INVALID: 'Téléphone invalide',
  LOCATION_INCOMPLETE: 'Localisation incomplète',
  BUSINESS_INCOMPLETE: 'Activité incomplète',
  SERVICE_WRONG: 'Service incorrect',
  CATEGORY_WRONG: 'Catégorie incorrecte',
  DUPLICATE_SUSPECTED: 'Doublon suspecté',
  FRAUD_SUSPECTED: 'Fraude suspectée',
  CONSENT_INVALID: 'Consentement invalide',
  DATA_INVALID: 'Données invalides',
  OTHER: 'Autre',
  OUT_OF_SCOPE: 'Hors périmètre',
  AGENT_ERROR: 'Erreur agent',
  POLICY_VIOLATION: 'Violation de politique',
  QUALITY_ISSUE: 'Problème de qualité',
  LEGAL_REQUEST: 'Demande légale',
  USER_REQUEST: 'Demande utilisateur',
  ISSUE_RESOLVED: 'Problème résolu',
  FALSE_POSITIVE: 'Faux positif',
  ADMIN_REVIEW_OK: 'Revue admin OK',
};
