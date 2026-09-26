/**
 * Tokens de couleur — Soutrali Admin 2026
 * Palette officielle Soutrali Deals (non modifiable).
 * Source : SDColors (sdealsmobile/lib/design_system/colors.dart)
 *
 *   forestGreen  #0B5132  — sidebar fond, bordure active
 *   primary      #159447  — actions principales
 *   emerald      #22A85A  — accents, succès
 *   primary500   #1CBF3F  — brand mobile officielle
 *   primary600   #1AA12A  — boutons
 *   primary700   #158622  — hover
 *   primary100   #C8FAD0  — surfaces sélectionnées
 *   greenLight   #DDF4E5  — fond cartes
 *   greenPale    #EEF9F1  — fond zone secondaire
 *   beigeLight   #F3EEE5  — fond attention
 *   beigeAccent  #E8DDC9  — chips, bordures
 *   bgWarm       #F5F6F3  — fond page
 *   border       #E2E7E3  — bordures légères
 *   textPrimary  #17211B
 *   textSecondary #667168
 */
export { alpha } from '@mui/material/styles';

export const colors = {
  // ── Verts Soutrali (identité) ────────────────────────────────────
  forestGreen: '#0B5132',
  primary: '#159447',
  emerald: '#22A85A',
  primary500: '#1CBF3F',
  primary600: '#1AA12A',
  primary700: '#158622',
  primary100: '#C8FAD0',

  // ── Surfaces ──────────────────────────────────────────────────────
  bgWarm: '#F5F6F3',   // fond page général
  bgCard: '#FFFFFF',   // fond cartes
  bgHover: '#F9FAF8',   // hover row
  greenLight: '#DDF4E5',
  greenPale: '#EEF9F1',
  beigeLight: '#F3EEE5',
  beigeAccent: '#E8DDC9',
  border: '#E2E7E3',

  // ── Topbar ────────────────────────────────────────────────────────
  topbarBg: '#FFFFFF',
  topbarBorder: '#E2E7E3',

  // ── Texte ─────────────────────────────────────────────────────────
  textPrimary: '#17211B',
  textSecondary: '#667168',
  textMuted: '#9CA3AF',
  white: '#FFFFFF',

  // ── Sémantique ────────────────────────────────────────────────────
  success: '#22A85A',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // ── Accent KPI (lignes colorées sous les cartes, style captures) ──
  // Utilisées UNIQUEMENT pour les barres d'accent des cartes KPI
  // Respectent la logique métier : vert = positif, ambre = attention
  kpiUsers: '#22A85A',   // vert émeraude
  kpiProviders: '#159447',   // vert principal
  kpiFreelances: '#1AA12A',   // vert primary600
  kpiSellers: '#0B5132',   // vert forêt
  kpiOrders: '#F59E0B',   // ambre — opérationnel
  kpiPending: '#EF4444',   // rouge — action requise
  kpiNotif: '#3B82F6',   // bleu — information

  // ── Neutres ───────────────────────────────────────────────────────
  neutral50: '#F9FAFB',
  neutral100: '#F3F4F6',
  neutral200: '#E5E7EB',
  neutral300: '#D1D5DB',
  neutral400: '#9CA3AF',
  neutral500: '#6B7280',
  neutral600: '#4B5563',
  neutral700: '#374151',
  neutral800: '#1F2937',
  neutral900: '#111827',

  secondary500: '#F97316',
} as const;

export type ColorTokens = typeof colors;
