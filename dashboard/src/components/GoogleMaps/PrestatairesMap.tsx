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
  CircularProgress
} from '@mui/material';
import {
  LocationOn,
  Person,
  Business,
  Directions,
  Search,
  FilterList
} from '@mui/icons-material';
import GoogleMapComponent from './GoogleMapComponent';
import { geocodeAddress, calculateDistance, searchNearbyPlaces } from '../../services/googleMapsService';

// Types
interface Prestataire {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  adresse: string;
  ville: string;
  services: string[];
  rating: number;
  isActive: boolean;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

interface ServiceArea {
  center: { lat: number; lng: number };
  radius: number;
  points: Array<{ lat: number; lng: number }>;
}

const PrestatairesMap: React.FC = () => {
  const [prestataires, setPrestataires] = useState<Prestataire[]>([]);
  const [filteredPrestataires, setFilteredPrestataires] = useState<Prestataire[]>([]);
  const [selectedPrestataire, setSelectedPrestataire] = useState<Prestataire | null>(null);
  const [searchAddress, setSearchAddress] = useState('');
  const [searchRadius, setSearchRadius] = useState(10);
  const [serviceFilter, setServiceFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 5.3600, lng: -4.0083 }); // Abidjan par défaut
  const [showServiceArea, setShowServiceArea] = useState(false);
  const [serviceArea, setServiceArea] = useState<ServiceArea | null>(null);

  // ✅ CHARGEMENT DES PRESTATAIRES
  useEffect(() => {
    loadPrestataires();
  }, []);

