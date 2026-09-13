/**
 * R1-01 — Modèle FieldRecensement (Phase 1B).
 * Vocabulaire métier unique : `business` (jamais `details`).
 * Aucune route / contrôleur n’importe encore ce modèle dans cette phase.
 */
import mongoose from 'mongoose';
import { CLD_AUTH_PREFIX } from '../utils/kycAccess.js';

export const FIELD_RECENSEMENT_SCHEMA_VERSION = 1;
export const DECISION_HISTORY_MAX = 50;
export const ATTEMPT_LOG_MAX = 20;

export const PROFESSIONAL_TYPES = Object.freeze(['prestataire', 'freelance', 'vendeur']);
export const REVIEW_STATUSES = Object.freeze([
  'pending_review',
  'needs_correction',
  'approved',
  'rejected',
  'suspended',
]);
export const PUBLICATION_STATUSES = Object.freeze([
  'not_started',
  'linking_user',
  'creating_profile',
  'linking_profile',
  'preparing_media',
  'preparing',
  'ready',
  'published',
  'failed',
  'suspended',
]);
export const KYC_STATUSES = Object.freeze([
  'none',
  'requested',
  'submitted',
  'verified',
  'rejected',
]);
export const INGESTION_STATUSES = Object.freeze([
  'reserved',
  'media_uploading',
  'completed',
  'failed',
]);

function assertCldAuthRef(value) {
  if (value == null || value === '') return true;
  if (typeof value !== 'string') return false;
  if (/^https?:\/\//i.test(value)) return false;
  if (value.includes('res.cloudinary.com')) return false;
  if (value.includes('signature') && value.includes('http')) return false;
  return value.startsWith(CLD_AUTH_PREFIX);
}

const cldAuthValidator = {
  validator: assertCldAuthRef,
  message: 'Référence média/KYC invalide : uniquement cld:auth: (pas d’URL publique/signée).',
};

function rejectTempEmail(email) {
  if (email == null || email === '') return true;
  if (typeof email !== 'string') return false;
  const lower = email.trim().toLowerCase();
  if (lower.endsWith('@temp.com')) return false;
  return true;
}

function rejectPasswordKeys(obj) {
  if (!obj || typeof obj !== 'object') return true;
  const banned = ['password', 'motDePasse', 'mot_de_passe', 'secret'];
  return !banned.some((k) => Object.prototype.hasOwnProperty.call(obj, k));
}

const operationHashSchema = new mongoose.Schema(
  {
    operationMutationId: { type: String, required: true },
    requestHash: { type: String, required: true },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const personSchema = new mongoose.Schema(
  {
    nom: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    prenoms: { type: String, trim: true, maxlength: 80 },
    telephone: { type: String, required: true, trim: true },
    whatsapp: { type: String, trim: true },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: undefined,
      validate: {
        validator: rejectTempEmail,
        message: 'email @temp.com interdit',
      },
    },
  },
  { _id: false, strict: 'throw' },
);

/** Champs business autorisés pour les 3 types (validation métier fine = API). */
const businessSchema = new mongoose.Schema(
  {
    // Prestataire
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
    /** Dérivé serveur depuis Service.categorie — jamais fourni par le client. */
    derivedCategorieId: { type: mongoose.Schema.Types.ObjectId, ref: 'Categorie' },
    description: { type: String, maxlength: 2000 },
    tarifDeclareMin: { type: Number },
    tarifDeclareMax: { type: Number },
    devise: { type: String, maxlength: 8 },
    horairesTexte: { type: String, maxlength: 200 },
    disponibilite: { type: String, maxlength: 40 },
    // Freelance
    displayName: { type: String, maxlength: 120 },
    jobTitle: { type: String, maxlength: 120 },
    /** Identifiant stable Categorie (groupe Freelance). */
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Categorie' },
    /** Libellé dérivé serveur depuis Categorie.nomcategorie. */
    categoryLabel: { type: String, maxlength: 120 },
    skills: [{ type: String, maxlength: 80 }],
    hourlyRate: { type: Number },
    bio: { type: String, maxlength: 2000 },
    // Vendeur
    shopName: { type: String, maxlength: 120 },
    shopDescription: { type: String, maxlength: 2000 },
    businessType: { type: String, maxlength: 80 },
    businessCategoryIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Categorie' }],
    /** Labels libres bornés — aucune collection productTypeIds aujourd’hui. */
    productTypeLabels: [{ type: String, maxlength: 80 }],
  },
  { _id: false, strict: 'throw' },
);

const locationSchema = new mongoose.Schema(
  {
    adresse: { type: String, maxlength: 300 },
    commune: { type: String, maxlength: 120 },
    quartier: { type: String, maxlength: 120 },
    zonesIntervention: [{ type: String, maxlength: 120 }],
    latitude: { type: Number, min: -90, max: 90 },
    longitude: { type: Number, min: -180, max: 180 },
    accuracyMeters: { type: Number, min: 0 },
  },
  { _id: false, strict: 'throw' },
);

const profilePhotoSchema = new mongoose.Schema(
  {
    ref: { type: String, validate: cldAuthValidator, select: false },
    publicId: { type: String, select: false },
    kind: {
      type: String,
      enum: ['profile_pending_private', 'profile_public'],
      default: 'profile_pending_private',
    },
    status: { type: String, maxlength: 32 },
    sha256: { type: String, select: false },
    promotedPublicUrl: { type: String, select: false },
    /** R1-08B — révocation du dérivé public (l’authenticated reste). */
    publicRevocationStatus: {
      type: String,
      enum: ['none', 'requested', 'revoked', 'failed'],
      default: 'none',
      select: false,
    },
  },
  { _id: false },
);

const mediaSchema = new mongoose.Schema(
  {
    profilePhoto: { type: profilePhotoSchema, default: undefined },
  },
  { _id: false },
);

const kycDocSchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      enum: ['cni_recto', 'cni_verso', 'selfie', 'business_license', 'tax_document', 'other'],
      required: true,
    },
    ref: {
      type: String,
      required: true,
      validate: cldAuthValidator,
      select: false,
    },
    sha256: { type: String, select: false },
    collectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur' },
    collectedAt: { type: Date },
  },
  { timestamps: false },
);

