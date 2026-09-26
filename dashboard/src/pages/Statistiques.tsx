import React, { useState, useEffect, useCallback } from 'react';

import {

  Box, Typography, Card, CardContent, Grid, Paper,

  FormControl, InputLabel, Select, MenuItem, Button,

  Tabs, Tab, LinearProgress, Alert, Tooltip

} from '@mui/material';

import {

  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,

  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell,

  Legend, ComposedChart

} from 'recharts';

import {

  TrendingUp, TrendingDown, Remove, People, AttachMoney, ShoppingCart,

  Assessment, Download, Refresh

} from '@mui/icons-material';

import { ToastContainer, toast } from 'react-toastify';

import 'react-toastify/dist/ReactToastify.css';

import {

  fetchStatistiquesOverview,

  fetchStatistiquesCategories,

  fetchStatistiquesGeographiques,

  canStartStatistiquesFetch,

  formatEvolutionDisplay,

  statistiquesErrorMessage,

  type StatistiquesBundle,

  type StatistiquesPeriode,

  type EvolutionStatus,

} from '../services/statisticsService';



const Statistiques: React.FC = () => {

  const [loadState, setLoadState] = useState<

    { status: 'loading' } | { status: 'success'; data: StatistiquesBundle; empty: boolean } | { status: 'error'; message: string }

  >({ status: 'loading' });

  const [activeTab, setActiveTab] = useState(0);

  const [periode, setPeriode] = useState<StatistiquesPeriode>('30j');

  const [dateDebut, setDateDebut] = useState('');

  const [dateFin, setDateFin] = useState('');

  const [tabDataLoaded, setTabDataLoaded] = useState({ categories: false, geographiques: false });



  const fetchParams = useCallback(

    () => ({

      periode,

      dateDebut: periode === 'personnalise' ? dateDebut : undefined,

      dateFin: periode === 'personnalise' ? dateFin : undefined,

    }),

    [periode, dateDebut, dateFin],

  );



  const loadOverview = useCallback(async (signal?: AbortSignal) => {

    if (!canStartStatistiquesFetch(fetchParams())) {

      setLoadState({ status: 'loading' });

      return;

    }

    setLoadState({ status: 'loading' });

    setTabDataLoaded({ categories: false, geographiques: false });

    try {

      const overview = await fetchStatistiquesOverview({ ...fetchParams(), signal });

      const partial: StatistiquesBundle = {

        ...overview,

        categories: [],

        geographiques: [],

      };

      const empty =

        overview.generales.totalUtilisateurs === 0 &&

        overview.generales.totalCommandes === 0 &&

        overview.generales.totalPrestations === 0 &&

        overview.generales.chiffreAffaires === 0 &&

        overview.temporelles.length === 0 &&

        overview.paiements.length === 0;

      setLoadState({ status: 'success', data: partial, empty });

    } catch (error) {

      if (signal?.aborted) return;

      setLoadState({ status: 'error', message: statistiquesErrorMessage(error) });

    }

  }, [fetchParams]);



  const loadAllStats = loadOverview;



  useEffect(() => {

    const controller = new AbortController();

    loadOverview(controller.signal);

    return () => controller.abort();

  }, [loadOverview]);



  useEffect(() => {

    if (loadState.status !== 'success') return;

    if (!canStartStatistiquesFetch(fetchParams())) return;

    const controller = new AbortController();

    const run = async () => {

      try {

        if (activeTab === 1 && !tabDataLoaded.categories) {

          const categories = await fetchStatistiquesCategories({

            ...fetchParams(),

            signal: controller.signal,

          });

          setLoadState((prev) => {

            if (prev.status !== 'success') return prev;

            return {

              ...prev,

              data: { ...prev.data, categories },

            };

          });

          setTabDataLoaded((t) => ({ ...t, categories: true }));

        }

        if (activeTab === 3 && !tabDataLoaded.geographiques) {

          const geographiques = await fetchStatistiquesGeographiques({

            ...fetchParams(),

            signal: controller.signal,

          });

          setLoadState((prev) => {

            if (prev.status !== 'success') return prev;

            return {

              ...prev,

              data: { ...prev.data, geographiques },

            };

          });

          setTabDataLoaded((t) => ({ ...t, geographiques: true }));

        }

      } catch (error) {

        if (controller.signal.aborted) return;

        setLoadState({ status: 'error', message: statistiquesErrorMessage(error) });

      }

    };

    run();

    return () => controller.abort();

  }, [activeTab, loadState.status, tabDataLoaded, fetchParams]);



  const waitingCustomDates =

    periode === 'personnalise' && !canStartStatistiquesFetch(fetchParams());



  const loading = loadState.status === 'loading' && !waitingCustomDates;

  const statsGenerales = loadState.status === 'success' ? loadState.data.generales : null;

  const statsTemporaires = loadState.status === 'success' ? loadState.data.temporelles : [];

  const statsCategories = loadState.status === 'success' ? loadState.data.categories : [];

  const statsPaiements = loadState.status === 'success' ? loadState.data.paiements : [];

  const statsGeographiques = loadState.status === 'success' ? loadState.data.geographiques : [];



  const renderStatCard = (

    title: string,

    value: string,

    icon: React.ReactNode,

    color: string,

    evolution: number | null,

    evolutionStatus: EvolutionStatus,

  ) => {

    const display = formatEvolutionDisplay(evolution, evolutionStatus);

    return (

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

        <Tooltip title={display.tooltip ?? ''} disableHoverListener={!display.tooltip}>

          <Box sx={{ display: 'flex', alignItems: 'center', minHeight: 24 }}>

            {evolutionStatus === 'up' && display.showTrendUpIcon && (

              <TrendingUp sx={{ fontSize: 16, mr: 0.5 }} />

            )}

            {evolutionStatus === 'down' && (

              <TrendingDown sx={{ fontSize: 16, mr: 0.5 }} />

            )}

            {evolutionStatus === 'stable' && (

              <Remove sx={{ fontSize: 16, mr: 0.5 }} />

            )}

            <Typography

              variant="body2"

              sx={evolutionStatus === 'new' ? { fontWeight: 600, color: 'success.light' } : undefined}

            >

              {evolutionStatus === 'new'

                ? `${display.text} · vs période précédente`

                : `${display.text} vs période précédente`}

            </Typography>

          </Box>

        </Tooltip>

      </CardContent>

    </Card>

    );

  };



  const COLORS = ['#2e7d32', '#9e9e9e', '#d7ccc8', '#558b2f', '#757575', '#bcaaa4'];



  return (

    <Box sx={{ p: 3 }}>

      <ToastContainer />



      <Box sx={{ mb: 3 }}>

        <Typography variant="h4" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>

          <Assessment /> Tableau de Bord Analytique

        </Typography>



        <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>

          <FormControl sx={{ minWidth: 120 }}>

            <InputLabel>Période</InputLabel>

            <Select

              value={periode}

              onChange={(e) => setPeriode(e.target.value as StatistiquesPeriode)}

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

            onClick={() => loadAllStats()}

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



      {waitingCustomDates && (

        <Alert severity="warning" sx={{ mb: 2 }}>

          Choisissez une date de début et une date de fin pour la période personnalisée.

        </Alert>

      )}



      {loadState.status === 'error' && (

        <Alert

          severity="error"

          sx={{ mb: 2 }}

          action={

            <Button color="inherit" size="small" onClick={() => loadAllStats()}>

              Réessayer

            </Button>

          }

        >

          {loadState.message}

        </Alert>

      )}



      {loadState.status === 'success' && loadState.empty && (

        <Alert severity="info" sx={{ mb: 2 }}>

          Aucune activité enregistrée pour cette période ou la base est vide.

        </Alert>

      )}



      {loading ? (

        <LinearProgress />

      ) : loadState.status === 'success' ? (

        <>

          {statsGenerales && (

            <Grid container spacing={3} sx={{ mb: 4 }}>

              <Grid item xs={12} sm={6} md={3}>

                {renderStatCard(

                  'Clients (inscriptions)',

                  statsGenerales.totalUtilisateurs.toLocaleString(),

                  <People />,

                  'primary.main',

                  statsGenerales.evolutionUtilisateurs,

                  statsGenerales.evolutionUtilisateursStatus

                )}

              </Grid>

              <Grid item xs={12} sm={6} md={3}>

                {renderStatCard(

                  'Commandes',

                  statsGenerales.totalCommandes.toLocaleString(),

                  <ShoppingCart />,

                  'success.main',

                  statsGenerales.evolutionCommandes,

                  statsGenerales.evolutionCommandesStatus

                )}

              </Grid>

              <Grid item xs={12} sm={6} md={3}>

                {renderStatCard(

                  'Prestations',

                  statsGenerales.totalPrestations.toLocaleString(),

                  <TrendingUp />,

                  'info.main',

                  statsGenerales.evolutionPrestations,

                  statsGenerales.evolutionPrestationsStatus

                )}

              </Grid>

              <Grid item xs={12} sm={6} md={3}>

                {renderStatCard(

                  'Chiffre d\'Affaires',

                  `${statsGenerales.chiffreAffaires.toLocaleString()} FCFA`,

                  <AttachMoney />,

                  'warning.main',

                  statsGenerales.evolutionCA,

                  statsGenerales.evolutionCAStatus

                )}

              </Grid>

            </Grid>

          )}



          <Box sx={{ mb: 3 }}>

            <Tabs value={activeTab} onChange={(_e, newValue) => setActiveTab(newValue)}>

              <Tab label="Évolution Temporelle" />

              <Tab label="Catégories" />

              <Tab label="Paiements" />

              <Tab label="Géographie" />

            </Tabs>

          </Box>



          {activeTab === 0 && (

            <Grid container spacing={3}>

              <Grid item xs={12} md={8}>

                <Paper sx={{ p: 3 }}>

                  <Typography variant="h6" sx={{ mb: 2 }}>

                    Évolution des inscriptions clients et commandes

                  </Typography>

                  {statsTemporaires.length === 0 ? (

                    <Typography color="text.secondary">Aucune série sur la période.</Typography>

                  ) : (

                    <ResponsiveContainer width="100%" height={400}>

                      <ComposedChart data={statsTemporaires}>

                        <CartesianGrid strokeDasharray="3 3" />

                        <XAxis dataKey="period" />

                        <YAxis yAxisId="left" />

                        <YAxis yAxisId="right" orientation="right" />

                        <RechartsTooltip />

                        <Legend />

                        <Bar yAxisId="left" dataKey="utilisateurs" fill="#558b2f" name="Clients" />

                        <Bar yAxisId="left" dataKey="commandes" fill="#9e9e9e" name="Commandes" />

                        <Line yAxisId="right" type="monotone" dataKey="chiffreAffaires" stroke="#2e7d32" name="CA (FCFA)" />

                      </ComposedChart>

                    </ResponsiveContainer>

                  )}

                </Paper>

              </Grid>

              <Grid item xs={12} md={4}>

                <Paper sx={{ p: 3 }}>

                  <Typography variant="h6" sx={{ mb: 2 }}>

                    Répartition des Paiements

                  </Typography>

                  {statsPaiements.length === 0 ? (

                    <Typography color="text.secondary">Aucun paiement validé.</Typography>

                  ) : (

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

                          {statsPaiements.map((_entry, index) => (

                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />

                          ))}

                        </Pie>

                        <RechartsTooltip />

                      </PieChart>

                    </ResponsiveContainer>

                  )}

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

                  {statsCategories.length === 0 ? (

                    <Typography color="text.secondary">Aucune catégorie.</Typography>

                  ) : (

                    <ResponsiveContainer width="100%" height={400}>

                      <BarChart data={statsCategories}>

                        <CartesianGrid strokeDasharray="3 3" />

                        <XAxis dataKey="categorie" />

                        <YAxis />

                        <RechartsTooltip />

                        <Legend />

                        <Bar dataKey="servicesActifsCatalogue" fill="#558b2f" name="Services (catalogue actuel)" />

                        <Bar dataKey="nombreCommandes" fill="#9e9e9e" name="Prestations (activité)" />

                      </BarChart>

                    </ResponsiveContainer>

                  )}

                </Paper>

              </Grid>

              <Grid item xs={12} md={4}>

                <Paper sx={{ p: 3 }}>

                  <Typography variant="h6" sx={{ mb: 2 }}>

                    Top Catégories par CA

                  </Typography>

                  {statsCategories

                    .slice()

                    .sort((a, b) => b.chiffreAffaires - a.chiffreAffaires)

                    .slice(0, 5)

                    .map((categorie) => (

                      <Box key={categorie.categorie} sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>

                        <Typography variant="subtitle2">{categorie.categorie}</Typography>

                        <Typography variant="h6" color="primary">

                          {categorie.chiffreAffaires.toLocaleString()} FCFA

                        </Typography>

                        <Typography variant="body2" color="text.secondary">

                          {categorie.nombreCommandes} prestations

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

                  {statsPaiements.length === 0 ? (

                    <Typography color="text.secondary">Aucun paiement validé.</Typography>

                  ) : (

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

                          {statsPaiements.map((_entry, index) => (

                            <Cell key={`cell-p2-${index}`} fill={COLORS[index % COLORS.length]} />

                          ))}

                        </Pie>

                        <RechartsTooltip formatter={(value) => `${Number(value).toLocaleString()} FCFA`} />

                      </PieChart>

                    </ResponsiveContainer>

                  )}

                </Paper>

              </Grid>

              <Grid item xs={12} md={6}>

                <Paper sx={{ p: 3 }}>

                  <Typography variant="h6" sx={{ mb: 2 }}>

                    Volume par Méthode de Paiement

                  </Typography>

                  {statsPaiements.length === 0 ? (

                    <Typography color="text.secondary">Aucun paiement validé.</Typography>

                  ) : (

                    <ResponsiveContainer width="100%" height={300}>

                      <BarChart data={statsPaiements}>

                        <CartesianGrid strokeDasharray="3 3" />

                        <XAxis dataKey="methode" />

                        <YAxis />

                        <RechartsTooltip />

                        <Bar dataKey="nombre" fill="#558b2f" name="Nombre de transactions" />

                      </BarChart>

                    </ResponsiveContainer>

                  )}

                </Paper>

              </Grid>

            </Grid>

          )}



          {activeTab === 3 && (

            <Grid container spacing={3}>

              <Grid item xs={12}>

                <Paper sx={{ p: 3 }}>

                  <Typography variant="h6" sx={{ mb: 2 }}>

                    Répartition Géographique (commandes)

                  </Typography>

                  {statsGeographiques.length === 0 ? (

                    <Typography color="text.secondary">Aucune donnée géographique.</Typography>

                  ) : (

                    <ResponsiveContainer width="100%" height={400}>

                      <BarChart data={statsGeographiques}>

                        <CartesianGrid strokeDasharray="3 3" />

                        <XAxis dataKey="ville" />

                        <YAxis yAxisId="left" />

                        <YAxis yAxisId="right" orientation="right" />

                        <RechartsTooltip />

                        <Legend />

                        <Bar yAxisId="left" dataKey="utilisateurs" fill="#558b2f" name="Clients distincts" />

                        <Bar yAxisId="left" dataKey="commandes" fill="#9e9e9e" name="Commandes" />

                        <Line yAxisId="right" type="monotone" dataKey="chiffreAffaires" stroke="#2e7d32" name="CA (FCFA)" />

                      </BarChart>

                    </ResponsiveContainer>

                  )}

                </Paper>

              </Grid>

            </Grid>

          )}

        </>

      ) : null}

    </Box>

  );

};



export default Statistiques;


