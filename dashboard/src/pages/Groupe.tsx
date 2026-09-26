/**
 * Groupe.tsx — Administration des groupes Soutrali
 * Design unifié : tokens colors, MUI Table, icônes réelles
 */
import React, { useEffect, useState, useCallback } from 'react';
import { apiClient } from '../services/setupApi';
import { colors } from '../tokens/colors';
import {
  Box, Typography, Button, TextField, InputAdornment,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, Tooltip, Dialog, DialogTitle, DialogContent,
  DialogActions, Snackbar, Alert, Skeleton, TablePagination, Stack,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import CloseIcon from '@mui/icons-material/Close';

// ── Types ──────────────────────────────────────────────────────────────────────
interface GroupeRecord {
  _id: string;
  nomgroupe: string;
}

// ── Helpers visuels ────────────────────────────────────────────────────────────
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

const Groupe: React.FC = () => {
    // ── État ──────────────────────────────────────────────────────────────────
  const [groupes, setGroupes] = useState<GroupeRecord[]>([]);
  const [filtered, setFiltered] = useState<GroupeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<GroupeRecord | null>(null);
  const [nomgroupe, setNomgroupe] = useState('');
  const [saving, setSaving] = useState(false);

  // Snackbar
  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: 'success' | 'error' }>({
    open: false, msg: '', severity: 'success',
  });
  const notify = (msg: string, severity: 'success' | 'error' = 'success') =>
    setSnack({ open: true, msg, severity });

  // ── Données ───────────────────────────────────────────────────────────────
  const fetchGroupes = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get(`/groupe`);
      setGroupes(data);
    } catch {
      notify('Erreur lors du chargement', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchGroupes(); }, [fetchGroupes]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(groupes.filter(g => g.nomgroupe.toLowerCase().includes(q)));
    setPage(0);
  }, [search, groupes]);

  // ── Dialogue ──────────────────────────────────────────────────────────────
  const openAdd = () => { setEditTarget(null); setNomgroupe(''); setDialogOpen(true); };
  const openEdit = (g: GroupeRecord) => { setEditTarget(g); setNomgroupe(g.nomgroupe); setDialogOpen(true); };
  const closeDialog = () => { setDialogOpen(false); setSaving(false); };

  const handleSave = async () => {
    if (!nomgroupe.trim()) return;
    setSaving(true);
    try {
      if (editTarget) {
        await apiClient.put(`/groupe/${editTarget._id}`, { nomgroupe: nomgroupe.trim() });
        notify('Groupe mis à jour');
      } else {
        await apiClient.post(`/groupe`, { nomgroupe: nomgroupe.trim() });
        notify('Groupe ajouté');
      }
      closeDialog();
      fetchGroupes();
    } catch {
      notify('Erreur lors de la sauvegarde', 'error');
      setSaving(false);
    }
  };

  const handleDelete = async (g: GroupeRecord) => {
    if (!window.confirm(`Supprimer "${g.nomgroupe}" ?`)) return;
    try {
      await apiClient.delete(`/groupe/${g._id}`);
      notify('Groupe supprimé');
      setGroupes(prev => prev.filter(x => x._id !== g._id));
    } catch {
      notify('Erreur lors de la suppression', 'error');
    }
  };

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  // ── Rendu ─────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ p: 3 }}>

      {/* ── En-tête ── */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Stack direction="row" alignItems="center" gap={1.5}>
          <Box sx={{
            width: 40, height: 40, borderRadius: 2,
            backgroundColor: alpha(colors.primary, 0.1),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <FolderOpenIcon sx={{ color: colors.primary, fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="body2" fontWeight={500} color={colors.textSecondary}>
              Gérez les univers Métiers, Freelance et E-marché.
            </Typography>
            <Typography variant="caption" color={colors.textMuted}>
              {loading ? '…' : `${filtered.length} groupe${filtered.length > 1 ? 's' : ''}`}
            </Typography>
          </Box>
        </Stack>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd} sx={{ borderRadius: 2, px: 2.5 }}>
          Ajouter un groupe
        </Button>
      </Stack>

      {/* ── Recherche ── */}
      <TextField
        size="small"
        placeholder="Rechercher un groupe…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: colors.textMuted, fontSize: 18 }} />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 2.5, width: 320 }}
      />

      {/* ── Tableau ── */}
      <Paper elevation={0} sx={{ border: `1px solid ${colors.border}`, borderRadius: 3, overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ ...TH_SX, width: 48 }}>#</TableCell>
                <TableCell sx={TH_SX}>Nom du groupe</TableCell>
                <TableCell sx={{ ...TH_SX, width: 110 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {[48, 'auto', 110].map((w, j) => (
                      <TableCell key={j} sx={{ width: w }}>
                        <Skeleton variant="text" width="70%" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} align="center" sx={{ py: 6, color: colors.textMuted }}>
                    Aucun groupe trouvé
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((g, idx) => (
                  <TableRow key={g._id} hover sx={{ '&:last-child td': { border: 0 } }}>
                    <TableCell sx={{ color: colors.textMuted, fontSize: '0.8rem', pl: 2 }}>
                      {page * rowsPerPage + idx + 1}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" gap={1}>
                        <Box sx={{
                          width: 28, height: 28, borderRadius: 1,
                          backgroundColor: alpha(colors.primary, 0.08),
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          <FolderOpenIcon sx={{ fontSize: 14, color: colors.primary }} />
                        </Box>
                        <Typography variant="body2" fontWeight={500}>{g.nomgroupe}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" gap={0.5}>
                        <Tooltip title="Modifier" arrow>
                          <IconButton size="small" onClick={() => openEdit(g)} sx={{ color: colors.primary }}>
                            <EditIcon sx={{ fontSize: 17 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Supprimer" arrow>
                          <IconButton size="small" onClick={() => handleDelete(g)} sx={{ color: colors.error }}>
                            <DeleteIcon sx={{ fontSize: 17 }} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
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
          rowsPerPage={rowsPerPage}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={e => { setRowsPerPage(+e.target.value); setPage(0); }}
          rowsPerPageOptions={[5, 10, 25]}
          labelRowsPerPage="Par page :"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} sur ${count}`}
          sx={{ borderTop: `1px solid ${colors.border}` }}
        />
      </Paper>

      {/* ── Dialogue ajout/édition ── */}
      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography fontWeight={700}>{editTarget ? 'Modifier le groupe' : 'Nouveau groupe'}</Typography>
            <IconButton size="small" onClick={closeDialog}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <TextField
            autoFocus
            fullWidth
            label="Nom du groupe *"
            placeholder="Ex. : Métiers, Freelance, E-marché"
            value={nomgroupe}
            onChange={e => setNomgroupe(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
            margin="normal"
            size="small"
            required
            helperText="Ce nom sera visible dans le catalogue et les formulaires."
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${colors.border}`, gap: 1 }}>
          <Button onClick={closeDialog} color="inherit" sx={{ minWidth: 90 }}>Annuler</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !nomgroupe.trim()}
            sx={{ minWidth: 160, height: 40 }}
          >
            {saving ? 'Enregistrement…' : editTarget ? 'Enregistrer les modifications' : 'Créer le groupe'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Snackbar ── */}
      <Snackbar
        open={snack.open}
        autoHideDuration={3500}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snack.severity}
          variant="filled"
          onClose={() => setSnack(s => ({ ...s, open: false }))}
        >
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Groupe;
