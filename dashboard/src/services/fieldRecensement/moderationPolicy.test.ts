import {
  canRunModerationAction,
  getVisibleModerationActions,
} from './moderationPolicy';
import { ModerationActionSession } from './moderationSession';
import { mapModerationResponse } from './moderationOutcome';

describe('moderationPolicy', () => {
  it('pending_review → correction, rejet, approbation', () => {
    expect(
      getVisibleModerationActions({
        reviewStatus: 'pending_review',
        publicationStatus: 'not_started',
      }),
    ).toEqual(['requestCorrection', 'reject', 'approve']);
  });

  it('needs_correction → rejet seulement', () => {
    expect(
      getVisibleModerationActions({
        reviewStatus: 'needs_correction',
        publicationStatus: 'not_started',
      }),
    ).toEqual(['reject']);
  });

  it('approved non publié → publish', () => {
    expect(
      getVisibleModerationActions({
        reviewStatus: 'approved',
        publicationStatus: 'failed',
      }),
    ).toEqual(['publish']);
  });

  it('published → suspend', () => {
    expect(
      getVisibleModerationActions({
        reviewStatus: 'approved',
        publicationStatus: 'published',
      }),
    ).toEqual(['suspend']);
  });

  it('suspended → reactivate', () => {
    expect(
      getVisibleModerationActions({
        reviewStatus: 'suspended',
        publicationStatus: 'suspended',
      }),
    ).toEqual(['reactivate']);
  });

  it('rejected → aucune action', () => {
    expect(
      getVisibleModerationActions({
        reviewStatus: 'rejected',
        publicationStatus: 'not_started',
      }),
    ).toEqual([]);
  });

  it('refuse action hors matrice', () => {
    expect(
      canRunModerationAction(
        { reviewStatus: 'rejected', publicationStatus: 'not_started' },
        'approve',
      ),
    ).toBe(false);
  });
});

describe('ModerationActionSession', () => {
  it('conserve le même UUID pendant un retry ambigu', () => {
    const s = new ModerationActionSession();
    const ids: string[] = [];
    const createId = () => {
      const id = `id-${ids.length + 1}`;
      ids.push(id);
      return id;
    };
    const first = s.begin('doc1', 'approve', createId);
    s.end('ambiguous_retry');
    const second = s.begin('doc1', 'approve', createId);
    expect(second).toBe(first);
    expect(ids).toHaveLength(1);
  });

  it('bloque le double clic (in-flight)', () => {
    const s = new ModerationActionSession();
    s.begin('doc1', 'reject', () => 'uuid-a');
    expect(() => s.begin('doc1', 'reject', () => 'uuid-b')).toThrow('ACTION_IN_FLIGHT');
  });

  it('nouvel UUID après succès', () => {
    const s = new ModerationActionSession();
    let n = 0;
    const createId = () => `u-${++n}`;
    const a = s.begin('doc1', 'suspend', createId);
    s.end('success');
    const b = s.begin('doc1', 'suspend', createId);
    expect(a).not.toBe(b);
  });

  it('nouvel UUID après conflit de révision', () => {
    const s = new ModerationActionSession();
    let n = 0;
    const createId = () => `u-${++n}`;
    s.begin('doc1', 'approve', createId);
    s.end('conflict_new_decision');
    const next = s.begin('doc1', 'approve', createId);
    expect(next).toBe('u-2');
  });
});

describe('mapModerationResponse', () => {
  it('distingue 200 / 202 / 409 / 503', () => {
    expect(mapModerationResponse(200, { success: true, code: 'RECENSEMENT_PUBLISHED' }).kind).toBe(
      'success',
    );
    expect(
      mapModerationResponse(202, {
        success: true,
        code: 'RECENSEMENT_PUBLICATION_PROCESSING',
      }).kind,
    ).toBe('processing');
    expect(
      mapModerationResponse(200, {
        success: true,
        code: 'RECENSEMENT_ALREADY_APPLIED',
      }).kind,
    ).toBe('already_applied');
    expect(
      mapModerationResponse(409, { code: 'RECENSEMENT_REVISION_CONFLICT' }).kind,
    ).toBe('revision_conflict');
    expect(
      mapModerationResponse(503, {
        code: 'RECENSEMENT_PUBLICATION_TEMPORARY_FAILURE',
        retryable: true,
      }).kind,
    ).toBe('temporary');
    expect(mapModerationResponse(403, { code: 'ADMIN_REQUIRED' }).kind).toBe('forbidden');
  });
});
