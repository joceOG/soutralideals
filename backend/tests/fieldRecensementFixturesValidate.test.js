/**
 * 5F-BIS — Fixtures golden create wire vs validateCreatePayload (sync).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateCreatePayload } from '../utils/fieldRecensementValidate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE = path.resolve(__dirname, '../../..');
const FIXTURES = path.join(
  WORKSPACE,
  'docs/recensement/fixtures/field_create_wire',
);

const FILES = [
  'prestataire.valid.json',
  'freelance.valid.json',
  'vendeur.valid.json',
];

function loadFixture(name) {
  const raw = fs.readFileSync(path.join(FIXTURES, name), 'utf8');
  return JSON.parse(raw);
}

describe('field create wire fixtures → validateCreatePayload', () => {
  for (const name of FILES) {
    it(`${name} → ok:true, sans details ni requestHash`, () => {
      const payload = loadFixture(name);
      assert.equal(Object.prototype.hasOwnProperty.call(payload, 'details'), false);
      assert.equal(
        Object.prototype.hasOwnProperty.call(payload, 'requestHash'),
        false,
      );
      assert.equal(
        Object.prototype.hasOwnProperty.call(payload, 'profileMediaId'),
        false,
      );

      const result = validateCreatePayload(payload);
      assert.equal(result.ok, true, JSON.stringify(result.errors, null, 2));
      assert.deepEqual(result.errors, []);
      assert.equal(result.value.person.telephone, payload.person.telephone);
      assert.equal(
        Object.prototype.hasOwnProperty.call(result.value.person, 'phone'),
        false,
      );
    });
  }

  it('location.ville alias → commune', () => {
    const payload = loadFixture('prestataire.valid.json');
    payload.location = {
      ...payload.location,
      ville: 'Cocody',
    };
    delete payload.location.commune;
    const result = validateCreatePayload(payload);
    assert.equal(result.ok, true, JSON.stringify(result.errors, null, 2));
    assert.equal(result.value.location.commune, 'Cocody');
    assert.equal(
      Object.prototype.hasOwnProperty.call(result.value.location, 'ville'),
      false,
    );
  });
});
