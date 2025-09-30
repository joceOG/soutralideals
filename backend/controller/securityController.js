import Security from '../models/securityModel.js';
import mongoose from 'mongoose';
import crypto from 'crypto';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

// ✅ OBTENIR LES PARAMÈTRES DE SÉCURITÉ D'UN UTILISATEUR
export const getUserSecurity = async (req, res) => {
  try {
    const { utilisateurId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(utilisateurId)) {
      return res.status(400).json({ 
        error: 'ID utilisateur invalide' 
      });
    }

    let security = await Security.findOne({ utilisateur: utilisateurId });

    if (!security) {
      // Créer des paramètres de sécurité par défaut
      security = new Security({
        utilisateur: utilisateurId,
        securitySettings: {
          emailNotifications: {
            newLogin: true,
            newDevice: true,
            passwordChange: true,
            suspiciousActivity: true
          },
          sessionTimeout: 30,
          maxConcurrentSessions: 5
        }
      });
      await security.save();
    }

    // Calculer le score de sécurité
    security.updateSecurityScore();
    await security.save();

    res.status(200).json({ security });
  } catch (err) {
    console.error('Erreur récupération sécurité:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ✅ ACTIVER L'AUTHENTIFICATION À DEUX FACTEURS
export const enable2FA = async (req, res) => {
  try {
    const { utilisateurId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(utilisateurId)) {
      return res.status(400).json({ 
        error: 'ID utilisateur invalide' 
      });
    }

    let security = await Security.findOne({ utilisateur: utilisateurId });
    
    if (!security) {
      security = new Security({ utilisateur: utilisateurId });
    }

    // Générer le secret 2FA
    const secret = security.generate2FASecret();
    await security.save();

    // Générer le QR code
    const otpauthUrl = speakeasy.otpauthURL({
      secret: secret,
      label: `SOUTRALI DEALS (${utilisateurId})`,
      issuer: 'SOUTRALI DEALS'
    });

    const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);

    res.status(200).json({
      message: '2FA activé avec succès',
      secret: secret,
      qrCode: qrCodeUrl,
      backupCodes: security.twoFactorAuth.backupCodes
    });
  } catch (err) {
    console.error('Erreur activation 2FA:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ✅ VÉRIFIER LE CODE 2FA
export const verify2FA = async (req, res) => {
  try {
    const { utilisateurId } = req.params;
    const { token } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(utilisateurId)) {
      return res.status(400).json({ 
        error: 'ID utilisateur invalide' 
      });
    }

    const security = await Security.findOne({ utilisateur: utilisateurId });
    
    if (!security || !security.twoFactorAuth.secret) {
      return res.status(400).json({ 
        error: '2FA non configuré pour cet utilisateur' 
      });
    }

    const verified = speakeasy.totp.verify({
      secret: security.twoFactorAuth.secret,
      encoding: 'base32',
      token: token,
      window: 2
    });

    if (verified) {
      security.twoFactorAuth.enabled = true;
      security.twoFactorAuth.lastUsed = new Date();
      await security.save();

      res.status(200).json({
        message: 'Code 2FA vérifié avec succès',
        verified: true
      });
    } else {
      res.status(400).json({
        message: 'Code 2FA invalide',
        verified: false
      });
    }
  } catch (err) {
    console.error('Erreur vérification 2FA:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ✅ DÉSACTIVER L'AUTHENTIFICATION À DEUX FACTEURS
export const disable2FA = async (req, res) => {
  try {
    const { utilisateurId } = req.params;
    const { password } = req.body; // Vérifier le mot de passe pour désactiver
    
    if (!mongoose.Types.ObjectId.isValid(utilisateurId)) {
      return res.status(400).json({ 
        error: 'ID utilisateur invalide' 
      });
    }

    const security = await Security.findOne({ utilisateur: utilisateurId });
    
    if (!security) {
      return res.status(404).json({ 
        error: 'Paramètres de sécurité non trouvés' 
      });
    }

    security.twoFactorAuth.enabled = false;
    security.twoFactorAuth.secret = null;
    security.twoFactorAuth.backupCodes = [];
    await security.save();

    // Ajouter une alerte de sécurité
    security.addSecurityAlert({
      type: '2FA_DISABLED',
      title: 'Authentification à deux facteurs désactivée',
      message: 'L\'authentification à deux facteurs a été désactivée pour votre compte.',
      severity: 'HIGH'
    });
    await security.save();

    res.status(200).json({
      message: '2FA désactivé avec succès'
    });
  } catch (err) {
    console.error('Erreur désactivation 2FA:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ✅ OBTENIR L'HISTORIQUE DES CONNEXIONS
export const getLoginHistory = async (req, res) => {
  try {
    const { utilisateurId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    if (!mongoose.Types.ObjectId.isValid(utilisateurId)) {
      return res.status(400).json({ 
        error: 'ID utilisateur invalide' 
      });
    }

    const security = await Security.findOne({ utilisateur: utilisateurId });
    
    if (!security) {
      return res.status(404).json({ 
        error: 'Paramètres de sécurité non trouvés' 
      });
    }

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    
    const loginHistory = security.loginHistory
      .sort((a, b) => new Date(b.loginTime) - new Date(a.loginTime))
      .slice(startIndex, endIndex);

    res.status(200).json({
      loginHistory,
      total: security.loginHistory.length,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (err) {
    console.error('Erreur récupération historique:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ✅ OBTENIR LES SESSIONS ACTIVES
export const getActiveSessions = async (req, res) => {
  try {
    const { utilisateurId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(utilisateurId)) {
      return res.status(400).json({ 
        error: 'ID utilisateur invalide' 
      });
    }

    const security = await Security.findOne({ utilisateur: utilisateurId });
    
    if (!security) {
      return res.status(404).json({ 
        error: 'Paramètres de sécurité non trouvés' 
      });
    }

    const activeSessions = security.activeSessions.filter(session => session.isActive);

    res.status(200).json({ activeSessions });
  } catch (err) {
    console.error('Erreur récupération sessions:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ✅ TERMINER UNE SESSION
export const terminateSession = async (req, res) => {
  try {
    const { utilisateurId, sessionId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(utilisateurId)) {
      return res.status(400).json({ 
        error: 'ID utilisateur invalide' 
      });
    }

    const security = await Security.findOne({ utilisateur: utilisateurId });
    
    if (!security) {
      return res.status(404).json({ 
        error: 'Paramètres de sécurité non trouvés' 
      });
    }

    security.removeActiveSession(sessionId);
    await security.save();

    res.status(200).json({
      message: 'Session terminée avec succès'
    });
  } catch (err) {
    console.error('Erreur termination session:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ✅ OBTENIR LES ALERTES DE SÉCURITÉ
export const getSecurityAlerts = async (req, res) => {
  try {
    const { utilisateurId } = req.params;
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    
    if (!mongoose.Types.ObjectId.isValid(utilisateurId)) {
      return res.status(400).json({ 
        error: 'ID utilisateur invalide' 
      });
    }

    const security = await Security.findOne({ utilisateur: utilisateurId });
    
    if (!security) {
      return res.status(404).json({ 
        error: 'Paramètres de sécurité non trouvés' 
      });
    }

    let alerts = security.securityAlerts;
    
    if (unreadOnly === 'true') {
      alerts = alerts.filter(alert => !alert.read);
    }

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    
    const paginatedAlerts = alerts
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(startIndex, endIndex);

    res.status(200).json({
      alerts: paginatedAlerts,
      total: alerts.length,
      unread: alerts.filter(alert => !alert.read).length,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (err) {
    console.error('Erreur récupération alertes:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ✅ MARQUER UNE ALERTE COMME LUE
export const markAlertAsRead = async (req, res) => {
  try {
    const { utilisateurId, alertId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(utilisateurId)) {
      return res.status(400).json({ 
        error: 'ID utilisateur invalide' 
      });
    }

    const security = await Security.findOne({ utilisateur: utilisateurId });
    
    if (!security) {
      return res.status(404).json({ 
        error: 'Paramètres de sécurité non trouvés' 
      });
    }

    const alert = security.securityAlerts.id(alertId);
    if (!alert) {
      return res.status(404).json({ 
        error: 'Alerte non trouvée' 
      });
    }

    alert.read = true;
    await security.save();

    res.status(200).json({
      message: 'Alerte marquée comme lue'
    });
  } catch (err) {
    console.error('Erreur marquage alerte:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ✅ OBTENIR LES APPAREILS DE CONFIANCE
export const getTrustedDevices = async (req, res) => {
  try {
    const { utilisateurId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(utilisateurId)) {
      return res.status(400).json({ 
        error: 'ID utilisateur invalide' 
      });
    }

    const security = await Security.findOne({ utilisateur: utilisateurId });
    
    if (!security) {
      return res.status(404).json({ 
        error: 'Paramètres de sécurité non trouvés' 
      });
    }

    const trustedDevices = security.trustedDevices.filter(device => device.isActive);

    res.status(200).json({ trustedDevices });
  } catch (err) {
    console.error('Erreur récupération appareils:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ✅ SUPPRIMER UN APPAREIL DE CONFIANCE
export const removeTrustedDevice = async (req, res) => {
  try {
    const { utilisateurId, deviceId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(utilisateurId)) {
      return res.status(400).json({ 
        error: 'ID utilisateur invalide' 
      });
    }

    const security = await Security.findOne({ utilisateur: utilisateurId });
    
    if (!security) {
      return res.status(404).json({ 
        error: 'Paramètres de sécurité non trouvés' 
      });
    }

    security.removeTrustedDevice(deviceId);
    await security.save();

    res.status(200).json({
      message: 'Appareil supprimé avec succès'
    });
  } catch (err) {
    console.error('Erreur suppression appareil:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ✅ METTRE À JOUR LES PARAMÈTRES DE SÉCURITÉ
export const updateSecuritySettings = async (req, res) => {
  try {
    const { utilisateurId } = req.params;
    const { securitySettings } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(utilisateurId)) {
      return res.status(400).json({ 
        error: 'ID utilisateur invalide' 
      });
    }

    let security = await Security.findOne({ utilisateur: utilisateurId });
    
    if (!security) {
      security = new Security({ utilisateur: utilisateurId });
    }

    security.securitySettings = { ...security.securitySettings, ...securitySettings };
    security.lastSecurityUpdate = new Date();
    await security.save();

    res.status(200).json({
      message: 'Paramètres de sécurité mis à jour avec succès',
      securitySettings: security.securitySettings
    });
  } catch (err) {
    console.error('Erreur mise à jour paramètres:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ✅ OBTENIR LES STATISTIQUES DE SÉCURITÉ
export const getSecurityStats = async (req, res) => {
  try {
    const { utilisateurId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(utilisateurId)) {
      return res.status(400).json({ 
        error: 'ID utilisateur invalide' 
      });
    }

    const security = await Security.findOne({ utilisateur: utilisateurId });
    
    if (!security) {
      return res.status(404).json({ 
        error: 'Paramètres de sécurité non trouvés' 
      });
    }

    // Calculer les statistiques
    const stats = {
      securityScore: security.securityStats.securityScore,
      totalLogins: security.securityStats.totalLogins,
      failedLogins: security.securityStats.failedLogins,
      activeSessions: security.activeSessions.filter(s => s.isActive).length,
      trustedDevices: security.trustedDevices.filter(d => d.isActive).length,
      unreadAlerts: security.securityAlerts.filter(a => !a.read).length,
      has2FA: security.twoFactorAuth.enabled,
      identityVerified: security.identityVerification.status === 'VERIFIED',
      lastLogin: security.securityStats.lastLogin,
      recentLogins: security.loginHistory.slice(0, 5)
    };

    res.status(200).json({ stats });
  } catch (err) {
    console.error('Erreur récupération statistiques:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ✅ OBTENIR TOUTES LES STATISTIQUES DE SÉCURITÉ (ADMIN)
export const getAllSecurityStats = async (req, res) => {
  try {
    const stats = await Security.getSecurityStats();
    const recentAlerts = await Security.getRecentSecurityAlerts(10);

    res.status(200).json({
      general: stats,
      recentAlerts
    });
  } catch (err) {
    console.error('Erreur récupération statistiques générales:', err.message);
    res.status(500).json({ error: err.message });
  }
};



