/**
 * R3-02 — Panneau d’actions de modération (détail admin).
 */
import React, { useMemo, useRef, useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputTextarea } from 'primereact/inputtextarea';
import { MultiSelect } from 'primereact/multiselect';
import { Box, Typography, Button, Stack } from '@mui/material';
import { alpha } from '@mui/material/styles';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import ReplayIcon from '@mui/icons-material/Replay';
import BlockIcon from '@mui/icons-material/Block';
import RefreshIcon from '@mui/icons-material/Refresh';
import { colors } from '../tokens/colors';
import { AdminConfirmDialog } from './admin/AdminConfirmDialog';
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
  onRefreshRequired: (patch?: {
    id?: string;
    revision?: number;
    reviewStatus?: string;
    publicationStatus?: string;
  }) => Promise<void>;
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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [confirmSeverity, setConfirmSeverity] = useState<'info' | 'warning' | 'danger'>('warning');

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
    const controller = new AbortController();
    try {
      const outcome = await postModerationAction(
        detail.id,
        action,
        {
          operationMutationId: mutationId,
          expectedRevision: detail.revision,
          ...bodyExtra,
        },
        controller.signal,
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
          await onRefreshRequired('data' in outcome ? outcome.data : undefined);
        } catch {
          onToast(
            'warn',
            'Actualisation',
            'Action enregistrée. Cliquez sur Actualiser pour voir le nouveau statut.',
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

  const confirmThen = (messageText: string, action: () => void, severity: 'info' | 'warning' | 'danger' = 'warning') => {
    setConfirmMessage(messageText);
    setConfirmAction(() => action);
    setConfirmSeverity(severity);
    setConfirmOpen(true);
  };

  const locked = disabled || busy;

  const btnSx = { height: 36, textTransform: 'none' as const, fontWeight: 600 };

  return (
    <Box mt={2}>
      <AdminConfirmDialog
        open={confirmOpen}
        title="Confirmation"
        message={confirmMessage}
        severity={confirmSeverity}
        loading={busy}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          confirmAction?.();
        }}
      />
      <Typography variant="subtitle2" fontWeight={600} color={colors.textPrimary} gutterBottom>
        Actions de modération
      </Typography>
      <Typography variant="caption" display="block" mb={1.5} color={colors.textMuted}>
        Révision courante : {detail.revision}
      </Typography>
      <Stack direction="row" flexWrap="wrap" gap={1}>
        {actions.includes('requestCorrection') && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<EditIcon />}
            disabled={locked}
            sx={{ ...btnSx, borderColor: colors.border, color: colors.textSecondary, '&:hover': { borderColor: colors.primary, color: colors.primary } }}
            onClick={() => {
              setReasonCode('PHOTO_UNCLEAR');
              setMessage('');
              setFields([]);
              setCorrectionOpen(true);
            }}
          >
            Demander une correction
          </Button>
        )}
        {actions.includes('reject') && (
          <Button
            variant="outlined"
            size="small"
            color="error"
            startIcon={<CloseIcon />}
            disabled={locked}
            sx={btnSx}
            onClick={() => {
              setReasonCode('OUT_OF_SCOPE');
              setMessage('');
              setRejectOpen(true);
            }}
          >
            Rejeter
          </Button>
        )}
        {actions.includes('approve') && (
          <Button
            variant="contained"
            size="small"
            startIcon={<CheckIcon />}
            disabled={locked}
            sx={{ ...btnSx, bgcolor: colors.primary, '&:hover': { bgcolor: colors.primary700 } }}
            onClick={() =>
              confirmThen(
                'L’approbation déclenche la publication. Le statut « publié » n’apparaîtra qu’après réponse du serveur.',
                () => void runAction('approve', { reasonCode: 'OTHER' }),
                'info',
              )
            }
          >
            Approuver et publier
          </Button>
        )}
        {actions.includes('publish') && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<ReplayIcon />}
            disabled={locked}
            sx={{ ...btnSx, borderColor: alpha(colors.primary, 0.4), color: colors.primary }}
            onClick={() =>
              confirmThen(
                'Relancer la publication pour ce dossier approuvé ?',
                () => void runAction('publish'),
              )
            }
          >
            Reprendre la publication
          </Button>
        )}
        {actions.includes('suspend') && (
          <Button
            variant="contained"
            size="small"
            color="warning"
            startIcon={<BlockIcon />}
            disabled={locked}
            sx={btnSx}
            onClick={() =>
              confirmThen(
                'Le profil deviendra invisible publiquement. Confirmer la suspension ?',
                () =>
                  void runAction('suspend', {
                    reasonCode: 'POLICY_VIOLATION',
                  }),
                'warning',
              )
            }
          >
            Suspendre
          </Button>
        )}
        {actions.includes('reactivate') && (
          <Button
            variant="contained"
            size="small"
            startIcon={<RefreshIcon />}
            disabled={locked}
            sx={{ ...btnSx, bgcolor: colors.emerald, '&:hover': { bgcolor: colors.primary700 } }}
            onClick={() =>
              confirmThen(
                'Le profil reste masqué jusqu’à la republication complète. Confirmer ?',
                () =>
                  void runAction('reactivate', {
                    reasonCode: 'ISSUE_RESOLVED',
                  }),
              )
            }
          >
            Réactiver
          </Button>
        )}
        {actions.length === 0 && (
          <Typography variant="body2" color={colors.textSecondary}>
            Aucune action disponible pour cet état.
          </Typography>
        )}
      </Stack>

      <Dialog
        header="Demande de correction"
        visible={correctionOpen}
        style={{ width: 'min(520px, 95vw)' }}
        onHide={() => setCorrectionOpen(false)}
        footer={
          <Stack direction="row" justifyContent="flex-end" gap={1} px={1} py={1}>
            <Button color="inherit" onClick={() => setCorrectionOpen(false)} disabled={busy}>
              Annuler
            </Button>
            <Button
              variant="contained"
              disabled={
                busy ||
                !reasonCode ||
                fields.length === 0 ||
                fields.length > MAX_CORRECTION_FIELDS ||
                message.length > MAX_CORRECTION_MESSAGE_LEN
              }
              sx={{ bgcolor: colors.primary, '&:hover': { bgcolor: colors.primary700 } }}
              onClick={() => {
                setCorrectionOpen(false);
                void runAction('requestCorrection', {
                  reasonCode,
                  message: message.trim() || undefined,
                  fields,
                });
              }}
            >
              Envoyer
            </Button>
          </Stack>
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
          <Stack direction="row" justifyContent="flex-end" gap={1} px={1} py={1}>
            <Button color="inherit" onClick={() => setRejectOpen(false)} disabled={busy}>
              Annuler
            </Button>
            <Button
              variant="contained"
              color="error"
              disabled={busy || !reasonCode}
              onClick={() => {
                setRejectOpen(false);
                void runAction('reject', {
                  reasonCode,
                  message: message.trim() || undefined,
                });
              }}
            >
              Confirmer le rejet
            </Button>
          </Stack>
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
