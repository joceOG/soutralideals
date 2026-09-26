import {
  buildVendeurFormData,
  normalizeVendeurForEdit,
  validateVendeurStep,
  emptyVendeurFormValues,
  stripVendeurListRow,
  mapVendeurApiError,
} from './vendeurService';

describe('vendeurService — DASH-8C', () => {
  const files = {
    shopLogo: null,
    cni1: null,
    cni2: null,
    selfie: null,
    businessLicense: null,
    taxDocument: null,
  };

  it('normalizeVendeurForEdit mappe boutique et KYC', () => {
    const { values, existingMedia } = normalizeVendeurForEdit({
      utilisateur: { _id: 'u1', nom: 'Di', prenom: 'Aminata' },
      shopName: 'Ma Boutique',
      shopDescription: 'Desc',
      businessType: 'Entreprise',
      businessCategories: ['Mode'],
      shopLogo: 'https://res.cloudinary.com/demo/logo.jpg',
      verificationDocuments: { cni1: 'cld:auth:x', isVerified: true },
      businessAddress: { city: 'Abidjan' },
    });
    expect(values.utilisateurId).toBe('u1');
    expect(values.shopName).toBe('Ma Boutique');
    expect(existingMedia.shopLogo).toBe(true);
    expect(existingMedia.cni1).toBe(true);
  });

  it('buildVendeurFormData sérialise businessAddress et catégories', () => {
    const values = {
      ...emptyVendeurFormValues(),
      utilisateurId: '507f1f77bcf86cd799439011',
      shopName: 'Shop',
      shopDescription: 'D',
      businessCategories: ['Mode'],
      addressCity: 'Cocody',
    };
    const fd = buildVendeurFormData(values, files);
    expect(Array.from(fd.keys())).toContain('businessCategories');
    expect(Array.from(fd.keys())).not.toContain('cni1');
  });

  it('validateVendeurStep exige catégories et ville', () => {
    const values = {
      ...emptyVendeurFormValues(),
      utilisateurId: 'u1',
      shopName: 'S',
      shopDescription: 'D',
    };
    expect(validateVendeurStep(1, values, files).businessCategories).toBeTruthy();
    expect(validateVendeurStep(2, values, files).addressCity).toBeTruthy();
  });

  it('stripVendeurListRow masque les URLs KYC', () => {
    const row = stripVendeurListRow({
      verificationDocuments: { cni1: 'https://leak.example/x', businessLicense: true },
    });
    expect(row.verificationDocuments?.cni1).toBe(true);
    expect(row.verificationDocuments?.businessLicense).toBe(true);
  });

  it('mapVendeurApiError mappe 409', () => {
    expect(
      mapVendeurApiError({ response: { status: 409, data: { error: 'Doublon' } } }),
    ).toBe('Doublon');
  });
});
