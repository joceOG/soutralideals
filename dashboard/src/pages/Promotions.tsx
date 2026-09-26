import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Dialog, DialogActions, DialogContent,
  DialogTitle, Button, TextField, InputAdornment,
  IconButton, MenuItem, Chip, Card, CardContent,
  Grid, FormControl, InputLabel, Select, Switch,
  FormControlLabel, Alert
} from '@mui/material';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, Paper, Skeleton, Snackbar, Stack, Tooltip,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import CampaignIcon from '@mui/icons-material/Campaign';
import { apiClient } from '../services/setupApi';
import { colors } from '../tokens/colors';

// ✅ INTERFACES TYPESCRIPT
interface IPromotion {
  _id?: string;
  titre: string;
  description: string;
  typeCiblage: 'TOUS' | 'CATEGORIE' | 'SERVICE' | 'UTILISATEUR' | 'VILLE';
  cibles: string[];
  cibleModel?: 'Categorie' | 'Service' | 'Utilisateur';
  typeOffre: 'POURCENTAGE' | 'MONTANT_FIXE' | 'LIVRAISON_GRATUITE' | 'PRODUIT_GRATUIT';
  valeurOffre: number;
  montantMinimum: number;
  dateDebut: string;
  dateFin: string;
  image?: string;
  couleur: string;
  vues: number;
  clics: number;
  conversions: number;
  statut: 'ACTIVE' | 'PAUSEE' | 'TERMINEE' | 'BROUILLON';
  createur: string;
  createdAt?: string;
  updatedAt?: string;
}

interface IStatsPromotions {
  totalPromotions: number;
  promotionsActives: number;
  totalVues: number;
  totalClics: number;
  totalConversions: number;
}

const TH_SX = {
  color: colors.textSecondary, fontWeight: 600, fontSize: '0.72rem',
  textTransform: 'uppercase' as const, letterSpacing: '0.06em',
  backgroundColor: colors.bgWarm, borderBottom: `1px solid ${colors.border}`,
  py: 1.5, px: 2,
};

