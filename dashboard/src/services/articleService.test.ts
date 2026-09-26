import {
  parseVendeurIdFromSearch,
  buildArticlesListUrl,
  resolveFormVendeurId,
  validateArticleForm,
  buildArticleFormData,
} from './articleService';

describe('articleService — DASH-8C.1', () => {
  it('parseVendeurIdFromSearch lit le query param vendeur', () => {
    expect(parseVendeurIdFromSearch('vendeur=507f1f77bcf86cd799439011')).toBe(
      '507f1f77bcf86cd799439011',
    );
    expect(parseVendeurIdFromSearch('')).toBeNull();
  });

  it('buildArticlesListUrl inclut vendeur et search sans undefined', () => {
    const url = buildArticlesListUrl({
      vendeurId: '507f1f77bcf86cd799439011',
      search: 'robe',
      page: 2,
    });
    expect(url).toContain('vendeur=507f1f77bcf86cd799439011');
    expect(url).toContain('search=robe');
    expect(url).toContain('page=2');
    expect(url).not.toContain('undefined');
  });

  it('buildArticlesListUrl sans vendeur retourne /articles', () => {
    expect(buildArticlesListUrl({})).toBe('/articles');
  });
});

describe('articleService — DASH-8C.2', () => {
  const baseValues = {
    nomArticle: 'Produit',
    prixArticle: '1000',
    quantiteArticle: '2',
    categorie: '507f1f77bcf86cd799439011',
    tags: ['tag1'],
  };

  it('resolveFormVendeurId — contexte URL prioritaire en création', () => {
    expect(
      resolveFormVendeurId({
        vendeurIdFromUrl: 'aaa',
        selectedVendeurId: 'bbb',
        isUpdate: false,
      }),
    ).toBe('aaa');
  });

  it('resolveFormVendeurId — sélection globale sans URL', () => {
    expect(
      resolveFormVendeurId({
        vendeurIdFromUrl: null,
        selectedVendeurId: 'bbb',
        isUpdate: false,
      }),
    ).toBe('bbb');
  });

  it('resolveFormVendeurId — édition verrouillée sur le propriétaire', () => {
    expect(
      resolveFormVendeurId({
        vendeurIdFromUrl: null,
        selectedVendeurId: 'bbb',
        editVendeurId: 'owner-id',
        isUpdate: true,
      }),
    ).toBe('owner-id');
  });

  it('validateArticleForm bloque création sans vendeur', () => {
    const err = validateArticleForm(baseValues, null, {
      isUpdate: false,
      hasExistingPhoto: false,
      resolvedVendeurId: '',
    });
    expect(err.vendeur).toBeTruthy();
    expect(err.photoArticle).toBeTruthy();
  });

  it('validateArticleForm — photo facultative en édition si existante', () => {
    const err = validateArticleForm(baseValues, null, {
      isUpdate: true,
      hasExistingPhoto: true,
      resolvedVendeurId: '507f1f77bcf86cd799439011',
    });
    expect(err.photoArticle).toBeUndefined();
  });

  it('buildArticleFormData inclut vendeur et photo en création', () => {
    const file = new File(['x'], 'a.png', { type: 'image/png' });
    const fd = buildArticleFormData(baseValues, file, {
      isUpdate: false,
      vendeurId: '507f1f77bcf86cd799439012',
    });
    expect(fd.get('vendeur')).toBe('507f1f77bcf86cd799439012');
    expect(fd.get('photoArticle')).toBe(file);
    expect(fd.get('nomArticle')).toBe('Produit');
    expect(fd.get('undefined')).toBeNull();
  });

  it('buildArticleFormData en update n’envoie pas vendeur ni photo sans fichier', () => {
    const fd = buildArticleFormData(baseValues, null, {
      isUpdate: true,
      vendeurId: '507f1f77bcf86cd799439012',
    });
    expect(fd.get('vendeur')).toBeNull();
    expect(fd.get('photoArticle')).toBeNull();
  });
});
