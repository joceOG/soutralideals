/**
 * Utilisateur.tsx — Administration des comptes (DASH-8D)
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  InputAdornment,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Chip,
  Avatar,
  Stack,
  Snackbar,
  Alert,
  Skeleton,
  TablePagination,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import PeopleIcon from '@mui/icons-material/People';
import PersonIcon from '@mui/icons-material/Person';
import { colors } from '../tokens/colors';
import { getCurrentUserId } from '../services/setupApi';
import {
  fetchUtilisateurs,
  createUtilisateurAdmin,
  updateUtilisateur,
  deleteUtilisateurAdmin,
  mapUtilisateurApiError,
  UtilisateurListItem,
  UtilisateurFormValues,
} from '../services/utilisateurService';
import { UtilisateurFormDialog } from '../components/utilisateur/UtilisateurFormDialog';
import { AdminConfirmDialog } from '../components/admin/AdminConfirmDialog';

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  Admin: { bg: alpha(colors.forestGreen, 0.12), color: colors.forestGreen },
  Client: { bg: alpha(colors.primary, 0.1), color: colors.primary },
  Prestataire: { bg: alpha(colors.info, 0.1), color: colors.info },
  Vendeur: { bg: alpha(colors.warning, 0.12), color: '#B45309' },
  Freelance: { bg: alpha(colors.secondary500, 0.1), color: colors.secondary500 },
};

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

const UtilisateurComponent: React.FC = () => {
  const [items, setItems] = useState<UtilisateurListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterActive, setFilterActive] = useState<'true' | 'false' | ''>('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<UtilisateurListItem | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<UtilisateurListItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: 'success' | 'error' }>({
    open: false,
    msg: '',
    severity: 'success',
  });
  const notify = (msg: string, severity: 'success' | 'error' = 'success') =>
    setSnack({ open: true, msg, severity });

  const abortRef = useRef<AbortController | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentAdminId = getCurrentUserId();

  const loadList = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setListError(null);
    try {
      const result = await fetchUtilisateurs({
        page: page + 1,
        limit: rowsPerPage,
        search,
        role: filterRole || undefined,
        isActive: filterActive,
        signal: controller.signal,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (e) {
      const mapped = mapUtilisateurApiError(e);
      if ((e as { code?: string }).code === 'ERR_CANCELED') return;
      setListError(mapped.message);
      setItems([]);
      setTotal(0);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [page, rowsPerPage, search, filterRole, filterActive]);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => loadList(), 300);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      abortRef.current?.abort();
    };
  }, [loadList]);

  const openAdd = () => {
    setEditTarget(null);
    setDialogOpen(true);
  };

  const openEdit = (u: UtilisateurListItem) => {
    setEditTarget(u);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setSaving(false);
  };

  const handleFormSubmit = async (formData: FormData, _values: UtilisateurFormValues) => {
    if (saving) return;
    setSaving(true);
    try {
      if (editTarget?._id) {
        await updateUtilisateur(editTarget._id, formData);
        notify('Utilisateur mis à jour');
      } else {
        await createUtilisateurAdmin(formData);
        notify('Utilisateur créé');
      }
      closeDialog();
      loadList();
    } catch (e) {
      notify(mapUtilisateurApiError(e).message, 'error');
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget?._id || deleteLoading) return;
    setDeleteLoading(true);
    try {
      await deleteUtilisateurAdmin(deleteTarget._id);
      notify('Utilisateur supprimé');
      setDeleteTarget(null);
      loadList();
    } catch (e) {
      const mapped = mapUtilisateurApiError(e);
      if (mapped.code === 'USER_HAS_DEPENDENCIES' && mapped.dependencies) {
        const parts = Object.entries(mapped.dependencies)
          .filter(([, n]) => n > 0)
          .map(([k, n]) => `${k}: ${n}`);
        notify(`${mapped.message} (${parts.join(', ')})`, 'error');
      } else {
        notify(mapped.message, 'error');
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatDate = (iso?: string) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('fr-FR');
    } catch {
      return '—';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>
        <Stack direction="row" alignItems="center" gap={1.5}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              backgroundColor: alpha(colors.primary, 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <PeopleIcon sx={{ color: colors.primary, fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="body2" fontWeight={500} color={colors.textSecondary}>
              Comptes, rôles et statuts — distincts des profils professionnels.
            </Typography>
            <Typography variant="caption" color={colors.textMuted}>
              {loading ? '…' : `${total} utilisateur${total > 1 ? 's' : ''}`}
            </Typography>
          </Box>
        </Stack>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd} sx={{ borderRadius: 2, px: 2.5 }}>
          Ajouter un utilisateur
        </Button>
      </Stack>

      {listError ? (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {listError}
        </Alert>
      ) : null}

      <Stack direction={{ xs: 'column', md: 'row' }} gap={1.5} mb={2.5} flexWrap="wrap">
        <TextField
          size="small"
          placeholder="Rechercher nom, email, téléphone…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: colors.textMuted, fontSize: 18 }} />
              </InputAdornment>
            ),
          }}
          sx={{ width: { xs: '100%', sm: 320 } }}
        />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Rôle</InputLabel>
          <Select
            label="Rôle"
            value={filterRole}
            onChange={(e) => {
              setFilterRole(e.target.value);
              setPage(0);
            }}
          >
            <MenuItem value="">Tous</MenuItem>
            {['Admin', 'Client', 'Prestataire', 'Vendeur', 'Freelance'].map((r) => (
              <MenuItem key={r} value={r}>
                {r}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Statut</InputLabel>
          <Select
            label="Statut"
            value={filterActive}
            onChange={(e) => {
              setFilterActive(e.target.value as '' | 'true' | 'false');
              setPage(0);
            }}
          >
            <MenuItem value="">Tous</MenuItem>
            <MenuItem value="true">Actifs</MenuItem>
            <MenuItem value="false">Désactivés</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      <Paper elevation={0} sx={{ border: `1px solid ${colors.border}`, borderRadius: 3, overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={TH_SX}>Utilisateur</TableCell>
                <TableCell sx={TH_SX}>Rôle</TableCell>
                <TableCell sx={TH_SX}>Statut</TableCell>
                <TableCell sx={TH_SX}>Contact</TableCell>
                <TableCell sx={TH_SX}>Inscription</TableCell>
                <TableCell sx={{ ...TH_SX, width: 100 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {[1, 2, 3, 4, 5, 6].map((j) => (
                      <TableCell key={j}>
                        <Skeleton variant="text" width="75%" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6, color: colors.textMuted }}>
                    Aucun utilisateur trouvé
                  </TableCell>
                </TableRow>
              ) : (
                items.map((u) => {
                  const initials = `${(u.prenom[0] ?? '').toUpperCase()}${(u.nom[0] ?? '').toUpperCase()}`;
                  const roleStyle = ROLE_COLORS[u.role] ?? ROLE_COLORS.Client;
                  const isSelf = currentAdminId === u._id;
                  return (
                    <TableRow key={u._id} hover sx={{ '&:last-child td': { border: 0 } }}>
                      <TableCell>
                        <Stack direction="row" alignItems="center" gap={1.5}>
                          {u.photoProfil ? (
                            <Avatar src={u.photoProfil} sx={{ width: 32, height: 32 }} />
                          ) : (
                            <Avatar
                              sx={{
                                width: 32,
                                height: 32,
                                fontSize: 12,
                                bgcolor: alpha(colors.primary, 0.12),
                                color: colors.primary,
                              }}
                            >
                              {initials || <PersonIcon sx={{ fontSize: 16 }} />}
                            </Avatar>
                          )}
                          <Typography variant="body2" fontWeight={500}>
                            {u.prenom} {u.nom}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={u.role}
                          size="small"
                          sx={{
                            backgroundColor: roleStyle.bg,
                            color: roleStyle.color,
                            fontWeight: 600,
                            fontSize: '0.72rem',
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={u.isActive !== false ? 'Actif' : 'Désactivé'}
                          size="small"
                          color={u.isActive !== false ? 'success' : 'default'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color={colors.textSecondary}>
                          {u.email || u.telephone || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color={colors.textMuted}>
                          {formatDate(u.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" gap={0.5}>
                          <Tooltip title="Modifier" arrow>
                            <IconButton size="small" onClick={() => openEdit(u)} sx={{ color: colors.primary }}>
                              <EditIcon sx={{ fontSize: 17 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={isSelf ? 'Suppression de votre propre compte non disponible ici' : 'Supprimer'} arrow>
                            <span>
                              <IconButton
                                size="small"
                                disabled={isSelf}
                                onClick={() => setDeleteTarget(u)}
                                sx={{ color: colors.error }}
                              >
                                <DeleteIcon sx={{ fontSize: 17 }} />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={total}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(+e.target.value);
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25, 50]}
          labelRowsPerPage="Par page :"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} sur ${count}`}
          sx={{ borderTop: `1px solid ${colors.border}` }}
        />
      </Paper>

      <UtilisateurFormDialog
        open={dialogOpen}
        editTarget={editTarget}
        saving={saving}
        onClose={closeDialog}
        onSubmit={handleFormSubmit}
      />

      <AdminConfirmDialog
        open={Boolean(deleteTarget)}
        title="Supprimer l’utilisateur"
        message={`Supprimer définitivement ${deleteTarget?.prenom} ${deleteTarget?.nom} ? Cette action est impossible si des commandes ou profils sont liés.`}
        severity="danger"
        confirmLabel="Supprimer"
        loading={deleteLoading}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
      />

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
        <Alert severity={snack.severity} variant="filled">
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UtilisateurComponent;
