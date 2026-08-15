import { Router } from 'express';
import auth, { authRole } from '../middleware/authMiddleware.js';
import {
  getUserSecurity,
  enable2FA,
  verify2FA,
  disable2FA,
  getLoginHistory,
  getActiveSessions,
  terminateSession,
  terminateAllOtherSessions,
  clearLoginHistory,
  getSecurityAlerts,
  markAlertAsRead,
  markAllAlertsAsRead,
  deleteSecurityAlert,
  exportSecurityData,
  getTrustedDevices,
  removeTrustedDevice,
  updateSecuritySettings,
  getSecurityStats,
  getAllSecurityStats
} from '../controller/securityController.js';

const securityRouter = Router();

// ✅ ROUTES DE BASE — protégées
securityRouter.get('/security/user/:utilisateurId', auth, getUserSecurity);
securityRouter.get('/security/user/:utilisateurId/stats', auth, getSecurityStats);
securityRouter.get('/security/user/:utilisateurId/export', auth, exportSecurityData);

// ✅ ROUTES 2FA
securityRouter.post('/security/user/:utilisateurId/2fa/enable', auth, enable2FA);
securityRouter.post('/security/user/:utilisateurId/2fa/verify', auth, verify2FA);
securityRouter.post('/security/user/:utilisateurId/2fa/disable', auth, disable2FA);

// ✅ ROUTES SESSIONS
securityRouter.get('/security/user/:utilisateurId/sessions', auth, getActiveSessions);
securityRouter.delete('/security/user/:utilisateurId/sessions', auth, terminateAllOtherSessions);
securityRouter.delete('/security/user/:utilisateurId/sessions/:sessionId', auth, terminateSession);

// ✅ ROUTES HISTORIQUE
securityRouter.get('/security/user/:utilisateurId/history', auth, getLoginHistory);
securityRouter.delete('/security/user/:utilisateurId/history', auth, clearLoginHistory);

// ✅ ROUTES ALERTES (read-all avant :alertId)
securityRouter.get('/security/user/:utilisateurId/alerts', auth, getSecurityAlerts);
securityRouter.patch('/security/user/:utilisateurId/alerts/read-all', auth, markAllAlertsAsRead);
securityRouter.patch('/security/user/:utilisateurId/alerts/:alertId/read', auth, markAlertAsRead);
securityRouter.delete('/security/user/:utilisateurId/alerts/:alertId', auth, deleteSecurityAlert);

// ✅ ROUTES APPAREILS
securityRouter.get('/security/user/:utilisateurId/devices', auth, getTrustedDevices);
securityRouter.delete('/security/user/:utilisateurId/devices/:deviceId', auth, removeTrustedDevice);

// ✅ ROUTES PARAMÈTRES
securityRouter.put('/security/user/:utilisateurId/settings', auth, updateSecuritySettings);

// ✅ ROUTES ADMIN
securityRouter.get('/security/stats', auth, authRole(['ADMIN']), getAllSecurityStats);

export default securityRouter;



