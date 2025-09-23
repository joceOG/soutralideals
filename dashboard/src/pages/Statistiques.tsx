import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Paper,
  FormControl, InputLabel, Select, MenuItem, Button,
  Tabs, Tab, Chip, LinearProgress, Alert
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, Legend, ComposedChart
} from 'recharts';
import {
  TrendingUp, People, AttachMoney, ShoppingCart,
  Assessment, DateRange, Download, Refresh
} from '@mui/icons-material';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// ✅ INTERFACES TYPESCRIPT
interface IStatsGenerales {
  totalUtilisateurs: number;
  totalCommandes: number;
  totalPrestations: number;
  chiffreAffaires: number;
  evolutionUtilisateurs: number;
  evolutionCommandes: number;
  evolutionPrestations: number;
  evolutionCA: number;
}

interface IStatsTemporaires {
  period: string;
  utilisateurs: number;
  commandes: number;
  prestations: number;
  chiffreAffaires: number;
}

interface IStatsCategories {
  categorie: string;
  nombreServices: number;
  nombreCommandes: number;
  chiffreAffaires: number;
}

interface IStatsPaiements {
  methode: string;
  nombre: number;
  montant: number;
  pourcentage: number;
}

interface IStatsGeographiques {
  ville: string;
  utilisateurs: number;
  commandes: number;
  chiffreAffaires: number;
}

