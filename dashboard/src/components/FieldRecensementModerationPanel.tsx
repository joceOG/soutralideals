/**
 * R3-02 — Panneau d’actions de modération (détail admin).
 */
import React, { useMemo, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputTextarea } from 'primereact/inputtextarea';
import { MultiSelect } from 'primereact/multiselect';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Box, Typography } from '@mui/material';
import axios from 'axios';
import {
  ADMIN_REASON_CODES,
  CORRECTION_FIELDS_BY_TYPE,
  MAX_CORRECTION_FIELDS,
  MAX_CORRECTION_MESSAGE_LEN,
  ModerationActionKind,
  REASON_LABELS,
  REJECT_REASON_CODES,
} from '../services/fieldRecensement/moderationConstants';
import { getVisibleModerationActions } from '../services/fieldRecensement/moderationPolicy';
import {
  ModerationApiOutcome,
  postModerationAction,
  userMessageForOutcome,
} from '../services/fieldRecensement/moderationApi';
import { ModerationActionSession } from '../services/fieldRecensement/moderationSession';

export type ModerationDetail = {
  id: string;
  professionalType: string;
  reviewStatus: string;
  publicationStatus: string;
  revision: number;
};

type Props = {
  detail: ModerationDetail;
  disabled?: boolean;
  onRefreshRequired: () => Promise<void>;
  onToast: (severity: 'success' | 'info' | 'warn' | 'error', summary: string, detail: string) => void;
};

function reasonOptions(codes: readonly string[]) {
  return codes.map((c) => ({ label: REASON_LABELS[c] || c, value: c }));
}

