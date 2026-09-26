import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TablePagination, Tabs, Tab, Chip, Button,
  IconButton, TextField, Skeleton, Divider, CircularProgress, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import BlockIcon from '@mui/icons-material/Block';
import RefreshIcon from '@mui/icons-material/Refresh';
import CoPresentIcon from '@mui/icons-material/CoPresent';
import WorkIcon from '@mui/icons-material/Work';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { apiClient } from '../services/setupApi';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AdminPageHeader, AdminStatusChip, AdminEmptyState, AdminErrorState, AdminConfirmDialog } from '../components/admin';
import { safeDate, formatPrice, maskPhone } from '../components/admin/utils';
import { colors } from '../tokens/colors';
import { alpha } from '@mui/material/styles';

// ─── Types ────────────────────────────────────────────────────────────────────

interface IUtilisateur {
  _id?: string;
  nom: string;
  prenom?: string;
  telephone?: string;
  email?: string;
}

interface IRecenseur {
  _id?: string;
  nom: string;
  prenom?: string;
}

interface IPendingPrestataire {
  _id: string;
  identite?: { nom: string; prenom?: string; telephone?: string };
  utilisateur?: IUtilisateur;
  service?: { _id?: string; nom?: string; nomservice?: string };
  localisation?: string;
  prixprestataire?: number;
  source?: string;
  status?: string;
  recenseur?: IRecenseur;
  dateRecensement?: string;
  createdAt?: string;
  kyc?: {
    cniRectoPresent?: boolean;
    cniVersoPresent?: boolean;
    selfiePresent?: boolean;
    assurancePresent?: boolean;
    legacyDocumentDetected?: boolean;
  };
}

function prestataireDisplayName(row: IPendingPrestataire): string {
  const fromIdentite = `${row.identite?.prenom ?? ''} ${row.identite?.nom ?? ''}`.trim();
  if (fromIdentite) return fromIdentite;
  return `${row.utilisateur?.prenom ?? ''} ${row.utilisateur?.nom ?? ''}`.trim() || '—';
}

function prestatairePhone(row: IPendingPrestataire): string {
  return row.identite?.telephone ?? row.utilisateur?.telephone;
}

function prestataireServiceName(row: IPendingPrestataire): string {
  return row.service?.nom ?? row.service?.nomservice ?? '—';
}

function kycPendingLabel(kyc?: IPendingPrestataire['kyc']): string {
  if (!kyc) return '—';
  const n = [
    kyc.cniRectoPresent,
    kyc.cniVersoPresent,
    kyc.selfiePresent,
  ].filter(Boolean).length;
  if (n === 3) return 'Complets';
  if (n === 0) return 'Aucun';
  return 'Partiels';
}

interface IPendingFreelance {
  _id: string;
  identite?: { nom?: string; prenom?: string; telephone?: string };
  utilisateur?: IUtilisateur;
  name?: string;
  job?: string;
  location?: string;
  hourlyRate?: number;
  kyc?: {
    cniRectoPresent?: boolean;
    cniVersoPresent?: boolean;
    selfiePresent?: boolean;
    legacyDocumentDetected?: boolean;
  };
  source?: string;
  status?: string;
  recenseur?: IRecenseur;
  dateRecensement?: string;
  createdAt?: string;
}

interface IPendingVendeur {
  _id: string;
  identite?: { nom?: string; prenom?: string; telephone?: string };
  boutique?: { shopName?: string; businessType?: string };
  utilisateur?: IUtilisateur;
  shopName?: string;
  businessType?: string;
  source?: string;
  status?: string;
  recenseur?: IRecenseur;
  dateRecensement?: string;
  createdAt?: string;
}

type TabIndex = 0 | 1 | 2;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Date d'un recensement : préférer dateRecensement, puis createdAt */
function recensementDate(row: { dateRecensement?: string; createdAt?: string }): string {
  return safeDate(row.dateRecensement || row.createdAt);
}

function recenseurName(r?: IRecenseur | null): string {
  if (!r) return '—';
  return `${r.prenom ?? ''} ${r.nom ?? ''}`.trim() || '—';
}

const SOURCE_LABELS: Record<string, string> = {
  sdealsidentification: 'Identification',
  web: 'Web',
  sdealsmobile: 'Mobile',
  dashboard: 'Dashboard',
};

// ─── Composant principal ──────────────────────────────────────────────────────