const kycSchema = new mongoose.Schema(
  {
    status: { type: String, enum: KYC_STATUSES, default: 'none' },
    documents: { type: [kycDocSchema], default: [] },
  },
  { _id: false },
);

const consentSchema = new mongoose.Schema(
  {
    recensementAccepted: { type: Boolean, required: true },
    acceptedAt: { type: Date },
    textVersion: { type: String, required: true, maxlength: 64 },
    method: { type: String, maxlength: 40 },
    language: { type: String, maxlength: 16 },
    confirmedByAgent: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur' },
  },
  { _id: false, strict: 'throw' },
);

const appSchema = new mongoose.Schema(
  {
    version: { type: String, required: true, maxlength: 32 },
    buildNumber: { type: Number, required: true },
    installationId: { type: String, maxlength: 80 },
  },
  { _id: false, strict: 'throw' },
);

const timingSchema = new mongoose.Schema(
  {
    recordedAt: { type: Date, required: true },
    serverReceivedAt: { type: Date, default: () => new Date() },
    deviceTimezone: { type: String, maxlength: 64 },
    clockSkewDetected: { type: Boolean, default: false },
  },
  { _id: false },
);

const linkedProfileSchema = new mongoose.Schema(
  {
    type: { type: String, enum: PROFESSIONAL_TYPES },
    id: { type: mongoose.Schema.Types.ObjectId },
  },
  { _id: false },
);

const internalMatchSchema = new mongoose.Schema(
  {
    utilisateurId: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur' },
    confidence: { type: Number },
    at: { type: Date },
  },
  { _id: false },
);

const correctionSchema = new mongoose.Schema(
  {
    reasonCode: { type: String, maxlength: 64 },
    message: { type: String, maxlength: 1000 },
    fields: [{ type: String }],
    requestedAt: { type: Date },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur' },
    /** Chemins effectivement patchés (R1-07). */
    addressedFields: { type: [String], default: [] },
    resolvedAt: { type: Date },
    resolvedRevision: { type: Number },
  },
  { _id: false },
);

