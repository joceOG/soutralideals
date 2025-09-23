import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Dialog, DialogActions, DialogContent,
  DialogTitle, Button, TextField, InputAdornment,
  IconButton, MenuItem, Chip, Card, CardContent,
  Grid, Avatar
} from '@mui/material';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// ✅ INTERFACES TYPESCRIPT
interface IUtilisateur {
  _id: string;
  nom: string;
  prenom: string;
  email?: string;
  telephone?: string;
  photoProfil?: string;
}

interface IPrestataire {
  _id: string;
  utilisateur: IUtilisateur;
  localisation?: string;
}

interface IService {
  _id: string;
  nomservice: string;
  categorie: {
    _id: string;
    nomcategorie: string;
  };
}

interface IPrestation {
  _id?: string;
  utilisateur: IUtilisateur;
  prestataire: IPrestataire;
  service: IService;
  datePrestation: string;
  heureDebut: string;
  heureFin?: string;
  dureeEstimee?: number;
  adresse: string;
  ville: string;
  codePostal?: string;
  tarifHoraire: number;
  montantTotal: number;
  fraisDeplacements?: number;
  statut: string;
  statutPaiement: string;
  moyenPaiement: string;
  description: string;
  notesClient?: string;
  notesPrestataire?: string;
  noteClient?: number;
  notePrestataire?: number;
  photosAvant?: string[];
  photosApres?: string[];
  createdAt?: string;
  updatedAt?: string;
}

interface IPrestationStats {
  statsParStatut: Array<{
    _id: string;
    count: number;
    totalRevenu: number;
  }>;
  statsParVille: Array<{
    _id: string;
    count: number;
    totalRevenu: number;
  }>;
  totalPrestations: number;
  revenueTotal: number;
}

