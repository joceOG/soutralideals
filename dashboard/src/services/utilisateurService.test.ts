import {
  normalizeEmailInput,
  validateUtilisateurForm,
  buildUtilisateurFormData,
  emptyUtilisateurFormValues,
  normalizeCapabilitiesPayload,
  resolveAccountAccessRole,
  professionalProfileLabel,
  isLegacyProfessionalStoredRole,
  mapUtilisateurApiError,
} from './utilisateurService';

describe('utilisateurService — DASH-8D', () => {
  it('normalizeEmailInput met en minuscules', () => {
    expect(normalizeEmailInput('  User@Mail.COM ')).toBe('user@mail.com');
  });

  it('validateUtilisateurForm exige mot de passe et confirmation en création', () => {
    const v = { ...emptyUtilisateurFormValues(), nom: 'A', prenom: 'B', password: 'short', passwordConfirm: 'x' };
    const err = validateUtilisateurForm(v, { isUpdate: false });
    expect(err.password).toBeTruthy();
    expect(err.passwordConfirm).toBeTruthy();
  });

  it('validateUtilisateurForm en update sans mot de passe', () => {
    const v = { ...emptyUtilisateurFormValues(), nom: 'A', prenom: 'B' };
    const err = validateUtilisateurForm(v, { isUpdate: true });
    expect(err.password).toBeUndefined();
  });

  it('buildUtilisateurFormData en update n’envoie pas password', () => {
    const v = { ...emptyUtilisateurFormValues(), nom: 'A', prenom: 'B', role: 'Client' };
    const fd = buildUtilisateurFormData(v, null, { isUpdate: true });
    expect(fd.get('password')).toBeNull();
    expect(fd.get('nom')).toBe('A');
  });

  it('buildUtilisateurFormData en création inclut password', () => {
    const v = {
      ...emptyUtilisateurFormValues(),
      nom: 'A',
      prenom: 'B',
      password: 'Secret12',
      passwordConfirm: 'Secret12',
      role: 'Client',
    };
    const fd = buildUtilisateurFormData(v, null, { isUpdate: false });
    expect(fd.get('password')).toBe('Secret12');
  });

  it('mapUtilisateurApiError mappe 409', () => {
    const mapped = mapUtilisateurApiError({
      response: { status: 409, data: { error: 'Conflit', code: 'USER_HAS_DEPENDENCIES', dependencies: { commandes: 2 } } },
    });
    expect(mapped.code).toBe('USER_HAS_DEPENDENCIES');
    expect(mapped.dependencies?.commandes).toBe(2);
  });
});

describe('utilisateurService — DASH-8E.1 capabilities', () => {
  it('normalizeCapabilitiesPayload lit data.capabilities', () => {
    const cap = normalizeCapabilitiesPayload({
      success: true,
      data: {
        accountRole: 'Client',
        capabilities: ['Prestataire'],
        profiles: {
          prestataire: { exists: true, status: 'active', canOperate: true },
          freelance: { exists: false, status: null, canOperate: false },
          vendeur: { exists: true, status: 'pending', canOperate: false },
        },
        inconsistencies: [],
      },
    });
    expect(cap.capabilities).toEqual(['Prestataire']);
  });

  it('resolveAccountAccessRole mappe legacy pro vers Client', () => {
    expect(resolveAccountAccessRole('Vendeur')).toBe('Client');
    expect(resolveAccountAccessRole('Admin')).toBe('Admin');
  });

  it('professionalProfileLabel statuts multiples', () => {
    expect(professionalProfileLabel('freelance', { exists: false, status: null, canOperate: false })).toContain('absent');
    expect(professionalProfileLabel('vendeur', { exists: true, status: 'pending', canOperate: false })).toContain('attente');
  });

  it('buildUtilisateurFormData update sans includeRole n’envoie pas role', () => {
    const v = { ...emptyUtilisateurFormValues(), nom: 'A', prenom: 'B' };
    const fd = buildUtilisateurFormData(v, null, { isUpdate: true, includeRole: false });
    expect(fd.get('role')).toBeNull();
  });

  it('isLegacyProfessionalStoredRole', () => {
    expect(isLegacyProfessionalStoredRole('Prestataire')).toBe(true);
    expect(isLegacyProfessionalStoredRole('Client')).toBe(false);
  });
});
