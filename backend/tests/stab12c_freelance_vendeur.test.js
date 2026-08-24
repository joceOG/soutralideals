/**
 * STAB-12C — Freelance getById + schéma (sans Mongo HTTP).
 * Cause historique : populate('service') sur un modèle sans champ service.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import mongoose from 'mongoose';
import freelanceModel from '../models/freelanceModel.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('STAB-12C freelance getById contract', () => {
  it('schéma Freelance n’a pas de path service (évite StrictPopulateError)', () => {
    assert.equal(freelanceModel.schema.path('service'), undefined);
    assert.ok(freelanceModel.schema.path('utilisateur'));
  });

  it('controller getFreelanceById ne populate plus service', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../controller/freelanceController.js'),
      'utf8',
    );
    const fn = src.slice(
      src.indexOf('export const getFreelanceById'),
      src.indexOf('export const updateFreelance'),
    );
    assert.match(fn, /ObjectId\.isValid/);
    assert.match(fn, /populate\("utilisateur"\)/);
    assert.doesNotMatch(fn, /path:\s*["']service["']/);
  });

  it('ObjectId invalide est détectable (contrat 404)', () => {
    assert.equal(mongoose.Types.ObjectId.isValid('abc'), false);
    assert.equal(mongoose.Types.ObjectId.isValid('507f1f77bcf86cd799439011'), true);
  });
});

describe('STAB-12C vendeur getById profileViews', () => {
  it('controller utilise updateOne \$inc (pas save revalidation)', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../controller/vendeurController.js'),
      'utf8',
    );
    const fn = src.slice(
      src.indexOf('export const getVendeurById'),
      src.indexOf('export const updateVendeur'),
    );
    assert.match(fn, /\$inc:\s*\{\s*profileViews:\s*1\s*\}/);
    assert.doesNotMatch(fn, /vendeur\.save\(\)/);
  });
});
