import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Card, CardContent, Grid, FormControl,
  InputLabel, Select, MenuItem, Switch, FormControlLabel, Button,
  TextField, Divider, Alert, Chip, Avatar, List, ListItem,
  ListItemText, ListItemIcon, ListItemSecondaryAction, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, Tabs, Tab,
  CircularProgress, Snackbar, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Tooltip, Badge, LinearProgress
} from '@mui/material';
import {
  Security as SecurityIcon,
  TwoWheeler as TwoFAIcon,
  Devices as DevicesIcon,
  History as HistoryIcon,
  Notifications as AlertIcon,
  Shield as ShieldIcon,
  Lock as LockIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  QrCode as QrCodeIcon,
  Smartphone as SmartphoneIcon,
  Computer as ComputerIcon,
  Tablet as TabletIcon,
  Language as LanguageIcon
} from '@mui/icons-material';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// ✅ INTERFACES TYPESCRIPT
interface ISecurityData {
  _id?: string;
  utilisateur: string;
  twoFactorAuth: {
    enabled: boolean;
    secret?: string;
    backupCodes: Array<{
      code: string;
      used: boolean;
      usedAt?: Date;
    }>;
    lastUsed?: Date;
  };
  trustedDevices: Array<{
    deviceId: string;
    deviceName: string;
    deviceType: string;
    userAgent: string;
    ipAddress: string;
    location: {
      country: string;
      city: string;
      coordinates: {
        latitude: number;
        longitude: number;
      };
    };
    lastUsed: Date;
    isActive: boolean;
    fingerprint: string;
    createdAt: Date;
  }>;
  activeSessions: Array<{
    sessionId: string;
    deviceInfo: {
      name: string;
      type: string;
      userAgent: string;
      ipAddress: string;
    };
    location: {
      country: string;
      city: string;
      coordinates: {
        latitude: number;
        longitude: number;
      };
    };
    loginTime: Date;
    lastActivity: Date;
    expiresAt: Date;
    isActive: boolean;
  }>;
  loginHistory: Array<{
    loginTime: Date;
    ipAddress: string;
    userAgent: string;
    location: {
      country: string;
      city: string;
      coordinates: {
        latitude: number;
        longitude: number;
      };
    };
    deviceInfo: {
      name: string;
      type: string;
      os: string;
      browser: string;
    };
    success: boolean;
    failureReason?: string;
    sessionId: string;
    twoFactorUsed: boolean;
  }>;
  securityAlerts: Array<{
    _id: string;
    type: string;
    title: string;
    message: string;
    severity: string;
    timestamp: Date;
    read: boolean;
    metadata: {
      ipAddress: string;
      userAgent: string;
      location: {
        country: string;
        city: string;
      };
      deviceInfo: {
        name: string;
        type: string;
      };
    };
  }>;
  securitySettings: {
    emailNotifications: {
      newLogin: boolean;
      newDevice: boolean;
      passwordChange: boolean;
      suspiciousActivity: boolean;
    };
    sessionTimeout: number;
    maxConcurrentSessions: number;
    allowedCountries: string[];
    blockedCountries: string[];
    allowedIPs: string[];
    blockedIPs: string[];
  };
  securityStats: {
    securityScore: number;
    totalLogins: number;
    failedLogins: number;
    lastLogin: Date;
    averageSessionDuration: number;
    mostUsedDevice: string;
    mostUsedLocation: string;
  };
}

