import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const SecuritySchema = new mongoose.Schema({
  // 👤 Utilisateur propriétaire des paramètres de sécurité
  utilisateur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilisateur',
    required: true,
    unique: true
  },

  // 🔐 AUTHENTIFICATION À DEUX FACTEURS (2FA)
  twoFactorAuth: {
    enabled: {
      type: Boolean,
      default: false
    },
    secret: {
      type: String,
      default: null
    },
    backupCodes: [{
      code: String,
      used: {
        type: Boolean,
        default: false
      },
      usedAt: Date
    }],
    lastUsed: Date,
    recoveryCodes: [String] // Codes de récupération d'urgence
  },

  // 📱 APPAREILS DE CONFIANCE
  trustedDevices: [{
    deviceId: {
      type: String,
      required: true
    },
    deviceName: {
      type: String,
      required: true
    },
    deviceType: {
      type: String,
      enum: ['mobile', 'desktop', 'tablet', 'web'],
      required: true
    },
    userAgent: String,
    ipAddress: String,
    location: {
      country: String,
      city: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      }
    },
    lastUsed: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    },
    fingerprint: String, // Empreinte unique de l'appareil
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  // 🔒 SESSIONS ACTIVES
  activeSessions: [{
    sessionId: {
      type: String,
      required: true
    },
    deviceInfo: {
      name: String,
      type: String,
      userAgent: String,
      ipAddress: String
    },
    location: {
      country: String,
      city: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      }
    },
    loginTime: {
      type: Date,
      default: Date.now
    },
    lastActivity: {
      type: Date,
      default: Date.now
    },
    expiresAt: Date,
    isActive: {
      type: Boolean,
      default: true
    },
    tokenHash: String // Hash du token JWT
  }],

  // 📊 HISTORIQUE DES CONNEXIONS
  loginHistory: [{
    loginTime: {
      type: Date,
      default: Date.now
    },
    ipAddress: String,
    userAgent: String,
    location: {
      country: String,
      city: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      }
    },
    deviceInfo: {
      name: String,
      type: String,
      os: String,
      browser: String
    },
    success: {
      type: Boolean,
      default: true
    },
    failureReason: String,
    sessionId: String,
    twoFactorUsed: {
      type: Boolean,
      default: false
    }
  }],

  // 🚨 ALERTES DE SÉCURITÉ
  securityAlerts: [{
    type: {
      type: String,
      enum: ['LOGIN_NEW_DEVICE', 'LOGIN_NEW_LOCATION', 'FAILED_LOGIN', 'PASSWORD_CHANGE', '2FA_ENABLED', '2FA_DISABLED', 'SUSPICIOUS_ACTIVITY'],
      required: true
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    read: {
      type: Boolean,
      default: false
    },
    metadata: {
      ipAddress: String,
      userAgent: String,
      location: {
        country: String,
        city: String
      },
      deviceInfo: {
        name: String,
        type: String
      }
    }
  }],

  // 🔑 GESTION DES MOTS DE PASSE
  passwordSecurity: {
    lastChanged: {
      type: Date,
      default: Date.now
    },
    mustChange: {
      type: Boolean,
      default: false
    },
    changeReason: {
      type: String,
      enum: ['USER_REQUEST', 'SECURITY_BREACH', 'ADMIN_RESET', 'FIRST_LOGIN']
    },
    previousPasswords: [{
      hash: String,
      changedAt: Date
    }],
    passwordStrength: {
      score: Number, // 0-100
      requirements: {
        length: Boolean,
        uppercase: Boolean,
        lowercase: Boolean,
        numbers: Boolean,
        symbols: Boolean
      }
    }
  },

  // 🛡️ PARAMÈTRES DE SÉCURITÉ
  securitySettings: {
    // Notifications de sécurité
    emailNotifications: {
      newLogin: {
        type: Boolean,
        default: true
      },
      newDevice: {
        type: Boolean,
        default: true
      },
      passwordChange: {
        type: Boolean,
        default: true
      },
      suspiciousActivity: {
        type: Boolean,
        default: true
      }
    },
    // Paramètres de session
    sessionTimeout: {
      type: Number,
      default: 30 // minutes
    },
    maxConcurrentSessions: {
      type: Number,
      default: 5
    },
    // Restrictions géographiques
    allowedCountries: [String],
    blockedCountries: [String],
    // Restrictions d'IP
    allowedIPs: [String],
    blockedIPs: [String]
  },

  // 🔍 VÉRIFICATION D'IDENTITÉ
  identityVerification: {
    status: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED'],
      default: 'PENDING'
    },
    documents: [{
      type: {
        type: String,
        enum: ['ID_CARD', 'PASSPORT', 'DRIVER_LICENSE', 'UTILITY_BILL']
      },
      url: String,
      status: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED']
      },
      uploadedAt: Date,
      verifiedAt: Date
    }],
    verificationLevel: {
      type: String,
      enum: ['BASIC', 'INTERMEDIATE', 'ADVANCED'],
      default: 'BASIC'
    },
    verifiedAt: Date,
    expiresAt: Date
  },

  // 📈 STATISTIQUES DE SÉCURITÉ
  securityStats: {
    totalLogins: {
      type: Number,
      default: 0
    },
    failedLogins: {
      type: Number,
      default: 0
    },
    lastLogin: Date,
    averageSessionDuration: Number, // en minutes
    mostUsedDevice: String,
    mostUsedLocation: String,
    securityScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },

  // 🔄 MÉTADONNÉES
  lastSecurityUpdate: {
    type: Date,
    default: Date.now
  },
  version: {
    type: String,
    default: '1.0.0'
  }

}, {
  timestamps: true
});

