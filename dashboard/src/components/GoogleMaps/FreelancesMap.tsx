import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  LocationOn,
  Person,
  Work,
  Directions,
  Search,
  FilterList,
  Schedule,
  Star,
  TrendingUp,
  CheckCircle,
  Pending
} from '@mui/icons-material';
import GoogleMapComponent from './GoogleMapComponent';
import { geocodeAddress, calculateDistance, getDirections } from '../../services/googleMapsService';

// Types
interface Freelance {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  adresse: string;
  ville: string;
  specialites: string[];
  competences: string[];
  rating: number;
  isActive: boolean;
  zoneService: {
    center: { lat: number; lng: number };
    radius: number;
  };
  missionsEnCours: number;
  revenus: number;
  disponibilite: 'disponible' | 'occupe' | 'indisponible';
  tarifHoraire: number;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

interface Mission {
  id: string;
  client: string;
  titre: string;
  description: string;
  adresse: string;
  dateDebut: string;
  dateFin: string;
  statut: 'en_attente' | 'en_cours' | 'terminee' | 'annulee';
  budget: number;
  coordinates?: { lat: number; lng: number };
}

const FreelancesMap: React.FC = () => {
  const [freelances, setFreelances] = useState<Freelance[]>([]);
  const [filteredFreelances, setFilteredFreelances] = useState<Freelance[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [selectedFreelance, setSelectedFreelance] = useState<Freelance | null>(null);
  const [searchAddress, setSearchAddress] = useState('');
  const [searchRadius, setSearchRadius] = useState(20);
  const [specialiteFilter, setSpecialiteFilter] = useState('');
  const [disponibiliteFilter, setDisponibiliteFilter] = useState('');
  const [showMissions, setShowMissions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 4.0483, lng: 9.7043 });
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);

  // ✅ CHARGEMENT DES FREELANCES
  useEffect(() => {
    loadFreelances();
    loadMissions();
  }, []);

  const loadFreelances = async () => {
    try {
      setLoading(true);
      // Simulation de données - remplacer par un appel API réel
      const mockFreelances: Freelance[] = [
        {
          id: '1',
          nom: 'Nguema',
          prenom: 'Pierre',
          email: 'pierre.nguema@example.com',
          telephone: '+237123456789',
          adresse: 'Bastos, Yaoundé',
          ville: 'Yaoundé',
          specialites: ['Développement Web', 'Mobile Apps'],
          competences: ['React', 'Node.js', 'Flutter', 'MongoDB'],
          rating: 4.8,
          isActive: true,
          zoneService: {
            center: { lat: 3.848, lng: 11.5021 },
            radius: 15
          },
          missionsEnCours: 3,
          revenus: 1200000,
          disponibilite: 'disponible',
          tarifHoraire: 15000,
          coordinates: { lat: 3.848, lng: 11.5021 }
        },
        {
          id: '2',
          nom: 'Mballa',
          prenom: 'Sophie',
          email: 'sophie.mballa@example.com',
          telephone: '+237123456790',
          adresse: 'Cocody, Abidjan',
          ville: 'Abidjan',
          specialites: ['Design Graphique', 'UI/UX'],
          competences: ['Photoshop', 'Figma', 'Illustrator', 'Sketch'],
          rating: 4.6,
          isActive: true,
          zoneService: {
            center: { lat: 4.0483, lng: 9.7043 },
            radius: 12
          },
          missionsEnCours: 2,
          revenus: 800000,
          disponibilite: 'occupe',
          tarifHoraire: 12000,
          coordinates: { lat: 4.0483, lng: 9.7043 }
        }
      ];

      setFreelances(mockFreelances);
      setFilteredFreelances(mockFreelances);
    } catch (err) {
      setError('Erreur lors du chargement des freelances');
    } finally {
      setLoading(false);
    }
  };

  const loadMissions = async () => {
    try {
      // Simulation de données de missions
      const mockMissions: Mission[] = [
        {
          id: '1',
          client: 'Entreprise ABC',
          titre: 'Développement Site Web',
          description: 'Création d\'un site e-commerce',
          adresse: 'Centre-ville, Yaoundé',
          dateDebut: '2024-01-20',
          dateFin: '2024-02-15',
          statut: 'en_cours',
          budget: 500000,
          coordinates: { lat: 3.848, lng: 11.5021 }
        },
        {
          id: '2',
          client: 'Startup XYZ',
          titre: 'Design Logo',
          description: 'Création d\'identité visuelle',
          adresse: 'Plateau, Abidjan',
          dateDebut: '2024-01-25',
          dateFin: '2024-02-05',
          statut: 'en_attente',
          budget: 150000,
          coordinates: { lat: 4.0583, lng: 9.7143 }
        }
      ];

      setMissions(mockMissions);
    } catch (err) {
      console.error('Erreur chargement missions:', err);
    }
  };

