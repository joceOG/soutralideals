/**
 * R1-15 — Classification des dossiers pour le reconciler.
 * Défaut : unknown_protected (pas de réparation automatique).
 */

export const RECONCILE_CLASS = Object.freeze({
  CONSISTENT: 'consistent',
  TOO_RECENT: 'too_recent',
  ACTIVE_OPERATION: 'active_operation',
  RECOVERABLE_PUBLISH: 'recoverable_publish',
  RECOVERABLE_REACTIVATION: 'recoverable_reactivation',
  RECOVERABLE_SUSPENSION: 'recoverable_suspension',
  RECOVERABLE_AUDIT: 'recoverable_audit',
  RECOVERABLE_MEDIA_REVOCATION: 'recoverable_media_revocation',
  UNSAFE_VISIBLE: 'unsafe_visible',
  MANUAL_REVIEW_REQUIRED: 'manual_review_required',
  MAX_ATTEMPTS_REACHED: 'max_attempts_reached',
  UNKNOWN_PROTECTED: 'unknown_protected',
});

const RECOVERABLE_PUBLICATION_STATUSES = new Set([
  'not_started',
  'linking_user',
  'creating_profile',
  'linking_profile',
  'preparing_media',
  'preparing',
  'ready',
  'failed',
]);

/**
 * @param {{
 *   dossier: object,
 *   profile?: object | null,
 *   now?: Date,
 *   staleAfterMinutes?: number,
 *   maxAttempts?: number,
 * }} args
 */
export function classifyFieldRecensementForReconciliation({
  dossier,
  profile = null,
  now = new Date(),
  staleAfterMinutes = 15,
  maxAttempts = 8,
}) {
  if (!dossier || !dossier._id) {
    return { class: RECONCILE_CLASS.UNKNOWN_PROTECTED, reason: 'NO_DOSSIER' };
  }

  const review = dossier.reviewStatus;
  const pub = dossier.publicationStatus;
  const attempts = Number(dossier.publicationLock?.attempts || dossier.publicationError?.attempts || 0);
  const profilePub = profile?.fieldPublicationStatus;
  const isV1Profile =
    profile &&
    (profile.source === 'field_recensement_v1' ||
      String(profile.sourceFieldRecensementId || '') === String(dossier._id));

  // Legacy profile linked somehow — never mutate
  if (profile && !isV1Profile && profilePub === 'published') {
    return { class: RECONCILE_CLASS.UNKNOWN_PROTECTED, reason: 'LEGACY_PROFILE' };
  }

  const unsafeVisible =
    isV1Profile &&
    profilePub === 'published' &&
    (review !== 'approved' || pub !== 'published');

  if (unsafeVisible) {
    return {
      class: RECONCILE_CLASS.UNSAFE_VISIBLE,
      reason: `UNSAFE_${review}_${pub}`,
      priority: 0,
    };
  }

  // LinkedProfile type mismatch
  if (
    dossier.linkedProfile?.type &&
    dossier.professionalType &&
    dossier.linkedProfile.type !== dossier.professionalType
  ) {
    return {
      class: RECONCILE_CLASS.MANUAL_REVIEW_REQUIRED,
      reason: 'LINKED_PROFILE_TYPE_MISMATCH',
    };
  }

  // Consistent published
  if (
    review === 'approved' &&
    pub === 'published' &&
    dossier.linkedProfile?.id &&
    isV1Profile &&
    profilePub === 'published'
  ) {
    return { class: RECONCILE_CLASS.CONSISTENT, reason: 'PUBLISHED_OK' };
  }

  // Dossier published, profile ready → recoverable seal
  if (
    review === 'approved' &&
    pub === 'published' &&
    isV1Profile &&
    profilePub === 'ready'
  ) {
    return classifyStaleOrActive(dossier, now, staleAfterMinutes, attempts, maxAttempts, {
      class: RECONCILE_CLASS.RECOVERABLE_PUBLISH,
      reason: 'SEAL_PENDING',
    });
  }

  // Suspended dossier, profile still needs hide (already covered by unsafe if published)
  if (review === 'suspended' && pub === 'suspended') {
    if (
      isV1Profile &&
      profilePub &&
      profilePub !== 'suspended' &&
      profilePub !== 'unpublished'
    ) {
      if (profilePub === 'published') {
        return { class: RECONCILE_CLASS.UNSAFE_VISIBLE, reason: 'SUSPENDED_BUT_PUBLISHED' };
      }
      return {
        class: RECONCILE_CLASS.RECOVERABLE_SUSPENSION,
        reason: 'ALIGN_SUSPENDED_PROFILE',
      };
    }
    if (
      dossier.media?.profilePhoto?.publicRevocationStatus === 'failed' ||
      dossier.media?.profilePhoto?.publicRevocationStatus === 'requested'
    ) {
      return classifyStaleOrActive(dossier, now, staleAfterMinutes, attempts, maxAttempts, {
        class: RECONCILE_CLASS.RECOVERABLE_MEDIA_REVOCATION,
        reason: 'REVOKE_PENDING',
      });
    }
    return { class: RECONCILE_CLASS.CONSISTENT, reason: 'SUSPENDED_OK' };
  }

  // Rejected / correction / pending without published profile → consistent if no V1 published
  if (['rejected', 'needs_correction', 'pending_review'].includes(review)) {
    if (isV1Profile && profilePub === 'published') {
      return { class: RECONCILE_CLASS.UNSAFE_VISIBLE, reason: `UNSAFE_${review}` };
    }
    return { class: RECONCILE_CLASS.CONSISTENT, reason: `${review}_NON_PUBLIC` };
  }

  // Approved incomplete publication
  if (review === 'approved' && RECOVERABLE_PUBLICATION_STATUSES.has(pub)) {
    if (attempts >= maxAttempts) {
      return { class: RECONCILE_CLASS.MAX_ATTEMPTS_REACHED, reason: 'PUBLISH_MAX' };
    }
    // Definitive failure codes
    const errCode = dossier.publicationError?.code;
    if (
      errCode &&
      [
        'RECENSEMENT_PUBLICATION_BLOCKED',
        'RECENSEMENT_MATCH_REVIEW_REQUIRED',
        'RECENSEMENT_DUPLICATE_SUSPECTED',
        'RECENSEMENT_REACTIVATION_BLOCKED',
      ].includes(errCode)
    ) {
      return { class: RECONCILE_CLASS.MANUAL_REVIEW_REQUIRED, reason: errCode };
    }
    return classifyStaleOrActive(dossier, now, staleAfterMinutes, attempts, maxAttempts, {
      class: RECONCILE_CLASS.RECOVERABLE_PUBLISH,
      reason: `RESUME_${pub}`,
    });
  }

  // Linked profile missing but published claimed
  if (review === 'approved' && pub === 'published' && !dossier.linkedProfile?.id) {
    return { class: RECONCILE_CLASS.MANUAL_REVIEW_REQUIRED, reason: 'PUBLISHED_WITHOUT_LINK' };
  }

  return { class: RECONCILE_CLASS.UNKNOWN_PROTECTED, reason: 'UNCLASSIFIED' };
}

