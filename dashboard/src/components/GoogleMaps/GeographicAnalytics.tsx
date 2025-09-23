import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Chip,
  LinearProgress,
  Alert
} from '@mui/material';
import {
  TrendingUp,
  LocationOn,
  Business,
  People,
  Assessment,
  Map
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import GoogleMapComponent from './GoogleMapComponent';
import { searchNearbyPlaces, calculateServiceArea } from '../../services/googleMapsService';

// Types
interface AnalyticsData {
  totalPrestataires: number;
  totalClients: number;
  totalServices: number;
  prestatairesParVille: Array<{
    ville: string;
    count: number;
    pourcentage: number;
  }>;
  servicesPopulaires: Array<{
    service: string;
    count: number;
    pourcentage: number;
  }>;
  couvertureGeographique: {
    zones: Array<{
      nom: string;
      prestataires: number;
      clients: number;
      services: number;
    }>;
  };
}

interface ZoneCouverture {
  nom: string;
  center: { lat: number; lng: number };
  radius: number;
  prestataires: number;
  clients: number;
  services: number;
}

const GeographicAnalytics: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [zonesCouverture, setZonesCouverture] = useState<ZoneCouverture[]>([]);
  const [selectedZone, setSelectedZone] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ COULEURS POUR LES GRAPHIQUES
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  // ✅ CHARGEMENT DES DONNÉES ANALYTICS
  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Simulation de données - remplacer par des appels API réels
      const mockData: AnalyticsData = {
        totalPrestataires: 156,
        totalClients: 1243,
        totalServices: 89,
        prestatairesParVille: [
          { ville: 'Abidjan', count: 67, pourcentage: 43 },
          { ville: 'Bouaké', count: 45, pourcentage: 29 },
          { ville: 'Yamoussoukro', count: 23, pourcentage: 15 },
          { ville: 'San-Pédro', count: 12, pourcentage: 8 },
          { ville: 'Autres', count: 9, pourcentage: 6 }
        ],
        servicesPopulaires: [
          { service: 'Plomberie', count: 34, pourcentage: 22 },
          { service: 'Électricité', count: 28, pourcentage: 18 },
          { service: 'Nettoyage', count: 25, pourcentage: 16 },
          { service: 'Cuisine', count: 22, pourcentage: 14 },
          { service: 'Jardinage', count: 18, pourcentage: 12 },
          { service: 'Autres', count: 29, pourcentage: 19 }
        ],
        couvertureGeographique: {
          zones: [
            { nom: 'Centre-ville', prestataires: 45, clients: 234, services: 23 },
            { nom: 'Banlieue Nord', prestataires: 32, clients: 189, services: 18 },
            { nom: 'Banlieue Sud', prestataires: 28, clients: 156, services: 15 },
            { nom: 'Zone Industrielle', prestataires: 15, clients: 67, services: 8 },
            { nom: 'Autres zones', prestataires: 36, clients: 197, services: 25 }
          ]
        }
      };

      setAnalyticsData(mockData);

      // Charger les zones de couverture
      await loadZonesCouverture();
    } catch (err) {
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const loadZonesCouverture = async () => {
    try {
      // Simulation de zones de couverture
      const mockZones: ZoneCouverture[] = [
        {
          nom: 'Abidjan Centre',
          center: { lat: 4.0483, lng: 9.7043 },
          radius: 5,
          prestataires: 45,
          clients: 234,
          services: 23
        },
        {
          nom: 'Yaoundé Centre',
          center: { lat: 3.848, lng: 11.5021 },
          radius: 8,
          prestataires: 38,
          clients: 189,
          services: 19
        },
        {
          nom: 'Bafoussam',
          center: { lat: 5.4737, lng: 10.4171 },
          radius: 3,
          prestataires: 15,
          clients: 67,
          services: 8
        }
      ];

      setZonesCouverture(mockZones);
    } catch (err) {
      console.error('Erreur chargement zones:', err);
    }
  };

  // ✅ PRÉPARATION DES DONNÉES POUR LA CARTE
  const mapMarkers = zonesCouverture.map(zone => ({
    id: zone.nom,
    position: zone.center,
    title: zone.nom,
    description: `${zone.prestataires} prestataires, ${zone.clients} clients`,
    type: 'service' as const,
    color: '#2196f3'
  }));

  const selectedZoneData = zonesCouverture.find(z => z.nom === selectedZone);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>Chargement des données...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!analyticsData) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Aucune donnée disponible</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Analytics Géographiques
      </Typography>

      {/* ✅ STATISTIQUES GÉNÉRALES */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Business sx={{ mr: 2, color: 'primary.main', fontSize: 40 }} />
                <Box>
                  <Typography variant="h4">{analyticsData.totalPrestataires}</Typography>
                  <Typography color="text.secondary">Prestataires</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <People sx={{ mr: 2, color: 'success.main', fontSize: 40 }} />
                <Box>
                  <Typography variant="h4">{analyticsData.totalClients}</Typography>
                  <Typography color="text.secondary">Clients</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Assessment sx={{ mr: 2, color: 'warning.main', fontSize: 40 }} />
                <Box>
                  <Typography variant="h4">{analyticsData.totalServices}</Typography>
                  <Typography color="text.secondary">Services</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <LocationOn sx={{ mr: 2, color: 'error.main', fontSize: 40 }} />
                <Box>
                  <Typography variant="h4">{zonesCouverture.length}</Typography>
                  <Typography color="text.secondary">Zones</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ✅ CARTE DES ZONES DE COUVERTURE */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Zones de Couverture</Typography>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Zone</InputLabel>
              <Select
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
              >
                <MenuItem value="">Toutes les zones</MenuItem>
                {zonesCouverture.map((zone) => (
                  <MenuItem key={zone.nom} value={zone.nom}>
                    {zone.nom}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <GoogleMapComponent
            center={selectedZoneData?.center || { lat: 4.0483, lng: 9.7043 }}
            zoom={selectedZoneData ? 12 : 8}
            markers={mapMarkers}
            height="400px"
          />
        </CardContent>
      </Card>

      {/* ✅ GRAPHIQUES */}
      <Grid container spacing={3}>
        {/* Prestataires par ville */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Prestataires par Ville
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData.prestatairesParVille}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="ville" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#1976d2" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Services populaires */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Services Populaires
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analyticsData.servicesPopulaires}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ service, pourcentage }) => `${service} (${pourcentage}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {analyticsData.servicesPopulaires.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Détails des zones */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Détails des Zones de Couverture
              </Typography>
              <Grid container spacing={2}>
                {analyticsData.couvertureGeographique.zones.map((zone, index) => (
                  <Grid item xs={12} md={6} lg={4} key={index}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle1" gutterBottom>
                          {zone.nom}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2">Prestataires:</Typography>
                          <Chip label={zone.prestataires} size="small" color="primary" />
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2">Clients:</Typography>
                          <Chip label={zone.clients} size="small" color="success" />
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2">Services:</Typography>
                          <Chip label={zone.services} size="small" color="warning" />
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default GeographicAnalytics;
