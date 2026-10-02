/**
 * Service.tsx — Administration des services Soutrali
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
import DesignServicesIcon from '@mui/icons-material/DesignServices';
import ImageIcon from '@mui/icons-material/Image';
import CloseIcon from '@mui/icons-material/Close';
import EuroIcon from '@mui/icons-material/Euro';
import { colors } from '../tokens/colors';
import TagsInput from '../components/TagsInput';
import { compressImageForUpload } from '../utils/compressImage';

// ── Types ──────────────────────────────────────────────────────────────────────
interface ServiceItem {
  _id: string;
  nomservice: string;
  imageservice?: string;
  prixmoyen?: number;
  tags: string[];
  aliases: string[];
  needs: string[];
  shortcutRank?: number;
  catalogKey?: string;
  categorie: {
    _id: string;
    nomcategorie: string;
    groupe: { _id: string; nomgroupe: string };
  };
}

interface CategorieOption {
  _id: string;
  nomcategorie: string;
  groupeId: string;
}

interface GroupeOption {
  _id: string;
  nomgroupe: string;
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
const Service: React.FC = () => {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [filtered, setFiltered] = useState<ServiceItem[]>([]);
  const [categories, setCategories] = useState<CategorieOption[]>([]);
  const [groupes, setGroupes] = useState<GroupeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ServiceItem | null>(null);
  const [nomservice, setNomservice] = useState('');
  const [prixmoyen, setPrixmoyen] = useState<string>('');
  const [selectedGroupe, setSelectedGroupe] = useState('');
  const [selectedCategorie, setSelectedCategorie] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [compressingImage, setCompressingImage] = useState(false);
  const [clearImage, setClearImage] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [aliases, setAliases] = useState<string[]>([]);
  const [needs, setNeeds] = useState<string[]>([]);
  const [shortcutRank, setShortcutRank] = useState('');
  const [catalogKey, setCatalogKey] = useState('');
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
      const [svcRes, catRes, grpRes] = await Promise.all([
        apiClient.get(`/service`),
        apiClient.get(`/categorie`),
        apiClient.get(`/groupe`),
      ]);
      setServices(svcRes.data.map((s: any) => ({
        ...s,
        tags: s.tags || [],
        aliases: s.aliases || [],
        needs: s.needs || [],
      })));
      setCategories(catRes.data.map((c: any) => ({
        _id: c._id,
        nomcategorie: c.nomcategorie,
        groupeId: typeof c.groupe === 'object' ? c.groupe?._id : c.groupe,
      })));
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
      services.filter(s =>
        s.nomservice.toLowerCase().includes(q) ||
        (s.categorie?.nomcategorie ?? '').toLowerCase().includes(q) ||
        (s.categorie?.groupe?.nomgroupe ?? '').toLowerCase().includes(q) ||
        s.tags.some(t => t.toLowerCase().includes(q)) ||
        (s.aliases || []).some(t => t.toLowerCase().includes(q)) ||
        (s.needs || []).some(t => t.toLowerCase().includes(q)),
      ),
    );
  }, [search, services]);

  // Ne pas réinitialiser la page quand on rafraîchit la liste (ex. après un PUT).
  useEffect(() => {
    setPage(0);
  }, [search]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(filtered.length / rowsPerPage) - 1);
    if (page > maxPage) setPage(maxPage);
  }, [filtered.length, rowsPerPage, page]);

  // Filtrage catégories par groupe sélectionné
  const filteredCats = selectedGroupe
    ? categories.filter(c => c.groupeId === selectedGroupe)
    : categories;

  // ── Dialogue ──────────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditTarget(null);
    setNomservice(''); setPrixmoyen(''); setSelectedGroupe('');
    setSelectedCategorie(''); setImageFile(null); setClearImage(false);
    setTags([]); setAliases([]); setNeeds([]); setShortcutRank(''); setCatalogKey('');
    setDialogOpen(true);
  };

  const openEdit = (s: ServiceItem) => {
    setEditTarget(s);
    setNomservice(s.nomservice);
    setPrixmoyen(s.prixmoyen !== undefined ? String(s.prixmoyen) : '');
    const grpId = typeof s.categorie?.groupe === 'object' ? s.categorie.groupe._id : '';
    setSelectedGroupe(grpId);
    setSelectedCategorie(s.categorie?._id ?? '');
    setImageFile(null);
    setClearImage(false);
    setTags(s.tags || []);
    setAliases(s.aliases || []);
    setNeeds(s.needs || []);
    setShortcutRank(s.shortcutRank != null ? String(s.shortcutRank) : '');
    setCatalogKey(s.catalogKey || '');
    setDialogOpen(true);
  };

  const closeDialog = () => { setDialogOpen(false); setSaving(false); };

  const mergeServiceRow = (prev: ServiceItem, data: any, fallbackCategorie: ServiceItem['categorie']): ServiceItem => ({
    ...prev,
    ...data,
    tags: data.tags || [],
    aliases: data.aliases || [],
    needs: data.needs || [],
    categorie:
      data.categorie && typeof data.categorie === 'object' && data.categorie.nomcategorie
        ? data.categorie
        : fallbackCategorie,
  });

  const pickImage = async (file: File | null) => {
    if (!file) {
      setImageFile(null);
      return;
    }
    setImageFile(file);
    setCompressingImage(true);
    try {
      const compressed = await compressImageForUpload(file);
      setImageFile(compressed);
    } finally {
      setCompressingImage(false);
    }
  };

  const handleSave = async () => {
    if (!nomservice.trim() || !selectedCategorie) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('nomservice', nomservice.trim());
      fd.append('categorie', selectedCategorie);
      if (prixmoyen !== '') fd.append('prixmoyen', prixmoyen);
      fd.append('tags', JSON.stringify(tags));
      fd.append('aliases', JSON.stringify(aliases));
      fd.append('needs', JSON.stringify(needs));
      fd.append('shortcutRank', shortcutRank);
      fd.append('catalogKey', catalogKey);
      if (imageFile) fd.append('imageservice', imageFile);
      if (clearImage && !imageFile) fd.append('clearImage', 'true');

      if (editTarget) {
        const { data } = await apiClient.put(`/service/${editTarget._id}`, fd, {
          timeout: 120000,
        });
        setServices(prev =>
          prev.map(s =>
            s._id === editTarget._id ? mergeServiceRow(s, data, s.categorie) : s,
          ),
        );
        notify('Service mis à jour');
      } else {
        await apiClient.post(`/service`, fd);
        notify('Service ajouté');
        await fetchAll();
      }
      closeDialog();
    } catch {
      notify('Erreur lors de la sauvegarde', 'error');
      setSaving(false);
    }
  };

  const handleDelete = async (s: ServiceItem) => {
    if (!window.confirm(`Supprimer "${s.nomservice}" ?`)) return;
    try {
      await apiClient.delete(`/service/${s._id}`);
      notify('Service supprimé');
      setServices(prev => prev.filter(x => x._id !== s._id));
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
            backgroundColor: alpha(colors.primary600, 0.1),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <DesignServicesIcon sx={{ color: colors.primary600, fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="body2" fontWeight={500} color={colors.textSecondary}>
              Gérez les services disponibles pour les professionnels.
            </Typography>
            <Typography variant="caption" color={colors.textMuted}>
              {loading ? '…' : `${filtered.length} service${filtered.length > 1 ? 's' : ''}`}
            </Typography>
          </Box>
        </Stack>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd} sx={{ borderRadius: 2, px: 2.5 }}>
          Ajouter un service
        </Button>
      </Stack>

      {/* Recherche */}
      <TextField
        size="small"
        placeholder="Rechercher par nom, catégorie, tag…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: colors.textMuted, fontSize: 18 }} />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 2.5, width: 380 }}
      />

      {/* Tableau */}
      <Paper elevation={0} sx={{ border: `1px solid ${colors.border}`, borderRadius: 3, overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ ...TH_SX, width: 48 }}>#</TableCell>
                <TableCell sx={{ ...TH_SX, width: 60 }}>Image</TableCell>
                <TableCell sx={TH_SX}>Nom du service</TableCell>
                <TableCell sx={TH_SX}>Catégorie</TableCell>
                <TableCell sx={TH_SX}>Groupe</TableCell>
                <TableCell sx={{ ...TH_SX, width: 110 }}>Prix moyen</TableCell>
                <TableCell sx={TH_SX}>Tags</TableCell>
                <TableCell sx={{ ...TH_SX, width: 110 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(j => (
                      <TableCell key={j}><Skeleton variant="text" width="75%" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6, color: colors.textMuted }}>
                    Aucun service trouvé
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((s, idx) => (
                  <TableRow key={s._id} hover sx={{ '&:last-child td': { border: 0 } }}>
                    <TableCell sx={{ color: colors.textMuted, fontSize: '0.8rem', pl: 2 }}>
                      {page * rowsPerPage + idx + 1}
                    </TableCell>
                    <TableCell>
                      {s.imageservice ? (
                        <Avatar src={s.imageservice} variant="rounded" sx={{ width: 34, height: 34 }} />
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
                      <Typography variant="body2" fontWeight={500}>{s.nomservice}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={s.categorie?.nomcategorie ?? '—'}
                        size="small"
                        sx={{
                          backgroundColor: alpha(colors.emerald, 0.08),
                          color: colors.emerald,
                          fontWeight: 500,
                          fontSize: '0.72rem',
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={s.categorie?.groupe?.nomgroupe ?? '—'}
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
                      {s.prixmoyen != null && s.prixmoyen > 0 ? (
                        <Typography variant="body2" color={colors.textPrimary} fontWeight={500}>
                          {s.prixmoyen.toLocaleString('fr-FR')} F
                        </Typography>
                      ) : (
                        <Typography variant="body2" color={colors.textMuted}>—</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" gap={0.5} flexWrap="wrap">
                        {(s.tags || []).slice(0, 2).map(tag => (
                          <Chip key={tag} label={tag} size="small"
                            sx={{ fontSize: '0.68rem', height: 20, backgroundColor: alpha(colors.primary, 0.07), color: colors.primary700 }} />
                        ))}
                        {s.tags.length > 2 && (
                          <Chip label={`+${s.tags.length - 2}`} size="small"
                            sx={{ fontSize: '0.68rem', height: 20, backgroundColor: colors.bgWarm, color: colors.textMuted }} />
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" gap={0.5}>
                        <Tooltip title="Modifier" arrow>
                          <IconButton size="small" onClick={() => openEdit(s)} sx={{ color: colors.primary }}>
                            <EditIcon sx={{ fontSize: 17 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Supprimer" arrow>
                          <IconButton size="small" onClick={() => handleDelete(s)} sx={{ color: colors.error }}>
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

      {/* Dialogue */}
      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 1, borderBottom: `1px solid ${colors.border}` }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography fontWeight={700} color={colors.textPrimary}>
                {editTarget ? 'Modifier le service' : 'Nouveau service'}
              </Typography>
              <Typography variant="caption" color={colors.textMuted}>
                {editTarget ? 'Modifiez les informations du service.' : 'Renseignez les informations du nouveau service.'}
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
              label="Nom du service *"
              placeholder="Ex. : Plomberie, Électricité, Design graphique"
              value={nomservice}
              onChange={e => setNomservice(e.target.value)}
              size="small"
              required
              sx={{ mb: 0 }}
            />
          </Box>

          {/* Section 2 — Classification */}
          <Box sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${colors.border}` }}>
            <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: colors.textMuted, display: 'block', mb: 2 }}>
              Classification
            </Typography>
            <Stack gap={2}>
              <TextField
                select
                fullWidth
                label="Groupe *"
                value={selectedGroupe}
                onChange={e => { setSelectedGroupe(e.target.value); setSelectedCategorie(''); }}
                size="small"
              >
                <MenuItem value=""><em>Choisir un groupe</em></MenuItem>
                {groupes.map(g => (
                  <MenuItem key={g._id} value={g._id}>{g.nomgroupe}</MenuItem>
                ))}
              </TextField>
              <TextField
                select
                fullWidth
                label="Catégorie *"
                value={selectedCategorie}
                onChange={e => setSelectedCategorie(e.target.value)}
                size="small"
                required
                disabled={!selectedGroupe}
                helperText={!selectedGroupe ? 'Sélectionnez d\'abord un groupe' : ''}
              >
                {filteredCats.length === 0 && selectedGroupe ? (
                  <MenuItem value="" disabled>Aucune catégorie pour ce groupe</MenuItem>
                ) : filteredCats.map(c => (
                  <MenuItem key={c._id} value={c._id}>{c.nomcategorie}</MenuItem>
                ))}
              </TextField>
            </Stack>
          </Box>

          {/* Section 3 — Tarification */}
          <Box sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${colors.border}` }}>
            <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: colors.textMuted, display: 'block', mb: 2 }}>
              Tarification
            </Typography>
            <TextField
              fullWidth
              label="Prix moyen indicatif (optionnel)"
              placeholder="Ex. : 15000"
              type="number"
              value={prixmoyen}
              onChange={e => setPrixmoyen(e.target.value)}
              size="small"
              InputProps={{
                startAdornment: <InputAdornment position="start"><EuroIcon sx={{ fontSize: 16, color: colors.textMuted }} /></InputAdornment>,
                endAdornment: <InputAdornment position="end"><Typography variant="caption" color={colors.textMuted}>FCFA</Typography></InputAdornment>,
              }}
              inputProps={{ min: 0 }}
              helperText="Indicatif uniquement — ne constitue pas un prix contractuel."
            />
          </Box>

          {/* Section 4 — Vocabulaire de recherche */}
          <Box sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${colors.border}` }}>
            <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: colors.textMuted, display: 'block', mb: 2 }}>
              Vocabulaire de recherche
            </Typography>
            <TagsInput tags={aliases} onChange={setAliases} label="Alias et anciens noms (synonymes)" />
            <TagsInput tags={needs} onChange={setNeeds} label="Besoins associés (fuite d’eau, robinet…)" />
            <TagsInput tags={tags} onChange={setTags} label="Tags legacy (ne pas confondre avec les alias)" />
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} mt={2}>
              <TextField
                size="small"
                label="Raccourci éditorial (1–6)"
                placeholder="Vide = hors raccourcis"
                value={shortcutRank}
                onChange={e => setShortcutRank(e.target.value)}
                helperText="Ordre stable des raccourcis Métiers. Pas un indice de popularité."
                sx={{ flex: 1 }}
              />
              <TextField
                size="small"
                label="Clé catalogue"
                placeholder="metiers.plombier"
                value={catalogKey}
                onChange={e => setCatalogKey(e.target.value)}
                helperText="Clé stable de migration. Laisser vide si non utilisé."
                sx={{ flex: 1 }}
              />
            </Stack>
          </Box>

          {/* Section 5 — Image */}
          <Box sx={{ px: 3, py: 2.5, backgroundColor: colors.bgWarm }}>
            <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: colors.textMuted, display: 'block', mb: 2 }}>
              Image
            </Typography>
            {imageFile ? (
              <Stack direction="row" alignItems="center" gap={2}>
                <Avatar
                  src={URL.createObjectURL(imageFile)}
                  variant="rounded"
                  sx={{ width: 64, height: 64 }}
                />
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body2" fontWeight={500}>{imageFile.name}</Typography>
                  <Typography variant="caption" color={colors.textMuted}>
                    {compressingImage
                      ? 'Réduction de l’image…'
                      : `${(imageFile.size / 1024).toFixed(0)} Ko — réduite avant envoi`}
                  </Typography>
                </Box>
                <Button size="small" color="inherit" onClick={() => setImageFile(null)}>
                  Annuler le fichier
                </Button>
              </Stack>
            ) : editTarget?.imageservice && !clearImage ? (
              <Stack direction="row" alignItems="center" gap={2}>
                <Avatar src={editTarget.imageservice} variant="rounded" sx={{ width: 64, height: 64 }} />
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body2">Image actuelle conservée si vous n’en choisissez pas une autre.</Typography>
                </Box>
                <Button size="small" color="inherit" onClick={() => setClearImage(true)}>
                  Retirer l’image
                </Button>
                <Button variant="outlined" component="label" size="small">
                  Remplacer
                  <input type="file" hidden accept="image/*" onChange={e => {
                    void pickImage(e.target.files?.[0] ?? null);
                    setClearImage(false);
                    e.target.value = '';
                  }} />
                </Button>
              </Stack>
            ) : (
              <Stack gap={1}>
                {clearImage && (
                  <Typography variant="caption" color={colors.textMuted}>
                    L’image actuelle sera retirée à l’enregistrement.
                  </Typography>
                )}
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<ImageIcon />}
                  sx={{ color: colors.textSecondary, borderColor: colors.border, borderStyle: 'dashed', width: '100%', py: 1.5, borderRadius: 2 }}
                >
                  Choisir une image (optionnel)
                  <input type="file" hidden accept="image/*" onChange={e => {
                    void pickImage(e.target.files?.[0] ?? null);
                    setClearImage(false);
                    e.target.value = '';
                  }} />
                </Button>
              </Stack>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${colors.border}`, gap: 1 }}>
          <Button onClick={closeDialog} color="inherit" sx={{ minWidth: 90 }}>Annuler</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || compressingImage || !nomservice.trim() || !selectedCategorie}
            sx={{ minWidth: 160, height: 40 }}
          >
            {compressingImage
              ? 'Préparation de l’image…'
              : saving
                ? 'Enregistrement…'
                : editTarget ? 'Enregistrer les modifications' : 'Créer le service'}
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

export default Service;
