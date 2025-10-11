import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Dialog, DialogActions, DialogContent,
  DialogTitle, Button, TextField, InputAdornment,
  IconButton, MenuItem, Chip, Card, CardContent,
  Avatar, Grid, CircularProgress, Select, FormControl, InputLabel,
  Tabs, Tab, Badge, Tooltip, Switch, FormControlLabel
} from '@mui/material';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ArchiveIcon from '@mui/icons-material/Archive';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import FilterListIcon from '@mui/icons-material/FilterList';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// ✅ INTERFACES TYPESCRIPT
interface IUtilisateur {
  _id: string;
  nom: string;
  prenom: string;
  photoProfil?: string;
}

interface ILocalisation {
  ville: string;
  pays: string;
}

interface IFavorite {
  _id?: string;
  utilisateur: IUtilisateur;
  objetType: 'PRESTATAIRE' | 'VENDEUR' | 'FREELANCE' | 'ARTICLE' | 'SERVICE' | 'PRESTATION' | 'COMMANDE';
  objetId: string;
  titre: string;
  description?: string;
  image?: string;
  prix?: number;
  devise?: string;
  categorie?: string;
  tags?: string[];
  localisation?: ILocalisation;
  note?: number;
  statut: 'ACTIF' | 'ARCHIVE' | 'SUPPRIME';
  vues: number;
  listePersonnalisee?: string;
  notesPersonnelles?: string;
  alertePrix: boolean;
  alerteDisponibilite: boolean;
  dateAjout: string;
  dateDerniereConsultation: string;
  createdAt?: string;
  updatedAt?: string;
}

interface IFavoriteStats {
  totalFavorites: number;
  byObjetType: Array<{ type: string; count: number }>;
  byCategorie: Array<{ categorie: string; count: number }>;
  recentFavorites: number;
}

