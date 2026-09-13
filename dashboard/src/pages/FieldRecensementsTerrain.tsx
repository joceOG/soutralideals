/**
 * R3-01/R3-02 — File admin recensements terrain + actions de modération.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios, { AxiosError, CancelTokenSource } from 'axios';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Calendar } from 'primereact/calendar';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { Skeleton } from 'primereact/skeleton';
import { Card } from 'primereact/card';
import { Link } from 'react-router-dom';
import { Box, Typography, Chip } from '@mui/material';
import { clearSession, getApiUrl, isCurrentUserAdmin } from '../services/setupApi';
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
  if (!axios.isAxiosError(err)) {
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

const FieldRecensementsTerrain: React.FC = () => {
  const toast = useRef<Toast>(null);
  const reqSeq = useRef(0);
  const cancelRef = useRef<CancelTokenSource | null>(null);

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

  const apiBase = useMemo(() => getApiUrl(), []);

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

      cancelRef.current?.cancel('obsolete');
      const source = axios.CancelToken.source();
      cancelRef.current = source;
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
          axios.get(`${apiBase}/v1/field-recensements/admin/queue`, {
            params: buildParams(cursor),
            cancelToken: source.token,
          }),
          mode === 'replace'
            ? axios.get(`${apiBase}/v1/field-recensements/admin/queue/stats`, {
                params: buildParams(null),
                cancelToken: source.token,
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
        if (axios.isCancel(err)) return;
        if (seq !== reqSeq.current) return;
        const mapped = mapApiError(err);
        setUiError(mapped);
        if (mapped.kind === 'auth') {
          clearSession();
        }
        toast.current?.show({
          severity: 'error',
          summary: 'Erreur',
          detail: errorMessage(mapped),
          life: 4000,
        });
      } finally {
        if (seq === reqSeq.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [apiBase, buildParams, nextCursor],
  );

  useEffect(() => {
    setItems([]);
    setNextCursor(null);
    void loadQueue('replace');
    return () => {
      cancelRef.current?.cancel('unmount');
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
      const res = await axios.get(`${apiBase}/v1/field-recensements/${id}`);
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

  const refreshAfterModeration = async () => {
    if (!detail?.id) {
      await loadQueue('replace');
      return;
    }
    const id = detail.id;
    try {
      const res = await axios.get(`${apiBase}/v1/field-recensements/${id}`);
      const payload = res.data?.data as DetailDto;
      if (payload && 'kyc' in (payload as object)) {
        delete (payload as { kyc?: unknown }).kyc;
      }
      setDetail(payload);
    } catch {
      throw new Error('DETAIL_REFRESH_FAILED');
    }
    await loadQueue('replace');
  };

  const reviewTag = (status: string) => {
    const map: Record<string, { severity: 'success' | 'info' | 'warning' | 'danger' | null; label: string }> = {
      pending_review: { severity: 'warning', label: 'En revue' },
      needs_correction: { severity: 'info', label: 'Correction' },
      approved: { severity: 'success', label: 'Approuvé' },
      rejected: { severity: 'danger', label: 'Rejeté' },
      suspended: { severity: 'danger', label: 'Suspendu' },
    };
    const m = map[status] || { severity: null, label: status };
    return <Tag value={m.label} severity={m.severity} />;
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
    <div className="field-recensements-terrain" style={{ padding: '1.5rem' }}>
      <Toast ref={toast} />
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <div>
          <Typography variant="h5" component="h1">
            Recensements terrain
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Consultation administrateur (V1) — décisions métier dans une prochaine étape.
          </Typography>
        </div>
        <Chip
          component={Link}
          to="/recensements-pending"
          clickable
          label="Legacy : recensements en attente"
          size="small"
          variant="outlined"
        />
      </Box>

      <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
        {loading && !counts
          ? Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} width="6rem" height="2rem" borderRadius="1rem" />
            ))
          : countChips.map((c) => (
              <Chip key={c.label} label={`${c.label} : ${c.value}`} size="small" />
            ))}
      </Box>

      <Card className="mb-3">
        <Box display="flex" flexWrap="wrap" gap={1.5} alignItems="flex-end">
          <div>
            <label htmlFor="fr-review">Statut revue</label>
            <Dropdown
              inputId="fr-review"
              value={reviewStatus}
              options={REVIEW_OPTIONS}
              onChange={(e) => setReviewStatus(e.value)}
              style={{ minWidth: '10rem' }}
            />
          </div>
          <div>
            <label htmlFor="fr-type">Type</label>
            <Dropdown
              inputId="fr-type"
              value={professionalType}
              options={TYPE_OPTIONS}
              onChange={(e) => setProfessionalType(e.value)}
              style={{ minWidth: '10rem' }}
            />
          </div>
          <div>
            <label htmlFor="fr-commune">Commune</label>
            <InputText
              id="fr-commune"
              value={commune}
              onChange={(e) => setCommune(e.target.value)}
              aria-label="Filtrer par commune"
            />
          </div>
          <div>
            <label htmlFor="fr-quartier">Quartier</label>
            <InputText
              id="fr-quartier"
              value={quartier}
              onChange={(e) => setQuartier(e.target.value)}
              aria-label="Filtrer par quartier"
            />
          </div>
          <div>
            <label htmlFor="fr-search">Recherche</label>
            <InputText
              id="fr-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nom ou téléphone"
              aria-label="Recherche nom ou téléphone"
            />
          </div>
          <div>
            <label htmlFor="fr-from">Du</label>
            <Calendar
              inputId="fr-from"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.value as Date | null)}
              showIcon
              dateFormat="dd/mm/yy"
            />
          </div>
          <div>
            <label htmlFor="fr-to">Au</label>
            <Calendar
              inputId="fr-to"
              value={dateTo}
              onChange={(e) => setDateTo(e.value as Date | null)}
              showIcon
              dateFormat="dd/mm/yy"
            />
          </div>
          <Button
            type="button"
            label="Réinitialiser"
            icon="pi pi-filter-slash"
            className="p-button-outlined"
            onClick={resetFilters}
          />
          <Button
            type="button"
            label="Actualiser"
            icon="pi pi-refresh"
            onClick={() => void loadQueue('replace')}
            aria-label="Actualiser la liste"
          />
        </Box>
      </Card>

      {uiError.kind !== 'none' && (
        <Box mb={2} role="alert">
          <Typography color="error">{errorMessage(uiError)}</Typography>
        </Box>
      )}

      {loading ? (
        <Skeleton width="100%" height="16rem" />
      ) : (
        <DataTable
          value={items}
          emptyMessage="Aucun recensement pour ces filtres."
          paginator={false}
          stripedRows
          responsiveLayout="scroll"
          size="small"
        >
          <Column
            header="Personne"
            body={(row: QueueItem) => (
              <span>
                {row.personLabel || row.displayLabel || '—'}
                <br />
                <small>{row.telephoneMasked || ''}</small>
              </span>
            )}
          />
          <Column field="professionalType" header="Type" />
          <Column
            header="Localisation"
            body={(row: QueueItem) =>
              [row.commune, row.quartier].filter(Boolean).join(' · ') || '—'
            }
          />
          <Column
            header="Recenseur"
            body={(row: QueueItem) =>
              row.recenseur?.id ? `${row.recenseur.id.slice(0, 6)}…` : '—'
            }
          />
          <Column
            header="Revue"
            body={(row: QueueItem) => reviewTag(row.reviewStatus)}
          />
          <Column field="publicationStatus" header="Publication" />
          <Column
            header="Date"
            body={(row: QueueItem) =>
              row.createdAt ? new Date(row.createdAt).toLocaleString('fr-FR') : '—'
            }
          />
          <Column
            header="Correction"
            body={(row: QueueItem) => (row.hasCorrection ? 'Oui' : 'Non')}
          />
          <Column
            header="Action"
            body={(row: QueueItem) => (
              <Button
                type="button"
                label="Voir"
                icon="pi pi-eye"
                className="p-button-text"
                onClick={() => void openDetail(row.id)}
                aria-label={`Voir le dossier ${row.personLabel || row.id}`}
              />
            )}
          />
        </DataTable>
      )}

      <Box mt={2} display="flex" gap={1}>
        <Button
          type="button"
          label={loadingMore ? 'Chargement…' : 'Page suivante'}
          disabled={!nextCursor || loadingMore || loading}
          onClick={() => void loadQueue('append')}
        />
      </Box>

      <Dialog
        header="Détail recensement"
        visible={detailOpen}
        style={{ width: 'min(640px, 95vw)' }}
        onHide={() => setDetailOpen(false)}
        dismissableMask
      >
        {detailLoading && <Skeleton width="100%" height="8rem" />}
        {!detailLoading && detailError.kind !== 'none' && (
          <Typography color="error">{errorMessage(detailError)}</Typography>
        )}
        {!detailLoading && detail && (
          <div>
            <p>
              <strong>Type :</strong> {detail.professionalType}
            </p>
            <p>
              <strong>Revue :</strong> {detail.reviewStatus} —{' '}
              <strong>Publication :</strong> {detail.publicationStatus}
            </p>
            <p>
              <strong>Personne :</strong>{' '}
              {[detail.person?.prenoms, detail.person?.nom].filter(Boolean).join(' ')}
              {detail.person?.telephone ? ` · ${detail.person.telephone}` : ''}
            </p>
            <p>
              <strong>Photo :</strong>{' '}
              {detail.profilePhoto?.present
                ? `présente (${detail.profilePhoto.status})`
                : 'absente'}
            </p>
            {detail.correction ? (
              <p>
                <strong>Correction :</strong> {JSON.stringify(detail.correction)}
              </p>
            ) : null}
            <p>
              <strong>Recenseur :</strong> {detail.recenseurId || '—'}
            </p>
            {isCurrentUserAdmin() && (
              <FieldRecensementModerationPanel
                detail={{
                  id: detail.id,
                  professionalType: detail.professionalType,
                  reviewStatus: detail.reviewStatus,
                  publicationStatus: detail.publicationStatus,
                  revision: detail.revision,
                }}
                onRefreshRequired={refreshAfterModeration}
                onToast={(severity, summary, detailMsg) =>
                  toast.current?.show({
                    severity,
                    summary,
                    detail: detailMsg,
                    life: 4500,
                  })
                }
              />
            )}
          </div>
        )}
      </Dialog>
    </div>
  );
};

export default FieldRecensementsTerrain;
