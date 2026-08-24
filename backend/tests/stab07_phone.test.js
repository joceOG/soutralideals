/**
 * STAB-07 — Tests normalisation E.164 (libphonenumber-js).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  canonicalizePhone,
  normalizePhone,
  normalizeLoginIdentifiant,
  proposePhoneMigration,
  isInternationalInput,
  PhoneValidationError,
} from '../utils/phone.js';

describe('STAB-07 phone canonicalize', () => {
  it('+21620113786 → accepté et inchangé', () => {
    const { e164 } = canonicalizePhone('+21620113786');
    assert.equal(e164, '+21620113786');
  });

  it('0021620113786 → +21620113786', () => {
    assert.equal(canonicalizePhone('0021620113786').e164, '+21620113786');
  });

  it('pays Tunisie + 20113786 → +21620113786', () => {
    assert.equal(
      canonicalizePhone('20113786', { defaultCountry: 'TN' }).e164,
      '+21620113786',
    );
  });

  it("pays Côte d'Ivoire + numéro national valide → +225…", () => {
    const { e164 } = canonicalizePhone('0708091011', { defaultCountry: 'CI' });
    assert.equal(e164, '+2250708091011');
    assert.ok(e164.startsWith('+225'));
  });

  it('numéro national sans pays → refus', () => {
    assert.throws(
      () => canonicalizePhone('20113786'),
      (e) => e instanceof PhoneValidationError,
    );
    assert.equal(normalizePhone('20113786'), '');
  });

  it('format avec espaces/tirets → normalisé', () => {
    assert.equal(
      canonicalizePhone('+216 20-113-786').e164,
      '+21620113786',
    );
  });

  it('numéro trop court → refus', () => {
    assert.throws(
      () => canonicalizePhone('20', { defaultCountry: 'TN' }),
      PhoneValidationError,
    );
  });

  it('numéro impossible pour le pays (TN n° sous CI) → refus', () => {
    assert.throws(
      () => canonicalizePhone('20113786', { defaultCountry: 'CI' }),
      PhoneValidationError,
    );
  });

  it('mêmes formats → même valeur canonique', () => {
    const a = canonicalizePhone('+21620113786').e164;
    const b = canonicalizePhone('0021620113786').e164;
    const c = canonicalizePhone('20113786', { defaultCountry: 'TN' }).e164;
    const d = canonicalizePhone('+216 20 113 786').e164;
    assert.equal(a, b);
    assert.equal(b, c);
    assert.equal(c, d);
  });

  it('aucun +225 automatique sur international non ivoirien', () => {
    const e164 = canonicalizePhone('+21620113786').e164;
    assert.equal(e164, '+21620113786');
    assert.ok(!e164.startsWith('+225'));
    assert.equal(normalizePhone('+21620113786'), '+21620113786');
  });

  it('normalizeLoginIdentifiant : formats alternatifs', () => {
    assert.equal(
      normalizeLoginIdentifiant('0021620113786'),
      '+21620113786',
    );
    assert.equal(
      normalizeLoginIdentifiant('20113786', 'TN'),
      '+21620113786',
    );
    assert.equal(
      normalizeLoginIdentifiant('User@Example.COM'),
      'user@example.com',
    );
    // National sans pays : ne pas inventer +225
    assert.equal(normalizeLoginIdentifiant('20113786'), '20113786');
  });

  it('isInternationalInput', () => {
    assert.equal(isInternationalInput('+21620113786'), true);
    assert.equal(isInternationalInput('0021620113786'), true);
    assert.equal(isInternationalInput('20113786'), false);
  });

  it('proposePhoneMigration : international ok, national ambiguous', () => {
    const ok = proposePhoneMigration('+21620113786');
    assert.equal(ok.status, 'ok');
    assert.equal(ok.proposed, '+21620113786');
    assert.equal(ok.country, 'TN');

    const amb = proposePhoneMigration('20113786');
    assert.equal(amb.status, 'ambiguous');
    assert.equal(amb.proposed, null);

    const norm = proposePhoneMigration('0021620113786');
    assert.equal(norm.status, 'normalize');
    assert.equal(norm.proposed, '+21620113786');
  });

  it('collision détectable : mêmes E.164', () => {
    const keys = [
      canonicalizePhone('+21620113786').e164,
      canonicalizePhone('0021620113786').e164,
      canonicalizePhone('20113786', { defaultCountry: 'TN' }).e164,
    ];
    assert.equal(new Set(keys).size, 1);
  });
});