  const loadPrestataires = async () => {
    try {
      setLoading(true);
      // Simulation de données - remplacer par un appel API réel
      const mockPrestataires: Prestataire[] = [
        {
          id: '1',
          nom: 'Kouassi',
          prenom: 'Jean',
          email: 'jean.kouassi@example.com',
          telephone: '+22507123456789',
          adresse: 'Cocody, Abidjan',
          ville: 'Abidjan',
          services: ['Plomberie', 'Électricité'],
          rating: 4.5,
          isActive: true,
          coordinates: { lat: 5.3600, lng: -4.0083 }
        },
        {
          id: '2',
          nom: 'Traoré',
          prenom: 'Marie',
          email: 'marie.traore@example.com',
          telephone: '+22507123456790',
          adresse: 'Plateau, Abidjan',
          ville: 'Abidjan',
          services: ['Nettoyage', 'Cuisine'],
          rating: 4.8,
          isActive: true,
          coordinates: { lat: 5.3700, lng: -4.0183 }
        }
      ];

      // Géocoder les adresses des prestataires
      const prestatairesWithCoords = await Promise.all(
        mockPrestataires.map(async (prestataire) => {
          if (prestataire.coordinates) return prestataire;
          
          const geocodeResult = await geocodeAddress(`${prestataire.adresse}, ${prestataire.ville}`);
          if (geocodeResult.success && geocodeResult.coordinates) {
            return {
              ...prestataire,
              coordinates: geocodeResult.coordinates
            };
          }
          return prestataire;
        })
      );

      setPrestataires(prestatairesWithCoords);
      setFilteredPrestataires(prestatairesWithCoords);
    } catch (err) {
      setError('Erreur lors du chargement des prestataires');
    } finally {
      setLoading(false);
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
        
        // Filtrer les prestataires dans le rayon
        const nearbyPrestataires = prestataires.filter(prestataire => {
          if (!prestataire.coordinates) return false;
          
          // Calculer la distance (simplifié)
          const distance = calculateSimpleDistance(
            geocodeResult.coordinates!,
            prestataire.coordinates
          );
          
          return distance <= searchRadius;
        });
        
        setFilteredPrestataires(nearbyPrestataires);
      } else {
        setError('Adresse non trouvée');
      }
    } catch (err) {
      setError('Erreur lors de la recherche');
    } finally {
      setLoading(false);
    }
  };

  // ✅ FILTRAGE PAR SERVICE
  const handleServiceFilter = (service: string) => {
    setServiceFilter(service);
    
    if (service === '') {
      setFilteredPrestataires(prestataires);
    } else {
      const filtered = prestataires.filter(prestataire =>
        prestataire.services.includes(service)
      );
      setFilteredPrestataires(filtered);
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
  const handleMarkerClick = (prestataire: Prestataire) => {
    setSelectedPrestataire(prestataire);
  };

  // ✅ PRÉPARATION DES MARQUEURS POUR LA CARTE
  const mapMarkers = filteredPrestataires
    .filter(p => p.coordinates)
    .map(prestataire => ({
      id: prestataire.id,
      position: prestataire.coordinates!,
      title: `${prestataire.prenom} ${prestataire.nom}`,
      description: `${prestataire.services.join(', ')} - ${prestataire.ville}`,
      type: 'prestataire' as const,
      color: prestataire.isActive ? '#4caf50' : '#f44336'
    }));

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Gestion des Prestataires - Cartes
      </Typography>

      {/* ✅ BARRE DE RECHERCHE */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
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
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Service</InputLabel>
                <Select
                  value={serviceFilter}
                  onChange={(e) => handleServiceFilter(e.target.value)}
                >
                  <MenuItem value="">Tous les services</MenuItem>
                  <MenuItem value="Plomberie">Plomberie</MenuItem>
                  <MenuItem value="Électricité">Électricité</MenuItem>
                  <MenuItem value="Nettoyage">Nettoyage</MenuItem>
                  <MenuItem value="Cuisine">Cuisine</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
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
          </Grid>
        </CardContent>
      </Card>

      {/* ✅ CARTE */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Carte des Prestataires ({filteredPrestataires.length})
          </Typography>
          <GoogleMapComponent
            center={mapCenter}
            zoom={12}
            markers={mapMarkers}
            onMarkerClick={handleMarkerClick}
            height="500px"
          />
        </CardContent>
      </Card>

      {/* ✅ LISTE DES PRESTATAIRES */}
      <Grid container spacing={2}>
        {filteredPrestataires.map((prestataire) => (
          <Grid item xs={12} md={6} lg={4} key={prestataire.id}>
            <Card 
              sx={{ 
                cursor: 'pointer',
                '&:hover': { boxShadow: 3 }
              }}
              onClick={() => setSelectedPrestataire(prestataire)}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Person sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">
                    {prestataire.prenom} {prestataire.nom}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <LocationOn sx={{ mr: 1, color: 'text.secondary', fontSize: 16 }} />
                  <Typography variant="body2" color="text.secondary">
                    {prestataire.adresse}, {prestataire.ville}
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  {prestataire.services.map((service) => (
                    <Chip
                      key={service}
                      label={service}
                      size="small"
                      sx={{ mr: 1, mb: 1 }}
                    />
                  ))}
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    ⭐ {prestataire.rating}/5
                  </Typography>
                  <Chip
                    label={prestataire.isActive ? 'Actif' : 'Inactif'}
                    color={prestataire.isActive ? 'success' : 'error'}
                    size="small"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ✅ DIALOG DÉTAILS PRESTATAIRE */}
      <Dialog
        open={!!selectedPrestataire}
        onClose={() => setSelectedPrestataire(null)}
        maxWidth="md"
        fullWidth
      >
        {selectedPrestataire && (
          <>
            <DialogTitle>
              {selectedPrestataire.prenom} {selectedPrestataire.nom}
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Informations de contact
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    📧 {selectedPrestataire.email}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    📞 {selectedPrestataire.telephone}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    📍 {selectedPrestataire.adresse}, {selectedPrestataire.ville}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Services proposés
                  </Typography>
                  <Box>
                    {selectedPrestataire.services.map((service) => (
                      <Chip
                        key={service}
                        label={service}
                        sx={{ mr: 1, mb: 1 }}
                      />
                    ))}
                  </Box>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedPrestataire(null)}>
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

export default PrestatairesMap;
