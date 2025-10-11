import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Avatar,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Divider,
  Stack
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Delete as DeleteIcon,
  Archive as ArchiveIcon,
  Visibility as VisibilityIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Timeline as TimelineIcon,
  Category as CategoryIcon,
  LocationOn as LocationIcon,
  AccessTime as TimeIcon,
  TrendingUp as TrendingUpIcon,
  History as HistoryIcon,
  Analytics as AnalyticsIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import axios from 'axios';

// 🎯 INTERFACES
interface IUtilisateur {
  _id: string;
  nom: string;
  prenom: string;
  photoProfil?: string;
  verifie?: boolean;
}

interface IHistorique {
  _id?: string;
  utilisateur: IUtilisateur;
  objetType: 'PRESTATAIRE' | 'VENDEUR' | 'FREELANCE' | 'ARTICLE' | 'SERVICE' | 'PRESTATION' | 'COMMANDE' | 'PAGE' | 'CATEGORIE';
  objetId?: string;
  titre: string;
  description?: string;
  image?: string;
  prix?: number;
  devise?: string;
  categorie?: string;
  tags?: string[];
  localisation?: {
    ville?: string;
    pays?: string;
  };
  note?: number;
  statut: 'ACTIVE' | 'ARCHIVE' | 'SUPPRIME';
  dureeConsultation: number;
  nombreVues: number;
  sessionId: string;
  userAgent?: string;
  ipAddress?: string;
  localisationUtilisateur?: {
    latitude?: number;
    longitude?: number;
    ville?: string;
    pays?: string;
  };
  url?: string;
  referrer?: string;
  tagsConsultation?: string[];
  interactions?: {
    clics: number;
    scrolls: number;
    tempsSurPage: number;
  };
  actions?: Array<{
    type: 'VIEW' | 'CLICK' | 'SCROLL' | 'SEARCH' | 'FILTER' | 'SORT' | 'SHARE' | 'FAVORITE' | 'CONTACT' | 'BOOKMARK';
    timestamp: string;
    details?: string;
  }>;
  deviceInfo?: {
    type: 'MOBILE' | 'TABLET' | 'DESKTOP';
    os?: string;
    browser?: string;
    version?: string;
  };
  dateConsultation: string;
  dateDerniereConsultation: string;
  createdAt: string;
  updatedAt: string;
}

interface IHistoriqueStats {
  totalConsultations: number;
  consultationsParType: Array<{
    type: string;
    count: number;
  }>;
  consultationsParCategorie: Array<{
    categorie: string;
    count: number;
  }>;
  tempsTotal: number;
  consultationsRecentes: number;
}

