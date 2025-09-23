import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Dialog, DialogActions, DialogContent,
  DialogTitle, Button, TextField, InputAdornment,
  IconButton, MenuItem, Chip, Card, CardContent,
  Grid, FormControl, InputLabel, Select, Switch,
  FormControlLabel, Alert, LinearProgress
} from '@mui/material';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AddIcon from '@mui/icons-material/Add';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CampaignIcon from '@mui/icons-material/Campaign';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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

const Promotions: React.FC = () => {
  const [promotions, setPromotions] = useState<IPromotion[]>([]);
  const [loading, setLoading] = useState(true);
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
      const response = await axios.get('/api/promotions');
      setPromotions(response.data.promotions || response.data);
    } catch (error) {
      console.error('Erreur chargement promotions:', error);
      toast.error('Erreur lors du chargement des promotions');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await axios.get('/api/promotions/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    }
  };

  // ✅ GESTION DES PROMOTIONS
  const handleCreatePromotion = async () => {
    try {
      await axios.post('/api/promotion', formData);
      toast.success('Promotion créée avec succès');
      setOpenDialog(false);
      resetForm();
      loadPromotions();
      loadStats();
    } catch (error) {
      console.error('Erreur création promotion:', error);
      toast.error('Erreur lors de la création');
    }
  };

  const handleUpdatePromotion = async () => {
    if (!editingPromotion?._id) return;
    
    try {
      await axios.put(`/api/promotion/${editingPromotion._id}`, formData);
      toast.success('Promotion mise à jour');
      setOpenDialog(false);
      resetForm();
      loadPromotions();
    } catch (error) {
      console.error('Erreur mise à jour:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleDeletePromotion = async (id: string) => {
    if (!window.confirm('Supprimer cette promotion ?')) return;
    
    try {
      await axios.delete(`/api/promotion/${id}`);
      toast.success('Promotion supprimée');
      loadPromotions();
      loadStats();
    } catch (error) {
      console.error('Erreur suppression:', error);
      toast.error('Erreur lors de la suppression');
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
      <ToastContainer />
      
      {/* ✅ EN-TÊTE AVEC STATISTIQUES */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <CampaignIcon /> Gestion des Promotions
        </Typography>
        
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

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            resetForm();
            setOpenDialog(true);
          }}
          sx={{ ml: 'auto' }}
        >
          Nouvelle Promotion
        </Button>
      </Box>

      {/* ✅ TABLEAU DES PROMOTIONS */}
      {loading ? (
        <LinearProgress />
      ) : (
        <DataTable
          value={filteredPromotions}
          paginator
          rows={10}
          rowsPerPageOptions={[5, 10, 25]}
          emptyMessage="Aucune promotion trouvée"
        >
          <Column field="titre" header="Titre" sortable />
          <Column 
            field="typeOffre" 
            header="Type d'offre" 
            body={(rowData) => renderTypeOffre(rowData.typeOffre, rowData.valeurOffre)}
          />
          <Column field="dateDebut" header="Date début" sortable />
          <Column field="dateFin" header="Date fin" sortable />
          <Column 
            field="statut" 
            header="Statut" 
            body={(rowData) => renderStatus(rowData.statut)}
          />
          <Column field="vues" header="Vues" sortable />
          <Column field="clics" header="Clics" sortable />
          <Column field="conversions" header="Conversions" sortable />
          <Column header="Actions" body={renderActions} />
        </DataTable>
      )}

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
                onChange={(e) => setFormData({...formData, titre: e.target.value})}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Type d'offre</InputLabel>
                <Select
                  value={formData.typeOffre}
                  onChange={(e) => setFormData({...formData, typeOffre: e.target.value as any})}
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
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Valeur de l'offre"
                type="number"
                value={formData.valeurOffre}
                onChange={(e) => setFormData({...formData, valeurOffre: Number(e.target.value)})}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Montant minimum"
                type="number"
                value={formData.montantMinimum}
                onChange={(e) => setFormData({...formData, montantMinimum: Number(e.target.value)})}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Date de début"
                type="datetime-local"
                value={formData.dateDebut}
                onChange={(e) => setFormData({...formData, dateDebut: e.target.value})}
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
                onChange={(e) => setFormData({...formData, dateFin: e.target.value})}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Type de ciblage</InputLabel>
                <Select
                  value={formData.typeCiblage}
                  onChange={(e) => setFormData({...formData, typeCiblage: e.target.value as any})}
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
                onChange={(e) => setFormData({...formData, couleur: e.target.value})}
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
    </Box>
  );
};

export default Promotions;
