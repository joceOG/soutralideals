/**
 * R3-05 — Administration des agents recenseurs (dashboard).
 * Rôle Mongo reste Client ; capacité = canCreateRecensement.
 */
import Utilisateur from '../models/utilisateurModel.js';
import { isAdmin } from '../utils/accessControl.js';
import { requireCanonicalPhone } from '../services/otpService.js';
import { PhoneValidationError } from '../utils/phone.js';
import { normalizeEmail } from '../utils/emailIdentity.js';
import crypto from 'crypto';

const AGENT_SELECT =
  'nom prenom email telephone role canCreateRecensement isActive activationStatus source createdAt updatedAt recensementPermissionLog';

function adminLabel(req) {
  const u = req.utilisateur;
  if (!u) return 'Admin';
  const name = `${u.prenom || ''} ${u.nom || ''}`.trim();
  return name || u.email || u.telephone || String(u._id);
}

function pushPermissionLog(user, action, req) {
  if (!Array.isArray(user.recensementPermissionLog)) {
    user.recensementPermissionLog = [];
  }
  user.recensementPermissionLog.push({
    action,
    at: new Date(),
    byAdminId: req.utilisateur?._id,
    byAdminLabel: adminLabel(req),
  });
  // Garder les 30 dernières entrées
  if (user.recensementPermissionLog.length > 30) {
    user.recensementPermissionLog = user.recensementPermissionLog.slice(-30);
  }
}

function toAgentDto(user) {
  const plain = user.toObject ? user.toObject() : user;
  const log = Array.isArray(plain.recensementPermissionLog)
    ? plain.recensementPermissionLog.slice(-10).reverse()
    : [];
  return {
    id: String(plain._id),
    nom: plain.nom || '',
    prenom: plain.prenom || '',
    email: plain.email || null,
    telephone: plain.telephone || null,
    role: plain.role,
    label: 'Agent recenseur',
    canCreateRecensement: plain.canCreateRecensement === true,
    isActive: plain.isActive !== false,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
    permissionHistory: log.map((e) => ({
      action: e.action,
      at: e.at,
      byAdminLabel: e.byAdminLabel || 'Admin',
    })),
  };
}

function requireAdmin(req, res) {
  if (!isAdmin(req)) {
    res.status(403).json({ error: 'Droits administrateur requis.' });
    return false;
  }
  return true;
}

/** GET /utilisateur/field-agents */
export const listFieldAgents = async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const q = String(req.query.q || '').trim();
    const filter = String(req.query.filter || 'authorized').toLowerCase();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const skip = (page - 1) * limit;

    const query = { role: 'Client' };

    if (filter === 'authorized') {
      query.canCreateRecensement = true;
    } else if (filter === 'unauthorized') {
      query.canCreateRecensement = { $ne: true };
    } else if (filter === 'inactive') {
      query.isActive = false;
    }
    // filter === 'all' → tous les Client (candidats agents)

    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [
        { nom: rx },
        { prenom: rx },
        { telephone: rx },
        { email: rx },
      ];
    }

    const [rows, total] = await Promise.all([
      Utilisateur.find(query)
        .select(AGENT_SELECT)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit),
      Utilisateur.countDocuments(query),
    ]);

    res.status(200).json({
      agents: rows.map(toAgentDto),
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (err) {
    console.error('listFieldAgents:', err.message);
    res.status(500).json({ error: err.message || 'Erreur serveur.' });
  }
};

/**
 * POST /utilisateur/field-agents
 * Crée un Client + optionnellement active canCreateRecensement.
 */
export const createFieldAgent = async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const nom = String(req.body?.nom || '').trim();
    const prenom = String(req.body?.prenom || '').trim();
    const emailRaw = String(req.body?.email || '').trim();
    const password = String(req.body?.password || '');
    const authorize =
      req.body?.authorize === undefined ? true : req.body?.authorize === true;
    const phoneCountry = req.body?.phoneCountry || 'CI';

    if (nom.length < 2) {
      return res.status(400).json({ error: 'Le nom est obligatoire (min. 2 caractères).' });
    }
    if (prenom.length < 1) {
      return res.status(400).json({ error: 'Le prénom est obligatoire.' });
    }
    if (!req.body?.telephone) {
      return res.status(400).json({ error: 'Le téléphone est obligatoire.' });
    }
    if (password.length < 8) {
      return res
        .status(400)
        .json({ error: 'Mot de passe temporaire : au moins 8 caractères.' });
    }

    let telephone;
    try {
      telephone = requireCanonicalPhone(req.body.telephone, phoneCountry);
    } catch (e) {
      const msg =
        e instanceof PhoneValidationError || e?.code === 'INVALID_PHONE'
          ? 'Numéro de téléphone invalide.'
          : e.message || 'Numéro de téléphone invalide.';
      return res.status(400).json({ error: msg });
    }

    const email = emailRaw ? normalizeEmail(emailRaw) : undefined;
    if (emailRaw && !email) {
      return res.status(400).json({ error: 'Email invalide.' });
    }

    const phoneClash = await Utilisateur.findOne({ telephone });
    if (phoneClash) {
      return res.status(409).json({
        error: 'Un compte existe déjà avec ce téléphone.',
        existingUserId: String(phoneClash._id),
        canCreateRecensement: phoneClash.canCreateRecensement === true,
      });
    }
    if (email) {
      const emailClash = await Utilisateur.findOne({ email });
      if (emailClash) {
        return res.status(409).json({
          error: 'Un compte existe déjà avec cet email.',
          existingUserId: String(emailClash._id),
        });
      }
    }

    const user = new Utilisateur({
      nom,
      prenom,
      email: email || undefined,
      password,
      telephone,
      telephoneVerified: true,
      role: 'Client',
      canCreateRecensement: false,
      isActive: true,
      activationStatus: 'active',
      source: 'dashboard',
      authProvider: 'local',
    });

    await user.save();

    let authorizationGranted = false;
    let authorizationError = null;

    if (authorize) {
      try {
        user.canCreateRecensement = true;
        pushPermissionLog(user, 'grant', req);
        await user.save();
        authorizationGranted = true;
      } catch (grantErr) {
        authorizationError =
          grantErr.message ||
          'Compte créé, mais autorisation de recensement non activée.';
      }
    }

    const status = authorizationGranted || !authorize ? 201 : 201;
    res.status(status).json({
      agent: toAgentDto(user),
      temporaryPasswordSet: true,
      authorizationGranted,
      authorizationError,
      message: authorizationGranted
        ? 'Agent créé et autorisé à recensement.'
        : authorize
          ? 'Compte créé, mais autorisation de recensement non activée.'
          : 'Compte agent créé (autorisation non demandée).',
    });
  } catch (err) {
    console.error('createFieldAgent:', err.message);
    if (err?.code === 11000) {
      return res.status(409).json({ error: 'Compte déjà existant (doublon).' });
    }
    res.status(500).json({ error: err.message || 'Erreur serveur.' });
  }
};