const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const HistoriqueComponent: React.FC = () => {
  const [historique, setHistorique] = useState<IHistorique[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedHistorique, setSelectedHistorique] = useState<IHistorique | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statutFilter, setStatutFilter] = useState<string>('');
  const [periodeFilter, setPeriodeFilter] = useState<string>('30');
  const [stats, setStats] = useState<IHistoriqueStats | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  const typeOptions = [
    { value: 'PRESTATAIRE', label: 'Prestataire' },
    { value: 'VENDEUR', label: 'Vendeur' },
    { value: 'FREELANCE', label: 'Freelance' },
    { value: 'ARTICLE', label: 'Article' },
    { value: 'SERVICE', label: 'Service' },
    { value: 'PRESTATION', label: 'Prestation' },
    { value: 'COMMANDE', label: 'Commande' },
    { value: 'PAGE', label: 'Page' },
    { value: 'CATEGORIE', label: 'Catégorie' }
  ];

  const statutOptions = [
    { value: 'ACTIVE', label: 'Active' },
    { value: 'ARCHIVE', label: 'Archivée' },
    { value: 'SUPPRIME', label: 'Supprimée' }
  ];

  const periodeOptions = [
    { value: '7', label: '7 derniers jours' },
    { value: '30', label: '30 derniers jours' },
    { value: '90', label: '90 derniers jours' },
    { value: '365', label: '1 an' }
  ];

  // 🔹 CHARGEMENT DE L'HISTORIQUE
  const fetchHistorique = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('q', searchTerm);
      if (typeFilter) params.append('objetType', typeFilter);
      if (statutFilter) params.append('statut', statutFilter);
      if (periodeFilter) params.append('periode', periodeFilter);
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());

      const response = await axios.get(`${apiUrl}/history?${params.toString()}`);
      
      // Vérifier si la réponse est un tableau
      const data = response.data.history || response.data;
      if (Array.isArray(data)) {
        setHistorique(data);
      } else {
        console.error("Données historique non valides:", data);
        setHistorique([]);
        toast.error("Format de données incorrect reçu du serveur");
      }
      
      if (response.data.pagination) {
        setPagination(response.data.pagination);
      }
    } catch (error) {
      toast.error("Erreur lors du chargement de l'historique");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 CHARGEMENT DES STATISTIQUES
  const fetchStats = async () => {
    try {
      const response = await axios.get(`${apiUrl}/history/stats?periode=${periodeFilter}`);
      setStats(response.data);
    } catch (error) {
      console.error("Erreur lors du chargement des statistiques:", error);
    }
  };

  useEffect(() => {
    fetchHistorique();
    fetchStats();
  }, [searchTerm, typeFilter, statutFilter, periodeFilter, pagination.page]);

  // 🔹 GESTION DES MODALES
  const handleDetailOpen = (historique: IHistorique) => {
    setSelectedHistorique(historique);
    setDetailModalOpen(true);
  };

  const handleDetailClose = () => {
    setSelectedHistorique(null);
    setDetailModalOpen(false);
  };

  // 🔹 SUPPRIMER UNE CONSULTATION
  const handleDelete = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette consultation ?')) {
      try {
        await axios.delete(`${apiUrl}/history/${id}`);
        toast.success('Consultation supprimée avec succès');
        fetchHistorique();
      } catch (error) {
        toast.error('Erreur lors de la suppression');
        console.error(error);
      }
    }
  };

  // 🔹 ARCHIVER UNE CONSULTATION
  const handleArchive = async (id: string) => {
    try {
      await axios.patch(`${apiUrl}/history/${id}/archive`);
      toast.success('Consultation archivée avec succès');
      fetchHistorique();
    } catch (error) {
      toast.error('Erreur lors de l\'archivage');
      console.error(error);
    }
  };

  // 🔹 NETTOYER L'HISTORIQUE ANCIEN
  const handleCleanOld = async () => {
    if (window.confirm('Êtes-vous sûr de vouloir nettoyer l\'historique ancien (90+ jours) ?')) {
      try {
        const response = await axios.delete(`${apiUrl}/history/clean?jours=90`);
        toast.success(`${response.data.deletedCount} consultations supprimées`);
        fetchHistorique();
      } catch (error) {
        toast.error('Erreur lors du nettoyage');
        console.error(error);
      }
    }
  };

  // 🔹 FORMATER LA DURÉE
  const formatDuration = (seconds: number) => {
    const heures = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (heures > 0) {
      return `${heures}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  // 🔹 FORMATER LA DATE
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR');
  };

  // 🔹 COULEUR DU STATUT
  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'ACTIVE': return 'success';
      case 'ARCHIVE': return 'warning';
      case 'SUPPRIME': return 'error';
      default: return 'default';
    }
  };

  // 🔹 COULEUR DU TYPE
  const getTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      'PRESTATAIRE': '#1976d2',
      'VENDEUR': '#388e3c',
      'FREELANCE': '#f57c00',
      'ARTICLE': '#7b1fa2',
      'SERVICE': '#d32f2f',
      'PRESTATION': '#0288d1',
      'COMMANDE': '#5d4037',
      'PAGE': '#455a64',
      'CATEGORIE': '#e91e63'
    };
    return colors[type] || '#757575';
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* 📊 HEADER AVEC STATISTIQUES */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <HistoryIcon color="primary" />
              Historique des Consultations
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={fetchHistorique}
                disabled={loading}
              >
                Actualiser
              </Button>
              <Button
                variant="outlined"
                color="warning"
                startIcon={<DeleteIcon />}
                onClick={handleCleanOld}
              >
                Nettoyer
              </Button>
            </Box>
          </Box>

          {/* 📊 STATISTIQUES */}
          {stats && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="primary">
                      {stats.totalConsultations}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Consultations
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="success.main">
                      {stats.consultationsRecentes}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Récentes (24h)
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="info.main">
                      {formatDuration(stats.tempsTotal)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Temps Total
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="warning.main">
                      {Array.isArray(historique) ? historique.length : 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Affichées
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* 🔍 FILTRES ET RECHERCHE */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Rechercher"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  label="Type"
                >
                  <MenuItem value="">Tous</MenuItem>
                  {typeOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Statut</InputLabel>
                <Select
                  value={statutFilter}
                  onChange={(e) => setStatutFilter(e.target.value)}
                  label="Statut"
                >
                  <MenuItem value="">Tous</MenuItem>
                  {statutOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Période</InputLabel>
                <Select
                  value={periodeFilter}
                  onChange={(e) => setPeriodeFilter(e.target.value)}
                  label="Période"
                >
                  {periodeOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<FilterIcon />}
                onClick={fetchHistorique}
                disabled={loading}
              >
                Filtrer
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 📋 TABLEAU DE L'HISTORIQUE */}
      <Card>
        <CardContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Utilisateur</TableCell>
                    <TableCell>Objet</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Durée</TableCell>
                    <TableCell>Vues</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Statut</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(Array.isArray(historique) ? historique : []).map((item) => (
                    <TableRow key={item._id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar 
                            src={item.utilisateur.photoProfil} 
                            sx={{ width: 32, height: 32 }}
                          >
                            {item.utilisateur.nom?.[0]}{item.utilisateur.prenom?.[0]}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {item.utilisateur.nom} {item.utilisateur.prenom}
                            </Typography>
                            {item.utilisateur.verifie && (
                              <Chip size="small" label="Vérifié" color="success" />
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {item.image && (
                            <Avatar 
                              src={item.image} 
                              variant="rounded"
                              sx={{ width: 40, height: 40 }}
                            />
                          )}
                          <Box>
                            <Typography variant="body2" fontWeight="medium" noWrap>
                              {item.titre}
                            </Typography>
                            {item.prix && (
                              <Typography variant="caption" color="text.secondary">
                                {item.prix} {item.devise}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={typeOptions.find(t => t.value === item.objetType)?.label || item.objetType}
                          size="small"
                          sx={{ 
                            backgroundColor: getTypeColor(item.objetType),
                            color: 'white',
                            fontWeight: 'medium'
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <TimeIcon fontSize="small" color="action" />
                          <Typography variant="body2">
                            {formatDuration(item.dureeConsultation)}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {item.nombreVues}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(item.dateConsultation)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={statutOptions.find(s => s.value === item.statut)?.label || item.statut}
                          size="small"
                          color={getStatusColor(item.statut) as any}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="Voir détails">
                            <IconButton
                              size="small"
                              onClick={() => handleDetailOpen(item)}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {item.statut === 'ACTIVE' && (
                            <Tooltip title="Archiver">
                              <IconButton
                                size="small"
                                onClick={() => handleArchive(item._id!)}
                              >
                                <ArchiveIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Supprimer">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDelete(item._id!)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* 📄 PAGINATION */}
          {pagination.pages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Stack direction="row" spacing={1}>
                {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={pagination.page === page ? "contained" : "outlined"}
                    size="small"
                    onClick={() => setPagination(prev => ({ ...prev, page }))}
                  >
                    {page}
                  </Button>
                ))}
              </Stack>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* 🔍 MODAL DÉTAILS */}
      <Dialog
        open={detailModalOpen}
        onClose={handleDetailClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Détails de la Consultation
        </DialogTitle>
        <DialogContent>
          {selectedHistorique && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Informations Générales
                  </Typography>
                  <Stack spacing={1}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Titre
                      </Typography>
                      <Typography variant="body1">
                        {selectedHistorique.titre}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Type
                      </Typography>
                      <Chip
                        label={typeOptions.find(t => t.value === selectedHistorique.objetType)?.label}
                        size="small"
                        sx={{ backgroundColor: getTypeColor(selectedHistorique.objetType), color: 'white' }}
                      />
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Durée de consultation
                      </Typography>
                      <Typography variant="body1">
                        {formatDuration(selectedHistorique.dureeConsultation)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Nombre de vues
                      </Typography>
                      <Typography variant="body1">
                        {selectedHistorique.nombreVues}
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Informations Techniques
                  </Typography>
                  <Stack spacing={1}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Session ID
                      </Typography>
                      <Typography variant="body1" sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                        {selectedHistorique.sessionId}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Adresse IP
                      </Typography>
                      <Typography variant="body1">
                        {selectedHistorique.ipAddress || 'N/A'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        User Agent
                      </Typography>
                      <Typography variant="body1" sx={{ fontSize: '0.875rem', wordBreak: 'break-all' }}>
                        {selectedHistorique.userAgent || 'N/A'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Appareil
                      </Typography>
                      <Typography variant="body1">
                        {selectedHistorique.deviceInfo?.type || 'N/A'} - {selectedHistorique.deviceInfo?.os || 'N/A'}
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>
                {selectedHistorique.actions && selectedHistorique.actions.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      Actions Effectuées
                    </Typography>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Type</TableCell>
                            <TableCell>Détails</TableCell>
                            <TableCell>Heure</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {selectedHistorique.actions.map((action, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <Chip label={action.type} size="small" />
                              </TableCell>
                              <TableCell>{action.details || 'N/A'}</TableCell>
                              <TableCell>
                                {new Date(action.timestamp).toLocaleString('fr-FR')}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDetailClose}>
            Fermer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HistoriqueComponent;



