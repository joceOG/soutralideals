/**
 * R3-01/R3-02 — File admin recensements terrain + actions de modération.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { AxiosError } from 'axios';
import { Link } from 'react-router-dom';
import {
  Box, Typography, Chip, Paper, Stack, TextField, MenuItem, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Skeleton, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Tooltip,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';
import TerrainIcon from '@mui/icons-material/Terrain';
import { colors } from '../tokens/colors';
import { apiClient, clearSession, isApiClientError, isCurrentUserAdmin } from '../services/setupApi';
import FieldRecensementModerationPanel from '../components/FieldRecensementModerationPanel';

type QueueItem = {
  id: string;
  professionalType: string;
  reviewStatus: string;
  publicationStatus: string;
  revision: number;
  displayLabel?: string | null;
  personLabel?: string | null;
  telephoneMasked?: string | null;
  commune?: string | null;
  quartier?: string | null;
  hasPhoto: boolean;
  hasCorrection: boolean;
  publicationFailed?: boolean;
  recenseur?: { id: string };
  createdAt?: string;
  updatedAt?: string;
};

type QueueCounts = {
  total: number;
  pending_review: number;
  needs_correction: number;
  approved_awaiting_publication: number;
  published: number;
  rejected: number;
  suspended: number;
  publication_failed: number;
  attention_required: number;
};

type DetailDto = {
  id: string;
  professionalType: string;
  reviewStatus: string;
  publicationStatus: string;
  revision: number;
  person?: {
    nom?: string;
    prenoms?: string;
    telephone?: string;
    whatsapp?: string | null;
    email?: string | null;
  };
  business?: Record<string, unknown>;
  location?: Record<string, unknown>;
  consent?: Record<string, unknown>;
  profilePhoto?: { present: boolean; status: string };
  correction?: Record<string, unknown>;
  recenseurId?: string;
  createdAt?: string;
  updatedAt?: string;
};

type UiError =
  | { kind: 'none' }
  | { kind: 'network' }
  | { kind: 'auth' }
  | { kind: 'forbidden' }
  | { kind: 'flag' }
  | { kind: 'cursor' }
  | { kind: 'other'; message: string };

const REVIEW_OPTIONS = [
  { label: 'Tous', value: '' },
  { label: 'En revue', value: 'pending_review' },
  { label: 'Correction', value: 'needs_correction' },
  { label: 'Approuvé', value: 'approved' },
  { label: 'Rejeté', value: 'rejected' },
  { label: 'Suspendu', value: 'suspended' },
];

const TYPE_OPTIONS = [
  { label: 'Tous', value: '' },
  { label: 'Prestataire', value: 'prestataire' },
  { label: 'Freelance', value: 'freelance' },
  { label: 'Vendeur', value: 'vendeur' },
];

function mapApiError(err: unknown): UiError {
  if (!isApiClientError(err)) {
    return { kind: 'network' };
  }
  const ax = err as AxiosError<{ code?: string; message?: string }>;
  if (!ax.response) return { kind: 'network' };
  const code = ax.response.data?.code;
  if (ax.response.status === 401 || code === 'AUTH_REQUIRED' || code === 'AUTH_TOKEN_EXPIRED') {
    return { kind: 'auth' };
  }
  if (ax.response.status === 403 || code === 'ADMIN_REQUIRED') {
    return { kind: 'forbidden' };
  }
  if (code === 'FIELD_RECENSEMENT_V1_DISABLED' || ax.response.status === 503) {
    return { kind: 'flag' };
  }
  if (code === 'RECENSEMENT_CURSOR_INVALID') {
    return { kind: 'cursor' };
  }
  return {
    kind: 'other',
    message: 'Impossible de charger la file. Réessayez.',
  };
}

function errorMessage(e: UiError): string {
  switch (e.kind) {
    case 'network':
      return 'Réseau indisponible. Vérifiez votre connexion.';
    case 'auth':
      return 'Session expirée. Veuillez vous reconnecter.';
    case 'forbidden':
      return 'Accès réservé aux administrateurs.';
    case 'flag':
      return 'Le module recensement terrain est temporairement désactivé.';
    case 'cursor':
      return 'Pagination invalide. Réinitialisez les filtres.';
    case 'other':
      return e.message;
    default:
      return '';
  }
}

const TH_SX = {
  color: colors.textSecondary,
  fontWeight: 600,
  fontSize: '0.72rem',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
  backgroundColor: colors.bgWarm,
  borderBottom: `1px solid ${colors.border}`,
  py: 1.5,
  px: 2,
};

const FieldRecensementsTerrain: React.FC = () => {
  const reqSeq = useRef(0);
  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: 'success' | 'error' | 'info' | 'warning' }>({
    open: false,
    msg: '',
    severity: 'info',
  });
  const notify = (msg: string, severity: 'success' | 'error' | 'info' | 'warning' = 'info') =>
    setSnack({ open: true, msg, severity });
  const cancelRef = useRef<AbortController | null>(null);

  const [items, setItems] = useState<QueueItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [counts, setCounts] = useState<QueueCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [uiError, setUiError] = useState<UiError>({ kind: 'none' });

  const [reviewStatus, setReviewStatus] = useState('');
  const [professionalType, setProfessionalType] = useState('');
  const [commune, setCommune] = useState('');
  const [quartier, setQuartier] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<DetailDto | null>(null);
  const [detailError, setDetailError] = useState<UiError>({ kind: 'none' });

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(search.trim()), 350);
    return () => window.clearTimeout(t);
  }, [search]);

  const buildParams = useCallback(
    (cursor?: string | null) => {
      const params: Record<string, string> = { limit: '20' };
      if (reviewStatus) params.reviewStatus = reviewStatus;
      if (professionalType) params.professionalType = professionalType;
      if (commune.trim()) params.commune = commune.trim();
      if (quartier.trim()) params.quartier = quartier.trim();
      if (debouncedQ) params.q = debouncedQ;
      if (dateFrom) params.createdFrom = dateFrom.toISOString();
      if (dateTo) params.createdTo = dateTo.toISOString();
      if (cursor) params.cursor = cursor;
      return params;
    },
    [reviewStatus, professionalType, commune, quartier, debouncedQ, dateFrom, dateTo],
  );

  const loadQueue = useCallback(
    async (mode: 'replace' | 'append') => {
      if (!isCurrentUserAdmin()) {
        setUiError({ kind: 'forbidden' });
        setLoading(false);
        return;
      }

      cancelRef.current?.abort();
      const controller = new AbortController();
      cancelRef.current = controller;
      const seq = ++reqSeq.current;

      if (mode === 'replace') {
        setLoading(true);
        setUiError({ kind: 'none' });
      } else {
        setLoadingMore(true);
      }

      try {
        const cursor = mode === 'append' ? nextCursor : null;
        const [listRes, statsRes] = await Promise.all([
          apiClient.get('/v1/field-recensements/admin/queue', {
            params: buildParams(cursor),
            signal: controller.signal,
          }),
          mode === 'replace'
            ? apiClient.get('/v1/field-recensements/admin/queue/stats', {
              params: buildParams(null),
              signal: controller.signal,
            })
            : Promise.resolve(null),
        ]);

        if (seq !== reqSeq.current) return;

        const data = listRes.data?.data;
        const pageItems: QueueItem[] = data?.items || [];
        setNextCursor(data?.nextCursor || null);
        setItems((prev) => (mode === 'append' ? [...prev, ...pageItems] : pageItems));
        if (statsRes) {
          setCounts(statsRes.data?.data?.counts || null);
        }
        setUiError({ kind: 'none' });
      } catch (err) {
        if (isApiClientError(err) && (err.code === 'ERR_CANCELED' || err.name === 'CanceledError')) return;
        if (seq !== reqSeq.current) return;
        const mapped = mapApiError(err);
        setUiError(mapped);
        if (mapped.kind === 'auth') {
          clearSession();
        }
        notify(errorMessage(mapped), 'error');
      } finally {
        if (seq === reqSeq.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [buildParams, nextCursor],
  );

  useEffect(() => {
    setItems([]);
    setNextCursor(null);
    void loadQueue('replace');
    return () => {
      cancelRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewStatus, professionalType, commune, quartier, debouncedQ, dateFrom, dateTo]);

  const resetFilters = () => {
    setReviewStatus('');
    setProfessionalType('');
    setCommune('');
    setQuartier('');
    setSearch('');
    setDebouncedQ('');
    setDateFrom(null);
    setDateTo(null);
  };

  const openDetail = async (id: string) => {
    setDetailOpen(true);
    setDetail(null);
    setDetailError({ kind: 'none' });
    setDetailLoading(true);
    try {
      const res = await apiClient.get(`/v1/field-recensements/${id}`);
      const payload = res.data?.data as DetailDto;
      if (payload && 'kyc' in (payload as object)) {
        delete (payload as { kyc?: unknown }).kyc;
      }
      setDetail(payload);
    } catch (err) {
      const mapped = mapApiError(err);
      setDetailError(mapped);
      if (mapped.kind === 'auth') clearSession();
    } finally {
      setDetailLoading(false);
    }
  };

  const applyModerationPatch = (patch?: {
    id?: string;
    revision?: number;
    reviewStatus?: string;
    publicationStatus?: string;
  }) => {
    if (!patch) return;
    setDetail((prev) => {
      if (!prev) return prev;
      if (patch.id && patch.id !== prev.id) return prev;
      return {
        ...prev,
        reviewStatus: patch.reviewStatus ?? prev.reviewStatus,
        publicationStatus: patch.publicationStatus ?? prev.publicationStatus,
        revision: typeof patch.revision === 'number' ? patch.revision : prev.revision,
      };
    });
    const targetId = patch.id || detail?.id;
    if (!targetId) return;
    setItems((prev) =>
      prev.map((it) =>
        it.id === targetId
          ? {
            ...it,
            reviewStatus: patch.reviewStatus ?? it.reviewStatus,
            publicationStatus: patch.publicationStatus ?? it.publicationStatus,
            revision: typeof patch.revision === 'number' ? patch.revision : it.revision,
          }
          : it,
      ),
    );
  };

  const refreshAfterModeration = async (patch?: {
    id?: string;
    revision?: number;
    reviewStatus?: string;
    publicationStatus?: string;
  }) => {
    applyModerationPatch(patch);
    const id = patch?.id || detail?.id;
    if (id) {
      try {
        const res = await apiClient.get(`/v1/field-recensements/${id}`);
        const payload = res.data?.data as DetailDto;
        if (payload && 'kyc' in (payload as object)) {
          delete (payload as { kyc?: unknown }).kyc;
        }
        if (payload) {
          setDetail(payload);
          applyModerationPatch({
            id: payload.id,
            reviewStatus: payload.reviewStatus,
            publicationStatus: payload.publicationStatus,
            revision: payload.revision,
          });
        }
      } catch {
        /* la liste ci-dessous reste la source de vérité */
      }
    }
    await loadQueue('replace');
  };

  const publicationLabel = (status: string) => {
    const map: Record<string, string> = {
      not_started: 'Non démarrée',
      ready: 'Prête',
      linking_user: 'Liaison compte',
      creating_profile: 'Création profil',
      linking_profile: 'Liaison profil',
      published: 'Publié',
      failed: 'Échouée',
      suspended: 'Suspendue',
    };
    return map[status] || status;
  };

  const reviewChip = (status: string) => {
    const map: Record<string, { label: string; bg: string; color: string }> = {
      pending_review: { label: 'En revue', bg: alpha(colors.warning, 0.12), color: '#B45309' },
      needs_correction: { label: 'Correction', bg: alpha(colors.info, 0.1), color: colors.info },
      approved: { label: 'Approuvé', bg: alpha(colors.success, 0.1), color: colors.success },
      rejected: { label: 'Rejeté', bg: alpha(colors.error, 0.08), color: colors.error },
      suspended: { label: 'Suspendu', bg: alpha(colors.error, 0.08), color: colors.error },
    };
    const m = map[status] || { label: status, bg: colors.bgWarm, color: colors.textMuted };
    return (
      <Chip
        label={m.label}
        size="small"
        sx={{ fontSize: '0.72rem', fontWeight: 600, bgcolor: m.bg, color: m.color }}
      />
    );
  };

  const statChipSx = (key: string) => {
    if (key === 'Publiés') return { bgcolor: alpha(colors.success, 0.1), color: colors.success, borderColor: alpha(colors.success, 0.25) };
    if (key === 'En revue' || key === 'Attention') return { bgcolor: alpha(colors.warning, 0.1), color: '#B45309', borderColor: alpha(colors.warning, 0.25) };
    if (key === 'Rejetés' || key === 'Suspendus' || key === 'Pub. échouée') return { bgcolor: alpha(colors.error, 0.06), color: colors.error, borderColor: alpha(colors.error, 0.2) };
    if (key === 'Total') return { bgcolor: alpha(colors.forestGreen, 0.08), color: colors.forestGreen, borderColor: alpha(colors.forestGreen, 0.2) };
    return { bgcolor: colors.bgCard, color: colors.textSecondary, borderColor: colors.border };
  };

  const countChips = counts
    ? [
      { label: 'Total', value: counts.total },
      { label: 'En revue', value: counts.pending_review },
      { label: 'Correction', value: counts.needs_correction },
      { label: 'À publier', value: counts.approved_awaiting_publication },
      { label: 'Publiés', value: counts.published },
      { label: 'Rejetés', value: counts.rejected },
      { label: 'Suspendus', value: counts.suspended },
      { label: 'Pub. échouée', value: counts.publication_failed },
      { label: 'Attention', value: counts.attention_required },
    ]
    : [];

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* En-tête — titre unique dans la topbar */}
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={2.5} flexWrap="wrap" gap={2}>
        <Stack direction="row" alignItems="center" gap={1.5}>
          <Box sx={{
            width: 40, height: 40, borderRadius: 2,
            backgroundColor: alpha(colors.forestGreen, 0.1),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <TerrainIcon sx={{ color: colors.forestGreen, fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="body2" fontWeight={500} color={colors.textSecondary}>
              Consultation administrateur (V1) — décisions métier dans une prochaine étape.
            </Typography>
            <Typography variant="caption" color={colors.textMuted}>
              {loading && !counts ? 'Chargement…' : counts ? `${counts.total} dossier${counts.total > 1 ? 's' : ''}` : '—'}
            </Typography>
          </Box>
        </Stack>
        <Chip
          component={Link}
          to="/recensements-pending"
          clickable
          label="Legacy : recensements en attente"
          size="small"
          variant="outlined"
          sx={{ borderColor: colors.border, color: colors.textSecondary }}
        />
      </Stack>

      {/* Compteurs */}
      <Stack direction="row" flexWrap="wrap" gap={1} mb={2.5}>
        {loading && !counts
          ? Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" width={96} height={28} />
          ))
          : countChips.map((c) => {
            const sx = statChipSx(c.label);
            return (
              <Chip
                key={c.label}
                label={`${c.label} : ${c.value}`}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.72rem', fontWeight: 600, ...sx }}
              />
            );
          })}
      </Stack>

      {/* Filtres */}
      <Paper
        elevation={0}
        sx={{ border: `1px solid ${colors.border}`, borderRadius: 2, p: 2, mb: 2.5, backgroundColor: colors.bgCard }}
      >
        <Stack direction="row" flexWrap="wrap" gap={2} alignItems="flex-end">
          <TextField
            select
            size="small"
            label="Statut revue"
            value={reviewStatus}
            onChange={(e) => setReviewStatus(e.target.value)}
            sx={{ minWidth: 150 }}
          >
            {REVIEW_OPTIONS.map((o) => (
              <MenuItem key={o.value || 'all'} value={o.value}>{o.label}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Type"
            value={professionalType}
            onChange={(e) => setProfessionalType(e.target.value)}
            sx={{ minWidth: 140 }}
          >
            {TYPE_OPTIONS.map((o) => (
              <MenuItem key={o.value || 'all'} value={o.value}>{o.label}</MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            label="Commune"
            value={commune}
            onChange={(e) => setCommune(e.target.value)}
            sx={{ minWidth: 140 }}
          />
          <TextField
            size="small"
            label="Quartier"
            value={quartier}
            onChange={(e) => setQuartier(e.target.value)}
            sx={{ minWidth: 140 }}
          />
          <TextField
            size="small"
            label="Recherche"
            placeholder="Nom ou téléphone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 200, flexGrow: 1 }}
          />
          <TextField
            size="small"
            label="Du"
            type="date"
            value={dateFrom ? dateFrom.toISOString().slice(0, 10) : ''}
            onChange={(e) => setDateFrom(e.target.value ? new Date(`${e.target.value}T12:00:00`) : null)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 155 }}
          />
          <TextField
            size="small"
            label="Au"
            type="date"
            value={dateTo ? dateTo.toISOString().slice(0, 10) : ''}
            onChange={(e) => setDateTo(e.target.value ? new Date(`${e.target.value}T12:00:00`) : null)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 155 }}
          />
          <Button
            variant="outlined"
            startIcon={<FilterAltOffIcon />}
            onClick={resetFilters}
            sx={{
              height: 40,
              borderColor: colors.border,
              color: colors.textSecondary,
              '&:hover': { borderColor: colors.primary, color: colors.primary },
            }}
          >
            Réinitialiser
          </Button>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={() => void loadQueue('replace')}
            disabled={loading}
            aria-label="Actualiser la liste"
            sx={{ height: 40, px: 2.5, bgcolor: colors.primary, '&:hover': { bgcolor: colors.primary700 } }}
          >
            Actualiser
          </Button>
        </Stack>
      </Paper>

      {uiError.kind !== 'none' && (
        <Alert severity="error" sx={{ mb: 2 }} role="alert">
          {errorMessage(uiError)}
        </Alert>
      )}

      <Paper elevation={0} sx={{ border: `1px solid ${colors.border}`, borderRadius: 3, overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Personne', 'Type', 'Localisation', 'Recenseur', 'Revue', 'Publication', 'Date', 'Correction', 'Action'].map((h) => (
                  <TableCell key={h} sx={TH_SX}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }).map((__, j) => (
                      <TableCell key={j}><Skeleton variant="text" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 6, color: colors.textMuted }}>
                    Aucun recensement pour ces filtres.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((row) => (
                  <TableRow key={row.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {row.personLabel || row.displayLabel || '—'}
                      </Typography>
                      {row.telephoneMasked ? (
                        <Typography variant="caption" color={colors.textMuted}>{row.telephoneMasked}</Typography>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{row.professionalType}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color={colors.textSecondary}>
                        {[row.commune, row.quartier].filter(Boolean).join(' · ') || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: colors.textMuted }}>
                        {row.recenseur?.id ? `${row.recenseur.id.slice(0, 6)}…` : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>{reviewChip(row.reviewStatus)}</TableCell>
                    <TableCell>
                      <Typography variant="body2">{publicationLabel(row.publicationStatus)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color={colors.textSecondary}>
                        {row.createdAt ? new Date(row.createdAt).toLocaleString('fr-FR') : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={row.hasCorrection ? 'Oui' : 'Non'}
                        size="small"
                        sx={{
                          fontSize: '0.72rem',
                          bgcolor: row.hasCorrection ? alpha(colors.warning, 0.1) : colors.bgWarm,
                          color: row.hasCorrection ? '#B45309' : colors.textMuted,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Voir le dossier">
                        <IconButton
                          size="small"
                          onClick={() => void openDetail(row.id)}
                          aria-label={`Voir le dossier ${row.personLabel || row.id}`}
                          sx={{ color: colors.primary }}
                        >
                          <VisibilityIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Box mt={2}>
        <Button
          variant="outlined"
          disabled={!nextCursor || loadingMore || loading}
          onClick={() => void loadQueue('append')}
          sx={{ borderColor: colors.border, color: colors.textSecondary, '&:hover': { borderColor: colors.primary, color: colors.primary } }}
        >
          {loadingMore ? 'Chargement…' : 'Page suivante'}
        </Button>
      </Box>

      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ borderBottom: `1px solid ${colors.border}`, pb: 1.5 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography fontWeight={700} color={colors.textPrimary}>Détail recensement</Typography>
            <IconButton size="small" onClick={() => setDetailOpen(false)} aria-label="Fermer">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ py: 2 }}>
          {detailLoading && (
            <Stack gap={1}>
              <Skeleton variant="text" />
              <Skeleton variant="text" width="80%" />
              <Skeleton variant="rectangular" height={80} />
            </Stack>
          )}
          {!detailLoading && detailError.kind !== 'none' && (
            <Alert severity="error">{errorMessage(detailError)}</Alert>
          )}
          {!detailLoading && detail && (
            <Stack gap={1.5}>
              <Typography variant="body2"><strong>Type :</strong> {detail.professionalType}</Typography>
              <Typography variant="body2">
                <strong>Revue :</strong> {detail.reviewStatus} — <strong>Publication :</strong>{' '}
                {publicationLabel(detail.publicationStatus)}
              </Typography>
              <Typography variant="body2">
                <strong>Personne :</strong>{' '}
                {[detail.person?.prenoms, detail.person?.nom].filter(Boolean).join(' ')}
                {detail.person?.telephone ? ` · ${detail.person.telephone}` : ''}
              </Typography>
              <Typography variant="body2">
                <strong>Photo :</strong>{' '}
                {detail.profilePhoto?.present
                  ? `présente (${detail.profilePhoto.status})`
                  : 'absente'}
              </Typography>
              {detail.correction ? (
                <Typography variant="body2" component="pre" sx={{ fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>
                  <strong>Correction :</strong> {JSON.stringify(detail.correction)}
                </Typography>
              ) : null}
              <Typography variant="body2"><strong>Recenseur :</strong> {detail.recenseurId || '—'}</Typography>
              {isCurrentUserAdmin() && (
                <Box sx={{ mt: 1, pt: 2, borderTop: `1px solid ${colors.border}` }}>
                  <FieldRecensementModerationPanel
                    detail={{
                      id: detail.id,
                      professionalType: detail.professionalType,
                      reviewStatus: detail.reviewStatus,
                      publicationStatus: detail.publicationStatus,
                      revision: detail.revision,
                    }}
                    onRefreshRequired={refreshAfterModeration}
                    onToast={(severity, summary, detailMsg) => {
                      const sev = severity === 'warn' ? 'warning' : severity === 'error' ? 'error' : severity === 'success' ? 'success' : 'info';
                      notify(`${summary}${detailMsg ? ` — ${detailMsg}` : ''}`, sev);
                    }}
                  />
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.5, borderTop: `1px solid ${colors.border}` }}>
          <Button onClick={() => setDetailOpen(false)} color="inherit">Fermer</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={4500}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack.severity} variant="filled" onClose={() => setSnack((s) => ({ ...s, open: false }))}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default FieldRecensementsTerrain;