const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const PrestationsComponent: React.FC = () => {
  const [prestations, setPrestations] = useState<IPrestation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [statutModalOpen, setStatutModalOpen] = useState(false);
  const [selectedPrestation, setSelectedPrestation] = useState<IPrestation | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statutFilter, setStatutFilter] = useState<string>('');
  const [villeFilter, setVilleFilter] = useState<string>('');
  const [stats, setStats] = useState<IPrestationStats | null>(null);

  const [formData, setFormData] = useState<Partial<IPrestation>>({
    datePrestation: '',
    heureDebut: '',
    adresse: '',
    ville: '',
    tarifHoraire: 0,
    montantTotal: 0,
    moyenPaiement: 'CARTE',
    description: '',
    statut: 'EN_ATTENTE',
    statutPaiement: 'ATTENTE'
  });

  const [statutData, setStatutData] = useState({
    nouveauStatut: '',
    commentaire: ''
  });

  const statutOptions = [
    'EN_ATTENTE', 'ACCEPTEE', 'REFUSEE', 'EN_COURS', 'TERMINEE', 'ANNULEE', 'LITIGE'
  ];

  const statutPaiementOptions = [
    'ATTENTE', 'PAYE', 'REMBOURSE', 'ECHEC'
  ];

  const moyenPaiementOptions = [
    'CARTE', 'MOBILE_MONEY', 'ESPECES', 'VIREMENT'
  ];

  // 🔹 CHARGEMENT DES PRESTATIONS
  const fetchPrestations = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${apiUrl}/prestations`);
      setPrestations(response.data.prestations || response.data);
    } catch (error) {
      toast.error("Erreur lors du chargement des prestations");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 CHARGEMENT DES STATISTIQUES
  const fetchStats = async () => {
    try {
      const response = await axios.get(`${apiUrl}/prestations/stats`);
      setStats(response.data);
    } catch (error) {
      console.error("Erreur lors du chargement des statistiques:", error);
    }
  };

  useEffect(() => {
    fetchPrestations();
    fetchStats();
  }, []);

  // 🔹 GESTION DES MODALES
  const handleOpen = (prestation: IPrestation | null = null) => {
    setSelectedPrestation(prestation);
    if (prestation) {
      setFormData(prestation);
    } else {
      setFormData({
        datePrestation: '',
        heureDebut: '',
        adresse: '',
        ville: '',
        tarifHoraire: 0,
        montantTotal: 0,
        moyenPaiement: 'CARTE',
        description: '',
        statut: 'EN_ATTENTE',
        statutPaiement: 'ATTENTE'
      });
    }
    setModalOpen(true);
  };

  const handleClose = () => {
    setSelectedPrestation(null);
    setModalOpen(false);
    setDetailModalOpen(false);
    setStatutModalOpen(false);
  };

  const handleDetail = (prestation: IPrestation) => {
    setSelectedPrestation(prestation);
    setDetailModalOpen(true);
  };

  const handleStatutModal = (prestation: IPrestation) => {
    setSelectedPrestation(prestation);
    setStatutData({
      nouveauStatut: prestation.statut,
      commentaire: ''
    });
    setStatutModalOpen(true);
  };

  // 🔹 CHANGEMENT DE STATUT
  const handleChangerStatut = async () => {
    if (!selectedPrestation?._id) return;
    try {
      await axios.patch(`${apiUrl}/prestation/${selectedPrestation._id}/statut`, statutData);
      toast.success("Statut mis à jour");
      fetchPrestations();
      fetchStats();
      handleClose();
    } catch (error) {
      toast.error("Erreur lors du changement de statut");
      console.error(error);
    }
  };

  // 🔹 SUPPRESSION
  const handleDelete = async (prestation: IPrestation) => {
    if (!prestation._id) return;
    if (window.confirm(`Supprimer la prestation ${prestation._id} ?`)) {
      try {
        await axios.delete(`${apiUrl}/prestation/${prestation._id}`);
        toast.success("Prestation supprimée");
        fetchPrestations();
        fetchStats();
      } catch {
        toast.error("Erreur lors de la suppression");
      }
    }
  };

  // 🔹 SAUVEGARDE
  const handleSave = async () => {
    try {
      const isUpdate = !!selectedPrestation?._id;
      const url = isUpdate ? `${apiUrl}/prestation/${selectedPrestation?._id}` : `${apiUrl}/prestation`;
      const method = isUpdate ? 'put' : 'post';

      await axios({
        method,
        url,
        data: formData,
        headers: { 'Content-Type': 'application/json' }
      });

      toast.success(isUpdate ? "Prestation mise à jour" : "Prestation créée");
      fetchPrestations();
      fetchStats();
      handleClose();
    } catch (error) {
      toast.error("Erreur lors de la sauvegarde");
      console.error(error);
    }
  };

  // 🔹 FILTRAGE
  const filteredPrestations = prestations.filter(prestation => {
    const matchesSearch = 
      prestation.utilisateur.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prestation.service.nomservice.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prestation.ville.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prestation.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatut = !statutFilter || prestation.statut === statutFilter;
    const matchesVille = !villeFilter || prestation.ville.toLowerCase().includes(villeFilter.toLowerCase());
    
    return matchesSearch && matchesStatut && matchesVille;
  });

  // 🔹 TEMPLATES COLONNES
  const clientBodyTemplate = (rowData: IPrestation) => (
    <Box display="flex" alignItems="center" gap={1}>
      <Avatar src={rowData.utilisateur.photoProfil} sx={{ width: 32, height: 32 }}>
        {rowData.utilisateur.nom.charAt(0)}
      </Avatar>
      <Box>
        <Typography variant="body2" fontWeight="bold">
          {rowData.utilisateur.nom} {rowData.utilisateur.prenom}
        </Typography>
        <Typography variant="caption" color="textSecondary">
          {rowData.utilisateur.telephone}
        </Typography>
      </Box>
    </Box>
  );

  const prestataireBodyTemplate = (rowData: IPrestation) => (
    <Box>
      <Typography variant="body2" fontWeight="bold">
        {rowData.prestataire.utilisateur.nom} {rowData.prestataire.utilisateur.prenom}
      </Typography>
      <Typography variant="caption" color="textSecondary">
        {rowData.prestataire.localisation}
      </Typography>
    </Box>
  );

  const serviceBodyTemplate = (rowData: IPrestation) => (
    <Box>
      <Typography variant="body2" fontWeight="bold">
        {rowData.service.nomservice}
      </Typography>
      <Typography variant="caption" color="textSecondary">
        {rowData.service.categorie.nomcategorie}
      </Typography>
    </Box>
  );

  const statutBodyTemplate = (rowData: IPrestation) => {
    const getStatutColor = (statut: string) => {
      switch (statut) {
        case 'TERMINEE': return 'success';
        case 'ANNULEE': case 'REFUSEE': return 'error';
        case 'EN_COURS': return 'info';
        case 'ACCEPTEE': return 'primary';
        case 'LITIGE': return 'warning';
        default: return 'default';
      }
    };

    return (
      <Chip 
        label={rowData.statut} 
        color={getStatutColor(rowData.statut) as any}
        size="small"
      />
    );
  };

  const montantBodyTemplate = (rowData: IPrestation) => (
    <Typography variant="body2" fontWeight="bold">
      {rowData.montantTotal.toLocaleString()} F
    </Typography>
  );

  const dateBodyTemplate = (rowData: IPrestation) => (
    <Box>
      <Typography variant="body2">
        {new Date(rowData.datePrestation).toLocaleDateString('fr-FR')}
      </Typography>
      <Typography variant="caption" color="textSecondary">
        {rowData.heureDebut}
      </Typography>
    </Box>
  );

  const actionBodyTemplate = (rowData: IPrestation) => (
    <Box>
      <IconButton color="info" onClick={() => handleDetail(rowData)}>
        <VisibilityIcon />
      </IconButton>
      <IconButton color="primary" onClick={() => handleStatutModal(rowData)}>
        <CheckCircleIcon />
      </IconButton>
      <IconButton color="warning" onClick={() => handleOpen(rowData)}>
        <EditIcon />
      </IconButton>
      <IconButton color="error" onClick={() => handleDelete(rowData)}>
        <DeleteIcon />
      </IconButton>
    </Box>
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) || 0 : value
    }));
  };

  return (
    <Box m={2}>
      <ToastContainer />
      
      {/* 📊 HEADER AVEC STATISTIQUES */}
      <Box mb={3}>
        <Typography variant="h4" gutterBottom>
          Gestion des Prestations
        </Typography>
        
        {stats && (
          <Grid container spacing={2} mb={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="h6" color="primary">
                    {stats.totalPrestations}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total Prestations
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="h6" color="success.main">
                    {stats.revenueTotal.toLocaleString()} F
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Chiffre d'Affaires
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {stats.statsParStatut.slice(0, 2).map(stat => (
              <Grid item xs={12} sm={6} md={3} key={stat._id}>
                <Card>
                  <CardContent sx={{ p: 2 }}>
                    <Typography variant="h6" color="secondary">
                      {stat.count}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {stat._id}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {/* 🔍 FILTRES ET RECHERCHE */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" gap={2}>
          <TextField
            variant="outlined"
            size="small"
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
            }}
            sx={{ width: 300 }}
          />
          
          <TextField
            select
            variant="outlined"
            size="small"
            label="Statut"
            value={statutFilter}
            onChange={e => setStatutFilter(e.target.value)}
            sx={{ width: 150 }}
          >
            <MenuItem value="">Tous</MenuItem>
            {statutOptions.map(option => (
              <MenuItem key={option} value={option}>{option}</MenuItem>
            ))}
          </TextField>

          <TextField
            variant="outlined"
            size="small"
            label="Ville"
            value={villeFilter}
            onChange={e => setVilleFilter(e.target.value)}
            sx={{ width: 150 }}
          />
        </Box>
        
        <Button variant="contained" onClick={() => handleOpen(null)}>
          Nouvelle Prestation
        </Button>
      </Box>

      {/* 📊 TABLEAU PRINCIPAL */}
      <DataTable
        value={filteredPrestations || []}
        paginator
        rows={15}
        loading={loading}
        dataKey="_id"
        emptyMessage="Aucune prestation trouvée"
      >
        <Column 
          header="Client" 
          body={clientBodyTemplate}
          style={{ width: '200px' }}
        />
        <Column 
          header="Prestataire" 
          body={prestataireBodyTemplate}
          style={{ width: '200px' }}
        />
        <Column 
          header="Service" 
          body={serviceBodyTemplate}
          style={{ width: '200px' }}
        />
        <Column 
          header="Date & Heure" 
          body={dateBodyTemplate}
          style={{ width: '120px' }}
        />
        <Column field="ville" header="Ville" sortable style={{ width: '100px' }} />
        <Column 
          header="Statut" 
          body={statutBodyTemplate} 
          sortable 
          sortField="statut"
          style={{ width: '120px' }}
        />
        <Column 
          header="Montant" 
          body={montantBodyTemplate} 
          sortable 
          sortField="montantTotal"
          style={{ width: '100px' }}
        />
        <Column header="Actions" body={actionBodyTemplate} style={{ width: '150px' }} />
      </DataTable>

      {/* 📝 MODAL CRÉATION/ÉDITION */}
      <Dialog open={modalOpen} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedPrestation?._id ? "Modifier Prestation" : "Nouvelle Prestation"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} mt={1}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Date de Prestation"
                name="datePrestation"
                type="date"
                fullWidth
                value={formData.datePrestation || ''}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Heure de Début"
                name="heureDebut"
                type="time"
                fullWidth
                value={formData.heureDebut || ''}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Adresse"
                name="adresse"
                fullWidth
                value={formData.adresse || ''}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Ville"
                name="ville"
                fullWidth
                value={formData.ville || ''}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Code Postal"
                name="codePostal"
                fullWidth
                value={formData.codePostal || ''}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Tarif Horaire"
                name="tarifHoraire"
                type="number"
                fullWidth
                value={formData.tarifHoraire || ''}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Montant Total"
                name="montantTotal"
                type="number"
                fullWidth
                value={formData.montantTotal || ''}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Moyen de Paiement"
                name="moyenPaiement"
                fullWidth
                value={formData.moyenPaiement || 'CARTE'}
                onChange={handleChange}
              >
                {moyenPaiementOptions.map(option => (
                  <MenuItem key={option} value={option}>{option}</MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Statut"
                name="statut"
                fullWidth
                value={formData.statut || 'EN_ATTENTE'}
                onChange={handleChange}
              >
                {statutOptions.map(option => (
                  <MenuItem key={option} value={option}>{option}</MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Description"
                name="description"
                fullWidth
                multiline
                rows={3}
                value={formData.description || ''}
                onChange={handleChange}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Annuler</Button>
          <Button variant="contained" onClick={handleSave}>
            {selectedPrestation?._id ? "Enregistrer" : "Créer"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 👁️ MODAL DÉTAIL */}
      <Dialog open={detailModalOpen} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>Détail de la Prestation</DialogTitle>
        <DialogContent>
          {selectedPrestation && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="h6" gutterBottom>Client</Typography>
                <Typography>{selectedPrestation.utilisateur.nom} {selectedPrestation.utilisateur.prenom}</Typography>
                <Typography color="textSecondary">{selectedPrestation.utilisateur.email}</Typography>
                <Typography color="textSecondary">{selectedPrestation.utilisateur.telephone}</Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="h6" gutterBottom>Prestataire</Typography>
                <Typography>{selectedPrestation.prestataire.utilisateur.nom} {selectedPrestation.prestataire.utilisateur.prenom}</Typography>
                <Typography color="textSecondary">{selectedPrestation.prestataire.utilisateur.telephone}</Typography>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Service</Typography>
                <Typography>{selectedPrestation.service.nomservice}</Typography>
                <Typography color="textSecondary">{selectedPrestation.service.categorie.nomcategorie}</Typography>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Détails</Typography>
                <Typography><strong>Date:</strong> {new Date(selectedPrestation.datePrestation).toLocaleDateString('fr-FR')}</Typography>
                <Typography><strong>Heure:</strong> {selectedPrestation.heureDebut}</Typography>
                <Typography><strong>Adresse:</strong> {selectedPrestation.adresse}, {selectedPrestation.ville}</Typography>
                <Typography><strong>Montant:</strong> {selectedPrestation.montantTotal} F</Typography>
                <Typography><strong>Statut:</strong> {selectedPrestation.statut}</Typography>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Description</Typography>
                <Typography>{selectedPrestation.description}</Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* 🔄 MODAL CHANGEMENT STATUT */}
      <Dialog open={statutModalOpen} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Changer le Statut</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              select
              label="Nouveau Statut"
              value={statutData.nouveauStatut}
              onChange={e => setStatutData(prev => ({ ...prev, nouveauStatut: e.target.value }))}
              fullWidth
            >
              {statutOptions.map(option => (
                <MenuItem key={option} value={option}>{option}</MenuItem>
              ))}
            </TextField>
            
            <TextField
              label="Commentaire (optionnel)"
              value={statutData.commentaire}
              onChange={e => setStatutData(prev => ({ ...prev, commentaire: e.target.value }))}
              fullWidth
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Annuler</Button>
          <Button variant="contained" onClick={handleChangerStatut}>
            Changer Statut
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PrestationsComponent;

