import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Dialog, DialogActions, DialogContent,
  DialogTitle, Button, TextField, InputAdornment, IconButton,
  MenuItem, Chip, Card, CardContent, Avatar, Badge, FormControlLabel,
  Checkbox, Grid, Rating, Alert, Tabs, Tab, Paper, Divider
} from '@mui/material';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import StarIcon from '@mui/icons-material/Star';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import ReplyIcon from '@mui/icons-material/Reply';
import ReportIcon from '@mui/icons-material/Report';
import FilterListIcon from '@mui/icons-material/FilterList';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// ✅ INTERFACES TYPESCRIPT
interface IUtilisateur {
  _id: string;
  nom: string;
  prenom: string;
  email?: string;
  photoProfil?: string;
  verifie?: boolean;
}

interface IAvis {
  _id?: string;
  auteur: IUtilisateur;
  objetType: 'PRESTATAIRE' | 'VENDEUR' | 'FREELANCE' | 'ARTICLE' | 'SERVICE' | 'PRESTATION' | 'COMMANDE';
  objetId: string;
  note: number;
  titre: string;
  commentaire: string;
  categories?: Array<{
    nom: string;
    note: number;
  }>;
  medias?: Array<{
    type: 'IMAGE' | 'VIDEO';
    url: string;
    description?: string;
  }>;
  recommande: boolean;
  utile: number;
  pasUtile: number;
  reponse?: {
    contenu: string;
    date: string;
    auteur: IUtilisateur;
  };
  statut: 'EN_ATTENTE' | 'PUBLIE' | 'MODERE' | 'SUPPRIME';
  signale: boolean;
  motifsSignalement?: string[];
  localisation?: {
    ville?: string;
    pays?: string;
  };
  tags?: string[];
  anonyme: boolean;
  vues: number;
  partages: number;
  createdAt: string;
  updatedAt: string;
}

interface IAvisStats {
  totalAvis: number;
  moyenneNote: number;
  distributionNotes: {
    note1: number;
    note2: number;
    note3: number;
    note4: number;
    note5: number;
  };
  avisRecents: number;
  avisSignales: number;
  avisEnAttente: number;
}

