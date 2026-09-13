/**
 * R1-06 — Curseur opaque pagination /mine (createdAt + _id).
 */
import mongoose from 'mongoose';

/**
 * @param {{ createdAt: Date|string, id: string }} point
 * @returns {string}
 */
export function encodeFieldRecensementCursor(point) {
  const payload = {
    c: new Date(point.createdAt).toISOString(),
    i: String(point.id),
  };
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

/**
 * @param {string} cursor
 * @returns {{ createdAt: Date, id: mongoose.Types.ObjectId }}
 */
export function decodeFieldRecensementCursor(cursor) {
  if (cursor == null || String(cursor).trim() === '') {
    const err = new Error('Curseur requis.');
    err.code = 'RECENSEMENT_CURSOR_INVALID';
    err.status = 400;
    throw err;
  }
  let raw;
  try {
    raw = Buffer.from(String(cursor), 'base64url').toString('utf8');
  } catch {
    const err = new Error('Curseur mal formé.');
    err.code = 'RECENSEMENT_CURSOR_INVALID';
    err.status = 400;
    throw err;
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const err = new Error('Curseur JSON invalide.');
    err.code = 'RECENSEMENT_CURSOR_INVALID';
    err.status = 400;
    throw err;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    const err = new Error('Curseur invalide.');
    err.code = 'RECENSEMENT_CURSOR_INVALID';
    err.status = 400;
    throw err;
  }
  // Rejeter opérateurs / clés inattendues
  const keys = Object.keys(parsed);
  if (keys.length !== 2 || !keys.includes('c') || !keys.includes('i')) {
    const err = new Error('Curseur structure invalide.');
    err.code = 'RECENSEMENT_CURSOR_INVALID';
    err.status = 400;
    throw err;
  }
  const createdAt = new Date(parsed.c);
  if (Number.isNaN(createdAt.getTime())) {
    const err = new Error('Curseur date invalide.');
    err.code = 'RECENSEMENT_CURSOR_INVALID';
    err.status = 400;
    throw err;
  }
  if (!mongoose.Types.ObjectId.isValid(String(parsed.i))) {
    const err = new Error('Curseur id invalide.');
    err.code = 'RECENSEMENT_CURSOR_INVALID';
    err.status = 400;
    throw err;
  }
  return {
    createdAt,
    id: new mongoose.Types.ObjectId(String(parsed.i)),
  };
}

export default { encodeFieldRecensementCursor, decodeFieldRecensementCursor };
