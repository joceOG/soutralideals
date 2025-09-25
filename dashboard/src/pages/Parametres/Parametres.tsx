import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Card, CardContent, Grid, FormControl,
  InputLabel, Select, MenuItem, Switch, FormControlLabel, Button,
  TextField, Divider, Alert, Chip, Avatar, List, ListItem,
  ListItemText, ListItemIcon, ListItemSecondaryAction, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, Tabs, Tab,
  CircularProgress, Snackbar
} from '@mui/material';
import {
  Language as LanguageIcon,
  AttachMoney as CurrencyIcon,
  Public as CountryIcon,
  Schedule as TimeIcon,
  Palette as ThemeIcon,
  Notifications as NotificationIcon,
  Security as SecurityIcon,
  Accessibility as AccessibilityIcon,
  PhoneAndroid as MobileIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Securite from './Securite';

// ✅ INTERFACES TYPESCRIPT
interface IUserPreferences {
  _id?: string;
  utilisateur: string;
  langue: string;
  devise: string;
  pays: string;
  fuseauHoraire: string;
  formatDate: string;
  formatHeure: string;
  formatMonetaire: string;
  theme: string;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    langue: string;
  };
  localisation: {
    ville?: string;
    codePostal?: string;
    coordonnees?: {
      latitude: number;
      longitude: number;
    };
  };
  recherche: {
    rayon: number;
    triParDefaut: string;
    afficherPrix: boolean;
  };
  securite: {
    authentificationDoubleFacteur: boolean;
    notificationsConnexion: boolean;
    partageDonnees: boolean;
  };
  analytics: {
    partageDonneesUsage: boolean;
    cookies: boolean;
  };
  accessibilite: {
    taillePolice: string;
    contraste: string;
    lecteurEcran: boolean;
  };
  mobile: {
    vibrations: boolean;
    son: boolean;
    orientation: string;
  };
  derniereModification: string;
  version: string;
  // Index signature pour permettre l'accès dynamique
  [key: string]: any;
}

interface IPreferencesStats {
  totalUsers: number;
  langues: string[];
  devises: string[];
  pays: string[];
  byLanguage: Array<{ _id: string; count: number }>;
  byCurrency: Array<{ _id: string; count: number }>;
  byCountry: Array<{ _id: string; count: number }>;
}