const decisionEntrySchema = new mongoose.Schema(
  {
    action: { type: String, maxlength: 64 },
    actorId: { type: mongoose.Schema.Types.ObjectId },
    at: { type: Date, default: Date.now },
    note: { type: String, maxlength: 500 },
  },
  { _id: false },
);

const attemptEntrySchema = new mongoose.Schema(
  {
    operationMutationId: { type: String },
    outcome: { type: String, maxlength: 64 },
    at: { type: Date, default: Date.now },
    errorCode: { type: String, maxlength: 64 },
  },
  { _id: false },
);

const fieldRecensementSchema = new mongoose.Schema(
  {
    schemaVersion: {
      type: Number,
      default: FIELD_RECENSEMENT_SCHEMA_VERSION,
      min: 1,
    },
    clientMutationId: { type: String, required: true, trim: true },
    requestHash: { type: String, select: false },
    /** Hash du contenu courant (corrections) — distinct de requestHash initial. */
    currentContentHash: { type: String, select: false },
    revision: { type: Number, default: 1, min: 1 },
    lastOperationMutationId: { type: String, select: false },
    operationHashes: { type: [operationHashSchema], default: [], select: false },

    recenseur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Utilisateur',
      required: true,
    },
    professionalType: {
      type: String,
      enum: PROFESSIONAL_TYPES,
      required: true,
    },
    reviewStatus: {
      type: String,
      enum: REVIEW_STATUSES,
      default: 'pending_review',
    },
    publicationStatus: {
      type: String,
      enum: PUBLICATION_STATUSES,
      default: 'not_started',
    },
    /** Fencing multi-worker : incrémenté à chaque suspension (invalide seal published). */
    publicationFenceEpoch: {
      type: Number,
      default: 0,
      min: 0,
      select: false,
    },
    /** Verrou multi-instance publication (R1-09). */
    publicationLock: {
      type: new mongoose.Schema(
        {
          ownerId: { type: String },
          attemptId: { type: String },
          acquiredAt: { type: Date },
          expiresAt: { type: Date },
          attempts: { type: Number, default: 0 },
        },
        { _id: false },
      ),
      default: undefined,
      select: false,
    },
    /** Lien durable utilisateur pendant publish (interne). */
    publicationLinkedUtilisateurId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Utilisateur',
      default: null,
      select: false,
    },
    publicationError: {
      type: new mongoose.Schema(
        {
          step: { type: String, maxlength: 64 },
          code: { type: String, maxlength: 64 },
          at: { type: Date },
          attempts: { type: Number },
          retryable: { type: Boolean },
        },
        { _id: false },
      ),
      default: undefined,
      select: false,
    },
    ingestionStatus: {
      type: String,
      enum: INGESTION_STATUSES,
      default: 'reserved',
    },
    ingestionErrorCode: { type: String, select: false },

    person: { type: personSchema, required: true },
    business: { type: businessSchema, required: true },
    location: { type: locationSchema },
    media: { type: mediaSchema, default: () => ({}) },
    kyc: { type: kycSchema, default: () => ({ status: 'none', documents: [] }) },
    consent: { type: consentSchema, required: true },
    app: { type: appSchema, required: true },
    timing: { type: timingSchema, required: true },
    metadata: {
      type: new mongoose.Schema(
        { notes: { type: String, maxlength: 2000 } },
        { _id: false, strict: 'throw' },
      ),
      default: () => ({}),
    },
    correction: { type: correctionSchema },

    matchedUtilisateurId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Utilisateur',
      default: null,
      select: false,
    },
    internalMatch: { type: internalMatchSchema, select: false },
    linkedProfile: { type: linkedProfileSchema, default: null, select: false },

    decisionHistory: {
      type: [decisionEntrySchema],
      default: [],
    },
    attemptLogEmbedded: {
      type: [attemptEntrySchema],
      default: [],
      select: false,
    },
  },
  {
    timestamps: true,
    strict: 'throw',
    collection: 'field_recensements',
  },
);