const Statistiques: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [periode, setPeriode] = useState('30j');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  
  // ✅ DONNÉES STATISTIQUES
  const [statsGenerales, setStatsGenerales] = useState<IStatsGenerales | null>(null);
  const [statsTemporaires, setStatsTemporaires] = useState<IStatsTemporaires[]>([]);
  const [statsCategories, setStatsCategories] = useState<IStatsCategories[]>([]);
  const [statsPaiements, setStatsPaiements] = useState<IStatsPaiements[]>([]);
  const [statsGeographiques, setStatsGeographiques] = useState<IStatsGeographiques[]>([]);

  // ✅ CHARGEMENT DES DONNÉES
  useEffect(() => {
    loadAllStats();
  }, [periode, dateDebut, dateFin]);

  const loadAllStats = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadStatsGenerales(),
        loadStatsTemporaires(),
        loadStatsCategories(),
        loadStatsPaiements(),
        loadStatsGeographiques()
      ]);
    } catch (error) {
      console.error('Erreur chargement stats:', error);
      toast.error('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  const loadStatsGenerales = async () => {
    try {
      const response = await axios.get('/api/statistiques/generales', {
        params: { periode, dateDebut, dateFin }
      });
      setStatsGenerales(response.data);
    } catch (error) {
      console.error('Erreur stats générales:', error);
    }
  };

  const loadStatsTemporaires = async () => {
    try {
      const response = await axios.get('/api/statistiques/temporelles', {
        params: { periode, dateDebut, dateFin }
      });
      setStatsTemporaires(response.data);
    } catch (error) {
      console.error('Erreur stats temporelles:', error);
    }
  };

  const loadStatsCategories = async () => {
    try {
      const response = await axios.get('/api/statistiques/categories');
      setStatsCategories(response.data);
    } catch (error) {
      console.error('Erreur stats catégories:', error);
    }
  };

  const loadStatsPaiements = async () => {
    try {
      const response = await axios.get('/api/statistiques/paiements');
      setStatsPaiements(response.data);
    } catch (error) {
      console.error('Erreur stats paiements:', error);
    }
  };

  const loadStatsGeographiques = async () => {
    try {
      const response = await axios.get('/api/statistiques/geographiques');
      setStatsGeographiques(response.data);
    } catch (error) {
      console.error('Erreur stats géographiques:', error);
    }
  };

  // ✅ RENDU DES CARTES STATISTIQUES
  const renderStatCard = (title: string, value: string, icon: React.ReactNode, color: string, evolution?: number) => (
    <Card sx={{ bgcolor: color, color: 'white', height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          {icon}
          <Typography variant="h6" sx={{ ml: 1 }}>
            {title}
          </Typography>
        </Box>
        <Typography variant="h4" sx={{ mb: 1 }}>
          {value}
        </Typography>
        {evolution !== undefined && (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <TrendingUp sx={{ fontSize: 16, mr: 0.5 }} />
            <Typography variant="body2">
              {evolution > 0 ? '+' : ''}{evolution}% vs période précédente
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  // ✅ COULEURS POUR GRAPHIQUES
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  return (
    <Box sx={{ p: 3 }}>
      <ToastContainer />
      
      {/* ✅ EN-TÊTE */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Assessment /> Tableau de Bord Analytique
        </Typography>
        
        {/* ✅ FILTRES */}
        <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Période</InputLabel>
            <Select
              value={periode}
              onChange={(e) => setPeriode(e.target.value)}
              label="Période"
            >
              <MenuItem value="7j">7 derniers jours</MenuItem>
              <MenuItem value="30j">30 derniers jours</MenuItem>
              <MenuItem value="90j">90 derniers jours</MenuItem>
              <MenuItem value="1a">1 an</MenuItem>
              <MenuItem value="personnalise">Personnalisé</MenuItem>
            </Select>
          </FormControl>
          
          {periode === 'personnalise' && (
            <>
              <FormControl sx={{ minWidth: 150 }}>
                <InputLabel>Date début</InputLabel>
                <Select
                  value={dateDebut}
                  onChange={(e) => setDateDebut(e.target.value)}
                  label="Date début"
                >
                  <MenuItem value="2024-01-01">Janvier 2024</MenuItem>
                  <MenuItem value="2024-02-01">Février 2024</MenuItem>
                  <MenuItem value="2024-03-01">Mars 2024</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl sx={{ minWidth: 150 }}>
                <InputLabel>Date fin</InputLabel>
                <Select
                  value={dateFin}
                  onChange={(e) => setDateFin(e.target.value)}
                  label="Date fin"
                >
                  <MenuItem value="2024-01-31">31 Janvier 2024</MenuItem>
                  <MenuItem value="2024-02-29">29 Février 2024</MenuItem>
                  <MenuItem value="2024-03-31">31 Mars 2024</MenuItem>
                </Select>
              </FormControl>
            </>
          )}
          
          <Button
            variant="contained"
            startIcon={<Refresh />}
            onClick={loadAllStats}
            disabled={loading}
          >
            Actualiser
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={() => toast.info('Export en cours de développement')}
          >
            Exporter
          </Button>
        </Box>
      </Box>

      {loading ? (
        <LinearProgress />
      ) : (
        <>
          {/* ✅ STATISTIQUES GÉNÉRALES */}
          {statsGenerales && (
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={3}>
                {renderStatCard(
                  'Utilisateurs',
                  statsGenerales.totalUtilisateurs.toLocaleString(),
                  <People />,
                  'primary.main',
                  statsGenerales.evolutionUtilisateurs
                )}
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                {renderStatCard(
                  'Commandes',
                  statsGenerales.totalCommandes.toLocaleString(),
                  <ShoppingCart />,
                  'success.main',
                  statsGenerales.evolutionCommandes
                )}
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                {renderStatCard(
                  'Prestations',
                  statsGenerales.totalPrestations.toLocaleString(),
                  <TrendingUp />,
                  'info.main',
                  statsGenerales.evolutionPrestations
                )}
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                {renderStatCard(
                  'Chiffre d\'Affaires',
                  `${statsGenerales.chiffreAffaires.toLocaleString()} FCFA`,
                  <AttachMoney />,
                  'warning.main',
                  statsGenerales.evolutionCA
                )}
              </Grid>
            </Grid>
          )}

          {/* ✅ ONGLETS */}
          <Box sx={{ mb: 3 }}>
            <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
              <Tab label="Évolution Temporelle" />
              <Tab label="Catégories" />
              <Tab label="Paiements" />
              <Tab label="Géographie" />
            </Tabs>
          </Box>

          {/* ✅ CONTENU DES ONGLETS */}
          {activeTab === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Évolution des Utilisateurs et Commandes
                  </Typography>
                  <ResponsiveContainer width="100%" height={400}>
                    <ComposedChart data={statsTemporaires}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <RechartsTooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="utilisateurs" fill="#8884d8" name="Utilisateurs" />
                      <Bar yAxisId="left" dataKey="commandes" fill="#82ca9d" name="Commandes" />
                      <Line yAxisId="right" type="monotone" dataKey="chiffreAffaires" stroke="#ff7300" name="CA (FCFA)" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Répartition des Paiements
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={statsPaiements}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, pourcentage }) => `${name} (${pourcentage}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="nombre"
                      >
                        {statsPaiements.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
            </Grid>
          )}

          {activeTab === 1 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Performance par Catégorie
                  </Typography>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={statsCategories}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="categorie" />
                      <YAxis />
                      <RechartsTooltip />
                      <Legend />
                      <Bar dataKey="nombreServices" fill="#8884d8" name="Services" />
                      <Bar dataKey="nombreCommandes" fill="#82ca9d" name="Commandes" />
                    </BarChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Top Catégories par CA
                  </Typography>
                  {statsCategories
                    .sort((a, b) => b.chiffreAffaires - a.chiffreAffaires)
                    .slice(0, 5)
                    .map((categorie, index) => (
                      <Box key={index} sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Typography variant="subtitle2">{categorie.categorie}</Typography>
                        <Typography variant="h6" color="primary">
                          {categorie.chiffreAffaires.toLocaleString()} FCFA
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {categorie.nombreCommandes} commandes
                        </Typography>
                      </Box>
                    ))}
                </Paper>
              </Grid>
            </Grid>
          )}

          {activeTab === 2 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Répartition des Méthodes de Paiement
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={statsPaiements}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, pourcentage }) => `${name} (${pourcentage}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="montant"
                      >
                        {statsPaiements.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value) => `${value.toLocaleString()} FCFA`} />
                    </PieChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Volume par Méthode de Paiement
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={statsPaiements}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="methode" />
                      <YAxis />
                      <RechartsTooltip />
                      <Bar dataKey="nombre" fill="#8884d8" name="Nombre de transactions" />
                    </BarChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
            </Grid>
          )}

          {activeTab === 3 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Répartition Géographique
                  </Typography>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={statsGeographiques}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="ville" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <RechartsTooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="utilisateurs" fill="#8884d8" name="Utilisateurs" />
                      <Bar yAxisId="left" dataKey="commandes" fill="#82ca9d" name="Commandes" />
                      <Line yAxisId="right" type="monotone" dataKey="chiffreAffaires" stroke="#ff7300" name="CA (FCFA)" />
                    </BarChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
            </Grid>
          )}
        </>
      )}
    </Box>
  );
};

export default Statistiques;
