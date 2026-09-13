/**
 * R3-02 — Politique pure : actions visibles selon reviewStatus / publicationStatus.
 * Alignée sur les états source backend (adminModeration / publish / lifecycle).
 */
import type { ModerationActionKind } from './moderationConstants';

export type ModerationStateInput = {
  reviewStatus: string;
  publicationStatus: string;
};

export function getVisibleModerationActions(
  state: ModerationStateInput,
): ModerationActionKind[] {
  const review = state.reviewStatus;
  const pub = state.publicationStatus;

  if (review === 'rejected') return [];

  if (review === 'pending_review') {
    return ['requestCorrection', 'reject', 'approve'];
  }

  if (review === 'needs_correction') {
    return ['reject'];
  }

  if (review === 'suspended') {
    return ['reactivate'];
  }

  if (review === 'approved') {
    if (pub === 'published') {
      return ['suspend'];
    }
    // non publié, en cours, failed, ready, not_started, etc.
    if (pub === 'suspended') {
      // incohérent côté revue approved + pub suspended → prudence : pas d’action
      return [];
    }
    return ['publish'];
  }

  return [];
}

export function canRunModerationAction(
  state: ModerationStateInput,
  action: ModerationActionKind,
): boolean {
  return getVisibleModerationActions(state).includes(action);
}