const Promotions: React.FC = () => {
    const [promotions, setPromotions] = useState<IPromotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [tablePage, setTablePage] = useState(0);
  const [tableRowsPerPage, setTableRowsPerPage] = useState(10);
  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: 'success' | 'error' }>({ open: false, msg: '', severity: 'success' });
  const notify = (msg: string, severity: 'success' | 'error' = 'success') => setSnack({ open: true, msg, severity });
  const [openDialog, setOpenDialog] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<IPromotion | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('TOUS');
  const [stats, setStats] = useState<IStatsPromotions | null>(null);

  // ✅ ÉTAT DU FORMULAIRE
  const [formData, setFormData] = useState<Partial<IPromotion>>({
    titre: '',
    description: '',
    typeCiblage: 'TOUS',
    cibles: [],
    typeOffre: 'POURCENTAGE',
    valeurOffre: 0,
    montantMinimum: 0,
    dateDebut: '',
    dateFin: '',
    couleur: '#FF6B6B',
    statut: 'BROUILLON'
  });

  // ✅ CHARGEMENT DES DONNÉES
  useEffect(() => {
    loadPromotions();
    loadStats();
  }, []);

  const loadPromotions = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/promotions`);
      setPromotions(response.data.promotions || response.data);
    } catch (error) {
      console.error('Erreur chargement promotions:', error);
      notify('Erreur lors du chargement des promotions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await apiClient.get(`/promotions/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    }
  };

  // ✅ GESTION DES PROMOTIONS
  const handleCreatePromotion = async () => {
    try {
      await apiClient.post(`/promotion`, formData);
      notify('Promotion créée avec succès');
      setOpenDialog(false);
      resetForm();
      loadPromotions();
      loadStats();
    } catch (error) {
      console.error('Erreur création promotion:', error);
      notify('Erreur lors de la création', 'error');
    }
  };

  const handleUpdatePromotion = async () => {
    if (!editingPromotion?._id) return;

    try {
      await apiClient.put(`/promotion/${editingPromotion._id}`, formData);
      notify('Promotion mise à jour');
      setOpenDialog(false);
      resetForm();
      loadPromotions();
    } catch (error) {
      console.error('Erreur mise à jour:', error);
      notify('Erreur lors de la mise à jour', 'error');
    }
  };

  const handleDeletePromotion = async (id: string) => {
    if (!window.confirm('Supprimer cette promotion ?')) return;

    try {
      await apiClient.delete(`/promotion/${id}`);
      notify('Promotion supprimée');
      loadPromotions();
      loadStats();
    } catch (error) {
      console.error('Erreur suppression:', error);
      notify('Erreur lors de la suppression', 'error');
    }
  };

  const handleEditPromotion = (promotion: IPromotion) => {
    setEditingPromotion(promotion);
    setFormData(promotion);
    setOpenDialog(true);
  };

  const resetForm = () => {
    setFormData({
      titre: '',
      description: '',
      typeCiblage: 'TOUS',
      cibles: [],
      typeOffre: 'POURCENTAGE',
      valeurOffre: 0,
      montantMinimum: 0,
      dateDebut: '',
      dateFin: '',
      couleur: '#FF6B6B',
      statut: 'BROUILLON'
    });
    setEditingPromotion(null);
  };

  // ✅ FILTRAGE ET RECHERCHE
  const filteredPromotions = promotions.filter(promotion => {
    const matchesSearch = promotion.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      promotion.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'TOUS' || promotion.statut === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // ✅ RENDU DES COLONNES
  const renderStatus = (statut: string) => {
    const colors = {
      'ACTIVE': 'success',
      'PAUSEE': 'warning',
      'TERMINEE': 'error',
      'BROUILLON': 'default'
    } as const;

    return <Chip label={statut} color={colors[statut as keyof typeof colors]} size="small" />;
  };

  const renderTypeOffre = (typeOffre: string, valeurOffre: number) => {
    switch (typeOffre) {
      case 'POURCENTAGE':
        return `${valeurOffre}%`;
      case 'MONTANT_FIXE':
        return `${valeurOffre} FCFA`;
      case 'LIVRAISON_GRATUITE':
        return 'Livraison gratuite';
      case 'PRODUIT_GRATUIT':
        return 'Produit gratuit';
      default:
        return valeurOffre.toString();
    }
  };

  const renderActions = (rowData: IPromotion) => (
    <Box>
      <IconButton onClick={() => handleEditPromotion(rowData)} size="small">
        <EditIcon />
      </IconButton>
      <IconButton onClick={() => handleDeletePromotion(rowData._id!)} size="small">
        <DeleteIcon />
      </IconButton>
    </Box>
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* En-tête */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2.5}>
        <Stack direction="row" alignItems="center" gap={1.5}>
          <Box sx={{ width: 40, height: 40, borderRadius: 2, backgroundColor: alpha(colors.primary, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CampaignIcon sx={{ color: colors.primary, fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="body2" fontWeight={500} color={colors.textSecondary}>
              Gérez les offres promotionnelles de la plateforme.
            </Typography>
            <Typography variant="caption" color={colors.textMuted}>
              {loading ? '…' : `${filteredPromotions.length} promotion${filteredPromotions.length > 1 ? 's' : ''}`}
            </Typography>
          </Box>
        </Stack>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { resetForm(); setOpenDialog(true); }} sx={{ borderRadius: 2, px: 2.5 }}>
          Nouvelle promotion
        </Button>
      </Stack>
      <Box sx={{ mb: 3 }}>

        {stats && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={2.4}>
              <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
                <CardContent>
                  <Typography variant="h6">{stats.totalPromotions}</Typography>
                  <Typography variant="body2">Total Promotions</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <Card sx={{ bgcolor: 'success.main', color: 'white' }}>
                <CardContent>
                  <Typography variant="h6">{stats.promotionsActives}</Typography>
                  <Typography variant="body2">Actives</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <Card sx={{ bgcolor: 'info.main', color: 'white' }}>
                <CardContent>
                  <Typography variant="h6">{stats.totalVues}</Typography>
                  <Typography variant="body2">Vues</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <Card sx={{ bgcolor: 'warning.main', color: 'white' }}>
                <CardContent>
                  <Typography variant="h6">{stats.totalClics}</Typography>
                  <Typography variant="body2">Clics</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <Card sx={{ bgcolor: 'secondary.main', color: 'white' }}>
                <CardContent>
                  <Typography variant="h6">{stats.totalConversions}</Typography>
                  <Typography variant="body2">Conversions</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Box>

      {/* ✅ BARRE D'OUTILS */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          placeholder="Rechercher..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 200 }}
        />

        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Statut</InputLabel>
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            label="Statut"
          >
            <MenuItem value="TOUS">Tous</MenuItem>
            <MenuItem value="ACTIVE">Actives</MenuItem>
            <MenuItem value="PAUSEE">En pause</MenuItem>
            <MenuItem value="TERMINEE">Terminées</MenuItem>
            <MenuItem value="BROUILLON">Brouillons</MenuItem>
          </Select>
        </FormControl>

      </Box>

      {/* Tableau des promotions */}
      {(() => {
        const statutColor = (s: string) => {
          if (s === 'ACTIVE') return { bg: alpha(colors.success, 0.1), color: colors.success };
          if (s === 'PAUSEE') return { bg: alpha(colors.warning, 0.1), color: '#B45309' };
          if (s === 'TERMINEE') return { bg: alpha(colors.error, 0.08), color: colors.error };
          return { bg: colors.bgWarm, color: colors.textMuted };
        };
        const paged = filteredPromotions.slice(tablePage * tableRowsPerPage, (tablePage + 1) * tableRowsPerPage);
        return (
          <Paper elevation={0} sx={{ border: `1px solid ${colors.border}`, borderRadius: 3, overflow: 'hidden' }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={TH_SX}>Titre</TableCell>
                    <TableCell sx={TH_SX}>Type d'offre</TableCell>
                    <TableCell sx={{ ...TH_SX, width: 110 }}>Date début</TableCell>
                    <TableCell sx={{ ...TH_SX, width: 110 }}>Date fin</TableCell>
                    <TableCell sx={{ ...TH_SX, width: 110 }}>Statut</TableCell>
                    <TableCell sx={{ ...TH_SX, width: 70 }}>Vues</TableCell>
                    <TableCell sx={{ ...TH_SX, width: 70 }}>Clics</TableCell>
                    <TableCell sx={{ ...TH_SX, width: 90 }}>Conversions</TableCell>
                    <TableCell sx={{ ...TH_SX, width: 90 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>{[1, 2, 3, 4, 5, 6, 7, 8, 9].map(j => <TableCell key={j}><Skeleton variant="text" /></TableCell>)}</TableRow>
                    ))
                  ) : paged.length === 0 ? (
                    <TableRow><TableCell colSpan={9} align="center" sx={{ py: 6, color: colors.textMuted }}>Aucune promotion trouvée</TableCell></TableRow>
                  ) : paged.map(p => {
                    const sc = statutColor(p.statut);
                    return (
                      <TableRow key={p._id} hover sx={{ '&:last-child td': { border: 0 } }}>
                        <TableCell><Typography variant="body2" fontWeight={500}>{p.titre}</Typography></TableCell>
                        <TableCell><Typography variant="body2" color={colors.textSecondary}>{renderTypeOffre(p.typeOffre, p.valeurOffre)}</Typography></TableCell>
                        <TableCell><Typography variant="body2" color={colors.textSecondary}>{p.dateDebut ? new Date(p.dateDebut).toLocaleDateString('fr-FR') : '—'}</Typography></TableCell>
                        <TableCell><Typography variant="body2" color={colors.textSecondary}>{p.dateFin ? new Date(p.dateFin).toLocaleDateString('fr-FR') : '—'}</Typography></TableCell>
                        <TableCell><Chip label={p.statut} size="small" sx={{ fontSize: '0.72rem', bgcolor: sc.bg, color: sc.color, fontWeight: 600 }} /></TableCell>
                        <TableCell><Typography variant="body2">{p.vues ?? 0}</Typography></TableCell>
                        <TableCell><Typography variant="body2">{p.clics ?? 0}</Typography></TableCell>
                        <TableCell><Typography variant="body2">{p.conversions ?? 0}</Typography></TableCell>
                        <TableCell>
                          <Stack direction="row" gap={0.5}>
                            <Tooltip title="Modifier"><IconButton size="small" onClick={() => handleEditPromotion(p)} sx={{ color: colors.primary }}><EditIcon sx={{ fontSize: 17 }} /></IconButton></Tooltip>
                            <Tooltip title="Supprimer"><IconButton size="small" onClick={() => handleDeletePromotion(p._id!)} sx={{ color: colors.error }}><DeleteIcon sx={{ fontSize: 17 }} /></IconButton></Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div" count={filteredPromotions.length} page={tablePage} rowsPerPage={tableRowsPerPage}
              onPageChange={(_, pg) => setTablePage(pg)} onRowsPerPageChange={e => { setTableRowsPerPage(+e.target.value); setTablePage(0); }}
              rowsPerPageOptions={[5, 10, 25]} labelRowsPerPage="Par page :"
              labelDisplayedRows={({ from, to, count }) => `${from}–${to} sur ${count}`}
              sx={{ borderTop: `1px solid ${colors.border}` }}
            />
          </Paper>
        );
      })()}

      {/* ✅ DIALOG CRÉATION/ÉDITION */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingPromotion ? 'Modifier la Promotion' : 'Nouvelle Promotion'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Titre"
                value={formData.titre}
                onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Type d'offre</InputLabel>
                <Select
                  value={formData.typeOffre}
                  onChange={(e) => setFormData({ ...formData, typeOffre: e.target.value as any })}
                  label="Type d'offre"
                >
                  <MenuItem value="POURCENTAGE">Pourcentage</MenuItem>
                  <MenuItem value="MONTANT_FIXE">Montant fixe</MenuItem>
                  <MenuItem value="LIVRAISON_GRATUITE">Livraison gratuite</MenuItem>
                  <MenuItem value="PRODUIT_GRATUIT">Produit gratuit</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Valeur de l'offre"
                type="number"
                value={formData.valeurOffre}
                onChange={(e) => setFormData({ ...formData, valeurOffre: Number(e.target.value) })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Montant minimum"
                type="number"
                value={formData.montantMinimum}
                onChange={(e) => setFormData({ ...formData, montantMinimum: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Date de début"
                type="datetime-local"
                value={formData.dateDebut}
                onChange={(e) => setFormData({ ...formData, dateDebut: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Date de fin"
                type="datetime-local"
                value={formData.dateFin}
                onChange={(e) => setFormData({ ...formData, dateFin: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Type de ciblage</InputLabel>
                <Select
                  value={formData.typeCiblage}
                  onChange={(e) => setFormData({ ...formData, typeCiblage: e.target.value as any })}
                  label="Type de ciblage"
                >
                  <MenuItem value="TOUS">Tous les utilisateurs</MenuItem>
                  <MenuItem value="CATEGORIE">Par catégorie</MenuItem>
                  <MenuItem value="SERVICE">Par service</MenuItem>
                  <MenuItem value="UTILISATEUR">Utilisateurs spécifiques</MenuItem>
                  <MenuItem value="VILLE">Par ville</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Couleur"
                type="color"
                value={formData.couleur}
                onChange={(e) => setFormData({ ...formData, couleur: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.statut === 'ACTIVE'}
                    onChange={(e) => setFormData({
                      ...formData,
                      statut: e.target.checked ? 'ACTIVE' : 'BROUILLON'
                    })}
                  />
                }
                label="Promotion active"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Annuler</Button>
          <Button
            onClick={editingPromotion ? handleUpdatePromotion : handleCreatePromotion}
            variant="contained"
          >
            {editingPromotion ? 'Mettre à jour' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={snack.open} autoHideDuration={3500} onClose={() => setSnack(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.severity} variant="filled" onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
};

export default Promotions;