const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const ParametresComponent: React.FC = () => {
  const [preferences, setPreferences] = useState<IUserPreferences | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState(0);
  const [stats, setStats] = useState<IPreferencesStats | null>(null);
  const [statsLoading, setStatsLoading] = useState<boolean>(true);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // 🔧 OPTIONS DE CONFIGURATION
  const languageOptions = [
    { value: 'fr', label: 'Français', flag: '🇫🇷' },
    { value: 'en', label: 'English', flag: '🇺🇸' },
    { value: 'es', label: 'Español', flag: '🇪🇸' },
    { value: 'pt', label: 'Português', flag: '🇵🇹' },
    { value: 'ar', label: 'العربية', flag: '🇸🇦' }
  ];

  const currencyOptions = [
    { value: 'FCFA', label: 'Franc CFA', symbol: 'FCFA', flag: '🇨🇮' },
    { value: 'EUR', label: 'Euro', symbol: '€', flag: '🇪🇺' },
    { value: 'USD', label: 'Dollar US', symbol: '$', flag: '🇺🇸' },
    { value: 'XOF', label: 'Franc CFA (XOF)', symbol: 'F', flag: '🇸🇳' },
    { value: 'XAF', label: 'Franc CFA (XAF)', symbol: 'F', flag: '🇨🇲' }
  ];

  const countryOptions = [
    { value: 'CI', label: 'Côte d\'Ivoire', flag: '🇨🇮' },
    { value: 'FR', label: 'France', flag: '🇫🇷' },
    { value: 'US', label: 'États-Unis', flag: '🇺🇸' },
    { value: 'SN', label: 'Sénégal', flag: '🇸🇳' },
    { value: 'ML', label: 'Mali', flag: '🇲🇱' },
    { value: 'BF', label: 'Burkina Faso', flag: '🇧🇫' },
    { value: 'NE', label: 'Niger', flag: '🇳🇪' },
    { value: 'TG', label: 'Togo', flag: '🇹🇬' },
    { value: 'BJ', label: 'Bénin', flag: '🇧🇯' },
    { value: 'GH', label: 'Ghana', flag: '🇬🇭' },
    { value: 'NG', label: 'Nigeria', flag: '🇳🇬' }
  ];

  const timezoneOptions = [
    { value: 'Africa/Abidjan', label: 'Abidjan (GMT+0)' },
    { value: 'Europe/Paris', label: 'Paris (GMT+1)' },
    { value: 'America/New_York', label: 'New York (GMT-5)' },
    { value: 'Africa/Dakar', label: 'Dakar (GMT+0)' },
    { value: 'Africa/Bamako', label: 'Bamako (GMT+0)' }
  ];

  const dateFormatOptions = [
    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (31/12/2023)' },
    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (12/31/2023)' },
    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2023-12-31)' }
  ];

  const timeFormatOptions = [
    { value: '12h', label: '12 heures (AM/PM)' },
    { value: '24h', label: '24 heures' }
  ];

  const monetaryFormatOptions = [
    { value: '1,234.56', label: '1,234.56 (Anglais)' },
    { value: '1 234,56', label: '1 234,56 (Français)' },
    { value: '1.234,56', label: '1.234,56 (Allemand)' }
  ];

  const themeOptions = [
    { value: 'light', label: 'Clair', icon: '☀️' },
    { value: 'dark', label: 'Sombre', icon: '🌙' },
    { value: 'auto', label: 'Automatique', icon: '🔄' }
  ];

  // 🔹 CHARGEMENT DES PRÉFÉRENCES
  const fetchPreferences = async () => {
    setLoading(true);
    try {
      // Utiliser un ID utilisateur par défaut pour la démonstration
      const userId = '653a8411c76522006a111111';
      const response = await axios.get(`${apiUrl}/preferences/user/${userId}`);
      setPreferences(response.data.preferences);
    } catch (error) {
      console.error('Erreur lors du chargement des préférences:', error);
      // Créer des préférences par défaut en cas d'erreur
      const defaultPreferences: IUserPreferences = {
        utilisateur: '653a8411c76522006a111111',
        langue: 'fr',
        devise: 'FCFA',
        pays: 'CI',
        fuseauHoraire: 'Africa/Abidjan',
        formatDate: 'DD/MM/YYYY',
        formatHeure: '24h',
        formatMonetaire: '1 234,56',
        theme: 'light',
        notifications: {
          email: true,
          push: true,
          sms: false,
          langue: 'fr'
        },
        localisation: {
          ville: '',
          codePostal: '',
          coordonnees: undefined
        },
        recherche: {
          rayon: 10,
          triParDefaut: 'distance',
          afficherPrix: true
        },
        securite: {
          authentificationDoubleFacteur: false,
          notificationsConnexion: true,
          partageDonnees: false
        },
        analytics: {
          partageDonneesUsage: true,
          cookies: true
        },
        accessibilite: {
          taillePolice: 'normale',
          contraste: 'normal',
          lecteurEcran: false
        },
        mobile: {
          vibrations: true,
          son: true,
          orientation: 'auto'
        },
        derniereModification: new Date().toISOString(),
        version: '1.0.0'
      };
      setPreferences(defaultPreferences);
      toast.warning("Préférences par défaut chargées (connexion au serveur échouée)");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 CHARGEMENT DES STATISTIQUES
  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const response = await axios.get(`${apiUrl}/preferences/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
      // Initialiser avec des valeurs par défaut en cas d'erreur
      setStats({
        totalUsers: 0,
        langues: [],
        devises: [],
        pays: [],
        byLanguage: [],
        byCurrency: [],
        byCountry: []
      });
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchPreferences();
    fetchStats();
  }, []);

  // 🔹 SAUVEGARDE DES PRÉFÉRENCES
  const savePreferences = async () => {
    if (!preferences) return;
    
    setSaving(true);
    try {
      const userId = '653a8411c76522006a111111';
      await axios.put(`${apiUrl}/preferences/user/${userId}`, preferences);
      setSnackbarMessage('Préférences sauvegardées avec succès');
      setSnackbarOpen(true);
      toast.success("Préférences sauvegardées avec succès");
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      setSnackbarMessage('Erreur lors de la sauvegarde');
      setSnackbarOpen(true);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  // 🔹 RÉINITIALISATION DES PRÉFÉRENCES
  const resetPreferences = async () => {
    if (!preferences) return;
    
    try {
      const userId = '653a8411c76522006a111111';
      await axios.patch(`${apiUrl}/preferences/user/${userId}/reset`);
      await fetchPreferences();
      setSnackbarMessage('Préférences réinitialisées avec succès');
      setSnackbarOpen(true);
      toast.success("Préférences réinitialisées avec succès");
    } catch (error) {
      console.error('Erreur lors de la réinitialisation:', error);
      toast.error("Erreur lors de la réinitialisation");
    }
  };

  // 🔹 GESTION DES CHANGEMENTS
  const handlePreferenceChange = (path: string, value: any) => {
    if (!preferences) return;
    
    const newPreferences = { ...preferences };
    
    // Gestion simple pour les propriétés de premier niveau
    if (path === 'langue') {
      newPreferences.langue = value;
    } else if (path === 'devise') {
      newPreferences.devise = value;
    } else if (path === 'pays') {
      newPreferences.pays = value;
    } else if (path === 'fuseauHoraire') {
      newPreferences.fuseauHoraire = value;
    } else if (path === 'formatDate') {
      newPreferences.formatDate = value;
    } else if (path === 'formatHeure') {
      newPreferences.formatHeure = value;
    } else if (path === 'formatMonetaire') {
      newPreferences.formatMonetaire = value;
    } else if (path === 'theme') {
      newPreferences.theme = value;
    } else if (path === 'notifications.email') {
      newPreferences.notifications.email = value;
    } else if (path === 'notifications.push') {
      newPreferences.notifications.push = value;
    } else if (path === 'notifications.sms') {
      newPreferences.notifications.sms = value;
    } else if (path === 'notifications.langue') {
      newPreferences.notifications.langue = value;
    } else if (path === 'securite.authentificationDoubleFacteur') {
      newPreferences.securite.authentificationDoubleFacteur = value;
    } else if (path === 'securite.notificationsConnexion') {
      newPreferences.securite.notificationsConnexion = value;
    } else if (path === 'securite.partageDonnees') {
      newPreferences.securite.partageDonnees = value;
    } else if (path === 'accessibilite.taillePolice') {
      newPreferences.accessibilite.taillePolice = value;
    } else if (path === 'accessibilite.contraste') {
      newPreferences.accessibilite.contraste = value;
    } else if (path === 'accessibilite.lecteurEcran') {
      newPreferences.accessibilite.lecteurEcran = value;
    }
    
    setPreferences(newPreferences);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!preferences) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Impossible de charger les préférences. Veuillez réessayer.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3 }}>
        Paramètres & Préférences
      </Typography>

      {/* 📊 STATISTIQUES GÉNÉRALES */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <LanguageIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Langues</Typography>
              </Box>
              {statsLoading ? (
                <CircularProgress size={40} />
              ) : (
                <Typography variant="h3" color="primary">
                  {stats?.langues?.length ?? 0}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary">
                Langues supportées
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CurrencyIcon color="secondary" sx={{ mr: 1 }} />
                <Typography variant="h6">Devises</Typography>
              </Box>
              {statsLoading ? (
                <CircularProgress size={40} />
              ) : (
                <Typography variant="h3" color="secondary">
                  {stats?.devises?.length ?? 0}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary">
                Devises disponibles
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CountryIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">Pays</Typography>
              </Box>
              {statsLoading ? (
                <CircularProgress size={40} />
              ) : (
                <Typography variant="h3" color="success">
                  {stats?.pays?.length ?? 0}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary">
                Pays supportés
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <SettingsIcon color="info" sx={{ mr: 1 }} />
                <Typography variant="h6">Utilisateurs</Typography>
              </Box>
              {statsLoading ? (
                <CircularProgress size={40} />
              ) : (
                <Typography variant="h3" color="info">
                  {stats?.totalUsers ?? 0}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary">
                Utilisateurs configurés
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 🎯 ONGLETS DE CONFIGURATION */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Langue & Devise" icon={<LanguageIcon />} />
          <Tab label="Localisation" icon={<CountryIcon />} />
          <Tab label="Affichage" icon={<ThemeIcon />} />
          <Tab label="Notifications" icon={<NotificationIcon />} />
          <Tab label="Sécurité" icon={<SecurityIcon />} />
          <Tab label="Accessibilité" icon={<AccessibilityIcon />} />
        </Tabs>
      </Paper>

      {/* 🌍 ONGLET LANGUE & DEVISE */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  🌍 Langue
                </Typography>
                <FormControl fullWidth>
                  <InputLabel>Langue de l'interface</InputLabel>
                  <Select
                    value={preferences.langue}
                    onChange={(e) => handlePreferenceChange('langue', e.target.value)}
                    label="Langue de l'interface"
                  >
                    {languageOptions.map((lang) => (
                      <MenuItem key={lang.value} value={lang.value}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography sx={{ mr: 1 }}>{lang.flag}</Typography>
                          <Typography>{lang.label}</Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  💰 Devise
                </Typography>
                <FormControl fullWidth>
                  <InputLabel>Devise par défaut</InputLabel>
                  <Select
                    value={preferences.devise}
                    onChange={(e) => handlePreferenceChange('devise', e.target.value)}
                    label="Devise par défaut"
                  >
                    {currencyOptions.map((currency) => (
                      <MenuItem key={currency.value} value={currency.value}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography sx={{ mr: 1 }}>{currency.flag}</Typography>
                          <Typography>{currency.label} ({currency.symbol})</Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* 📍 ONGLET LOCALISATION */}
      {activeTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  🌍 Pays
                </Typography>
                <FormControl fullWidth>
                  <InputLabel>Pays</InputLabel>
                  <Select
                    value={preferences.pays}
                    onChange={(e) => handlePreferenceChange('pays', e.target.value)}
                    label="Pays"
                  >
                    {countryOptions.map((country) => (
                      <MenuItem key={country.value} value={country.value}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography sx={{ mr: 1 }}>{country.flag}</Typography>
                          <Typography>{country.label}</Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  🕐 Fuseau horaire
                </Typography>
                <FormControl fullWidth>
                  <InputLabel>Fuseau horaire</InputLabel>
                  <Select
                    value={preferences.fuseauHoraire}
                    onChange={(e) => handlePreferenceChange('fuseauHoraire', e.target.value)}
                    label="Fuseau horaire"
                  >
                    {timezoneOptions.map((tz) => (
                      <MenuItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* 🎨 ONGLET AFFICHAGE */}
      {activeTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  🎨 Thème
                </Typography>
                <FormControl fullWidth>
                  <InputLabel>Thème</InputLabel>
                  <Select
                    value={preferences.theme}
                    onChange={(e) => handlePreferenceChange('theme', e.target.value)}
                    label="Thème"
                  >
                    {themeOptions.map((theme) => (
                      <MenuItem key={theme.value} value={theme.value}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography sx={{ mr: 1 }}>{theme.icon}</Typography>
                          <Typography>{theme.label}</Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📅 Format de date
                </Typography>
                <FormControl fullWidth>
                  <InputLabel>Format de date</InputLabel>
                  <Select
                    value={preferences.formatDate}
                    onChange={(e) => handlePreferenceChange('formatDate', e.target.value)}
                    label="Format de date"
                  >
                    {dateFormatOptions.map((format) => (
                      <MenuItem key={format.value} value={format.value}>
                        {format.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  🕐 Format d'heure
                </Typography>
                <FormControl fullWidth>
                  <InputLabel>Format d'heure</InputLabel>
                  <Select
                    value={preferences.formatHeure}
                    onChange={(e) => handlePreferenceChange('formatHeure', e.target.value)}
                    label="Format d'heure"
                  >
                    {timeFormatOptions.map((format) => (
                      <MenuItem key={format.value} value={format.value}>
                        {format.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* 🔔 ONGLET NOTIFICATIONS */}
      {activeTab === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📧 Notifications Email
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.notifications.email}
                      onChange={(e) => handlePreferenceChange('notifications.email', e.target.checked)}
                    />
                  }
                  label="Activer les notifications par email"
                />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📱 Notifications Push
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.notifications.push}
                      onChange={(e) => handlePreferenceChange('notifications.push', e.target.checked)}
                    />
                  }
                  label="Activer les notifications push"
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* 🔒 ONGLET SÉCURITÉ */}
      {activeTab === 4 && (
        <Securite />
      )}

      {/* ♿ ONGLET ACCESSIBILITÉ */}
      {activeTab === 6 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📝 Taille de police
                </Typography>
                <FormControl fullWidth>
                  <InputLabel>Taille de police</InputLabel>
                  <Select
                    value={preferences.accessibilite.taillePolice}
                    onChange={(e) => handlePreferenceChange('accessibilite.taillePolice', e.target.value)}
                    label="Taille de police"
                  >
                    <MenuItem value="petite">Petite</MenuItem>
                    <MenuItem value="normale">Normale</MenuItem>
                    <MenuItem value="grande">Grande</MenuItem>
                    <MenuItem value="tres-grande">Très grande</MenuItem>
                  </Select>
                </FormControl>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  🎨 Contraste
                </Typography>
                <FormControl fullWidth>
                  <InputLabel>Contraste</InputLabel>
                  <Select
                    value={preferences.accessibilite.contraste}
                    onChange={(e) => handlePreferenceChange('accessibilite.contraste', e.target.value)}
                    label="Contraste"
                  >
                    <MenuItem value="normal">Normal</MenuItem>
                    <MenuItem value="eleve">Élevé</MenuItem>
                    <MenuItem value="tres-eleve">Très élevé</MenuItem>
                  </Select>
                </FormControl>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  🔊 Lecteur d'écran
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.accessibilite.lecteurEcran}
                      onChange={(e) => handlePreferenceChange('accessibilite.lecteurEcran', e.target.checked)}
                    />
                  }
                  label="Activer le lecteur d'écran"
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* 🎯 ACTIONS */}
      <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={resetPreferences}
          color="warning"
        >
          Réinitialiser
        </Button>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={savePreferences}
          disabled={saving}
          color="primary"
        >
          {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </Button>
      </Box>

      {/* 📱 SNACKBAR */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </Box>
  );
};

export default ParametresComponent;