function classifyStaleOrActive(dossier, now, staleAfterMinutes, attempts, maxAttempts, recoverable) {
  const lockExp = dossier.publicationLock?.expiresAt
    ? new Date(dossier.publicationLock.expiresAt)
    : null;
  if (lockExp && lockExp > now) {
    return { class: RECONCILE_CLASS.ACTIVE_OPERATION, reason: 'PUBLICATION_LOCK' };
  }
  if (attempts >= maxAttempts) {
    return { class: RECONCILE_CLASS.MAX_ATTEMPTS_REACHED, reason: 'ATTEMPTS' };
  }

  const refDate = pickServerTimestamp(dossier);
  const ageMs = now.getTime() - refDate.getTime();
  const staleMs = staleAfterMinutes * 60_000;
  if (ageMs < staleMs) {
    return { class: RECONCILE_CLASS.TOO_RECENT, reason: 'STALE_THRESHOLD' };
  }
  return recoverable;
}

function pickServerTimestamp(dossier) {
  const candidates = [
    dossier.publicationError?.at,
    dossier.publicationLock?.acquiredAt,
    dossier.updatedAt,
    dossier.timing?.serverReceivedAt,
  ].filter(Boolean);
  if (!candidates.length) return new Date(0);
  return new Date(Math.max(...candidates.map((d) => new Date(d).getTime())));
}

export function isAutomaticRepairClass(cls) {
  return [
    RECONCILE_CLASS.UNSAFE_VISIBLE,
    RECONCILE_CLASS.RECOVERABLE_PUBLISH,
    RECONCILE_CLASS.RECOVERABLE_SUSPENSION,
    RECONCILE_CLASS.RECOVERABLE_MEDIA_REVOCATION,
    RECONCILE_CLASS.RECOVERABLE_AUDIT,
    RECONCILE_CLASS.RECOVERABLE_REACTIVATION,
  ].includes(cls);
}

export default {
  classifyFieldRecensementForReconciliation,
  RECONCILE_CLASS,
};