  // ✅ RECHERCHE PAR ADRESSE
  const handleSearchByAddress = async () => {
    if (!searchAddress.trim()) return;

    try {
      setLoading(true);
      const geocodeResult = await geocodeAddress(searchAddress);
      
      if (geocodeResult.success && geocodeResult.coordinates) {
        setMapCenter(geocodeResult.coordinates);
        
        // Filtrer les freelances dans le rayon
        const nearbyFreelances = freelances.filter(freelance => {
          if (!freelance.coordinates) return false;
          
          const distance = calculateSimpleDistance(
            geocodeResult.coordinates!,
            freelance.coordinates
          );
          
          return distance <= searchRadius;
        });
        
        setFilteredFreelances(nearbyFreelances);
      } else {
        setError('Adresse non trouvée');
      }
    } catch (err) {
      setError('Erreur lors de la recherche');
    } finally {
      setLoading(false);
    }
  };

  // ✅ FILTRAGE PAR SPÉCIALITÉ
  const handleSpecialiteFilter = (specialite: string) => {
    setSpecialiteFilter(specialite);
    
    if (specialite === '') {
      setFilteredFreelances(freelances);
    } else {
      const filtered = freelances.filter(freelance =>
        freelance.specialites.includes(specialite)
      );
      setFilteredFreelances(filtered);
    }
  };

  // ✅ FILTRAGE PAR DISPONIBILITÉ
  const handleDisponibiliteFilter = (disponibilite: string) => {
    setDisponibiliteFilter(disponibilite);
    
    if (disponibilite === '') {
      setFilteredFreelances(freelances);
    } else {
      const filtered = freelances.filter(freelance =>
        freelance.disponibilite === disponibilite
      );
      setFilteredFreelances(filtered);
    }
  };

