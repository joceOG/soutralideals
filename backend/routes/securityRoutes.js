import { Router } from 'express';
import {
  getUserSecurity,
  enable2FA,
  verify2FA,
  disable2FA,
  getLoginHistory,
  getActiveSessions,
  terminateSession,
  getSecurityAlerts,
  markAlertAsRead,
  getTrustedDevices,
  removeTrustedDevice,
  updateSecuritySettings,
  getSecurityStats,
  getAllSecurityStats
} from '../controller/securityController.js';

const securityRouter = Router();

// ✅ ROUTES DE BASE
securityRouter.get('/security/user/:utilisateurId', getUserSecurity);
securityRouter.get('/security/user/:utilisateurId/stats', getSecurityStats);

// ✅ ROUTES 2FA
securityRouter.post('/security/user/:utilisateurId/2fa/enable', enable2FA);
securityRouter.post('/security/user/:utilisateurId/2fa/verify', verify2FA);
securityRouter.post('/security/user/:utilisateurId/2fa/disable', disable2FA);

// ✅ ROUTES SESSIONS
securityRouter.get('/security/user/:utilisateurId/sessions', getActiveSessions);
securityRouter.delete('/security/user/:utilisateurId/sessions/:sessionId', terminateSession);

// ✅ ROUTES HISTORIQUE
securityRouter.get('/security/user/:utilisateurId/history', getLoginHistory);

// ✅ ROUTES ALERTES
securityRouter.get('/security/user/:utilisateurId/alerts', getSecurityAlerts);
securityRouter.patch('/security/user/:utilisateurId/alerts/:alertId/read', markAlertAsRead);

// ✅ ROUTES APPAREILS
securityRouter.get('/security/user/:utilisateurId/devices', getTrustedDevices);
securityRouter.delete('/security/user/:utilisateurId/devices/:deviceId', removeTrustedDevice);

// ✅ ROUTES PARAMÈTRES
securityRouter.put('/security/user/:utilisateurId/settings', updateSecuritySettings);

// ✅ ROUTES ADMIN
securityRouter.get('/security/stats', getAllSecurityStats);

export default securityRouter;



