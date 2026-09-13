/**
 * R3-02 — Session d’action : UUID stable pendant retries, anti double-clic.
 */
import type { ModerationActionKind } from './moderationConstants';

export type ActionSessionEndReason =
  | 'success'
  | 'already_applied'
  | 'ambiguous_retry'
  | 'conflict_new_decision'
  | 'abort';

export class ModerationActionSession {
  private dossierId: string | null = null;
  private action: ModerationActionKind | null = null;
  private operationMutationId: string | null = null;
  private inFlight = false;

  isBusy(): boolean {
    return this.inFlight;
  }

  getActiveDossierId(): string | null {
    return this.dossierId;
  }

  getOperationMutationId(): string | null {
    return this.operationMutationId;
  }

  /**
   * Démarre ou reprend une action. Conserve le même UUID si retry ambigu.
   */
  begin(
    dossierId: string,
    action: ModerationActionKind,
    createId: () => string = () => crypto.randomUUID(),
  ): string {
    if (this.inFlight) {
      throw new Error('ACTION_IN_FLIGHT');
    }
    const sameSession =
      this.dossierId === dossierId &&
      this.action === action &&
      !!this.operationMutationId;

    if (!sameSession) {
      this.dossierId = dossierId;
      this.action = action;
      this.operationMutationId = createId();
    }
    this.inFlight = true;
    return this.operationMutationId!;
  }

  end(reason: ActionSessionEndReason): void {
    this.inFlight = false;
    if (
      reason === 'success' ||
      reason === 'already_applied' ||
      reason === 'conflict_new_decision' ||
      reason === 'abort'
    ) {
      this.dossierId = null;
      this.action = null;
      this.operationMutationId = null;
    }
    // ambiguous_retry : conserve UUID + dossier/action, inFlight false
  }
}
