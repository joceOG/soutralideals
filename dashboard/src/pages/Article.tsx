/**
 * Article.tsx — Administration des articles Soutrali (E-marché)
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate, Link as RouterLink } from 'react-router-dom';
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
import Inventory2Icon from '@mui/icons-material/Inventory2';
import ImageIcon from '@mui/icons-material/Image';
import CloseIcon from '@mui/icons-material/Close';
import StorefrontIcon from '@mui/icons-material/Storefront';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { colors } from '../tokens/colors';
import TagsInput from '../components/TagsInput';
import {
  fetchArticles,
  parseVendeurIdFromSearch,
  mapArticleListError,
  fetchVendeurPickerOptions,
  resolveFormVendeurId,
  validateArticleForm,
  buildArticleFormData,
  saveArticle,
  mapArticleSaveError,
  ArticleListItem,
  BoutiqueContext,
  VendeurPickerOption,
} from '../services/articleService';
import { AdminFileUpload } from '../components/admin/AdminFileUpload';
import {
  VendeurShopAutocomplete,
  VendeurShopLockedSummary,
} from '../components/admin/VendeurShopAutocomplete';
import { apiClient } from '../services/setupApi';

interface CategorieOption {
  _id: string;
  label: string;
  value: string;
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

const Article: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const vendeurId = parseVendeurIdFromSearch(searchParams.toString());

  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [filtered, setFiltered] = useState<ArticleListItem[]>([]);
  const [categorieOptions, setCategorieOptions] = useState<CategorieOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [boutique, setBoutique] = useState<BoutiqueContext | null>(null);
  const [totalFiltered, setTotalFiltered] = useState(0);

  const [search, setSearch] = useState('');
  const [filterCategorie, setFilterCategorie] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ArticleListItem | null>(null);
  const [nomArticle, setNomArticle] = useState('');
  const [prixArticle, setPrixArticle] = useState('');
  const [quantiteArticle, setQuantiteArticle] = useState<string>('0');
  const [selectedCategorie, setSelectedCategorie] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [vendeurOptions, setVendeurOptions] = useState<VendeurPickerOption[]>([]);
  const [selectedVendeur, setSelectedVendeur] = useState<VendeurPickerOption | null>(null);
  const [loadingVendeurs, setLoadingVendeurs] = useState(false);
  const [vendeursLoaded, setVendeursLoaded] = useState(false);

  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: 'success' | 'error' }>({
    open: false,
    msg: '',
    severity: 'success',
  });
  const notify = (msg: string, severity: 'success' | 'error' = 'success') =>
    setSnack({ open: true, msg, severity });

  const abortRef = useRef<AbortController | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadCategories = useCallback(async () => {
    try {
      const catRes = await apiClient.get(`/categorie/groupe/E-marché`);
      setCategorieOptions(
        catRes.data.map((c: { _id: string; nomcategorie: string }) => ({
          _id: c._id,
          label: c.nomcategorie,
          value: c._id,
        })),
      );
    } catch {
      /* non bloquant */
    }
  }, []);

  const loadArticles = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setListError(null);

    try {
      if (vendeurId) {
        const result = await fetchArticles({
          vendeurId,
          search,
          categorie: filterCategorie || undefined,
          page: page + 1,
          limit: rowsPerPage,
          signal: controller.signal,
        });
        if (result.mode === 'filtered') {
          setArticles(result.items);
          setFiltered(result.items);
          setTotalFiltered(result.total);
          setBoutique(result.boutique);
        }
      } else {
        setBoutique(null);
        const result = await fetchArticles({ signal: controller.signal });
        setArticles(result.items);
        setTotalFiltered(result.total);
      }
    } catch (e) {
      const mapped = mapArticleListError(e);
      if (mapped.message === 'cancelled') return;
      setListError(mapped.message);
      setArticles([]);
      setFiltered([]);
      setTotalFiltered(0);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [vendeurId, search, filterCategorie, page, rowsPerPage]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    setPage(0);
  }, [vendeurId]);

  useEffect(() => {
    if (vendeurId) {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = setTimeout(() => {
        loadArticles();
      }, 300);
      return () => {
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      };
    }
    loadArticles();
    return () => abortRef.current?.abort();
  }, [vendeurId, search, filterCategorie, page, rowsPerPage, loadArticles]);

  useEffect(() => {
    if (vendeurId) return;
    const q = search.toLowerCase();
    setFiltered(
      articles.filter(
        (a) =>
          a.nomArticle.toLowerCase().includes(q) ||
          String(a.prixArticle).toLowerCase().includes(q) ||
          (a.categorie?.nomcategorie ?? '').toLowerCase().includes(q) ||
          a.tags.some((t) => t.toLowerCase().includes(q)),
      ),
    );
    setPage(0);
  }, [search, articles, vendeurId]);

  useEffect(() => {
    if (vendeurId) {
      setVendeursLoaded(true);
      return undefined;
    }
    let cancelled = false;
    const controller = new AbortController();
    (async () => {
      setLoadingVendeurs(true);
      try {
        const opts = await fetchVendeurPickerOptions(controller.signal);
        if (!cancelled) setVendeurOptions(opts);
      } catch {
        if (!cancelled) setVendeurOptions([]);
      } finally {
        if (!cancelled) {
          setLoadingVendeurs(false);
          setVendeursLoaded(true);
        }
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [vendeurId]);

  const vendeurLocked = Boolean(editTarget) || Boolean(vendeurId);
  const globalCreateBlocked = !vendeurId && vendeursLoaded && vendeurOptions.length === 0;

  const pickerOptionFromContext = useCallback((): VendeurPickerOption | null => {
    if (!vendeurId) return null;
    const fromList = vendeurOptions.find((o) => o.id === vendeurId);
    if (fromList) return fromList;
    if (boutique) {
      return {
        id: vendeurId,
        shopName: boutique.shopName,
        shopLogo: boutique.shopLogo ?? undefined,
        ownerLabel: '',
        categoriesLabel: '',
        isVerified: false,
      };
    }
    return {
      id: vendeurId,
      shopName: 'Boutique sélectionnée',
      ownerLabel: '',
      categoriesLabel: '',
      isVerified: false,
    };
  }, [vendeurId, vendeurOptions, boutique]);

  const resetForm = () => {
    setNomArticle('');
    setPrixArticle('');
    setQuantiteArticle('0');
    setSelectedCategorie('');
    setImageFile(null);
    setTags([]);
    setFormErrors({});
    setSelectedVendeur(null);
  };

  const openAdd = () => {
    setEditTarget(null);
    resetForm();
    if (vendeurId) {
      setSelectedVendeur(pickerOptionFromContext());
    }
    setDialogOpen(true);
  };

  const openEdit = (a: ArticleListItem) => {
    setEditTarget(a);
    setNomArticle(a.nomArticle);
    setPrixArticle(String(a.prixArticle));
    setQuantiteArticle(String(a.quantiteArticle));
    setSelectedCategorie(a.categorie?._id ?? '');
    setImageFile(null);
    setTags(a.tags || []);
    setFormErrors({});
    const v = a.vendeur;
    if (v?._id) {
      setSelectedVendeur({
        id: String(v._id),
        shopName: v.shopName ?? 'Boutique',
        shopLogo: v.shopLogo,
        ownerLabel: '',
        categoriesLabel: '',
        isVerified: false,
      });
    } else {
      setSelectedVendeur(null);
    }
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setSaving(false);
  };

  const handleSave = async () => {
    if (saving) return;
    const isUpdate = Boolean(editTarget);
    const resolvedVendeurId = resolveFormVendeurId({
      vendeurIdFromUrl: vendeurId,
      selectedVendeurId: selectedVendeur?.id ?? '',
      editVendeurId: editTarget?.vendeur?._id ? String(editTarget.vendeur._id) : null,
      isUpdate,
    });
    const values = {
      nomArticle,
      prixArticle,
      quantiteArticle,
      categorie: selectedCategorie,
      tags,
    };
    const errors = validateArticleForm(values, imageFile, {
      isUpdate,
      hasExistingPhoto: Boolean(editTarget?.photoArticle),
      resolvedVendeurId,
    });
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    setSaving(true);
    try {
      const fd = buildArticleFormData(values, imageFile, {
        isUpdate,
        vendeurId: resolvedVendeurId,
      });
      await saveArticle({
        isUpdate,
        articleId: editTarget?._id,
        formData: fd,
      });
      notify(isUpdate ? 'Article mis à jour' : 'Article ajouté');
      closeDialog();
      loadArticles();
    } catch (e) {
      notify(mapArticleSaveError(e), 'error');
      setSaving(false);
    }
  };

  const handleDelete = async (a: ArticleListItem) => {
    if (!window.confirm(`Supprimer "${a.nomArticle}" ?`)) return;
    try {
      await apiClient.delete(`/article/${a._id}`);
      notify('Article supprimé');
      loadArticles();
    } catch {
      notify('Erreur lors de la suppression', 'error');
    }
  };

  const clearShopContext = () => {
    navigate('/article');
  };

  const resetListFilters = () => {
    setSearch('');
    setFilterCategorie('');
    setPage(0);
  };

  const displayRows = vendeurId ? articles : filtered;
  const paginated = vendeurId
    ? displayRows
    : displayRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const paginationCount = vendeurId ? totalFiltered : filtered.length;

  return (
    <Box sx={{ p: 3 }}>
      {vendeurId && boutique && !listError ? (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 2.5,
            border: `1px solid ${colors.border}`,
            borderRadius: 2,
            bgcolor: colors.bgWarm,
          }}
        >
          <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" gap={2}>
            <Stack direction="row" alignItems="center" gap={1.5}>
              {boutique.shopLogo ? (
                <Avatar src={boutique.shopLogo} variant="rounded" sx={{ width: 44, height: 44 }} />
              ) : (
                <Avatar variant="rounded" sx={{ width: 44, height: 44, bgcolor: alpha(colors.primary, 0.12) }}>
                  <StorefrontIcon color="primary" />
                </Avatar>
              )}
              <Box>
                <Typography variant="overline" color={colors.textMuted}>
                  Articles de la boutique
                </Typography>
                <Typography variant="h6" fontWeight={600}>
                  {boutique.shopName}
                </Typography>
                <Stack direction="row" gap={1} mt={0.5} flexWrap="wrap">
                  <Chip size="small" label={`${totalFiltered} article${totalFiltered > 1 ? 's' : ''}`} />
                  <Chip size="small" variant="outlined" label="Filtre boutique actif" />
                </Stack>
              </Box>
            </Stack>
            <Stack direction="row" gap={1} flexWrap="wrap">
              <Button size="small" component={RouterLink} to="/vendeur" startIcon={<ArrowBackIcon />}>
                Vendeurs
              </Button>
              <Button size="small" variant="outlined" onClick={clearShopContext}>
                Afficher tous les articles
              </Button>
            </Stack>
          </Stack>
        </Paper>
      ) : null}

      {listError ? (
        <Alert
          severity="error"
          sx={{ mb: 2, borderRadius: 2 }}
          action={
            <Button color="inherit" size="small" onClick={clearShopContext}>
              Catalogue global
            </Button>
          }
        >
          {listError}
        </Alert>
      ) : null}

      {!vendeurId && vendeursLoaded && vendeurOptions.length === 0 ? (
        <Alert
          severity="warning"
          sx={{ mb: 2, borderRadius: 2 }}
          action={
            <Button component={RouterLink} to="/vendeur" color="inherit" size="small">
              Créer un vendeur
            </Button>
          }
        >
          Créez d&apos;abord un vendeur/boutique pour pouvoir ajouter des articles au catalogue.
        </Alert>
      ) : null}

      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Stack direction="row" alignItems="center" gap={1.5}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              backgroundColor: alpha(colors.warning, 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Inventory2Icon sx={{ color: colors.warning, fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="body2" fontWeight={500} color={colors.textSecondary}>
              {vendeurId ? 'Produits de la boutique sélectionnée.' : "Gérez les produits de l'E-marché."}
            </Typography>
            <Typography variant="caption" color={colors.textMuted}>
              {loading ? '…' : `${paginationCount} article${paginationCount > 1 ? 's' : ''}`}
            </Typography>
          </Box>
        </Stack>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openAdd}
          disabled={globalCreateBlocked}
          sx={{ borderRadius: 2, px: 2.5 }}
        >
          Ajouter un article
        </Button>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} mb={2.5} alignItems={{ sm: 'center' }}>
        <TextField
          size="small"
          placeholder="Rechercher par nom, catégorie, tag…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            if (vendeurId) setPage(0);
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: colors.textMuted, fontSize: 18 }} />
              </InputAdornment>
            ),
          }}
          sx={{ width: { xs: '100%', sm: 380 } }}
        />
        {vendeurId ? (
          <TextField
            select
            size="small"
            label="Catégorie"
            value={filterCategorie}
            onChange={(e) => {
              setFilterCategorie(e.target.value);
              setPage(0);
            }}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">Toutes</MenuItem>
            {categorieOptions.map((c) => (
              <MenuItem key={c._id} value={c.value}>
                {c.label}
              </MenuItem>
            ))}
          </TextField>
        ) : null}
        {vendeurId ? (
          <Button size="small" onClick={resetListFilters}>
            Réinitialiser les filtres
          </Button>
        ) : null}
      </Stack>

      <Paper elevation={0} sx={{ border: `1px solid ${colors.border}`, borderRadius: 3, overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ ...TH_SX, width: 48 }}>#</TableCell>
                <TableCell sx={{ ...TH_SX, width: 60 }}>Photo</TableCell>
                <TableCell sx={TH_SX}>Nom</TableCell>
                <TableCell sx={TH_SX}>Catégorie</TableCell>
                <TableCell sx={{ ...TH_SX, width: 120 }}>Prix</TableCell>
                <TableCell sx={{ ...TH_SX, width: 90 }}>Qté</TableCell>
                <TableCell sx={TH_SX}>Tags</TableCell>
                <TableCell sx={{ ...TH_SX, width: 110 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((j) => (
                      <TableCell key={j}>
                        <Skeleton variant="text" width="75%" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6, color: colors.textMuted }}>
                    {vendeurId ? 'Aucun article pour cette boutique' : 'Aucun article trouvé'}
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((a, idx) => (
                  <TableRow key={a._id} hover sx={{ '&:last-child td': { border: 0 } }}>
                    <TableCell sx={{ color: colors.textMuted, fontSize: '0.8rem', pl: 2 }}>
                      {vendeurId ? page * rowsPerPage + idx + 1 : page * rowsPerPage + idx + 1}
                    </TableCell>
                    <TableCell>
                      {a.photoArticle ? (
                        <Avatar src={a.photoArticle} variant="rounded" sx={{ width: 34, height: 34 }} />
                      ) : (
                        <Box
                          sx={{
                            width: 34,
                            height: 34,
                            borderRadius: 1,
                            backgroundColor: colors.bgWarm,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <ImageIcon sx={{ fontSize: 16, color: colors.textMuted }} />
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {a.nomArticle}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {a.categorie ? (
                        <Chip
                          label={a.categorie.nomcategorie}
                          size="small"
                          sx={{
                            backgroundColor: alpha(colors.warning, 0.08),
                            color: '#B45309',
                            fontWeight: 500,
                            fontSize: '0.72rem',
                          }}
                        />
                      ) : (
                        <Typography variant="body2" color={colors.textMuted}>
                          —
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {a.prixArticle} F
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={a.quantiteArticle}
                        size="small"
                        sx={{
                          backgroundColor:
                            a.quantiteArticle > 0 ? alpha(colors.success, 0.1) : alpha(colors.error, 0.08),
                          color: a.quantiteArticle > 0 ? colors.success : colors.error,
                          fontWeight: 600,
                          minWidth: 36,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" gap={0.5} flexWrap="wrap">
                        {(a.tags || []).slice(0, 2).map((tag) => (
                          <Chip
                            key={tag}
                            label={tag}
                            size="small"
                            sx={{
                              fontSize: '0.68rem',
                              height: 20,
                              backgroundColor: alpha(colors.primary, 0.07),
                              color: colors.primary700,
                            }}
                          />
                        ))}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" gap={0.5}>
                        <Tooltip title="Modifier" arrow>
                          <IconButton size="small" onClick={() => openEdit(a)} sx={{ color: colors.primary }}>
                            <EditIcon sx={{ fontSize: 17 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Supprimer" arrow>
                          <IconButton size="small" onClick={() => handleDelete(a)} sx={{ color: colors.error }}>
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
          count={paginationCount}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(+e.target.value);
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25]}
          labelRowsPerPage="Par page :"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} sur ${count}`}
          sx={{ borderTop: `1px solid ${colors.border}` }}
        />
      </Paper>

      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 1, borderBottom: `1px solid ${colors.border}` }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography fontWeight={700}>{editTarget ? "Modifier l'article" : 'Nouvel article'}</Typography>
              {vendeurId && boutique ? (
                <Typography variant="caption" color={colors.textMuted}>
                  Boutique : {boutique.shopName}
                </Typography>
              ) : null}
            </Box>
            <IconButton size="small" onClick={closeDialog} aria-label="Fermer">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          <Box sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${colors.border}` }}>
            <Typography variant="overline" color={colors.textMuted} display="block" mb={1.5}>
              Informations principales
            </Typography>
            <TextField
              fullWidth
              label="Nom de l'article *"
              value={nomArticle}
              onChange={(e) => setNomArticle(e.target.value)}
              size="small"
              required
              error={Boolean(formErrors.nomArticle)}
              helperText={formErrors.nomArticle}
            />
          </Box>
          <Box sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${colors.border}` }}>
            <Typography variant="overline" color={colors.textMuted} display="block" mb={1.5}>
              Boutique
            </Typography>
            {vendeurLocked && selectedVendeur ? (
              <VendeurShopLockedSummary
                shopName={selectedVendeur.shopName}
                shopLogo={selectedVendeur.shopLogo ?? boutique?.shopLogo}
                ownerLabel={selectedVendeur.ownerLabel || undefined}
                lockedHint={
                  editTarget
                    ? 'Le propriétaire ne peut pas être modifié en édition.'
                    : 'Vendeur verrouillé pour cette boutique (contexte URL).'
                }
              />
            ) : (
              <VendeurShopAutocomplete
                options={vendeurOptions}
                value={selectedVendeur}
                onChange={setSelectedVendeur}
                loading={loadingVendeurs}
                disabled={saving}
                error={formErrors.vendeur}
              />
            )}
          </Box>
          <Box sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${colors.border}` }}>
            <Typography variant="overline" color={colors.textMuted} display="block" mb={1.5}>
              Prix et disponibilité
            </Typography>
            <Stack direction="row" gap={2}>
              <TextField
                fullWidth
                label="Prix (FCFA)"
                value={prixArticle}
                onChange={(e) => setPrixArticle(e.target.value)}
                size="small"
              />
              <TextField
                fullWidth
                label="Quantité"
                type="number"
                value={quantiteArticle}
                onChange={(e) => setQuantiteArticle(e.target.value)}
                size="small"
                inputProps={{ min: 0 }}
              />
            </Stack>
          </Box>
          <Box sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${colors.border}` }}>
            <TextField
              select
              fullWidth
              label="Catégorie E-marché *"
              value={selectedCategorie}
              onChange={(e) => setSelectedCategorie(e.target.value)}
              size="small"
              required
              error={Boolean(formErrors.categorie)}
              helperText={formErrors.categorie}
            >
              <MenuItem value="" disabled>
                Choisir une catégorie
              </MenuItem>
              {categorieOptions.map((c) => (
                <MenuItem key={c._id} value={c.value}>
                  {c.label}
                </MenuItem>
              ))}
            </TextField>
            <Box mt={2}>
              <TagsInput tags={tags} onChange={setTags} label="Tags" />
            </Box>
          </Box>
          <Box sx={{ px: 3, py: 2.5, backgroundColor: colors.bgWarm }}>
            <AdminFileUpload
              label={editTarget ? 'Photo de l’article' : 'Photo de l’article *'}
              helperText={
                editTarget
                  ? 'La photo actuelle est conservée si vous ne choisissez pas de fichier.'
                  : 'Une photo est obligatoire pour publier l’article.'
              }
              file={imageFile}
              onFileChange={setImageFile}
              error={formErrors.photoArticle}
              disabled={saving}
              existingLabel={
                editTarget?.photoArticle ? 'Photo enregistrée sur le serveur (aperçu liste).' : undefined
              }
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={closeDialog} disabled={saving}>
            Annuler
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Enregistrement…' : editTarget ? 'Enregistrer' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={3500} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
        <Alert severity={snack.severity} variant="filled">
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Article;