export const RecensementsPending: React.FC = () => {
  const [tabIndex, setTabIndex] = useState<TabIndex>(0);
  const [prestataires, setPrestataires] = useState<IPendingPrestataire[]>([]);
  const [freelances, setFreelances] = useState<IPendingFreelance[]>([]);
  const [vendeurs, setVendeurs] = useState<IPendingVendeur[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination par onglet
  const [pages, setPages] = useState<[number, number, number]>([0, 0, 0]);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Actions en cours
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Dialogue rejet
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<{ type: string; id: string; name: string } | null>(null);
  const [rejectMotif, setRejectMotif] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

  // Dialogue confirm validation
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<{ type: string; id: string; name: string } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  const loadPending = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const ts = Date.now();
      const [pr, fr, ve] = await Promise.all([
        apiClient.get(`/prestataire/pending/list?t=${ts}`, { signal: controller.signal }),
        apiClient.get(`/freelance/pending/list?t=${ts}`, { signal: controller.signal }),
        apiClient.get(`/vendeur/pending/list?t=${ts}`, { signal: controller.signal }),
      ]);

      if (!controller.signal.aborted) {
        setPrestataires(Array.isArray(pr.data) ? pr.data : []);
        setFreelances(Array.isArray(fr.data) ? fr.data : []);
        setVendeurs(Array.isArray(ve.data) ? ve.data : []);
      }
    } catch (err: any) {
      if (err?.code === 'ERR_CANCELED' || controller.signal.aborted) return;
      console.error(err);
      setError('Impossible de charger les recensements en attente.');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPending();
    return () => abortRef.current?.abort();
  }, [loadPending]);

  // ─── Validation ─────────────────────────────────────────────────────────────

  const openConfirmValidate = (type: string, id: string, name: string) => {
    setConfirmTarget({ type, id, name });
    setConfirmOpen(true);
  };

  const doValidate = async () => {
    if (!confirmTarget) return;
    setConfirmLoading(true);
    try {
      await apiClient.put(`/${confirmTarget.type}/${confirmTarget.id}/validate`, {});
      toast.success(`${confirmTarget.name} validé avec succès.`);
      setConfirmOpen(false);
      setConfirmTarget(null);
      await loadPending();
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de la validation.');
    } finally {
      setConfirmLoading(false);
    }
  };

  // ─── Rejet ──────────────────────────────────────────────────────────────────

  const openReject = (type: string, id: string, name: string) => {
    setRejectTarget({ type, id, name });
    setRejectMotif('');
    setRejectOpen(true);
  };

  const doReject = async () => {
    if (!rejectTarget || !rejectMotif.trim()) {
      toast.warn('Un motif de rejet est requis.');
      return;
    }
    setRejectLoading(true);
    try {
      await apiClient.put(
        `/${rejectTarget.type}/${rejectTarget.id}/reject`,
        { motif: rejectMotif },
      );
      toast.success('Recensement rejeté.');
      setRejectOpen(false);
      setRejectTarget(null);
      await loadPending();
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors du rejet.');
    } finally {
      setRejectLoading(false);
    }
  };

  // ─── Actions ligne ────────────────────────────────────────────────────────

  const ActionsCell: React.FC<{ type: string; id: string; name: string }> = ({ type, id, name }) => (
    <Box sx={{ display: 'flex', gap: 0.75, justifyContent: 'flex-end' }}>
      <Tooltip title="Valider">
        <span>
          <Button
            size="small"
            variant="outlined"
            color="success"
            startIcon={<CheckCircleOutlineIcon />}
            disabled={!!actionLoading}
            onClick={() => openConfirmValidate(type, id, name)}
            sx={{ minWidth: 0, px: 1.5 }}
          >
            Valider
          </Button>
        </span>
      </Tooltip>
      <Tooltip title="Rejeter">
        <span>
          <Button
            size="small"
            variant="outlined"
            color="error"
            startIcon={<BlockIcon />}
            disabled={!!actionLoading}
            onClick={() => openReject(type, id, name)}
            sx={{ minWidth: 0, px: 1.5 }}
          >
            Rejeter
          </Button>
        </span>
      </Tooltip>
    </Box>
  );

  // ─── Tables ───────────────────────────────────────────────────────────────

  const renderPrestataires = () => {
    const p = pages[0];
    const paged = prestataires.slice(p * rowsPerPage, (p + 1) * rowsPerPage);
    return (
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 600, backgroundColor: 'grey.50', whiteSpace: 'nowrap' } }}>
              <TableCell>Prestataire</TableCell>
              <TableCell>Téléphone</TableCell>
              <TableCell>Service</TableCell>
              <TableCell>Localisation</TableCell>
              <TableCell>Tarif</TableCell>
              <TableCell>KYC</TableCell>
              <TableCell>Recenseur</TableCell>
              <TableCell>Source</TableCell>
              <TableCell>Date soumission</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading
              ? renderSkeleton(11)
              : paged.length === 0
                ? <TableRow><TableCell colSpan={11} sx={{ py: 0 }}><AdminEmptyState title="Aucun prestataire en attente" /></TableCell></TableRow>
                : paged.map(row => (
                  <TableRow key={row._id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {prestataireDisplayName(row)}
                      </Typography>
                    </TableCell>
                    <TableCell><Typography variant="body2">{maskPhone(prestatairePhone(row))}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{prestataireServiceName(row)}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{row.localisation ?? '—'}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{formatPrice(row.prixprestataire)}</Typography></TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        variant="outlined"
                        label={kycPendingLabel(row.kyc)}
                        color={kycPendingLabel(row.kyc) === 'Complets' ? 'success' : kycPendingLabel(row.kyc) === 'Partiels' ? 'warning' : 'default'}
                      />
                      {row.kyc?.legacyDocumentDetected ? (
                        <Typography variant="caption" color="warning.main" display="block">
                          Legacy à sécuriser
                        </Typography>
                      ) : null}
                    </TableCell>
                    <TableCell><Typography variant="body2">{recenseurName(row.recenseur)}</Typography></TableCell>
                    <TableCell>
                      <Chip
                        label={SOURCE_LABELS[row.source ?? ''] ?? (row.source || '—')}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {recensementDate(row)}
                      </Typography>
                    </TableCell>
                    <TableCell><AdminStatusChip status={row.status ?? 'pending'} /></TableCell>
                    <TableCell align="right">
                      <ActionsCell
                        type="prestataire"
                        id={row._id}
                        name={prestataireDisplayName(row) === '—' ? row._id : prestataireDisplayName(row)}
                      />
                    </TableCell>
                  </TableRow>
                ))
            }
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={prestataires.length}
          page={p}
          onPageChange={(_, np) => setPages(prev => [np, prev[1], prev[2]])}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={e => setRowsPerPage(+e.target.value)}
          labelRowsPerPage="Lignes :"
        />
      </TableContainer>
    );
  };

  const renderFreelances = () => {
    const p = pages[1];
    const paged = freelances.slice(p * rowsPerPage, (p + 1) * rowsPerPage);
    return (
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 600, backgroundColor: 'grey.50', whiteSpace: 'nowrap' } }}>
              <TableCell>Nom</TableCell>
              <TableCell>Téléphone</TableCell>
              <TableCell>Métier</TableCell>
              <TableCell>Localisation</TableCell>
              <TableCell>Tarif horaire</TableCell>
              <TableCell>Recenseur</TableCell>
              <TableCell>Source</TableCell>
              <TableCell>Date soumission</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading
              ? renderSkeleton(10)
              : paged.length === 0
                ? <TableRow><TableCell colSpan={10} sx={{ py: 0 }}><AdminEmptyState title="Aucun freelance en attente" /></TableCell></TableRow>
                : paged.map(row => (
                  <TableRow key={row._id} hover>
                    <TableCell><Typography variant="body2" sx={{ fontWeight: 500 }}>{row.name || '—'}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{maskPhone(row.identite?.telephone ?? row.utilisateur?.telephone)}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{row.job ?? '—'}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{row.location ?? '—'}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{formatPrice(row.hourlyRate)}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{recenseurName(row.recenseur)}</Typography></TableCell>
                    <TableCell>
                      <Chip label={SOURCE_LABELS[row.source ?? ''] ?? (row.source || '—')} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {recensementDate(row)}
                      </Typography>
                    </TableCell>
                    <TableCell><AdminStatusChip status={row.status ?? 'pending'} /></TableCell>
                    <TableCell align="right">
                      <ActionsCell type="freelance" id={row._id} name={row.name || row._id} />
                    </TableCell>
                  </TableRow>
                ))
            }
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={freelances.length}
          page={p}
          onPageChange={(_, np) => setPages(prev => [prev[0], np, prev[2]])}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={e => setRowsPerPage(+e.target.value)}
          labelRowsPerPage="Lignes :"
        />
      </TableContainer>
    );
  };

  const renderVendeurs = () => {
    const p = pages[2];
    const paged = vendeurs.slice(p * rowsPerPage, (p + 1) * rowsPerPage);
    return (
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 600, backgroundColor: 'grey.50', whiteSpace: 'nowrap' } }}>
              <TableCell>Boutique</TableCell>
              <TableCell>Téléphone</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Recenseur</TableCell>
              <TableCell>Source</TableCell>
              <TableCell>Date soumission</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading
              ? renderSkeleton(8)
              : paged.length === 0
                ? <TableRow><TableCell colSpan={8} sx={{ py: 0 }}><AdminEmptyState title="Aucun vendeur en attente" /></TableCell></TableRow>
                : paged.map(row => (
                  <TableRow key={row._id} hover>
                    <TableCell><Typography variant="body2" sx={{ fontWeight: 500 }}>{row.boutique?.shopName ?? row.shopName ?? '—'}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{maskPhone(row.identite?.telephone ?? row.utilisateur?.telephone)}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{row.boutique?.businessType ?? row.businessType ?? '—'}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{recenseurName(row.recenseur)}</Typography></TableCell>
                    <TableCell>
                      <Chip label={SOURCE_LABELS[row.source ?? ''] ?? (row.source || '—')} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {recensementDate(row)}
                      </Typography>
                    </TableCell>
                    <TableCell><AdminStatusChip status={row.status ?? 'pending'} /></TableCell>
                    <TableCell align="right">
                      <ActionsCell type="vendeur" id={row._id} name={(row.boutique?.shopName ?? row.shopName) || row._id} />
                    </TableCell>
                  </TableRow>
                ))
            }
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={vendeurs.length}
          page={p}
          onPageChange={(_, np) => setPages(prev => [prev[0], prev[1], np])}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={e => setRowsPerPage(+e.target.value)}
          labelRowsPerPage="Lignes :"
        />
      </TableContainer>
    );
  };

  const totalPending = prestataires.length + freelances.length + vendeurs.length;

  if (error && totalPending === 0 && !loading) {
    return (
      <Box>
        <AdminPageHeader title="Recensements en attente" />
        <AdminErrorState message={error} onRetry={loadPending} />
      </Box>
    );
  }

  return (
    <Box>
      <AdminPageHeader
        title="Recensements en attente"
        subtitle="Validez ou rejetez les recensements soumis par les agents terrain."
        count={loading ? undefined : totalPending}
        countLoading={loading}
        onRefresh={loadPending}
        refreshing={loading}
      />

      {/* Onglets */}
      <Tabs
        value={tabIndex}
        onChange={(_, v) => setTabIndex(v as TabIndex)}
        sx={{ mb: 2, borderBottom: '1px solid', borderColor: 'divider' }}
      >
        <Tab
          icon={<CoPresentIcon fontSize="small" />}
          iconPosition="start"
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              Prestataires
              <Chip label={loading ? '…' : prestataires.length} size="small" variant="outlined" />
            </Box>
          }
          value={0}
          sx={{ textTransform: 'none', fontWeight: 500, minHeight: 48 }}
        />
        <Tab
          icon={<WorkIcon fontSize="small" />}
          iconPosition="start"
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              Freelances
              <Chip label={loading ? '…' : freelances.length} size="small" variant="outlined" />
            </Box>
          }
          value={1}
          sx={{ textTransform: 'none', fontWeight: 500, minHeight: 48 }}
        />
        <Tab
          icon={<StorefrontIcon fontSize="small" />}
          iconPosition="start"
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              Vendeurs
              <Chip label={loading ? '…' : vendeurs.length} size="small" variant="outlined" />
            </Box>
          }
          value={2}
          sx={{ textTransform: 'none', fontWeight: 500, minHeight: 48 }}
        />
      </Tabs>

      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
        {tabIndex === 0 && renderPrestataires()}
        {tabIndex === 1 && renderFreelances()}
        {tabIndex === 2 && renderVendeurs()}
      </Paper>

      {/* Dialogue confirmation validation */}
      <AdminConfirmDialog
        open={confirmOpen}
        title="Confirmer la validation"
        message={`Valider le recensement de ${confirmTarget?.name ?? '…'} ?`}
        confirmLabel="Valider"
        severity="info"
        loading={confirmLoading}
        onConfirm={doValidate}
        onCancel={() => { setConfirmOpen(false); setConfirmTarget(null); }}
      />

      {/* Dialogue rejet avec motif */}
      <Dialog open={rejectOpen} onClose={rejectLoading ? undefined : () => setRejectOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Rejeter le recensement</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Indiquez le motif du rejet pour {rejectTarget?.name ?? '…'}.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Motif du rejet"
            placeholder="Ex : Informations incomplètes, photo non conforme, doublon…"
            value={rejectMotif}
            onChange={e => setRejectMotif(e.target.value)}
            disabled={rejectLoading}
            inputProps={{ 'aria-label': 'Motif du rejet' }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => { setRejectOpen(false); setRejectMotif(''); setRejectTarget(null); }}
            disabled={rejectLoading}
            color="inherit"
          >
            Annuler
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={doReject}
            disabled={rejectLoading || !rejectMotif.trim()}
            startIcon={rejectLoading ? <CircularProgress size={16} color="inherit" /> : <BlockIcon />}
          >
            {rejectLoading ? 'En cours…' : 'Rejeter'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// ─── Skeleton partagé ────────────────────────────────────────────────────────

function renderSkeleton(cols: number) {
  return Array.from({ length: 5 }).map((_, i) => (
    <TableRow key={i}>
      {Array.from({ length: cols }).map((_, j) => (
        <TableCell key={j}><Skeleton variant="text" /></TableCell>
      ))}
    </TableRow>
  ));
}

export default RecensementsPending;
