/**
 * Categorie.tsx — Administration des catégories Soutrali
 * Design unifié : tokens colors, MUI Table, icônes réelles
 */
import React, { useEffect, useState, useCallback } from 'react';
import { apiClient } from '../services/setupApi';
import {
  Box, Typography, Button, TextField, InputAdornment, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, Tooltip, Chip, Avatar, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Snackbar, Alert, Skeleton, TablePagination,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import CategoryIcon from '@mui/icons-material/Category';
import ImageIcon from '@mui/icons-material/Image';
import CloseIcon from '@mui/icons-material/Close';
import { colors } from '../tokens/colors';

// ── Types ──────────────────────────────────────────────────────────────────────
export interface CategorieItem {
  _id: string;
  nomcategorie: string;
  imagecategorie?: string | { type: string; data: any };
  groupe: { _id: string; nomgroupe: string };
}

interface GroupeOption {
  _id: string;
  nomgroupe: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function getImageSrc(img?: string | { type: string; data: any }): string | null {
  if (!img) return null;
  if (typeof img === 'string' && img.startsWith('http')) return img;
  if (typeof img === 'string' && img.length > 0) return img;
  if (img && typeof img === 'object' && 'data' in img) {
    try {
      const raw = img.data?.data ?? img.data;
      const bytes = new Uint8Array(Array.isArray(raw) ? raw : raw);
      let binary = '';
      bytes.forEach(b => { binary += String.fromCharCode(b); });
      return `data:image/jpeg;base64,${btoa(binary)}`;
    } catch { return null; }
  }
  return null;
}

const TH_SX = {
  color: colors.textSecondary,
  fontWeight: 600,
  fontSize: '0.72rem',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
  backgroundColor: colors.bgWarm,
  borderBottom: `1px solid ${colors.border}`,
  py: 1.5, px: 2,
};

// ── Composant ──────────────────────────────────────────────────────────────────
const Categorie: React.FC = () => {
    const [categories, setCategories] = useState<CategorieItem[]>([]);
  const [filtered, setFiltered] = useState<CategorieItem[]>([]);
  const [groupes, setGroupes] = useState<GroupeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CategorieItem | null>(null);
  const [nomcategorie, setNomcategorie] = useState('');
  const [selectedGroupe, setSelectedGroupe] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // Snackbar
  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: 'success' | 'error' }>({
    open: false, msg: '', severity: 'success',
  });
  const notify = (msg: string, severity: 'success' | 'error' = 'success') =>
    setSnack({ open: true, msg, severity });

  // ── Données ───────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, grpRes] = await Promise.all([
        apiClient.get(`/categorie`),
        apiClient.get(`/groupe`),
      ]);
      setCategories(catRes.data);
      setGroupes(grpRes.data);
    } catch {
      notify('Erreur lors du chargement', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      categories.filter(c =>
        c.nomcategorie.toLowerCase().includes(q) ||
        (c.groupe?.nomgroupe ?? '').toLowerCase().includes(q),
      ),
    );
    setPage(0);
  }, [search, categories]);

  // ── Dialogue ──────────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditTarget(null);
    setNomcategorie('');
    setSelectedGroupe('');
    setImageFile(null);
    setDialogOpen(true);
  };

  const openEdit = (c: CategorieItem) => {
    setEditTarget(c);
    setNomcategorie(c.nomcategorie);
    setSelectedGroupe(typeof c.groupe === 'object' ? c.groupe._id : c.groupe);
    setImageFile(null);
    setDialogOpen(true);
  };

  const closeDialog = () => { setDialogOpen(false); setSaving(false); };

  const handleSave = async () => {
    if (!nomcategorie.trim() || !selectedGroupe) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('nomcategorie', nomcategorie.trim());
      fd.append('groupe', selectedGroupe);
      if (imageFile) fd.append('imagecategorie', imageFile);

      if (editTarget) {
        await apiClient.put(`/categorie/${editTarget._id}`, fd);
        notify('Catégorie mise à jour');
      } else {
        await apiClient.post(`/categorie`, fd);
        notify('Catégorie ajoutée');
      }
      closeDialog();
      fetchAll();
    } catch {
      notify('Erreur lors de la sauvegarde', 'error');
      setSaving(false);
    }
  };

  const handleDelete = async (c: CategorieItem) => {
    if (!window.confirm(`Supprimer "${c.nomcategorie}" ?`)) return;
    try {
      await apiClient.delete(`/categorie/${c._id}`);
      notify('Catégorie supprimée');
      setCategories(prev => prev.filter(x => x._id !== c._id));
    } catch {
      notify('Erreur lors de la suppression', 'error');
    }
  };

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  // ── Rendu ─────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ p: 3 }}>

      {/* En-tête */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Stack direction="row" alignItems="center" gap={1.5}>
          <Box sx={{
            width: 40, height: 40, borderRadius: 2,
            backgroundColor: alpha(colors.emerald, 0.1),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CategoryIcon sx={{ color: colors.emerald, fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="body2" fontWeight={500} color={colors.textSecondary}>
              Organisez les services proposés sur la plateforme.
            </Typography>
            <Typography variant="caption" color={colors.textMuted}>
              {loading ? '…' : `${filtered.length} catégorie${filtered.length > 1 ? 's' : ''}`}
            </Typography>
          </Box>
        </Stack>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd} sx={{ borderRadius: 2, px: 2.5 }}>
          Ajouter une catégorie
        </Button>
      </Stack>

      {/* Recherche */}
      <TextField
        size="small"
        placeholder="Rechercher par nom ou groupe…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: colors.textMuted, fontSize: 18 }} />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 2.5, width: 360 }}
      />

      {/* Tableau */}
      <Paper elevation={0} sx={{ border: `1px solid ${colors.border}`, borderRadius: 3, overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ ...TH_SX, width: 48 }}>#</TableCell>
                <TableCell sx={TH_SX}>Catégorie</TableCell>
                <TableCell sx={TH_SX}>Groupe</TableCell>
                <TableCell sx={{ ...TH_SX, width: 70 }}>Image</TableCell>
                <TableCell sx={{ ...TH_SX, width: 110 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {[1, 2, 3, 4, 5].map(j => (
                      <TableCell key={j}><Skeleton variant="text" width="75%" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6, color: colors.textMuted }}>
                    Aucune catégorie trouvée
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((c, idx) => {
                  const imgSrc = getImageSrc(c.imagecategorie);
                  return (
                    <TableRow key={c._id} hover sx={{ '&:last-child td': { border: 0 } }}>
                      <TableCell sx={{ color: colors.textMuted, fontSize: '0.8rem', pl: 2 }}>
                        {page * rowsPerPage + idx + 1}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>{c.nomcategorie}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={c.groupe?.nomgroupe ?? '—'}
                          size="small"
                          sx={{
                            backgroundColor: alpha(colors.forestGreen, 0.08),
                            color: colors.forestGreen,
                            fontWeight: 500,
                            fontSize: '0.72rem',
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        {imgSrc ? (
                          <Avatar src={imgSrc} variant="rounded" sx={{ width: 34, height: 34 }} />
                        ) : (
                          <Box sx={{
                            width: 34, height: 34, borderRadius: 1,
                            backgroundColor: colors.bgWarm,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <ImageIcon sx={{ fontSize: 16, color: colors.textMuted }} />
                          </Box>
                        )}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" gap={0.5}>
                          <Tooltip title="Modifier" arrow>
                            <IconButton size="small" onClick={() => openEdit(c)} sx={{ color: colors.primary }}>
                              <EditIcon sx={{ fontSize: 17 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Supprimer" arrow>
                            <IconButton size="small" onClick={() => handleDelete(c)} sx={{ color: colors.error }}>
                              <DeleteIcon sx={{ fontSize: 17 }} />
                            </IconButton>
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

      {/* Dialogue */}
      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 1, borderBottom: `1px solid ${colors.border}` }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography fontWeight={700} color={colors.textPrimary}>
                {editTarget ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
              </Typography>
              <Typography variant="caption" color={colors.textMuted}>
                {editTarget ? 'Modifiez les informations de la catégorie.' : 'Renseignez les informations de la nouvelle catégorie.'}
              </Typography>
            </Box>
            <IconButton size="small" onClick={closeDialog} aria-label="Fermer">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          {/* Section 1 — Informations générales */}
          <Box sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${colors.border}` }}>
            <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: colors.textMuted, display: 'block', mb: 2 }}>
              Informations générales
            </Typography>
            <TextField
              fullWidth
              label="Nom de la catégorie *"
              placeholder="Ex. : Plomberie, Couture, Informatique"
              value={nomcategorie}
              onChange={e => setNomcategorie(e.target.value)}
              size="small"
              required
            />
          </Box>

          {/* Section 2 — Classification */}
          <Box sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${colors.border}` }}>
            <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: colors.textMuted, display: 'block', mb: 2 }}>
              Groupe parent
            </Typography>
            <TextField
              select
              fullWidth
              label="Groupe *"
              value={selectedGroupe}
              onChange={e => setSelectedGroupe(e.target.value)}
              size="small"
              required
              helperText="La catégorie sera rattachée à ce groupe."
            >
              <MenuItem value=""><em>Choisir un groupe</em></MenuItem>
              {groupes.map(g => (
                <MenuItem key={g._id} value={g._id}>{g.nomgroupe}</MenuItem>
              ))}
            </TextField>
          </Box>

          {/* Section 3 — Image */}
          <Box sx={{ px: 3, py: 2.5, backgroundColor: colors.bgWarm }}>
            <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: colors.textMuted, display: 'block', mb: 2 }}>
              Image
            </Typography>
            {imageFile ? (
              <Stack direction="row" alignItems="center" gap={2}>
                <Avatar src={URL.createObjectURL(imageFile)} variant="rounded" sx={{ width: 64, height: 64 }} />
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body2" fontWeight={500}>{imageFile.name}</Typography>
                  <Typography variant="caption" color={colors.textMuted}>{(imageFile.size / 1024).toFixed(0)} Ko</Typography>
                </Box>
                <Button size="small" color="inherit" onClick={() => setImageFile(null)}>Supprimer</Button>
              </Stack>
            ) : (
              <Button
                variant="outlined"
                component="label"
                startIcon={<ImageIcon />}
                sx={{ color: colors.textSecondary, borderColor: colors.border, borderStyle: 'dashed', width: '100%', py: 1.5, borderRadius: 2 }}
              >
                Choisir une image (optionnel)
                <input type="file" hidden accept="image/*" onChange={e => setImageFile(e.target.files?.[0] ?? null)} />
              </Button>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${colors.border}`, gap: 1 }}>
          <Button onClick={closeDialog} color="inherit" sx={{ minWidth: 90 }}>Annuler</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !nomcategorie.trim() || !selectedGroupe}
            sx={{ minWidth: 170, height: 40 }}
          >
            {saving ? 'Enregistrement…' : editTarget ? 'Enregistrer les modifications' : 'Créer la catégorie'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
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

export default Categorie;