// 🔍 INDEX POUR OPTIMISER LES REQUÊTES
SecuritySchema.index({ utilisateur: 1 });
SecuritySchema.index({ 'activeSessions.sessionId': 1 });
SecuritySchema.index({ 'loginHistory.loginTime': -1 });
SecuritySchema.index({ 'securityAlerts.timestamp': -1 });
SecuritySchema.index({ 'securityAlerts.read': 1 });

// 🔄 MÉTHODES VIRTUELLES
SecuritySchema.virtual('hasActiveSessions').get(function() {
  return this.activeSessions.some(session => session.isActive);
});

SecuritySchema.virtual('recentLogins').get(function() {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return this.loginHistory.filter(login => login.loginTime > oneWeekAgo);
});

SecuritySchema.virtual('unreadAlerts').get(function() {
  return this.securityAlerts.filter(alert => !alert.read);
});

SecuritySchema.virtual('isHighRisk').get(function() {
  const recentFailures = this.loginHistory
    .filter(login => !login.success)
    .filter(login => login.loginTime > new Date(Date.now() - 24 * 60 * 60 * 1000));
  
  return recentFailures.length >= 3;
});

// 🔄 MÉTHODES D'INSTANCE
SecuritySchema.methods.generate2FASecret = function() {
  const secret = crypto.randomBytes(32).toString('base32');
  this.twoFactorAuth.secret = secret;
  this.twoFactorAuth.backupCodes = this.generateBackupCodes();
  return secret;
};

SecuritySchema.methods.generateBackupCodes = function() {
  const codes = [];
  for (let i = 0; i < 10; i++) {
    codes.push({
      code: crypto.randomBytes(4).toString('hex').toUpperCase(),
      used: false
    });
  }
  return codes;
};

SecuritySchema.methods.addLoginAttempt = function(loginData) {
  this.loginHistory.unshift({
    ...loginData,
    loginTime: new Date()
  });
  
  // Garder seulement les 100 dernières connexions
  if (this.loginHistory.length > 100) {
    this.loginHistory = this.loginHistory.slice(0, 100);
  }
  
  this.securityStats.totalLogins += 1;
  this.securityStats.lastLogin = new Date();
};