export const FieldRecensementModerationPanel: React.FC<Props> = ({
  detail,
  disabled,
  onRefreshRequired,
  onToast,
}) => {
  const sessionRef = useRef(new ModerationActionSession());
  const [busy, setBusy] = useState(false);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reasonCode, setReasonCode] = useState('OTHER');
  const [message, setMessage] = useState('');
  const [fields, setFields] = useState<string[]>([]);

  const actions = useMemo(
    () =>
      getVisibleModerationActions({
        reviewStatus: detail.reviewStatus,
        publicationStatus: detail.publicationStatus,
      }),
    [detail.reviewStatus, detail.publicationStatus],
  );

  const fieldOptions = useMemo(() => {
    const list = CORRECTION_FIELDS_BY_TYPE[detail.professionalType] || [];
    return list.map((f) => ({ label: f, value: f }));
  }, [detail.professionalType]);

  const endSession = (outcome: ModerationApiOutcome) => {
    const session = sessionRef.current;
    if (outcome.kind === 'success' || outcome.kind === 'already_applied' || outcome.kind === 'processing') {
      session.end(outcome.kind === 'already_applied' ? 'already_applied' : 'success');
    } else if (
      outcome.kind === 'temporary' ||
      outcome.kind === 'network'
    ) {
      session.end('ambiguous_retry');
    } else if (
      outcome.kind === 'revision_conflict' ||
      outcome.kind === 'idempotency_reused' ||
      outcome.kind === 'invalid_state'
    ) {
      session.end('conflict_new_decision');
    } else {
      session.end('abort');
    }
  };

  const runAction = async (
    action: ModerationActionKind,
    bodyExtra: { reasonCode?: string; message?: string; fields?: string[] } = {},
  ) => {
    if (disabled || busy || sessionRef.current.isBusy()) return;
    let mutationId: string;
    try {
      mutationId = sessionRef.current.begin(detail.id, action);
    } catch {
      onToast('warn', 'Action', 'Une action est déjà en cours.');
      return;
    }

    setBusy(true);
    const source = axios.CancelToken.source();
    try {
      const outcome = await postModerationAction(
        detail.id,
        action,
        {
          operationMutationId: mutationId,
          expectedRevision: detail.revision,
          ...bodyExtra,
        },
        source.token,
      );

      endSession(outcome);

      if (outcome.kind === 'auth') {
        onToast('error', 'Session', userMessageForOutcome(outcome));
        return;
      }

      const refreshNeeded =
        outcome.kind === 'success' ||
        outcome.kind === 'processing' ||
        outcome.kind === 'already_applied' ||
        outcome.kind === 'revision_conflict' ||
        outcome.kind === 'invalid_state';

      if (
        outcome.kind === 'success' ||
        outcome.kind === 'processing' ||
        outcome.kind === 'already_applied'
      ) {
        onToast(
          outcome.kind === 'processing' ? 'info' : 'success',
          'Modération',
          userMessageForOutcome(outcome),
        );
        try {
          await onRefreshRequired();
        } catch {
          onToast(
            'warn',
            'Actualisation',
            'Action enregistrée. Impossible d’actualiser les données pour le moment.',
          );
        }
      } else {
        onToast('error', 'Modération', userMessageForOutcome(outcome));
        if (refreshNeeded) {
          try {
            await onRefreshRequired();
          } catch {
            /* ignore */
          }
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const confirmThen = (messageText: string, action: () => void) => {
    confirmDialog({
      message: messageText,
      header: 'Confirmation',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Confirmer',
      rejectLabel: 'Annuler',
      accept: action,
    });
  };

  const locked = disabled || busy;

  return (
    <Box mt={2}>
      <ConfirmDialog />
      <Typography variant="subtitle1" gutterBottom>
        Actions de modération
      </Typography>
      <Typography variant="caption" display="block" mb={1}>
        Révision courante : {detail.revision}
      </Typography>
      <Box display="flex" flexWrap="wrap" gap={1}>
        {actions.includes('requestCorrection') && (
          <Button
            type="button"
            label="Demander une correction"
            icon="pi pi-pencil"
            className="p-button-outlined"
            disabled={locked}
            onClick={() => {
              setReasonCode('PHOTO_UNCLEAR');
              setMessage('');
              setFields([]);
              setCorrectionOpen(true);
            }}
          />
        )}
        {actions.includes('reject') && (
          <Button
            type="button"
            label="Rejeter"
            icon="pi pi-times"
            className="p-button-danger p-button-outlined"
            disabled={locked}
            onClick={() => {
              setReasonCode('OUT_OF_SCOPE');
              setMessage('');
              setRejectOpen(true);
            }}
          />
        )}
        {actions.includes('approve') && (
          <Button
            type="button"
            label="Approuver et publier"
            icon="pi pi-check"
            disabled={locked}
            onClick={() =>
              confirmThen(
                'L’approbation déclenche la publication. Le statut « publié » n’apparaîtra qu’après réponse du serveur.',
                () => void runAction('approve', { reasonCode: 'OTHER' }),
              )
            }
          />
        )}
        {actions.includes('publish') && (
          <Button
            type="button"
            label="Reprendre la publication"
            icon="pi pi-replay"
            className="p-button-outlined"
            disabled={locked}
            onClick={() =>
              confirmThen(
                'Relancer la publication pour ce dossier approuvé ?',
                () => void runAction('publish'),
              )
            }
          />
        )}
        {actions.includes('suspend') && (
          <Button
            type="button"
            label="Suspendre"
            icon="pi pi-ban"
            className="p-button-warning"
            disabled={locked}
            onClick={() =>
              confirmThen(
                'Le profil deviendra invisible publiquement. Confirmer la suspension ?',
                () =>
                  void runAction('suspend', {
                    reasonCode: 'POLICY_VIOLATION',
                  }),
              )
            }
          />
        )}
        {actions.includes('reactivate') && (
          <Button
            type="button"
            label="Réactiver"
            icon="pi pi-refresh"
            disabled={locked}
            onClick={() =>
              confirmThen(
                'Le profil reste masqué jusqu’à la republication complète. Confirmer ?',
                () =>
                  void runAction('reactivate', {
                    reasonCode: 'ISSUE_RESOLVED',
                  }),
              )
            }
          />
        )}
        {actions.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            Aucune action disponible pour cet état.
          </Typography>
        )}
      </Box>

      <Dialog
        header="Demande de correction"
        visible={correctionOpen}
        style={{ width: 'min(520px, 95vw)' }}
        onHide={() => setCorrectionOpen(false)}
        footer={
          <div>
            <Button
              type="button"
              label="Annuler"
              className="p-button-text"
              onClick={() => setCorrectionOpen(false)}
              disabled={busy}
            />
            <Button
              type="button"
              label="Envoyer"
              disabled={
                busy ||
                !reasonCode ||
                fields.length === 0 ||
                fields.length > MAX_CORRECTION_FIELDS ||
                message.length > MAX_CORRECTION_MESSAGE_LEN
              }
              onClick={() => {
                setCorrectionOpen(false);
                void runAction('requestCorrection', {
                  reasonCode,
                  message: message.trim() || undefined,
                  fields,
                });
              }}
            />
          </div>
        }
      >
        <label htmlFor="corr-reason">Motif</label>
        <Dropdown
          inputId="corr-reason"
          value={reasonCode}
          options={reasonOptions(ADMIN_REASON_CODES)}
          onChange={(e) => setReasonCode(e.value)}
          className="w-full mb-2"
        />
        <label htmlFor="corr-fields">Champs à corriger</label>
        <MultiSelect
          inputId="corr-fields"
          value={fields}
          options={fieldOptions}
          onChange={(e) => setFields(e.value || [])}
          display="chip"
          className="w-full mb-2"
          placeholder="Sélectionner"
          filter
        />
        <label htmlFor="corr-msg">Message (optionnel)</label>
        <InputTextarea
          id="corr-msg"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className="w-full"
          maxLength={MAX_CORRECTION_MESSAGE_LEN}
        />
        <Typography variant="caption">
          {message.length}/{MAX_CORRECTION_MESSAGE_LEN} — aucun champ KYC.
        </Typography>
      </Dialog>

      <Dialog
        header="Rejeter le dossier"
        visible={rejectOpen}
        style={{ width: 'min(480px, 95vw)' }}
        onHide={() => setRejectOpen(false)}
        footer={
          <div>
            <Button
              type="button"
              label="Annuler"
              className="p-button-text"
              onClick={() => setRejectOpen(false)}
              disabled={busy}
            />
            <Button
              type="button"
              label="Confirmer le rejet"
              className="p-button-danger"
              disabled={busy || !reasonCode}
              onClick={() => {
                setRejectOpen(false);
                void runAction('reject', {
                  reasonCode,
                  message: message.trim() || undefined,
                });
              }}
            />
          </div>
        }
      >
        <Typography variant="body2" mb={1}>
          Le dossier ne sera pas publié.
        </Typography>
        <label htmlFor="rej-reason">Motif</label>
        <Dropdown
          inputId="rej-reason"
          value={reasonCode}
          options={reasonOptions(REJECT_REASON_CODES)}
          onChange={(e) => setReasonCode(e.value)}
          className="w-full mb-2"
        />
        <label htmlFor="rej-msg">Message (optionnel)</label>
        <InputTextarea
          id="rej-msg"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className="w-full"
          maxLength={MAX_CORRECTION_MESSAGE_LEN}
        />
      </Dialog>
    </Box>
  );
};

export default FieldRecensementModerationPanel;