const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const SecuriteComponent: React.FC = () => {
  const [securityData, setSecurityData] = useState<ISecurityData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState(0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [twoFAToken, setTwoFAToken] = useState('');
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  const _currentUserId = '653a8411c76522006a111111'; // TODO: Remplacer par l'ID utilisateur réel

  // 🔹 CHARGEMENT DES DONNÉES DE SÉCURITÉ
  const fetchSecurityData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${apiUrl}/security/user/${_currentUserId}`);
      setSecurityData(response.data.security);
    } catch (error) {
      console.error('Erreur lors du chargement des données de sécurité:', error);
      toast.error("Erreur lors du chargement des données de sécurité");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 CHARGEMENT DES STATISTIQUES DE SÉCURITÉ
  const fetchSecurityStats = async () => {
    try {
      const response = await axios.get(`${apiUrl}/security/user/${_currentUserId}/stats`);
      // Mettre à jour les statistiques dans securityData
      if (securityData) {
        setSecurityData({
          ...securityData,
          securityStats: response.data.stats
        });
      }
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    }
  };

  useEffect(() => {
    fetchSecurityData();
    fetchSecurityStats();
  }, []);

  // 🔹 ACTIVER L'AUTHENTIFICATION À DEUX FACTEURS
  const handleEnable2FA = async () => {
    try {
      const response = await axios.post(`${apiUrl}/security/user/${_currentUserId}/2fa/enable`);
      setQrCodeUrl(response.data.qrCode);
      setBackupCodes(response.data.backupCodes.map((code: any) => code.code));
      setShow2FASetup(true);
      toast.success("QR Code généré avec succès");
    } catch (error) {
      console.error('Erreur activation 2FA:', error);
      toast.error("Erreur lors de l'activation de l'authentification à deux facteurs");
    }
  };

  // 🔹 VÉRIFIER LE CODE 2FA
  const handleVerify2FA = async () => {
    try {
      const response = await axios.post(`${apiUrl}/security/user/${_currentUserId}/2fa/verify`, {
        token: twoFAToken
      });
      
      if (response.data.verified) {
        setShow2FASetup(false);
        setShowBackupCodes(true);
        toast.success("Authentification à deux facteurs activée avec succès");
        fetchSecurityData(); // Recharger les données
      } else {
        toast.error("Code invalide");
      }
    } catch (error) {
      console.error('Erreur vérification 2FA:', error);
      toast.error("Erreur lors de la vérification du code");
    }
  };

  // 🔹 DÉSACTIVER L'AUTHENTIFICATION À DEUX FACTEURS
  const handleDisable2FA = async () => {
    if (window.confirm("Êtes-vous sûr de vouloir désactiver l'authentification à deux facteurs ?")) {
      try {
        await axios.post(`${apiUrl}/security/user/${_currentUserId}/2fa/disable`, {
          password: "current_password" // TODO: Demander le mot de passe actuel
        });
        toast.success("Authentification à deux facteurs désactivée");
        fetchSecurityData(); // Recharger les données
      } catch (error) {
        console.error('Erreur désactivation 2FA:', error);
        toast.error("Erreur lors de la désactivation");
      }
    }
  };

  // 🔹 TERMINER UNE SESSION
  const handleTerminateSession = async (sessionId: string) => {
    try {
      await axios.delete(`${apiUrl}/security/user/${_currentUserId}/sessions/${sessionId}`);
      toast.success("Session terminée avec succès");
      fetchSecurityData(); // Recharger les données
    } catch (error) {
      console.error('Erreur termination session:', error);
      toast.error("Erreur lors de la termination de la session");
    }
  };

  // 🔹 SUPPRIMER UN APPAREIL DE CONFIANCE
  const handleRemoveTrustedDevice = async (deviceId: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cet appareil de confiance ?")) {
      try {
        await axios.delete(`${apiUrl}/security/user/${_currentUserId}/devices/${deviceId}`);
        toast.success("Appareil supprimé avec succès");
        fetchSecurityData(); // Recharger les données
      } catch (error) {
        console.error('Erreur suppression appareil:', error);
        toast.error("Erreur lors de la suppression de l'appareil");
      }
    }
  };

  // 🔹 MARQUER UNE ALERTE COMME LUE
  const handleMarkAlertAsRead = async (alertId: string) => {
    try {
      await axios.patch(`${apiUrl}/security/user/${_currentUserId}/alerts/${alertId}/read`);
      toast.success("Alerte marquée comme lue");
      fetchSecurityData(); // Recharger les données
    } catch (error) {
      console.error('Erreur marquage alerte:', error);
      toast.error("Erreur lors du marquage de l'alerte");
    }
  };

  // 🔹 METTRE À JOUR LES PARAMÈTRES DE SÉCURITÉ
  const handleUpdateSecuritySettings = async (settings: any) => {
    setSaving(true);
    try {
      await axios.put(`${apiUrl}/security/user/${_currentUserId}/settings`, {
        securitySettings: settings
      });
      setSnackbarMessage('Paramètres de sécurité mis à jour avec succès');
      setSnackbarOpen(true);
      toast.success("Paramètres mis à jour avec succès");
      fetchSecurityData(); // Recharger les données
    } catch (error) {
      console.error('Erreur mise à jour paramètres:', error);
      setSnackbarMessage('Erreur lors de la mise à jour');
      setSnackbarOpen(true);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setSaving(false);
    }
  };

  // 🔹 GESTION DES CHANGEMENTS DE PARAMÈTRES
  const handleSettingChange = (path: string, value: any) => {
    if (!securityData) return;
    
    const newSecurityData = { ...securityData };
    const keys = path.split('.');
    let current: any = newSecurityData;
    
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    setSecurityData(newSecurityData);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!securityData) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Impossible de charger les données de sécurité. Veuillez réessayer.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      maxHeight: 'calc(100vh - 200px)', 
      overflow: 'auto',
      p: 3 
    }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3 }}>
        Sécurité du Compte
      </Typography>

      {/* 📊 STATISTIQUES DE SÉCURITÉ */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <ShieldIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Score de Sécurité</Typography>
              </Box>
              <Typography variant="h3" color="primary">
                {securityData.securityStats.securityScore}/100
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={securityData.securityStats.securityScore} 
                sx={{ mt: 1 }}
              />
              <Typography variant="body2" color="text.secondary">
                Niveau de sécurité
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TwoFAIcon color="secondary" sx={{ mr: 1 }} />
                <Typography variant="h6">2FA</Typography>
              </Box>
              <Typography variant="h3" color="secondary">
                {securityData.twoFactorAuth.enabled ? 'Activé' : 'Désactivé'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Authentification à deux facteurs
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <DevicesIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">Appareils</Typography>
              </Box>
              <Typography variant="h3" color="success">
                {securityData.trustedDevices.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Appareils de confiance
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <AlertIcon color="info" sx={{ mr: 1 }} />
                <Typography variant="h6">Alertes</Typography>
              </Box>
              <Typography variant="h3" color="info">
                {securityData.securityAlerts.filter(alert => !alert.read).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Alertes non lues
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 🎯 ONGLETS DE SÉCURITÉ */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Authentification" icon={<TwoFAIcon />} />
          <Tab label="Sessions" icon={<DevicesIcon />} />
          <Tab label="Historique" icon={<HistoryIcon />} />
          <Tab label="Alertes" icon={<AlertIcon />} />
          <Tab label="Paramètres" icon={<SecurityIcon />} />
        </Tabs>
      </Paper>

      {/* 🔐 ONGLET AUTHENTIFICATION */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  🔐 Authentification à deux facteurs
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Ajoutez une couche de sécurité supplémentaire à votre compte.
                </Typography>
                {securityData.twoFactorAuth.enabled ? (
                  <Box>
                    <Alert severity="success" sx={{ mb: 2 }}>
                      Authentification à deux facteurs activée
                    </Alert>
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={handleDisable2FA}
                      startIcon={<LockIcon />}
                    >
                      Désactiver 2FA
                    </Button>
                  </Box>
                ) : (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleEnable2FA}
                    startIcon={<TwoFAIcon />}
                  >
                    Activer 2FA
                  </Button>
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📱 Appareils de confiance
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Gérez les appareils autorisés à accéder à votre compte.
                </Typography>
                <Typography variant="h4" color="primary">
                  {securityData.trustedDevices.length}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Appareils enregistrés
                </Typography>
                {securityData.trustedDevices.length > 0 && (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setActiveTab(1)} // Aller à l'onglet Sessions
                    startIcon={<DevicesIcon />}
                  >
                    Voir les appareils
                  </Button>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* 📱 ONGLET SESSIONS */}
      {activeTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📱 Sessions actives
                </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Appareil</TableCell>
                    <TableCell>Localisation</TableCell>
                    <TableCell>Dernière activité</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {securityData.activeSessions.map((session) => (
                    <TableRow key={session.sessionId}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {session.deviceInfo.type === 'mobile' && <SmartphoneIcon sx={{ mr: 1 }} />}
                          {session.deviceInfo.type === 'desktop' && <ComputerIcon sx={{ mr: 1 }} />}
                          {session.deviceInfo.type === 'tablet' && <TabletIcon sx={{ mr: 1 }} />}
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {session.deviceInfo.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {session.deviceInfo.ipAddress}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {session.location.city}, {session.location.country}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(session.lastActivity).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Terminer la session">
                          <IconButton 
                            color="error" 
                            onClick={() => handleTerminateSession(session.sessionId)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
              </CardContent>
            </Card>
          </Grid>
          
          {/* 📱 APPAREILS DE CONFIANCE */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  🔒 Appareils de confiance
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Appareil</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Localisation</TableCell>
                        <TableCell>Dernière utilisation</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {securityData.trustedDevices.map((device) => (
                        <TableRow key={device.deviceId}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {device.deviceType === 'mobile' && <SmartphoneIcon sx={{ mr: 1 }} />}
                              {device.deviceType === 'desktop' && <ComputerIcon sx={{ mr: 1 }} />}
                              {device.deviceType === 'tablet' && <TabletIcon sx={{ mr: 1 }} />}
                              <Box>
                                <Typography variant="body2" fontWeight="bold">
                                  {device.deviceName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {device.ipAddress}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={device.deviceType} 
                              color="primary" 
                              size="small" 
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {device.location?.city}, {device.location?.country}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {new Date(device.lastUsed).toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Tooltip title="Supprimer l'appareil">
                              <IconButton 
                                color="error" 
                                onClick={() => handleRemoveTrustedDevice(device.deviceId)}
                                size="small"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* 📊 ONGLET HISTORIQUE */}
      {activeTab === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              📊 Historique des connexions
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Appareil</TableCell>
                    <TableCell>Localisation</TableCell>
                    <TableCell>Statut</TableCell>
                    <TableCell>2FA</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {securityData.loginHistory.slice(0, 10).map((login, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(login.loginTime).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {login.deviceInfo.type === 'mobile' && <SmartphoneIcon sx={{ mr: 1 }} />}
                          {login.deviceInfo.type === 'desktop' && <ComputerIcon sx={{ mr: 1 }} />}
                          {login.deviceInfo.type === 'tablet' && <TabletIcon sx={{ mr: 1 }} />}
                          <Typography variant="body2">
                            {login.deviceInfo.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {login.location.city}, {login.location.country}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {login.success ? (
                          <Chip icon={<CheckIcon />} label="Succès" color="success" size="small" />
                        ) : (
                          <Chip icon={<ErrorIcon />} label="Échec" color="error" size="small" />
                        )}
                      </TableCell>
                      <TableCell>
                        {login.twoFactorUsed ? (
                          <Chip label="2FA" color="primary" size="small" />
                        ) : (
                          <Chip label="Standard" color="default" size="small" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* 🚨 ONGLET ALERTES */}
      {activeTab === 3 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              🚨 Alertes de sécurité
            </Typography>
            <List>
              {securityData.securityAlerts.slice(0, 10).map((alert) => (
                <ListItem key={alert._id}>
                  <ListItemIcon>
                    {alert.severity === 'CRITICAL' && <ErrorIcon color="error" />}
                    {alert.severity === 'HIGH' && <WarningIcon color="warning" />}
                    {alert.severity === 'MEDIUM' && <AlertIcon color="info" />}
                    {alert.severity === 'LOW' && <CheckIcon color="success" />}
                  </ListItemIcon>
                  <ListItemText
                    primary={alert.title}
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {alert.message}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(alert.timestamp).toLocaleString()}
                        </Typography>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip 
                        label={alert.severity} 
                        color={alert.severity === 'CRITICAL' ? 'error' : alert.severity === 'HIGH' ? 'warning' : 'default'}
                        size="small"
                      />
                      {!alert.read && (
                        <Tooltip title="Marquer comme lu">
                          <IconButton 
                            size="small"
                            onClick={() => handleMarkAlertAsRead(alert._id)}
                            color="primary"
                          >
                            <CheckIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* ⚙️ ONGLET PARAMÈTRES */}
      {activeTab === 4 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📧 Notifications de sécurité
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={securityData.securitySettings.emailNotifications.newLogin}
                      onChange={(e) => handleSettingChange('securitySettings.emailNotifications.newLogin', e.target.checked)}
                    />
                  }
                  label="Nouvelles connexions"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={securityData.securitySettings.emailNotifications.newDevice}
                      onChange={(e) => handleSettingChange('securitySettings.emailNotifications.newDevice', e.target.checked)}
                    />
                  }
                  label="Nouveaux appareils"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={securityData.securitySettings.emailNotifications.passwordChange}
                      onChange={(e) => handleSettingChange('securitySettings.emailNotifications.passwordChange', e.target.checked)}
                    />
                  }
                  label="Changement de mot de passe"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={securityData.securitySettings.emailNotifications.suspiciousActivity}
                      onChange={(e) => handleSettingChange('securitySettings.emailNotifications.suspiciousActivity', e.target.checked)}
                    />
                  }
                  label="Activité suspecte"
                />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  ⏱️ Paramètres de session
                </Typography>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Timeout de session (minutes)</InputLabel>
                  <Select
                    value={securityData.securitySettings.sessionTimeout}
                    onChange={(e) => handleSettingChange('securitySettings.sessionTimeout', e.target.value)}
                    label="Timeout de session (minutes)"
                  >
                    <MenuItem value={15}>15 minutes</MenuItem>
                    <MenuItem value={30}>30 minutes</MenuItem>
                    <MenuItem value={60}>1 heure</MenuItem>
                    <MenuItem value={120}>2 heures</MenuItem>
                    <MenuItem value={480}>8 heures</MenuItem>
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>Sessions simultanées max</InputLabel>
                  <Select
                    value={securityData.securitySettings.maxConcurrentSessions}
                    onChange={(e) => handleSettingChange('securitySettings.maxConcurrentSessions', e.target.value)}
                    label="Sessions simultanées max"
                  >
                    <MenuItem value={1}>1</MenuItem>
                    <MenuItem value={3}>3</MenuItem>
                    <MenuItem value={5}>5</MenuItem>
                    <MenuItem value={10}>10</MenuItem>
                  </Select>
                </FormControl>
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
          onClick={fetchSecurityData}
        >
          Actualiser
        </Button>
        <Button
          variant="contained"
          startIcon={<SecurityIcon />}
          onClick={() => handleUpdateSecuritySettings(securityData.securitySettings)}
          disabled={saving}
          color="primary"
        >
          {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </Button>
      </Box>

      {/* 📱 MODAL CONFIGURATION 2FA */}
      <Dialog open={show2FASetup} onClose={() => setShow2FASetup(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Configuration de l'authentification à deux facteurs</DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography variant="h6" gutterBottom>
              Scannez ce QR code avec votre application d'authentification
            </Typography>
            {qrCodeUrl && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                <img src={qrCodeUrl} alt="QR Code 2FA" style={{ maxWidth: '200px' }} />
              </Box>
            )}
            <TextField
              fullWidth
              label="Code de vérification"
              value={twoFAToken}
              onChange={(e) => setTwoFAToken(e.target.value)}
              placeholder="Entrez le code à 6 chiffres"
              sx={{ mb: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShow2FASetup(false)}>Annuler</Button>
          <Button onClick={handleVerify2FA} variant="contained">
            Vérifier
          </Button>
        </DialogActions>
      </Dialog>

      {/* 📱 MODAL CODES DE SAUVEGARDE */}
      <Dialog open={showBackupCodes} onClose={() => setShowBackupCodes(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Codes de sauvegarde</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Important :</strong> Sauvegardez ces codes dans un endroit sûr. 
              Ils vous permettront de récupérer l'accès à votre compte si vous perdez votre appareil.
            </Typography>
          </Alert>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
            {backupCodes.map((code, index) => (
              <Paper key={index} sx={{ p: 1, textAlign: 'center' }}>
                <Typography variant="body2" fontFamily="monospace">
                  {code}
                </Typography>
              </Paper>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowBackupCodes(false)} variant="contained">
            J'ai sauvegardé les codes
          </Button>
        </DialogActions>
      </Dialog>

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

export default SecuriteComponent;

