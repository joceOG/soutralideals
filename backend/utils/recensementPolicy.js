/**
 * STAB-11 / 11b — Traçabilité recensement terrain (SDEALSIDENTIFICATION).
 *
 * Pas de rôle RECENSEUR. Permission explicite `canCreateRecensement`
 * (booléen utilisateur, grant/revoke admin uniquement).
 * `source=sdealsidentification` dans le body n'est PAS une autorisation.
 */

import mongoose from 'mongoose';
import { isAdmin } from './accessControl.js';

export const RECENSEMENT_SOURCE = 'sdealsidentification';

export function isRecensementRequest(req) {
  const source = req.body?.source;
  const s = Array.isArray(source) ? source[0] : source;
  return String(s || '').toLowerCase() === RECENSEMENT_SOURCE;
}

/** Admin OU flag serveur canCreateRecensement === true */
export function userCanCreateRecensement(user) {
  if (!user) return false;
  if (String(user.role || '').toUpperCase() === 'ADMIN') return true;
  return user.canCreateRecensement === true;
}

/**
 * @returns {null | { status: number, error: string }}
 */
export function assertRecensementAgent(req) {
  if (!req.utilisateur) {
    return { status: 401, error: 'Authentification requise.' };
  }
  if (!isRecensementRequest(req)) return null;
  if (userCanCreateRecensement(req.utilisateur)) return null;
  return {
    status: 403,
    error: 'Accès refusé : permission de recensement requise.',
  };
}

/**
 * Applique la politique création terrain / self-signup.
 * Prérequis : assertRecensementAgent déjà passé si source recensement.
 */
export function buildRecensementCreateFields(req, { defaultStatus = 'pending' } = {}) {
  const admin = isAdmin(req);
  const out = {};

  if (req.body?.source) {
    const s = Array.isArray(req.body.source) ? req.body.source[0] : req.body.source;
    out.source = String(s);
  }

  if (isRecensementRequest(req)) {
    out.status = 'pending';
    out.recenseur = req.utilisateur._id;
    out.dateRecensement = req.body.dateRecensement
      ? new Date(req.body.dateRecensement)
      : new Date();
    return out;
  }

  out.status = defaultStatus;

  if (admin) {
    if (req.body.status) {
      const st = Array.isArray(req.body.status) ? req.body.status[0] : req.body.status;
      out.status = String(st);
    }
    if (req.body.recenseur && mongoose.Types.ObjectId.isValid(req.body.recenseur)) {
      out.recenseur = new mongoose.Types.ObjectId(req.body.recenseur);
    }
    if (req.body.dateRecensement) {
      out.dateRecensement = new Date(req.body.dateRecensement);
    }
  }

  return out;
}

export function stripClientStatusEscalation(body, isAdminUser) {
  if (isAdminUser || !body) return body;
  const clone = { ...body };
  delete clone.status;
  delete clone.verifier;
  delete clone.recenseur;
  delete clone.accountStatus;
  delete clone.canCreateRecensement;
  return clone;
}