SecuritySchema.methods.addSecurityAlert = function(alertData) {
  this.securityAlerts.unshift({
    ...alertData,
    timestamp: new Date()
  });
  
  // Garder seulement les 50 dernières alertes
  if (this.securityAlerts.length > 50) {
    this.securityAlerts = this.securityAlerts.slice(0, 50);
  }
};

SecuritySchema.methods.addTrustedDevice = function(deviceData) {
  this.trustedDevices.push({
    ...deviceData,
    createdAt: new Date()
  });
};

SecuritySchema.methods.removeTrustedDevice = function(deviceId) {
  this.trustedDevices = this.trustedDevices.filter(device => device.deviceId !== deviceId);
};

SecuritySchema.methods.addActiveSession = function(sessionData) {
  this.activeSessions.push({
    ...sessionData,
    loginTime: new Date(),
    lastActivity: new Date()
  });
};

SecuritySchema.methods.removeActiveSession = function(sessionId) {
  this.activeSessions = this.activeSessions.filter(session => session.sessionId !== sessionId);
};

SecuritySchema.methods.updateSecurityScore = function() {
  let score = 0;
  
  // 2FA activé (+20 points)
  if (this.twoFactorAuth.enabled) score += 20;
  
  // Mot de passe récent (+10 points)
  const passwordAge = Date.now() - this.passwordSecurity.lastChanged.getTime();
  if (passwordAge < 90 * 24 * 60 * 60 * 1000) score += 10; // Moins de 90 jours
  
  // Vérification d'identité (+15 points)
  if (this.identityVerification.status === 'VERIFIED') score += 15;
  
  // Pas d'échecs récents (+10 points)
  const recentFailures = this.loginHistory
    .filter(login => !login.success)
    .filter(login => login.loginTime > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  if (recentFailures.length === 0) score += 10;
  
  // Appareils de confiance (+5 points)
  if (this.trustedDevices.length > 0) score += 5;
  
  // Sessions actives limitées (+10 points)
  if (this.activeSessions.length <= this.securitySettings.maxConcurrentSessions) score += 10;
  
  // Alertes lues (+5 points)
  const unreadAlerts = this.securityAlerts.filter(alert => !alert.read);
  if (unreadAlerts.length === 0) score += 5;
  
  // Paramètres de sécurité stricts (+15 points)
  if (this.securitySettings.emailNotifications.newLogin) score += 5;
  if (this.securitySettings.emailNotifications.suspiciousActivity) score += 5;
  if (this.securitySettings.sessionTimeout <= 30) score += 5;
  
  this.securityStats.securityScore = Math.min(score, 100);
  return this.securityStats.securityScore;
};

// 🔄 MÉTHODES STATIQUES
SecuritySchema.statics.getSecurityStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        usersWith2FA: { $sum: { $cond: ['$twoFactorAuth.enabled', 1, 0] } },
        usersWithVerifiedIdentity: { $sum: { $cond: [{ $eq: ['$identityVerification.status', 'VERIFIED'] }, 1, 0] } },
        averageSecurityScore: { $avg: '$securityStats.securityScore' },
        totalActiveSessions: { $sum: { $size: '$activeSessions' } },
        totalTrustedDevices: { $sum: { $size: '$trustedDevices' } }
      }
    }
  ]);
  
  return stats[0] || {
    totalUsers: 0,
    usersWith2FA: 0,
    usersWithVerifiedIdentity: 0,
    averageSecurityScore: 0,
    totalActiveSessions: 0,
    totalTrustedDevices: 0
  };
};

SecuritySchema.statics.getRecentSecurityAlerts = async function(limit = 10) {
  return this.aggregate([
    { $unwind: '$securityAlerts' },
    { $sort: { 'securityAlerts.timestamp': -1 } },
    { $limit: limit },
    { $project: { securityAlerts: 1, utilisateur: 1 } }
  ]);
};

const Security = mongoose.model('Security', SecuritySchema);

export default Security;



