/**
 * STAB-11 — Tests politique Commande + recensement (unitaires, sans Mongo).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertOrderStatusChange,
  normalizeOrderStatus,
  resolveOrderActor,
  ORDER_STATUSES,
  OrderStatusPolicyError,
} from '../utils/orderStatusPolicy.js';
import {
  buildRecensementCreateFields,
  isRecensementRequest,
} from '../utils/recensementPolicy.js';

describe('STAB-11 order status policy', () => {
  it('refuse statut inconnu HACKED_STATUS', () => {
    assert.equal(normalizeOrderStatus('HACKED_STATUS'), null);
    assert.throws(
      () =>
        assertOrderStatusChange({
          currentStatus: 'En cours',
          targetStatus: 'HACKED_STATUS',
          actor: 'ADMIN',
        }),
      OrderStatusPolicyError,
    );
  });

  it('client owner : En cours → Annulée OK', () => {
    assert.doesNotThrow(() =>
      assertOrderStatusChange({
        currentStatus: 'En cours',
        targetStatus: 'Annulée',
        actor: 'CLIENT',
      }),
    );
  });

  it('client owner : En cours → Expédiée interdit', () => {
    assert.throws(
      () =>
        assertOrderStatusChange({
          currentStatus: 'En cours',
          targetStatus: 'Expédiée',
          actor: 'CLIENT',
        }),
      (e) => e instanceof OrderStatusPolicyError && e.statusCode === 409,
    );
  });

  it('vendeur : En cours → Confirmée → En préparation', () => {
    assert.doesNotThrow(() =>
      assertOrderStatusChange({
        currentStatus: 'En cours',
        targetStatus: 'Confirmée',
        actor: 'VENDEUR',
      }),
    );
    assert.doesNotThrow(() =>
      assertOrderStatusChange({
        currentStatus: 'Confirmée',
        targetStatus: 'En préparation',
        actor: 'VENDEUR',
      }),
    );
  });

  it('acteur OTHER → 403', () => {
    assert.throws(
      () =>
        assertOrderStatusChange({
          currentStatus: 'En cours',
          targetStatus: 'Confirmée',
          actor: 'OTHER',
        }),
      (e) => e instanceof OrderStatusPolicyError && e.statusCode === 403,
    );
  });

  it('admin peut toute transition enum', () => {
    for (const to of ORDER_STATUSES) {
      if (to === 'En cours') continue;
      assert.doesNotThrow(() =>
        assertOrderStatusChange({
          currentStatus: 'En cours',
          targetStatus: to,
          actor: 'ADMIN',
        }),
      );
    }
  });

  it('resolveOrderActor : client vs vendeur vs admin', () => {
    const commande = {
      utilisateur: 'u1',
      vendeur: 'v1',
    };
    assert.equal(
      resolveOrderActor({
        user: { _id: 'u1', role: 'Client' },
        commande,
      }),
      'CLIENT',
    );
    assert.equal(
      resolveOrderActor({
        user: { _id: 'u2', role: 'Vendeur' },
        commande,
        vendeurProfileId: 'v1',
      }),
      'VENDEUR',
    );
    assert.equal(
      resolveOrderActor({
        user: { _id: 'a1', role: 'Admin' },
        commande,
      }),
      'ADMIN',
    );
    assert.equal(
      resolveOrderActor({
        user: { _id: 'x', role: 'Client' },
        commande,
      }),
      'OTHER',
    );
  });
});

describe('STAB-11 recensement policy', () => {
  const fakeReq = (body, user, role = 'Client') => ({
    body,
    utilisateur: { _id: user, role },
  });

  it('détecte source sdealsidentification', () => {
    assert.equal(
      isRecensementRequest(fakeReq({ source: 'sdealsidentification' }, 'a')),
      true,
    );
    assert.equal(isRecensementRequest(fakeReq({ source: 'web' }, 'a')), false);
  });

  it('force pending + recenseur JWT ; ignore status active client', () => {
    const fields = buildRecensementCreateFields(
      fakeReq(
        {
          source: 'sdealsidentification',
          status: 'active',
          recenseur: '000000000000000000000099',
        },
        'aaaaaaaaaaaaaaaaaaaaaaaa',
      ),
    );
    assert.equal(fields.status, 'pending');
    assert.equal(String(fields.recenseur), 'aaaaaaaaaaaaaaaaaaaaaaaa');
  });

  it('non-recensement non-admin : status default, pas de recenseur body', () => {
    const fields = buildRecensementCreateFields(
      fakeReq({ status: 'active', recenseur: 'bbbbbbbbbbbbbbbbbbbbbbbb' }, 'a'),
      { defaultStatus: 'incomplete' },
    );
    assert.equal(fields.status, 'incomplete');
    assert.equal(fields.recenseur, undefined);
  });
});

describe('STAB-11 authRole case normalization (logic)', () => {
  it('Admin / ADMIN / admin convergent', () => {
    const normalize = (r) => String(r || '').toUpperCase();
    assert.equal(normalize('Admin'), 'ADMIN');
    assert.equal(normalize('ADMIN'), 'ADMIN');
    assert.equal(normalize('admin'), 'ADMIN');
  });
});
