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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import {
  LocationOn,
  Person,
  Store,
  Directions,
  Search,
  FilterList,
  LocalShipping,
  ShoppingCart,
  TrendingUp
} from '@mui/icons-material';
import GoogleMapComponent from './GoogleMapComponent';
import { geocodeAddress, calculateDistance, getDirections } from '../../services/googleMapsService';

// Types
interface Vendeur {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  adresse: string;
  ville: string;
  boutique: string;
  categories: string[];
  rating: number;
  isActive: boolean;
  zoneLivraison: {
    center: { lat: number; lng: number };
    radius: number;
  };
  commandesEnCours: number;
  chiffreAffaires: number;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

interface Commande {
  id: string;
  client: string;
  adresse: string;
  montant: number;
  statut: 'en_attente' | 'en_cours' | 'livree' | 'annulee';
  date: string;
  coordinates?: { lat: number; lng: number };
}

const VendeursMap: React.FC = () => {
  const [vendeurs, setVendeurs] = useState<Vendeur[]>([]);
  const [filteredVendeurs, setFilteredVendeurs] = useState<Vendeur[]>([]);
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [selectedVendeur, setSelectedVendeur] = useState<Vendeur | null>(null);
  const [searchAddress, setSearchAddress] = useState('');
  const [searchRadius, setSearchRadius] = useState(15);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showCommandes, setShowCommandes] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 4.0483, lng: 9.7043 });
  const [selectedCommande, setSelectedCommande] = useState<Commande | null>(null);

  // ✅ CHARGEMENT DES VENDEURS
  useEffect(() => {
    loadVendeurs();
    loadCommandes();
  }, []);

  const loadVendeurs = async () => {
    try {
      setLoading(true);
      // Simulation de données - remplacer par un appel API réel
      const mockVendeurs: Vendeur[] = [
        {
          id: '1',
          nom: 'Kouam',
          prenom: 'Jean',
          email: 'jean.kouam@example.com',
          telephone: '+237123456789',
          adresse: 'Marché de Treichville, Abidjan',
          ville: 'Abidjan',
          boutique: 'Boutique J&J',
          categories: ['Électronique', 'Téléphones'],
          rating: 4.7,
          isActive: true,
          zoneLivraison: {
            center: { lat: 4.0483, lng: 9.7043 },
            radius: 10
          },
          commandesEnCours: 12,
          chiffreAffaires: 2500000,
          coordinates: { lat: 4.0483, lng: 9.7043 }
        },
        {
          id: '2',
          nom: 'Mballa',
          prenom: 'Marie',
          email: 'marie.mballa@example.com',
          telephone: '+237123456790',
          adresse: 'Cocody, Abidjan',
          ville: 'Abidjan',
          boutique: 'Fashion Store',
          categories: ['Mode', 'Accessoires'],
          rating: 4.5,
          isActive: true,
          zoneLivraison: {
            center: { lat: 4.0583, lng: 9.7143 },
            radius: 8
          },
          commandesEnCours: 8,
          chiffreAffaires: 1800000,
          coordinates: { lat: 4.0583, lng: 9.7143 }
        }
      ];

      setVendeurs(mockVendeurs);
      setFilteredVendeurs(mockVendeurs);
    } catch (err) {
      setError('Erreur lors du chargement des vendeurs');
    } finally {
      setLoading(false);
    }
  };

  const loadCommandes = async () => {
    try {
      // Simulation de données de commandes
      const mockCommandes: Commande[] = [
        {
          id: '1',
          client: 'Client A',
          adresse: 'Plateau, Abidjan',
          montant: 45000,
          statut: 'en_cours',
          date: '2024-01-15',
          coordinates: { lat: 4.0483, lng: 9.7043 }
        },
        {
          id: '2',
          client: 'Client B',
          adresse: 'Yopougon, Abidjan',
          montant: 32000,
          statut: 'en_attente',
          date: '2024-01-15',
          coordinates: { lat: 4.0583, lng: 9.7143 }
        }
      ];

      setCommandes(mockCommandes);
    } catch (err) {
      console.error('Erreur chargement commandes:', err);
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
        
        // Filtrer les vendeurs dans le rayon
        const nearbyVendeurs = vendeurs.filter(vendeur => {
          if (!vendeur.coordinates) return false;
          
          const distance = calculateSimpleDistance(
            geocodeResult.coordinates!,
            vendeur.coordinates
          );
          
          return distance <= searchRadius;
        });
        
        setFilteredVendeurs(nearbyVendeurs);
      } else {
        setError('Adresse non trouvée');
      }
    } catch (err) {
      setError('Erreur lors de la recherche');
    } finally {
      setLoading(false);
    }
  };

  // ✅ FILTRAGE PAR CATÉGORIE
  const handleCategoryFilter = (category: string) => {
    setCategoryFilter(category);
    
    if (category === '') {
      setFilteredVendeurs(vendeurs);
    } else {
      const filtered = vendeurs.filter(vendeur =>
        vendeur.categories.includes(category)
      );
      setFilteredVendeurs(filtered);
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
  const handleMarkerClick = (vendeur: Vendeur) => {
    setSelectedVendeur(vendeur);
  };

  // ✅ PRÉPARATION DES MARQUEURS POUR LA CARTE
  const mapMarkers = filteredVendeurs
    .filter(v => v.coordinates)
    .map(vendeur => ({
      id: vendeur.id,
      position: vendeur.coordinates!,
      title: `${vendeur.boutique} - ${vendeur.prenom} ${vendeur.nom}`,
      description: `${vendeur.categories.join(', ')} - ${vendeur.ville}`,
      type: 'vendeur' as const,
      color: vendeur.isActive ? '#ff9800' : '#f44336'
    }));

  // ✅ MARQUEURS DES COMMANDES
  const commandeMarkers = commandes
    .filter(c => c.coordinates)
    .map(commande => ({
      id: `commande-${commande.id}`,
      position: commande.coordinates!,
      title: `Commande ${commande.id}`,
      description: `${commande.client} - ${commande.montant.toLocaleString()} FCFA`,
      type: 'commande' as const,
      color: '#2196f3'
    }));

  const allMarkers = [...mapMarkers, ...commandeMarkers];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Gestion des Vendeurs - Cartes
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
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Catégorie</InputLabel>
                <Select
                  value={categoryFilter}
                  onChange={(e) => handleCategoryFilter(e.target.value)}
                >
                  <MenuItem value="">Toutes les catégories</MenuItem>
                  <MenuItem value="Électronique">Électronique</MenuItem>
                  <MenuItem value="Téléphones">Téléphones</MenuItem>
                  <MenuItem value="Mode">Mode</MenuItem>
                  <MenuItem value="Accessoires">Accessoires</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
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
                onClick={() => setShowCommandes(!showCommandes)}
                startIcon={<ShoppingCart />}
                fullWidth
              >
                {showCommandes ? 'Masquer' : 'Voir'} Commandes
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* ✅ CARTE */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Carte des Vendeurs et Commandes ({filteredVendeurs.length} vendeurs, {commandes.length} commandes)
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

      {/* ✅ LISTE DES VENDEURS */}
      <Grid container spacing={2}>
        {filteredVendeurs.map((vendeur) => (
          <Grid item xs={12} md={6} lg={4} key={vendeur.id}>
            <Card 
              sx={{ 
                cursor: 'pointer',
                '&:hover': { boxShadow: 3 }
              }}
              onClick={() => setSelectedVendeur(vendeur)}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Store sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">
                    {vendeur.boutique}
                  </Typography>
                </Box>
                
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  {vendeur.prenom} {vendeur.nom}
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <LocationOn sx={{ mr: 1, color: 'text.secondary', fontSize: 16 }} />
                  <Typography variant="body2" color="text.secondary">
                    {vendeur.adresse}, {vendeur.ville}
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  {vendeur.categories.map((category) => (
                    <Chip
                      key={category}
                      label={category}
                      size="small"
                      sx={{ mr: 1, mb: 1 }}
                    />
                  ))}
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    ⭐ {vendeur.rating}/5
                  </Typography>
                  <Chip
                    label={vendeur.isActive ? 'Actif' : 'Inactif'}
                    color={vendeur.isActive ? 'success' : 'error'}
                    size="small"
                  />
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    📦 {vendeur.commandesEnCours} commandes
                  </Typography>
                  <Typography variant="body2" color="success.main" fontWeight="bold">
                    {vendeur.chiffreAffaires.toLocaleString()} FCFA
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ✅ DIALOG DÉTAILS VENDEUR */}
      <Dialog
        open={!!selectedVendeur}
        onClose={() => setSelectedVendeur(null)}
        maxWidth="md"
        fullWidth
      >
        {selectedVendeur && (
          <>
            <DialogTitle>
              {selectedVendeur.boutique} - {selectedVendeur.prenom} {selectedVendeur.nom}
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Informations de contact
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    📧 {selectedVendeur.email}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    📞 {selectedVendeur.telephone}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    📍 {selectedVendeur.adresse}, {selectedVendeur.ville}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Statistiques
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    📦 Commandes en cours: {selectedVendeur.commandesEnCours}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    💰 Chiffre d'affaires: {selectedVendeur.chiffreAffaires.toLocaleString()} FCFA
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ⭐ Note: {selectedVendeur.rating}/5
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>
                    Catégories
                  </Typography>
                  <Box>
                    {selectedVendeur.categories.map((category) => (
                      <Chip
                        key={category}
                        label={category}
                        sx={{ mr: 1, mb: 1 }}
                      />
                    ))}
                  </Box>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedVendeur(null)}>
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

export default VendeursMap;
