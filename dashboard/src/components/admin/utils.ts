/**
 * Formate une date de manière robuste pour les tableaux admin.
 * - date valide → format localisé FR
 * - date absente ou invalide → chaîne de remplacement
 */
export function safeDate(
  value: string | null | undefined,
  fallback = 'Date indisponible',
): string {
  if (!value) return fallback;
  const d = new Date(value);
  if (isNaN(d.getTime())) return fallback;
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Formate un prix en FCFA.
 * - 0 ou absent → « Sur devis »
 */
export function formatPrice(value: number | null | undefined): string {
  if (!value || value === 0) return 'Sur devis';
  return `${value.toLocaleString('fr-FR')} FCFA`;
}

/**
 * Retourne le statut KYC global à partir des champs de documents.
 */
export function kycStatus(
  cni1?: string | boolean | null,
  cni2?: string | boolean | null,
  selfie?: string | boolean | null,
): 'Complets' | 'Incomplets' | 'À vérifier' {
  const present = (v: string | boolean | null | undefined) =>
    v === true || (typeof v === 'string' && v.trim().length > 0);
  const count = [cni1, cni2, selfie].filter(present).length;
  if (count === 3) return 'Complets';
  if (count === 0) return 'Incomplets';
  return 'À vérifier';
}

/**
 * Masque un numéro de téléphone pour l'affichage en liste.
 * Ex: +2250700001234 → +225 07 •••• 1234
 */
export function maskPhone(phone: string | undefined | null): string {
  if (!phone) return '—';
  if (phone.length <= 6) return phone;
  const last4 = phone.slice(-4);
  const prefix = phone.slice(0, Math.min(6, phone.length - 4));
  return `${prefix} •••• ${last4}`;
}
