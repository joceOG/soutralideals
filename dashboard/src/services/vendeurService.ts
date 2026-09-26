import type { AxiosError } from 'axios';
import { PRESTATAIRE_MAX_FILE_BYTES, documentPresent } from './prestataireService';

export const VENDEUR_MAX_FILE_BYTES = PRESTATAIRE_MAX_FILE_BYTES;

export const VENDEUR_BUSINESS_CATEGORIES = [
  'Mode',
  'Électronique',
  'Beauté',
  'Maison',
  'Informatique',
  'Sports & Loisirs',
  'Santé',
  'Alimentation',
  'Artisanat',
  'Livres',
  'Jouets',
  'Animaux',
  'Automobile',
] as const;

export interface VendeurUtilisateurRef {
  _id: string;
  nom: string;
  prenom: string;
  email?: string;
  telephone?: string;
}

export interface VendeurFormValues {
  utilisateurId: string;
  shopName: string;
  shopDescription: string;
  businessType: string;
  businessCategories: string[];
  businessRegistrationNumber: string;
  businessPhone: string;
  businessEmail: string;
  addressStreet: string;
  addressCity: string;
  addressPostalCode: string;
  addressCountry: string;
  deliveryZones: string[];
  shippingMethods: string[];
  paymentMethods: string[];
  minimumOrderAmount: number;
  returnPolicy: string;
  preferredContactMethod: string;
  socialWhatsapp: string;
  isTopRated: boolean;
  isFeatured: boolean;
  isVerified: boolean;
  accountStatus: string;
  status: string;
  verificationLevel: string;
}

export interface VendeurFormFiles {
  shopLogo: File | null;
  cni1: File | null;
  cni2: File | null;
  selfie: File | null;
  businessLicense: File | null;
  taxDocument: File | null;
}

export interface VendeurExistingMedia {
  shopLogo: boolean;
  cni1: boolean;
  cni2: boolean;
  selfie: boolean;
  businessLicense: boolean;
  taxDocument: boolean;
}

export const VENDEUR_FORM_STEPS = [
  'Propriétaire',
  'Boutique E‑marché',
  'Localisation et activité',
  'Vérification',
  'Confirmation',
] as const;

export function emptyVendeurFormValues(): VendeurFormValues {
  return {
    utilisateurId: '',
    shopName: '',
    shopDescription: '',
    businessType: 'Particulier',
    businessCategories: [],
    businessRegistrationNumber: '',
    businessPhone: '',
    businessEmail: '',
    addressStreet: '',
    addressCity: '',
    addressPostalCode: '',
    addressCountry: "Côte d'Ivoire",
    deliveryZones: [],
    shippingMethods: ['Standard'],
    paymentMethods: ['Mobile Money'],
    minimumOrderAmount: 0,
    returnPolicy: 'Retour accepté sous 14 jours',
    preferredContactMethod: 'Email',
    socialWhatsapp: '',
    isTopRated: false,
    isFeatured: false,
    isVerified: false,
    accountStatus: 'Pending',
    status: 'pending',
    verificationLevel: 'Basic',
  };
}

export function normalizeVendeurForEdit(raw: Record<string, unknown>): {
  values: VendeurFormValues;
  existingMedia: VendeurExistingMedia;
} {
  const u = raw.utilisateur as VendeurUtilisateurRef | undefined;
  const vd = (raw.verificationDocuments || {}) as Record<string, unknown>;
  const addr = (raw.businessAddress || {}) as Record<string, unknown>;
  const social = (raw.socialMedia || {}) as Record<string, unknown>;

  return {
    values: {
      utilisateurId: u?._id ? String(u._id) : '',
      shopName: String(raw.shopName ?? ''),
      shopDescription: String(raw.shopDescription ?? ''),
      businessType: String(raw.businessType ?? 'Particulier'),
      businessCategories: Array.isArray(raw.businessCategories)
        ? (raw.businessCategories as string[])
        : [],
      businessRegistrationNumber: String(raw.businessRegistrationNumber ?? ''),
      businessPhone: String(raw.businessPhone ?? ''),
      businessEmail: String(raw.businessEmail ?? ''),
      addressStreet: String(addr.street ?? ''),
      addressCity: String(addr.city ?? ''),
      addressPostalCode: String(addr.postalCode ?? ''),
      addressCountry: String(addr.country ?? "Côte d'Ivoire"),
      deliveryZones: Array.isArray(raw.deliveryZones) ? (raw.deliveryZones as string[]) : [],
      shippingMethods: Array.isArray(raw.shippingMethods)
        ? (raw.shippingMethods as string[])
        : ['Standard'],
      paymentMethods: Array.isArray(raw.paymentMethods)
        ? (raw.paymentMethods as string[])
        : ['Mobile Money'],
      minimumOrderAmount: Number(raw.minimumOrderAmount) || 0,
      returnPolicy: String(raw.returnPolicy ?? 'Retour accepté sous 14 jours'),
      preferredContactMethod: String(raw.preferredContactMethod ?? 'Email'),
      socialWhatsapp: String(social.whatsapp ?? ''),
      isTopRated: Boolean(raw.isTopRated),
      isFeatured: Boolean(raw.isFeatured),
      isVerified: Boolean(vd.isVerified),
      accountStatus: String(raw.accountStatus ?? 'Pending'),
      status: String(raw.status ?? 'pending'),
      verificationLevel: String(raw.verificationLevel ?? 'Basic'),
    },
    existingMedia: {
      shopLogo: documentPresent(raw.shopLogo),
      cni1: documentPresent(vd.cni1),
      cni2: documentPresent(vd.cni2),
      selfie: documentPresent(vd.selfie),
      businessLicense: documentPresent(vd.businessLicense),
      taxDocument: documentPresent(vd.taxDocument),
    },
  };
}