fieldRecensementSchema.index(
  { recenseur: 1, clientMutationId: 1 },
  { unique: true, name: 'uniq_recenseur_clientMutationId' },
);
fieldRecensementSchema.index(
  { recenseur: 1, createdAt: -1, _id: -1 },
  { name: 'idx_recenseur_created_id' },
);
fieldRecensementSchema.index(
  { reviewStatus: 1, professionalType: 1, createdAt: -1 },
  { name: 'idx_review_type_created' },
);
fieldRecensementSchema.index(
  { 'person.telephone': 1, professionalType: 1, reviewStatus: 1 },
  { name: 'idx_phone_type_review' },
);
fieldRecensementSchema.index({ matchedUtilisateurId: 1 }, { name: 'idx_matched_utilisateur' });
fieldRecensementSchema.index({ 'linkedProfile.id': 1 }, { name: 'idx_linked_profile' });
fieldRecensementSchema.index({ publicationStatus: 1 }, { name: 'idx_publication_status' });
/** R3-01 — file admin globale tri createdAt/_id (sans recenseur). */
fieldRecensementSchema.index(
  { createdAt: -1, _id: -1 },
  { name: 'idx_created_id_admin_queue' },
);

/** Plafonne les historiques avant validate — pas de panne permanente. */
fieldRecensementSchema.pre('validate', function (next) {
  if (Array.isArray(this.decisionHistory) && this.decisionHistory.length > DECISION_HISTORY_MAX) {
    this.decisionHistory = this.decisionHistory.slice(-DECISION_HISTORY_MAX);
  }
  if (Array.isArray(this.attemptLogEmbedded) && this.attemptLogEmbedded.length > ATTEMPT_LOG_MAX) {
    this.attemptLogEmbedded = this.attemptLogEmbedded.slice(-ATTEMPT_LOG_MAX);
  }
  if (this.person && !rejectPasswordKeys(this.person)) {
    return next(new Error('person ne doit pas contenir de mot de passe'));
  }
  if (this.get('details') !== undefined) {
    return next(new Error('champ "details" interdit — utiliser "business"'));
  }
  if (this.consent && this.consent.recensementAccepted !== true && this.consent.recensementAccepted !== false) {
    return next(new Error('consent.recensementAccepted requis (true|false)'));
  }
  next();
});

fieldRecensementSchema.pre('save', function (next) {
  if (!this.timing) {
    this.timing = {};
  }
  if (!this.timing.serverReceivedAt) {
    this.timing.serverReceivedAt = new Date();
  }
  if (this.matchedUtilisateurId === undefined) {
    this.matchedUtilisateurId = null;
  }
  if (this.linkedProfile === undefined) {
    this.linkedProfile = null;
  }
  next();
});

const HIDDEN_JSON = new Set([
  'matchedUtilisateurId',
  'internalMatch',
  'linkedProfile',
  'requestHash',
  'currentContentHash',
  'lastOperationMutationId',
  'operationHashes',
  'attemptLogEmbedded',
  'publicationLock',
  'publicationLinkedUtilisateurId',
  'publicationError',
  'publicationFenceEpoch',
]);

fieldRecensementSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    for (const k of HIDDEN_JSON) {
      delete ret[k];
    }
    if (ret.media?.profilePhoto) {
      delete ret.media.profilePhoto.ref;
      delete ret.media.profilePhoto.publicId;
      delete ret.media.profilePhoto.sha256;
      delete ret.media.profilePhoto.promotedPublicUrl;
      ret.media.profilePhoto = {
        present: true,
        kind: ret.media.profilePhoto.kind,
      };
    }
    if (ret.kyc?.documents) {
      ret.kyc.documents = ret.kyc.documents.map((d) => ({
        _id: d._id,
        kind: d.kind,
        present: true,
        collectedAt: d.collectedAt,
      }));
    }
    return ret;
  },
});

fieldRecensementSchema.set('toObject', {
  virtuals: true,
});

const FieldRecensement =
  mongoose.models.FieldRecensement ||
  mongoose.model('FieldRecensement', fieldRecensementSchema);

export default FieldRecensement;
