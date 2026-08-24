import prestataireModel from '../models/prestataireModel.js';
import freelanceModel from '../models/freelanceModel.js';
import vendeurModel from '../models/vendeurModel.js';
import {
  isRecensementRequest,
  userCanCreateRecensement,
} from '../utils/recensementPolicy.js';

export function isAdmin(req) {
  return req.utilisateur?.role?.toUpperCase() === 'ADMIN';
}

export function isSelf(req, userId) {
  if (!userId || !req.utilisateur?._id) return false;
  return req.utilisateur._id.toString() === userId.toString();
}

async function loadOwnerId(Model, id, field = 'utilisateur') {
  const doc = await Model.findById(id).select(field);
  if (!doc) return { doc: null, ownerId: null };
  const ownerId = doc[field];
  return { doc, ownerId: ownerId?.toString() ?? null };
}

export function requireSelfOrAdmin(bodyField = 'utilisateur') {
  return (req, res, next) => {
    if (isAdmin(req)) return next();
    const targetId = req.body?.[bodyField];
    if (targetId && isSelf(req, targetId)) return next();

    // STAB-11b : recensement terrain — permission serveur, PAS le body source seul
    if (isRecensementRequest(req)) {
      if (userCanCreateRecensement(req.utilisateur)) return next();
      return res.status(403).json({
        error: 'Accès refusé : permission de recensement requise.',
      });
    }

    if (targetId && !isSelf(req, targetId)) {
      return res.status(403).json({ error: 'Accès refusé : profil utilisateur invalide.' });
    }
    next();
  };
}

export function requirePrestataireOwnerOrAdmin() {
  return async (req, res, next) => {
    try {
      if (isAdmin(req)) return next();
      const { doc, ownerId } = await loadOwnerId(prestataireModel, req.params.id);
      if (!doc) return res.status(404).json({ error: 'Prestataire non trouvé' });
      if (!isSelf(req, ownerId)) {
        return res.status(403).json({ error: 'Accès refusé : vous ne pouvez modifier que votre propre profil.' });
      }
      next();
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
}

/** Vérifie la propriété via prestataireId dans req.body (upload documents). */
export function requirePrestataireOwnerByBodyId() {
  return async (req, res, next) => {
    try {
      if (isAdmin(req)) return next();
      const prestataireId = req.body?.prestataireId;
      if (!prestataireId) {
        return res.status(400).json({ error: 'prestataireId requis' });
      }
      const { doc, ownerId } = await loadOwnerId(prestataireModel, prestataireId);
      if (!doc) return res.status(404).json({ error: 'Prestataire non trouvé' });
      if (!isSelf(req, ownerId)) {
        return res.status(403).json({ error: 'Accès refusé : vous ne pouvez modifier que votre propre profil.' });
      }
      next();
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
}

export function requireFreelanceOwnerOrAdmin() {
  return async (req, res, next) => {
    try {
      if (isAdmin(req)) return next();
      const { doc, ownerId } = await loadOwnerId(freelanceModel, req.params.id);
      if (!doc) return res.status(404).json({ error: 'Freelance non trouvé' });
      if (!isSelf(req, ownerId)) {
        return res.status(403).json({ error: 'Accès refusé : vous ne pouvez modifier que votre propre profil.' });
      }
      next();
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
}

export function requireVendeurOwnerOrAdmin() {
  return async (req, res, next) => {
    try {
      if (isAdmin(req)) return next();
      const { doc, ownerId } = await loadOwnerId(vendeurModel, req.params.id);
      if (!doc) return res.status(404).json({ error: 'Vendeur non trouvé' });
      if (!isSelf(req, ownerId)) {
        return res.status(403).json({ error: 'Accès refusé : vous ne pouvez modifier que votre propre profil.' });
      }
      next();
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
}
