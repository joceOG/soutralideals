import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TablePagination, TextField, InputAdornment,
  IconButton, Button, MenuItem, Chip, Drawer, Stack, Divider,
  CircularProgress, Skeleton, Avatar, Tooltip, Menu, Snackbar, Alert,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import BlockIcon from '@mui/icons-material/Block';
import FilterListIcon from '@mui/icons-material/FilterList';
import AddIcon from '@mui/icons-material/Add';
import { AdminPageHeader, AdminStatusChip, AdminEmptyState, AdminErrorState, AdminConfirmDialog } from '../components/admin';
import { PrestataireFormDialog } from '../components/prestataire/PrestataireFormDialog';
import { stripKycForListRow } from '../services/prestataireService';
import { apiClient } from '../services/setupApi';
import { safeDate, formatPrice, kycStatus, maskPhone } from '../components/admin/utils';
import { colors } from '../tokens/colors';

// ─── Types ────────────────────────────────────────────────────────────────────

interface IPrestataire {
  _id: string;
  utilisateur?: { _id: string; nom: string; prenom: string; email?: string; telephone?: string };
  service?: { _id: string; nomservice: string; categorie?: { nomcategorie: string } };
  prixprestataire?: number;
  localisation?: string;
  localisationmaps?: { latitude: number; longitude: number };
  note?: string;
  verifier?: boolean;
  status?: string;
  cni1?: string | boolean;
  cni2?: string | boolean;
  selfie?: string | boolean;
  numeroCNI?: string;
  specialite?: string[];
  anneeExperience?: string;
  description?: string;
  rayonIntervention?: number;
  zoneIntervention?: string[];
  tarifHoraireMin?: number;
  tarifHoraireMax?: number;
  nbMission?: number;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const initials = (p: IPrestataire) => {
  const nom = p.utilisateur?.nom ?? '';
  const prenom = p.utilisateur?.prenom ?? '';
  return `${prenom[0] ?? ''}${nom[0] ?? ''}`.toUpperCase() || 'P';
};

const fullName = (p: IPrestataire) =>
  `${p.utilisateur?.prenom ?? ''} ${p.utilisateur?.nom ?? ''}`.trim() || '—';

// ─── Composant principal ──────────────────────────────────────────────────────

const PrestataireComponent: React.FC = () => {
  const [rows, setRows] = useState<IPrestataire[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Snackbar
  const [snack, setSnack] = React.useState<{ open: boolean; msg: string; severity: 'success' | 'error' | 'info' }>({ open: false, msg: '', severity: 'success' });
  const notify = (msg: string, severity: 'success' | 'error' | 'info' = 'success') => setSnack({ open: true, msg, severity });

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Recherche & filtres
  const [search, setSearch] = useState('');
  const [filterVerif, setFilterVerif] = useState<'' | 'true' | 'false'>('');

  // Drawer de détail
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<IPrestataire | null>(null);

  // Menu actions ligne
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [menuItem, setMenuItem] = useState<IPrestataire | null>(null);

  // Dialogue confirmation
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ label: string; fn: () => Promise<void> } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // AbortController pour éviter les mises à jour sur composant démonté
  const abortRef = useRef<AbortController | null>(null);

  const fetchPrestataires = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/prestataire`, {
        signal: controller.signal,
      });
      if (!controller.signal.aborted) {
        setRows(Array.isArray(res.data) ? res.data : []);
      }
    } catch (err: any) {
      if (err?.code === 'ERR_CANCELED' || controller.signal.aborted) return;
      console.error(err);
      setError('Impossible de charger les prestataires.');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrestataires();
    return () => abortRef.current?.abort();
  }, [fetchPrestataires]);

  // ─── Filtrage côté frontend ────────────────────────────────────────────────

  const filtered = rows.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      fullName(p).toLowerCase().includes(q) ||
      (p.service?.nomservice ?? '').toLowerCase().includes(q) ||
      (p.localisation ?? '').toLowerCase().includes(q);
    const matchVerif = filterVerif === '' || String(p.verifier) === filterVerif;
    return matchSearch && matchVerif;
  });

  const paged = filtered.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  // ─── Actions ──────────────────────────────────────────────────────────────

  const openMenu = (e: React.MouseEvent<HTMLElement>, item: IPrestataire) => {
    setMenuAnchor(e.currentTarget);
    setMenuItem(item);
  };
  const closeMenu = () => { setMenuAnchor(null); setMenuItem(null); };

  const openDetail = (item: IPrestataire) => {
    setDetailItem(item);
    setDetailOpen(true);
    closeMenu();
  };

  const requestConfirm = (label: string, fn: () => Promise<void>) => {
    setConfirmAction({ label, fn });
    setConfirmOpen(true);
    closeMenu();
  };

  const runConfirm = async () => {
    if (!confirmAction) return;
    setConfirmLoading(true);
    try {
      await confirmAction.fn();
    } finally {
      setConfirmLoading(false);
      setConfirmOpen(false);
      setConfirmAction(null);
    }
  };

  const handleDelete = (item: IPrestataire) =>
    requestConfirm(
      `Supprimer le prestataire ${fullName(item)} ?`,
      async () => {
        await apiClient.delete(`/prestataire/${item._id}`);
        setRows(prev => prev.filter(r => r._id !== item._id));
        notify('Prestataire supprimé.');
      },
    );

  const handleToggleVerif = (item: IPrestataire) => {
    const next = !item.verifier;
    requestConfirm(
      `${next ? 'Vérifier' : 'Démarquer'} le prestataire ${fullName(item)} ?`,
      async () => {
        await apiClient.put(`/prestataire/${item._id}`, { verifier: next });
        setRows(prev => prev.map(r => r._id === item._id ? { ...r, verifier: next } : r));
        notify('Statut mis à jour.');
      },
    );
  };

  // ─── Rendu ────────────────────────────────────────────────────────────────

  if (error && rows.length === 0) {
    return (
      <Box>
        <AdminPageHeader title="Prestataires" />
        <AdminErrorState message={error} onRetry={fetchPrestataires} />
      </Box>
    );
  }

  return (
    <Box>

      <AdminPageHeader
        title="Prestataires"
        subtitle="Gérez les prestataires de la plateforme."
        count={loading ? undefined : filtered.length}
        countLoading={loading}
        onRefresh={fetchPrestataires}
        refreshing={loading}
        toolbar={
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => { setEditId(null); setFormOpen(true); }}
              sx={{ borderRadius: '10px' }}
            >
              Nouveau prestataire
            </Button>
            <TextField
              size="small"
              placeholder="Rechercher…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
              }}
              sx={{ width: 220 }}
            />
            <TextField
              select
              size="small"
              value={filterVerif}
              onChange={e => { setFilterVerif(e.target.value as any); setPage(0); }}
              sx={{ width: 160 }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><FilterListIcon fontSize="small" /></InputAdornment>,
              }}
            >
              <MenuItem value="">Toutes vérifications</MenuItem>
              <MenuItem value="true">Vérifiés</MenuItem>
              <MenuItem value="false">Non vérifiés</MenuItem>
            </TextField>
          </Box>
        }
      />

      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 600, backgroundColor: 'grey.50', whiteSpace: 'nowrap' } }}>
                <TableCell>Prestataire</TableCell>
                <TableCell>Métier / Service</TableCell>
                <TableCell>Localisation</TableCell>
                <TableCell>Tarif</TableCell>
                <TableCell>Vérification</TableCell>
                <TableCell>Expérience</TableCell>
                <TableCell>Documents KYC</TableCell>
                <TableCell>Créé le</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: rowsPerPage }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <TableCell key={j}><Skeleton variant="text" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : paged.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} sx={{ py: 0 }}>
                    <AdminEmptyState
                      title={search || filterVerif ? 'Aucun résultat pour cette recherche' : 'Aucun prestataire'}
                      description={search ? 'Essayez une autre recherche.' : undefined}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                paged.map((p) => (
                  <TableRow
                    key={p._id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => openDetail(p)}
                  >
                    {/* Prestataire */}
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 32, height: 32, fontSize: 12, bgcolor: alpha(colors.primary500, 0.15), color: colors.primary500 }}>
                          {initials(p)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>{fullName(p)}</Typography>
                          <Typography variant="caption" color="text.secondary">{maskPhone(p.utilisateur?.telephone)}</Typography>
                        </Box>
                      </Box>
                    </TableCell>

                    {/* Métier */}
                    <TableCell>
                      <Typography variant="body2">{p.service?.nomservice ?? '—'}</Typography>
                      {p.service?.categorie?.nomcategorie && (
                        <Typography variant="caption" color="text.secondary">{p.service.categorie.nomcategorie}</Typography>
                      )}
                    </TableCell>

                    {/* Localisation */}
                    <TableCell>
                      <Typography variant="body2">{p.localisation || '—'}</Typography>
                    </TableCell>

                    {/* Tarif */}
                    <TableCell>
                      <Typography variant="body2">{formatPrice(p.prixprestataire)}</Typography>
                    </TableCell>

                    {/* Vérification */}
                    <TableCell onClick={e => e.stopPropagation()}>
                      <AdminStatusChip status={p.verifier ? 'verified' : 'pending'} />
                    </TableCell>

                    {/* Expérience */}
                    <TableCell>
                      <Typography variant="body2">
                        {p.anneeExperience ? `${p.anneeExperience} ans` : '—'}
                      </Typography>
                    </TableCell>

                    {/* Documents KYC — indicateur booléen uniquement */}
                    <TableCell>
                      <Chip
                        label={kycStatus(p.cni1, p.cni2, p.selfie)}
                        size="small"
                        variant="outlined"
                        color={kycStatus(p.cni1, p.cni2, p.selfie) === 'Complets' ? 'success' : kycStatus(p.cni1, p.cni2, p.selfie) === 'Incomplets' ? 'error' : 'warning'}
                      />
                    </TableCell>

                    {/* Date */}
                    <TableCell>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {safeDate(p.createdAt)}
                      </Typography>
                    </TableCell>

                    {/* Actions */}
                    <TableCell align="right" onClick={e => e.stopPropagation()}>
                      <Tooltip title="Actions">
                        <IconButton size="small" onClick={e => openMenu(e, p)}>
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={e => { setRowsPerPage(+e.target.value); setPage(0); }}
          rowsPerPageOptions={[10, 25, 50]}
          labelRowsPerPage="Lignes :"
        />
      </Paper>

      {/* Menu ligne */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
        <MenuItem onClick={() => menuItem && openDetail(menuItem)}>
          Voir le détail
        </MenuItem>
        <MenuItem onClick={() => menuItem && handleToggleVerif(menuItem)}>
          {menuItem?.verifier ? 'Retirer la vérification' : 'Marquer comme vérifié'}
        </MenuItem>
        <Divider />
        <MenuItem sx={{ color: 'error.main' }} onClick={() => menuItem && handleDelete(menuItem)}>
          Supprimer
        </MenuItem>
      </Menu>

      {/* Drawer détail */}
      <Drawer
        anchor="right"
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        PaperProps={{ sx: { width: { xs: '100vw', sm: 480 }, p: 3 } }}
      >
        {detailItem && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>Détail prestataire</Typography>
              <IconButton onClick={() => setDetailOpen(false)}><CloseIcon /></IconButton>
            </Box>

            {/* Identité */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Avatar sx={{ width: 56, height: 56, bgcolor: alpha(colors.primary500, 0.15), color: colors.primary500, fontSize: 18 }}>
                {initials(detailItem)}
              </Avatar>
              <Box>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>{fullName(detailItem)}</Typography>
                <Typography variant="body2" color="text.secondary">{detailItem.utilisateur?.telephone || '—'}</Typography>
                <Typography variant="body2" color="text.secondary">{detailItem.utilisateur?.email || '—'}</Typography>
              </Box>
            </Box>

            <Divider sx={{ mb: 2.5 }} />

            <Stack spacing={2}>
              <DetailRow label="Métier" value={detailItem.service?.nomservice} />
              <DetailRow label="Catégorie" value={detailItem.service?.categorie?.nomcategorie} />
              <DetailRow label="Localisation" value={detailItem.localisation} />
              <DetailRow label="Tarif" value={formatPrice(detailItem.prixprestataire)} />
              <DetailRow label="Tarif horaire" value={
                detailItem.tarifHoraireMin || detailItem.tarifHoraireMax
                  ? `${formatPrice(detailItem.tarifHoraireMin)} – ${formatPrice(detailItem.tarifHoraireMax)}`
                  : undefined
              } />
              <DetailRow label="Expérience" value={detailItem.anneeExperience ? `${detailItem.anneeExperience} ans` : undefined} />
              <DetailRow label="Spécialités" value={detailItem.specialite?.join(', ')} />
              <DetailRow label="Description" value={detailItem.description} multiline />
              {detailItem.zoneIntervention?.length ? (
                <DetailRow label="Zones d'intervention" value={detailItem.zoneIntervention.join(', ')} />
              ) : null}
              <DetailRow label="Rayon d'intervention" value={detailItem.rayonIntervention ? `${detailItem.rayonIntervention} km` : undefined} />
              <DetailRow label="Missions" value={detailItem.nbMission?.toString()} />

              {/* Localisation GPS — uniquement dans le drawer */}
              {(detailItem.localisationmaps?.latitude || detailItem.localisationmaps?.longitude) && (
                <DetailRow
                  label="Coordonnées GPS"
                  value={`${detailItem.localisationmaps.latitude.toFixed(6)}, ${detailItem.localisationmaps.longitude.toFixed(6)}`}
                />
              )}

              <Divider />

              {/* Documents KYC */}
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Documents
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                  <Chip label="CNI Recto" size="small" color={detailItem.cni1 ? 'success' : 'default'} variant="outlined" />
                  <Chip label="CNI Verso" size="small" color={detailItem.cni2 ? 'success' : 'default'} variant="outlined" />
                  <Chip label="Selfie" size="small" color={detailItem.selfie ? 'success' : 'default'} variant="outlined" />
                </Box>
              </Box>

              <Divider />

              <Box sx={{ display: 'flex', gap: 1 }}>
                <AdminStatusChip status={detailItem.verifier ? 'verified' : 'pending'} />
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary">
                  Créé le {safeDate(detailItem.createdAt)} • Modifié le {safeDate(detailItem.updatedAt)}
                </Typography>
              </Box>
            </Stack>

            <Divider sx={{ my: 3 }} />

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<EditIcon />}
                fullWidth
                onClick={() => {
                  setDetailOpen(false);
                  setEditId(detailItem._id);
                  setFormOpen(true);
                }}
              >
                Modifier
              </Button>
              <Button
                variant="outlined"
                size="small"
                color={detailItem.verifier ? 'warning' : 'success'}
                fullWidth
                startIcon={detailItem.verifier ? <BlockIcon /> : <CheckCircleOutlineIcon />}
                onClick={() => {
                  setDetailOpen(false);
                  handleToggleVerif(detailItem);
                }}
              >
                {detailItem.verifier ? 'Démarquer' : 'Vérifier'}
              </Button>
            </Box>
          </>
        )}
      </Drawer>

      <PrestataireFormDialog
        open={formOpen}
        prestataireId={editId}
        onClose={() => { setFormOpen(false); setEditId(null); }}
        onSuccess={(saved) => {
          const id = String((saved as { _id?: string })._id ?? '');
          setRows((prev) => {
            const idx = prev.findIndex((r) => r._id === id);
            const row = stripKycForListRow(saved as unknown as IPrestataire);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = { ...next[idx], ...row };
              return next;
            }
            return [row, ...prev];
          });
          notify(editId ? 'Prestataire mis à jour.' : 'Prestataire créé.');
          setEditId(null);
        }}
      />

      {/* Dialogue confirmation */}
      <AdminConfirmDialog
        open={confirmOpen}
        title="Confirmer l'action"
        message={confirmAction?.label ?? ''}
        severity="warning"
        loading={confirmLoading}
        onConfirm={runConfirm}
        onCancel={() => { setConfirmOpen(false); setConfirmAction(null); }}
      />

      {/* Snackbar */}
      <Snackbar
        open={snack.open}
        autoHideDuration={3500}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack.severity} variant="filled" onClose={() => setSnack(s => ({ ...s, open: false }))}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

// ─── Composant auxiliaire ─────────────────────────────────────────────────────

const DetailRow: React.FC<{ label: string; value?: string | null; multiline?: boolean }> = ({
  label, value, multiline,
}) => (
  <Box>
    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {label}
    </Typography>
    <Typography variant="body2" sx={{ mt: 0.25, whiteSpace: multiline ? 'pre-wrap' : undefined }}>
      {value || '—'}
    </Typography>
  </Box>
);

export default PrestataireComponent;