const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const FavorisComponent: React.FC = () => {
  const [favorites, setFavorites] = useState<IFavorite[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedFavorite, setSelectedFavorite] = useState<IFavorite | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statutFilter, setStatutFilter] = useState<string>('');
  const [objetTypeFilter, setObjetTypeFilter] = useState<string>('');
  const [categorieFilter, setCategorieFilter] = useState<string>('');
  const [villeFilter, setVilleFilter] = useState<string>('');
  const [stats, setStats] = useState<IFavoriteStats | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [customLists, setCustomLists] = useState<string[]>([]);
  const [selectedList, setSelectedList] = useState<string>('');

  const statutOptions = [
    { value: '', label: 'Tous les statuts' },
    { value: 'ACTIF', label: 'Actif' },
    { value: 'ARCHIVE', label: 'Archivé' },
    { value: 'SUPPRIME', label: 'Supprimé' }
  ];

  const objetTypeOptions = [
    { value: '', label: 'Tous les types' },
    { value: 'PRESTATAIRE', label: 'Prestataire' },
    { value: 'VENDEUR', label: 'Vendeur' },
    { value: 'FREELANCE', label: 'Freelance' },
    { value: 'ARTICLE', label: 'Article' },
    { value: 'SERVICE', label: 'Service' },
    { value: 'PRESTATION', label: 'Prestation' },
    { value: 'COMMANDE', label: 'Commande' }
  ];

  // 🔹 CHARGEMENT DES FAVORIS
  const fetchFavorites = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('q', searchTerm);
      if (statutFilter) params.append('statut', statutFilter);
      if (objetTypeFilter) params.append('objetType', objetTypeFilter);
      if (categorieFilter) params.append('categorie', categorieFilter);
      if (villeFilter) params.append('ville', villeFilter);
      if (selectedList) params.append('listePersonnalisee', selectedList);

      const response = await axios.get(`${apiUrl}/favorites?${params.toString()}`);
      
      // Vérifier si la réponse est un tableau
      const data = response.data.favorites || response.data;
      if (Array.isArray(data)) {
        setFavorites(data);
      } else {
        console.error("Données favoris non valides:", data);
        setFavorites([]);
        toast.error("Format de données incorrect reçu du serveur");
      }
    } catch (error) {
      toast.error("Erreur lors du chargement des favoris");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statutFilter, objetTypeFilter, categorieFilter, villeFilter, selectedList]);

  // 🔹 CHARGEMENT DES STATISTIQUES
  const fetchStats = useCallback(async () => {
    try {
      const response = await axios.get(`${apiUrl}/favorites/stats`);
      setStats(response.data);
    } catch (error) {
      console.error("Erreur lors du chargement des statistiques:", error);
    }
  }, []);

  // 🔹 CHARGEMENT DES LISTES PERSONNALISÉES
  const fetchCustomLists = useCallback(async () => {
    try {
      const response = await axios.get(`${apiUrl}/favorites/lists`);
      
      // Vérifier si la réponse est un tableau
      if (Array.isArray(response.data)) {
        setCustomLists(response.data);
      } else {
        console.error("Données listes personnalisées non valides:", response.data);
        setCustomLists([]);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des listes:", error);
      setCustomLists([]);
    }
  }, []);

  useEffect(() => {
    fetchFavorites();
    fetchStats();
    fetchCustomLists();
  }, [fetchFavorites, fetchStats, fetchCustomLists]);

  // 🔹 GESTION DES MODALES
  const handleOpenDetail = (favorite: IFavorite) => {
    setSelectedFavorite(favorite);
    setDetailModalOpen(true);
  };

  const handleCloseDetail = () => {
    setSelectedFavorite(null);
    setDetailModalOpen(false);
  };

  // 🔹 ACTIONS SUR LES FAVORIS
  const handleDelete = async (favorite: IFavorite) => {
    if (!favorite._id) return;
    if (window.confirm(`Supprimer le favori "${favorite.titre}" ?`)) {
      try {
        await axios.delete(`${apiUrl}/favorites/${favorite._id}`);
        toast.success("Favori supprimé");
        fetchFavorites();
        fetchStats();
      } catch (error) {
        toast.error("Erreur lors de la suppression");
        console.error(error);
      }
    }
  };

  const handleArchive = async (favorite: IFavorite) => {
    if (!favorite._id) return;
    try {
      await axios.patch(`${apiUrl}/favorites/${favorite._id}/archive`);
      toast.success("Favori archivé");
      fetchFavorites();
      fetchStats();
    } catch (error) {
      toast.error("Erreur lors de l'archivage");
      console.error(error);
    }
  };

  // 🔹 FILTRAGE ET RECHERCHE
  const filteredFavorites = (Array.isArray(favorites) ? favorites : []).filter(item => {
    const matchesSearch = searchTerm === '' ||
      item.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.categorie?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatut = statutFilter === '' || item.statut === statutFilter;
    const matchesObjetType = objetTypeFilter === '' || item.objetType === objetTypeFilter;
    const matchesCategorie = categorieFilter === '' || item.categorie === categorieFilter;
    const matchesVille = villeFilter === '' || item.localisation?.ville === villeFilter;

    return matchesSearch && matchesStatut && matchesObjetType && matchesCategorie && matchesVille;
  });

  // 🔹 TEMPLATES DE COLONNES DATATABLE
  const utilisateurBodyTemplate = (rowData: IFavorite) => (
    <Box display="flex" alignItems="center">
      <Avatar src={rowData.utilisateur.photoProfil} alt={rowData.utilisateur.nom} sx={{ mr: 1 }} />
      <Typography>{rowData.utilisateur.nom} {rowData.utilisateur.prenom}</Typography>
    </Box>
  );

  const objetTypeBodyTemplate = (rowData: IFavorite) => (
    <Chip 
      label={rowData.objetType} 
      color={rowData.objetType === 'PRESTATAIRE' ? 'primary' : 
             rowData.objetType === 'VENDEUR' ? 'secondary' : 
             rowData.objetType === 'FREELANCE' ? 'success' : 'default'} 
      size="small" 
    />
  );

  const statutBodyTemplate = (rowData: IFavorite) => {
    let color: 'default' | 'primary' | 'secondary' | 'error' | 'success' | 'warning' = 'default';
    switch (rowData.statut) {
      case 'ACTIF': color = 'success'; break;
      case 'ARCHIVE': color = 'warning'; break;
      case 'SUPPRIME': color = 'error'; break;
    }
    return <Chip label={rowData.statut} color={color} size="small" />;
  };

  const prixBodyTemplate = (rowData: IFavorite) => (
    rowData.prix ? `${rowData.prix} ${rowData.devise || 'FCFA'}` : '-'
  );

  const actionsBodyTemplate = (rowData: IFavorite) => (
    <Box>
      <Tooltip title="Voir les détails">
        <IconButton color="info" onClick={() => handleOpenDetail(rowData)}>
          <VisibilityIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="Archiver">
        <IconButton color="warning" onClick={() => handleArchive(rowData)}>
          <ArchiveIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="Supprimer">
        <IconButton color="error" onClick={() => handleDelete(rowData)}>
          <DeleteIcon />
        </IconButton>
      </Tooltip>
    </Box>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Gestion des Favoris</Typography>

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" sx={{ height: '200px' }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* STATISTIQUES */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h6" color="textSecondary">Total Favoris</Typography>
                  <Typography variant="h3" color="primary">{stats?.totalFavorites || 0}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h6" color="textSecondary">Récemment ajoutés</Typography>
                  <Typography variant="h3" color="secondary">{stats?.recentFavorites || 0}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h6" color="textSecondary">Actifs</Typography>
                  <Typography variant="h3" sx={{ color: 'success.main' }}>
                    {(Array.isArray(favorites) ? favorites : []).filter(f => f.statut === 'ACTIF').length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h6" color="textSecondary">Archivés</Typography>
                  <Typography variant="h3" sx={{ color: 'warning.main' }}>
                    {(Array.isArray(favorites) ? favorites : []).filter(f => f.statut === 'ARCHIVE').length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* FILTRES ET RECHERCHE */}
          <Box display="flex" gap={2} mb={3} flexWrap="wrap">
            <TextField
              label="Rechercher dans les favoris"
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ width: { xs: '100%', sm: '200px' } }}
            />
            <FormControl variant="outlined" size="small" sx={{ width: { xs: '100%', sm: '150px' } }}>
              <InputLabel>Statut</InputLabel>
              <Select
                value={statutFilter}
                onChange={(e) => setStatutFilter(e.target.value as string)}
                label="Statut"
              >
                {statutOptions.map(option => (
                  <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl variant="outlined" size="small" sx={{ width: { xs: '100%', sm: '180px' } }}>
              <InputLabel>Type d'objet</InputLabel>
              <Select
                value={objetTypeFilter}
                onChange={(e) => setObjetTypeFilter(e.target.value as string)}
                label="Type d'objet"
              >
                {objetTypeOptions.map(option => (
                  <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl variant="outlined" size="small" sx={{ width: { xs: '100%', sm: '150px' } }}>
              <InputLabel>Liste</InputLabel>
              <Select
                value={selectedList}
                onChange={(e) => setSelectedList(e.target.value as string)}
                label="Liste"
              >
                <MenuItem value="">Toutes les listes</MenuItem>
                {(Array.isArray(customLists) ? customLists : []).map(list => (
                  <MenuItem key={list} value={list}>{list}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* DATATABLE DES FAVORIS */}
          <Card>
            <CardContent>
              <DataTable
                value={filteredFavorites}
                paginator
                rows={10}
                rowsPerPageOptions={[5, 10, 25, 50]}
                dataKey="_id"
                globalFilter={searchTerm}
                emptyMessage="Aucun favori trouvé."
                className="p-datatable-sm"
              >
                <Column field="utilisateur" header="Utilisateur" body={utilisateurBodyTemplate} sortable />
                <Column field="objetType" header="Type" body={objetTypeBodyTemplate} sortable />
                <Column field="titre" header="Titre" sortable />
                <Column field="categorie" header="Catégorie" sortable />
                <Column field="prix" header="Prix" body={prixBodyTemplate} sortable />
                <Column field="statut" header="Statut" body={statutBodyTemplate} sortable />
                <Column field="vues" header="Vues" sortable />
                <Column header="Actions" body={actionsBodyTemplate} style={{ width: '200px' }} />
              </DataTable>
            </CardContent>
          </Card>
        </>
      )}

      {/* MODALE DE DÉTAIL DU FAVORI */}
      <Dialog open={detailModalOpen} onClose={handleCloseDetail} maxWidth="md" fullWidth>
        <DialogTitle>Détails du Favori</DialogTitle>
        <DialogContent dividers>
          {selectedFavorite && (
            <Box>
              <Typography variant="h6">{selectedFavorite.titre}</Typography>
              <Typography color="textSecondary" gutterBottom>
                {selectedFavorite.objetType} • {selectedFavorite.categorie}
              </Typography>
              
              {selectedFavorite.description && (
                <Typography sx={{ mt: 2 }}>{selectedFavorite.description}</Typography>
              )}
              
              {selectedFavorite.prix && (
                <Typography sx={{ mt: 1 }}>
                  Prix: {selectedFavorite.prix} {selectedFavorite.devise}
                </Typography>
              )}
              
              {selectedFavorite.localisation && (
                <Typography sx={{ mt: 1 }}>
                  Localisation: {selectedFavorite.localisation.ville}, {selectedFavorite.localisation.pays}
                </Typography>
              )}
              
              {selectedFavorite.tags && selectedFavorite.tags.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2">Tags:</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                    {selectedFavorite.tags.map((tag, index) => (
                      <Chip key={index} label={tag} size="small" />
                    ))}
                  </Box>
                </Box>
              )}
              
              <Typography sx={{ mt: 2 }}>
                Statut: <Chip 
                  label={selectedFavorite.statut} 
                  color={selectedFavorite.statut === 'ACTIF' ? 'success' : 
                         selectedFavorite.statut === 'ARCHIVE' ? 'warning' : 'error'} 
                />
              </Typography>
              
              {selectedFavorite.listePersonnalisee && (
                <Typography sx={{ mt: 1 }}>
                  Liste: {selectedFavorite.listePersonnalisee}
                </Typography>
              )}
              
              {selectedFavorite.notesPersonnelles && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2">Notes personnelles:</Typography>
                  <Typography>{selectedFavorite.notesPersonnelles}</Typography>
                </Box>
              )}
              
              <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                <FormControlLabel
                  control={<Switch checked={selectedFavorite.alertePrix} disabled />}
                  label="Alerte prix"
                />
                <FormControlLabel
                  control={<Switch checked={selectedFavorite.alerteDisponibilite} disabled />}
                  label="Alerte disponibilité"
                />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetail} color="primary">Fermer</Button>
        </DialogActions>
      </Dialog>

      <ToastContainer />
    </Box>
  );
};

export default FavorisComponent;