const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const AvisComponent: React.FC = () => {
  const [avis, setAvis] = useState<IAvis[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedAvis, setSelectedAvis] = useState<IAvis | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statutFilter, setStatutFilter] = useState<string>('');
  const [objetTypeFilter, setObjetTypeFilter] = useState<string>('');
  const [noteFilter, setNoteFilter] = useState<string>('');
  const [stats, setStats] = useState<IAvisStats | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  const [formData, setFormData] = useState<Partial<IAvis>>({
    objetType: 'PRESTATAIRE',
    note: 5,
    titre: '',
    commentaire: '',
    recommande: true,
    anonyme: false
  });

  const statutOptions = [
    { value: '', label: 'Tous les statuts' },
    { value: 'EN_ATTENTE', label: 'En attente' },
    { value: 'PUBLIE', label: 'Publié' },
    { value: 'MODERE', label: 'Modéré' },
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

  const noteOptions = [
    { value: '', label: 'Toutes les notes' },
    { value: '5', label: '5 étoiles' },
    { value: '4', label: '4 étoiles' },
    { value: '3', label: '3 étoiles' },
    { value: '2', label: '2 étoiles' },
    { value: '1', label: '1 étoile' }
  ];

  // 🔹 CHARGEMENT DES AVIS
  const fetchAvis = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('q', searchTerm);
      if (statutFilter) params.append('statut', statutFilter);
      if (objetTypeFilter) params.append('objetType', objetTypeFilter);
      if (noteFilter) params.append('note', noteFilter);

      const response = await axios.get(`${apiUrl}/avis?${params.toString()}`);
      setAvis(response.data.avis || response.data);
    } catch (error) {
      toast.error("Erreur lors du chargement des avis");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 CHARGEMENT DES STATISTIQUES
  const fetchStats = async () => {
    try {
      // Simulation des statistiques - à remplacer par un vrai endpoint
      setStats({
        totalAvis: avis.length,
        moyenneNote: 4.2,
        distributionNotes: { note1: 5, note2: 10, note3: 25, note4: 40, note5: 120 },
        avisRecents: 15,
        avisSignales: 3,
        avisEnAttente: 8
      });
    } catch (error) {
      console.error("Erreur lors du chargement des statistiques:", error);
    }
  };

  useEffect(() => {
    fetchAvis();
  }, [searchTerm, statutFilter, objetTypeFilter, noteFilter]);

  useEffect(() => {
    fetchStats();
  }, [avis]);

  // 🔹 GESTION DES MODALES
  const handleOpen = (avis: IAvis | null = null) => {
    setSelectedAvis(avis);
    if (avis) {
      setFormData(avis);
    } else {
      setFormData({
        objetType: 'PRESTATAIRE',
        note: 5,
        titre: '',
        commentaire: '',
        recommande: true,
        anonyme: false
      });
    }
    setModalOpen(true);
  };

  const handleClose = () => {
    setSelectedAvis(null);
    setModalOpen(false);
  };

  const handleDetailOpen = (avis: IAvis) => {
    setSelectedAvis(avis);
    setDetailModalOpen(true);
  };

  const handleDetailClose = () => {
    setSelectedAvis(null);
    setDetailModalOpen(false);
  };

  // 🔹 ACTIONS
  const handleDelete = async (avis: IAvis) => {
    if (!avis._id) return;
    if (window.confirm(`Supprimer l'avis "${avis.titre}" ?`)) {
      try {
        await axios.delete(`${apiUrl}/avis/${avis._id}`);
        toast.success("Avis supprimé");
        fetchAvis();
      } catch {
        toast.error("Erreur lors de la suppression");
      }
    }
  };

  const handleSave = async () => {
    try {
      const isUpdate = !!selectedAvis?._id;
      const url = isUpdate ? `${apiUrl}/avis/${selectedAvis?._id}` : `${apiUrl}/avis`;
      const method = isUpdate ? 'put' : 'post';

      await axios({
        method,
        url,
        data: formData
      });

      toast.success(isUpdate ? "Avis mis à jour" : "Avis créé");
      fetchAvis();
      handleClose();
    } catch (error) {
      toast.error("Erreur lors de la sauvegarde");
      console.error(error);
    }
  };

  const handleModerate = async (avis: IAvis, newStatut: string) => {
    try {
      await axios.put(`${apiUrl}/avis/${avis._id}`, { statut: newStatut });
      toast.success(`Avis ${newStatut.toLowerCase()}`);
      fetchAvis();
    } catch {
      toast.error("Erreur lors de la modification");
    }
  };

  // 🔹 RENDU DES COLONNES
  const renderStatut = (rowData: IAvis) => {
    const colors = {
      'EN_ATTENTE': 'warning',
      'PUBLIE': 'success',
      'MODERE': 'error',
      'SUPPRIME': 'default'
    } as const;

    return (
      <Chip
        label={rowData.statut}
        color={colors[rowData.statut]}
        size="small"
      />
    );
  };

  const renderNote = (rowData: IAvis) => {
    return (
      <Box display="flex" alignItems="center">
        <Rating value={rowData.note} readOnly size="small" />
        <Typography variant="body2" sx={{ ml: 1 }}>
          {rowData.note}/5
        </Typography>
      </Box>
    );
  };

  const renderAuteur = (rowData: IAvis) => {
    return (
      <Box display="flex" alignItems="center">
        <Avatar
          src={rowData.auteur.photoProfil}
          sx={{ width: 32, height: 32, mr: 1 }}
        >
          {rowData.auteur.nom.charAt(0)}
        </Avatar>
        <Box>
          <Typography variant="body2" fontWeight="bold">
            {rowData.auteur.nom} {rowData.auteur.prenom}
          </Typography>
          {rowData.auteur.verifie && (
            <Chip label="Vérifié" size="small" color="success" />
          )}
        </Box>
      </Box>
    );
  };

  const renderActions = (rowData: IAvis) => {
    return (
      <Box display="flex" gap={1}>
        <IconButton
          size="small"
          onClick={() => handleDetailOpen(rowData)}
          color="primary"
        >
          <VisibilityIcon />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => handleDelete(rowData)}
          color="error"
        >
          <DeleteIcon />
        </IconButton>
      </Box>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Avis & Évaluations
      </Typography>

      {/* 📊 STATISTIQUES */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Avis
                </Typography>
                <Typography variant="h4">
                  {stats.totalAvis}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Note Moyenne
                </Typography>
                <Typography variant="h4">
                  {stats.moyenneNote}/5
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  En Attente
                </Typography>
                <Typography variant="h4" color="warning.main">
                  {stats.avisEnAttente}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Signalés
                </Typography>
                <Typography variant="h4" color="error.main">
                  {stats.avisSignales}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* 🔍 FILTRES */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
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
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              select
              label="Statut"
              value={statutFilter}
              onChange={(e) => setStatutFilter(e.target.value)}
            >
              {statutOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              select
              label="Type d'objet"
              value={objetTypeFilter}
              onChange={(e) => setObjetTypeFilter(e.target.value)}
            >
              {objetTypeOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              select
              label="Note"
              value={noteFilter}
              onChange={(e) => setNoteFilter(e.target.value)}
            >
              {noteOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={3}>
            <Button
              variant="contained"
              onClick={() => handleOpen()}
              sx={{ mr: 1 }}
            >
              Nouvel Avis
            </Button>
            <Button
              variant="outlined"
              onClick={fetchAvis}
              startIcon={<FilterListIcon />}
            >
              Actualiser
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* 📋 TABLEAU DES AVIS */}
      <DataTable
        value={avis}
        loading={loading}
        paginator
        rows={10}
        rowsPerPageOptions={[5, 10, 25]}
        emptyMessage="Aucun avis trouvé"
      >
        <Column
          field="auteur.nom"
          header="Auteur"
          body={renderAuteur}
          style={{ minWidth: '200px' }}
        />
        <Column
          field="titre"
          header="Titre"
          style={{ minWidth: '200px' }}
        />
        <Column
          field="note"
          header="Note"
          body={renderNote}
          style={{ minWidth: '120px' }}
        />
        <Column
          field="objetType"
          header="Type"
          style={{ minWidth: '100px' }}
        />
        <Column
          field="statut"
          header="Statut"
          body={renderStatut}
          style={{ minWidth: '120px' }}
        />
        <Column
          field="createdAt"
          header="Date"
          style={{ minWidth: '120px' }}
        />
        <Column
          header="Actions"
          body={renderActions}
          style={{ minWidth: '120px' }}
        />
      </DataTable>

      {/* 📝 MODAL CRÉATION/ÉDITION */}
      <Dialog open={modalOpen} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedAvis ? 'Modifier l\'avis' : 'Nouvel avis'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Type d'objet"
                select
                value={formData.objetType}
                onChange={(e) => setFormData({ ...formData, objetType: e.target.value as any })}
              >
                {objetTypeOptions.slice(1).map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="ID de l'objet"
                value={formData.objetId || ''}
                onChange={(e) => setFormData({ ...formData, objetId: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Titre"
                value={formData.titre}
                onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Commentaire"
                multiline
                rows={4}
                value={formData.commentaire}
                onChange={(e) => setFormData({ ...formData, commentaire: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Box>
                <Typography gutterBottom>Note</Typography>
                <Rating
                  value={formData.note}
                  onChange={(event, newValue) => {
                    setFormData({ ...formData, note: newValue || 5 });
                  }}
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.recommande}
                    onChange={(e) => setFormData({ ...formData, recommande: e.target.checked })}
                  />
                }
                label="Recommande"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Annuler</Button>
          <Button onClick={handleSave} variant="contained">
            {selectedAvis ? 'Modifier' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 👁️ MODAL DÉTAIL */}
      <Dialog open={detailModalOpen} onClose={handleDetailClose} maxWidth="md" fullWidth>
        <DialogTitle>Détail de l'avis</DialogTitle>
        <DialogContent>
          {selectedAvis && (
            <Box>
              <Box display="flex" alignItems="center" mb={2}>
                <Avatar src={selectedAvis.auteur.photoProfil} sx={{ mr: 2 }}>
                  {selectedAvis.auteur.nom.charAt(0)}
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    {selectedAvis.auteur.nom} {selectedAvis.auteur.prenom}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {new Date(selectedAvis.createdAt).toLocaleDateString()}
                  </Typography>
                </Box>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="h6" gutterBottom>
                {selectedAvis.titre}
              </Typography>
              
              <Box display="flex" alignItems="center" mb={2}>
                <Rating value={selectedAvis.note} readOnly />
                <Typography variant="body2" sx={{ ml: 1 }}>
                  {selectedAvis.note}/5
                </Typography>
              </Box>
              
              <Typography variant="body1" paragraph>
                {selectedAvis.commentaire}
              </Typography>
              
              {selectedAvis.reponse && (
                <Box mt={2} p={2} bgcolor="grey.100" borderRadius={1}>
                  <Typography variant="subtitle2" gutterBottom>
                    Réponse du professionnel :
                  </Typography>
                  <Typography variant="body2">
                    {selectedAvis.reponse.contenu}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDetailClose}>Fermer</Button>
          {selectedAvis && (
            <>
              <Button
                onClick={() => handleModerate(selectedAvis, 'PUBLIE')}
                color="success"
              >
                Approuver
              </Button>
              <Button
                onClick={() => handleModerate(selectedAvis, 'MODERE')}
                color="warning"
              >
                Modérer
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      <ToastContainer />
    </Box>
  );
};

export default AvisComponent;