/** PATCH /utilisateur/:id/can-create-recensement — avec journal. */
export const setFieldAgentAuthorization = async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const enabled =
      req.body?.enabled === true || req.body?.canCreateRecensement === true;
    const user = await Utilisateur.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé.' });

    const prev = user.canCreateRecensement === true;
    if (prev === enabled) {
      return res.status(200).json({
        agent: toAgentDto(user),
        message: enabled
          ? 'Permission déjà active.'
          : 'Permission déjà inactive.',
      });
    }

    user.canCreateRecensement = enabled;
    pushPermissionLog(user, enabled ? 'grant' : 'revoke', req);
    await user.save();

    res.status(200).json({
      agent: toAgentDto(user),
      canCreateRecensement: user.canCreateRecensement,
      message: enabled
        ? 'Permission de recensement accordée.'
        : 'Permission de recensement suspendue.',
    });
  } catch (err) {
    console.error('setFieldAgentAuthorization:', err.message);
    res.status(500).json({ error: err.message || 'Erreur serveur.' });
  }
};

/** PATCH /utilisateur/:id/field-agent-active */
export const setFieldAgentActive = async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const active = req.body?.isActive === true || req.body?.enabled === true;
    const user = await Utilisateur.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé.' });

    user.isActive = active;
    user.deactivatedAt = active ? undefined : new Date();
    await user.save();

    res.status(200).json({
      agent: toAgentDto(user),
      message: active ? 'Compte réactivé.' : 'Compte désactivé.',
    });
  } catch (err) {
    console.error('setFieldAgentActive:', err.message);
    res.status(500).json({ error: err.message || 'Erreur serveur.' });
  }
};

/** PATCH /utilisateur/:id/agent-password — admin réinitialise le MDP d'un agent. */
export const resetAgentPassword = async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const password = String(req.body?.password || '');
    if (password.length < 8) {
      return res.status(400).json({ error: 'Mot de passe : au moins 8 caractères.' });
    }

    const user = await Utilisateur.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé.' });

    user.password = password; // hashé par le pre-save hook
    await user.save();

    res.status(200).json({ message: 'Mot de passe mis à jour.' });
  } catch (err) {
    console.error('resetAgentPassword:', err.message);
    res.status(500).json({ error: err.message || 'Erreur serveur.' });
  }
};

/** Helper tests / scripts */
export function generateTempPassword() {
  return `Ag${crypto.randomBytes(4).toString('hex')}!a`;
}