  // ✅ CALCUL SIMPLE DE DISTANCE
  const calculateSimpleDistance = (coord1: { lat: number; lng: number }, coord2: { lat: number; lng: number }) => {
    const R = 6371; // Rayon de la Terre en km
    const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
    const dLng = (coord2.lng - coord1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // ✅ GESTION DES CLICS SUR MARQUEURS
  const handleMarkerClick = (freelance: Freelance) => {
    setSelectedFreelance(freelance);
  };

  // ✅ PRÉPARATION DES MARQUEURS POUR LA CARTE
  const mapMarkers = filteredFreelances
    .filter(f => f.coordinates)
    .map(freelance => ({
      id: freelance.id,
      position: freelance.coordinates!,
      title: `${freelance.prenom} ${freelance.nom}`,
      description: `${freelance.specialites.join(', ')} - ${freelance.ville}`,
      type: 'freelance' as const,
      color: freelance.disponibilite === 'disponible' ? '#4caf50' : 
             freelance.disponibilite === 'occupe' ? '#ff9800' : '#f44336'
    }));

  // ✅ MARQUEURS DES MISSIONS
  const missionMarkers = missions
    .filter(m => m.coordinates)
    .map(mission => ({
      id: `mission-${mission.id}`,
      position: mission.coordinates!,
      title: mission.titre,
      description: `${mission.client} - ${mission.budget.toLocaleString()} FCFA`,
      type: 'mission' as const,
      color: '#2196f3'
    }));

  const allMarkers = [...mapMarkers, ...missionMarkers];

  // ✅ FONCTION POUR OBTENIR LA COULEUR DE DISPONIBILITÉ
  const getDisponibiliteColor = (disponibilite: string) => {
    switch (disponibilite) {
      case 'disponible': return 'success';
      case 'occupe': return 'warning';
      case 'indisponible': return 'error';
      default: return 'default';
    }
  };

  // ✅ FONCTION POUR OBTENIR L'ICÔNE DE DISPONIBILITÉ
  const getDisponibiliteIcon = (disponibilite: string) => {
    switch (disponibilite) {
      case 'disponible': return <CheckCircle />;
      case 'occupe': return <Schedule />;
      case 'indisponible': return <Pending />;
      default: return <Pending />;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Gestion des Freelances - Cartes
      </Typography>

      {/* ✅ BARRE DE RECHERCHE */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Adresse de recherche"
                value={searchAddress}
                onChange={(e) => setSearchAddress(e.target.value)}
                placeholder="Ex: Abidjan, Côte d'Ivoire"
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'action.active' }} />
                }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                label="Rayon (km)"
                type="number"
                value={searchRadius}
                onChange={(e) => setSearchRadius(Number(e.target.value))}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Spécialité</InputLabel>
                <Select
                  value={specialiteFilter}
                  onChange={(e) => handleSpecialiteFilter(e.target.value)}
                >
                  <MenuItem value="">Toutes les spécialités</MenuItem>
                  <MenuItem value="Développement Web">Développement Web</MenuItem>
                  <MenuItem value="Mobile Apps">Mobile Apps</MenuItem>
                  <MenuItem value="Design Graphique">Design Graphique</MenuItem>
                  <MenuItem value="UI/UX">UI/UX</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Disponibilité</InputLabel>
                <Select
                  value={disponibiliteFilter}
                  onChange={(e) => handleDisponibiliteFilter(e.target.value)}
                >
                  <MenuItem value="">Toutes les disponibilités</MenuItem>
                  <MenuItem value="disponible">Disponible</MenuItem>
                  <MenuItem value="occupe">Occupé</MenuItem>
                  <MenuItem value="indisponible">Indisponible</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={1}>
              <Button
                variant="contained"
                onClick={handleSearchByAddress}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <Search />}
                fullWidth
              >
                Rechercher
              </Button>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                variant="outlined"
                onClick={() => setShowMissions(!showMissions)}
                startIcon={<Work />}
                fullWidth
              >
                {showMissions ? 'Masquer' : 'Voir'} Missions
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* ✅ CARTE */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Carte des Freelances et Missions ({filteredFreelances.length} freelances, {missions.length} missions)
          </Typography>
          <GoogleMapComponent
            center={mapCenter}
            zoom={12}
            markers={allMarkers}
            onMarkerClick={handleMarkerClick}
            height="500px"
          />
        </CardContent>
      </Card>

      {/* ✅ LISTE DES FREELANCES */}
      <Grid container spacing={2}>
        {filteredFreelances.map((freelance) => (
          <Grid item xs={12} md={6} lg={4} key={freelance.id}>
            <Card 
              sx={{ 
                cursor: 'pointer',
                '&:hover': { boxShadow: 3 }
              }}
              onClick={() => setSelectedFreelance(freelance)}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Work sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">
                    {freelance.prenom} {freelance.nom}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <LocationOn sx={{ mr: 1, color: 'text.secondary', fontSize: 16 }} />
                  <Typography variant="body2" color="text.secondary">
                    {freelance.adresse}, {freelance.ville}
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  {freelance.specialites.map((specialite) => (
                    <Chip
                      key={specialite}
                      label={specialite}
                      size="small"
                      sx={{ mr: 1, mb: 1 }}
                    />
                  ))}
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    ⭐ {freelance.rating}/5
                  </Typography>
                  <Chip
                    label={freelance.disponibilite}
                    color={getDisponibiliteColor(freelance.disponibilite)}
                    size="small"
                    icon={getDisponibiliteIcon(freelance.disponibilite)}
                  />
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    💼 {freelance.missionsEnCours} missions
                  </Typography>
                  <Typography variant="body2" color="success.main" fontWeight="bold">
                    {freelance.revenus.toLocaleString()} FCFA
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    💰 {freelance.tarifHoraire.toLocaleString()} FCFA/h
                  </Typography>
                  <Chip
                    label={freelance.isActive ? 'Actif' : 'Inactif'}
                    color={freelance.isActive ? 'success' : 'error'}
                    size="small"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ✅ DIALOG DÉTAILS FREELANCE */}
      <Dialog
        open={!!selectedFreelance}
        onClose={() => setSelectedFreelance(null)}
        maxWidth="md"
        fullWidth
      >
        {selectedFreelance && (
          <>
            <DialogTitle>
              {selectedFreelance.prenom} {selectedFreelance.nom}
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Informations de contact
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    📧 {selectedFreelance.email}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    📞 {selectedFreelance.telephone}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    📍 {selectedFreelance.adresse}, {selectedFreelance.ville}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Statistiques
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    💼 Missions en cours: {selectedFreelance.missionsEnCours}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    💰 Revenus: {selectedFreelance.revenus.toLocaleString()} FCFA
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ⭐ Note: {selectedFreelance.rating}/5
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    💰 Tarif: {selectedFreelance.tarifHoraire.toLocaleString()} FCFA/h
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>
                    Spécialités
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    {selectedFreelance.specialites.map((specialite) => (
                      <Chip
                        key={specialite}
                        label={specialite}
                        sx={{ mr: 1, mb: 1 }}
                      />
                    ))}
                  </Box>
                  <Typography variant="subtitle1" gutterBottom>
                    Compétences
                  </Typography>
                  <Box>
                    {selectedFreelance.competences.map((competence) => (
                      <Chip
                        key={competence}
                        label={competence}
                        variant="outlined"
                        sx={{ mr: 1, mb: 1 }}
                      />
                    ))}
                  </Box>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedFreelance(null)}>
                Fermer
              </Button>
              <Button variant="contained" startIcon={<Directions />}>
                Itinéraire
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ✅ AFFICHAGE DES ERREURS */}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
    </Box>
  );
};

export default FreelancesMap;