export function validateVendeurFile(file: File | null): string | null {
  if (!file) return null;
  if (!file.type.startsWith('image/')) return 'Seules les images sont autorisées.';
  if (file.size > VENDEUR_MAX_FILE_BYTES) return 'Fichier trop volumineux (max 10 Mo).';
  return null;
}

export function validateVendeurStep(
  step: number,
  values: VendeurFormValues,
  files: VendeurFormFiles,
): Record<string, string> {
  const err: Record<string, string> = {};
  if (step === 0) {
    if (!values.utilisateurId) err.utilisateurId = 'Sélectionnez un utilisateur.';
  }
  if (step === 1) {
    if (!values.shopName.trim()) err.shopName = 'Nom de boutique requis.';
    if (!values.shopDescription.trim()) err.shopDescription = 'Description requise.';
    if (!values.businessCategories.length) err.businessCategories = 'Au moins une catégorie.';
  }
  if (step === 2) {
    if (!values.addressCity.trim()) err.addressCity = 'Ville / commune requise.';
  }
  if (step === 3) {
    for (const [k, file] of Object.entries(files) as [keyof VendeurFormFiles, File | null][]) {
      const msg = validateVendeurFile(file);
      if (msg) err[k] = msg;
    }
  }
  return err;
}

export function collectVendeurMissing(values: VendeurFormValues): string[] {
  const missing: string[] = [];
  if (!values.utilisateurId) missing.push('Utilisateur');
  if (!values.shopName.trim()) missing.push('Nom boutique');
  if (!values.shopDescription.trim()) missing.push('Description');
  if (!values.businessCategories.length) missing.push('Catégories');
  if (!values.addressCity.trim()) missing.push('Ville');
  return missing;
}

export function buildVendeurFormData(
  values: VendeurFormValues,
  files: VendeurFormFiles,
): FormData {
  const businessAddress = JSON.stringify({
    street: values.addressStreet.trim(),
    city: values.addressCity.trim(),
    postalCode: values.addressPostalCode.trim(),
    country: values.addressCountry.trim(),
  });

  const fd = new FormData();
  const payload: Record<string, string> = {
    shopName: values.shopName.trim(),
    shopDescription: values.shopDescription.trim(),
    businessType: values.businessType,
    businessCategories: JSON.stringify(values.businessCategories),
    businessRegistrationNumber: values.businessRegistrationNumber.trim(),
    businessPhone: values.businessPhone.trim(),
    businessEmail: values.businessEmail.trim(),
    businessAddress,
    deliveryZones: JSON.stringify(
      values.deliveryZones.length ? values.deliveryZones : [values.addressCity.trim()].filter(Boolean),
    ),
    shippingMethods: JSON.stringify(values.shippingMethods),
    paymentMethods: JSON.stringify(values.paymentMethods),
    minimumOrderAmount: String(values.minimumOrderAmount || 0),
    returnPolicy: values.returnPolicy.trim(),
    preferredContactMethod: values.preferredContactMethod,
    socialMedia: JSON.stringify({
      whatsapp: values.socialWhatsapp.trim(),
    }),
    isTopRated: values.isTopRated ? 'true' : 'false',
    isFeatured: values.isFeatured ? 'true' : 'false',
    isVerified: values.isVerified ? 'true' : 'false',
    accountStatus: values.accountStatus,
    status: values.status,
    verificationLevel: values.verificationLevel,
  };

  if (values.utilisateurId) payload.utilisateur = values.utilisateurId;

  for (const [k, v] of Object.entries(payload)) {
    if (v !== undefined && v !== '') fd.append(k, v);
  }

  if (files.shopLogo) fd.append('shopLogo', files.shopLogo);
  if (files.cni1) fd.append('cni1', files.cni1);
  if (files.cni2) fd.append('cni2', files.cni2);
  if (files.selfie) fd.append('selfie', files.selfie);
  if (files.businessLicense) fd.append('businessLicense', files.businessLicense);
  if (files.taxDocument) fd.append('taxDocument', files.taxDocument);

  return fd;
}

export function stripVendeurListRow<T extends { verificationDocuments?: unknown }>(row: T): T {
  const vd = row.verificationDocuments as Record<string, unknown> | undefined;
  return {
    ...row,
    verificationDocuments: vd
      ? {
          isVerified: Boolean(vd.isVerified),
          cni1: documentPresent(vd.cni1),
          cni2: documentPresent(vd.cni2),
          selfie: documentPresent(vd.selfie),
          businessLicense: documentPresent(vd.businessLicense),
          taxDocument: documentPresent(vd.taxDocument),
        }
      : undefined,
  };
}

export function mapVendeurApiError(error: unknown): string {
  const ax = error as AxiosError<{ error?: string }>;
  const status = ax.response?.status;
  const msg = ax.response?.data?.error;
  if (status === 400) return msg || 'Données invalides.';
  if (status === 401) return 'Session expirée.';
  if (status === 403) return 'Action non autorisée.';
  if (status === 404) return msg || 'Ressource introuvable.';
  if (status === 409) return msg || 'Profil vendeur déjà existant.';
  if (status && status >= 500) return 'Erreur serveur.';
  if (ax.code === 'ERR_NETWORK') return 'Réseau indisponible.';
  return msg || 'Enregistrement impossible.';
}
