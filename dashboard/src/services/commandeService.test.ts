import { createOrder, mapCreateOrderError } from './commandeService';
import { apiClient } from './setupApi';

jest.mock('./setupApi', () => ({
  apiClient: {
    post: jest.fn(),
  },
}));

const mockedPost = apiClient.post as jest.Mock;

describe('commandeService — DASH-FINAL / Commandes', () => {
  beforeEach(() => {
    mockedPost.mockReset();
  });

  it('createOrder envoie articleId + quantite sans champs interdits', async () => {
    mockedPost.mockResolvedValue({ data: { success: true, _id: 'cmd1' } });

    await createOrder({
      articles: [{ articleId: '507f1f77bcf86cd799439011', quantite: 2 }],
      infoCommande: {
        adresse: 'Rue A',
        ville: 'Abidjan',
        telephone: '+2250700000000',
        codePostal: '00225',
        pays: 'CI',
      },
    });

    expect(mockedPost).toHaveBeenCalledTimes(1);
    const [path, body] = mockedPost.mock.calls[0];
    expect(path).toBe('/commande');
    expect(body).toEqual({
      articles: [{ articleId: '507f1f77bcf86cd799439011', quantite: 2 }],
      infoCommande: {
        adresse: 'Rue A',
        ville: 'Abidjan',
        telephone: '+2250700000000',
        codePostal: '00225',
        pays: 'CI',
      },
    });
    expect(body).not.toHaveProperty('vendeur');
    expect(body).not.toHaveProperty('utilisateur');
    expect(body).not.toHaveProperty('prixTotal');
    expect(body).not.toHaveProperty('statusCommande');
    expect(body).not.toHaveProperty('paiementInfo');
    expect(body.articles[0]).not.toHaveProperty('nom');
    expect(body.articles[0]).not.toHaveProperty('prix');
  });

  it('mapCreateOrderError — codes métier principaux', () => {
    const cases = [
      ['MULTI_VENDOR_ORDER_NOT_SUPPORTED', 'même boutique'],
      ['INSUFFICIENT_STOCK', 'Stock'],
      ['VENDOR_NOT_AVAILABLE', 'boutique'],
      ['ORDER_FIELD_FORBIDDEN', 'invalides'],
      ['ARTICLE_NOT_FOUND', 'existe plus'],
    ] as const;

    for (const [code, fragment] of cases) {
      const msg = mapCreateOrderError({
        response: { status: 409, data: { code, message: 'x' } },
      });
      expect(msg.toLowerCase()).toContain(fragment.toLowerCase());
    }
  });
});
