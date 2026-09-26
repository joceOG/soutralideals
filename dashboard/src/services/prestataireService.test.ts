import {
  buildPrestataireFormData,
  normalizePrestataireForEdit,
  validatePrestataireStep,
  emptyPrestataireFormValues,
  stripKycForListRow,
  mapPrestataireApiError,
} from './prestataireService';

describe('prestataireService — DASH-8A', () => {
  const files = { cni1: null, cni2: null, selfie: null, attestationAssurance: null };
  const existingKyc = { cni1: true, cni2: true, selfie: false, attestationAssurance: false };

  it('normalizePrestataireForEdit mappe utilisateur et KYC existants', () => {
    const { values, existingKyc: kyc } = normalizePrestataireForEdit({
      utilisateur: { _id: 'u1', nom: 'Kou', prenom: 'Aya' },
      service: { _id: 's1', nomservice: 'Plombier' },
      prixprestataire: 5000,
      localisation: 'Cocody',
      cni1: true,
      cni2: 'cld:auth:secret',
      zoneIntervention: ['Cocody', 'Plateau'],
    });
    expect(values.utilisateurId).toBe('u1');
    expect(values.serviceId).toBe('s1');
    expect(values.zoneInterventionText).toBe('Cocody, Plateau');
    expect(kyc.cni1).toBe(true);
    expect(kyc.cni2).toBe(true);
  });

  it('buildPrestataireFormData n’envoie pas undefined et sérialise les tableaux', () => {
    const values = {
      ...emptyPrestataireFormValues(),
      utilisateurId: '507f1f77bcf86cd799439011',
      serviceId: '507f1f77bcf86cd799439012',
      prixprestataire: 1000,
      localisation: 'Abidjan',
      specialite: ['Bâtiment'],
      latitude: '5.3',
      longitude: '-4.0',
    };
    const fd = buildPrestataireFormData(values, files, { isUpdate: false });
    const entries = Array.from(fd.entries());
    expect(entries.some(([k]) => k === 'utilisateur')).toBe(true);
    expect(entries.find(([k]) => k === 'specialite')?.[1]).toBe('["Bâtiment"]');
    expect(entries.find(([k]) => k === 'localisationmaps')?.[1]).toContain('latitude');
    for (const [, v] of entries) {
      expect(v).not.toBe(undefined);
    }
  });

  it('buildPrestataireFormData en update n’envoie pas les fichiers inchangés', () => {
    const values = {
      ...emptyPrestataireFormValues(),
      utilisateurId: 'u1',
      serviceId: 's1',
      localisation: 'Abidjan',
      prixprestataire: 1000,
    };
    const fd = buildPrestataireFormData(values, files, { isUpdate: true });
    const keys = Array.from(fd.keys());
    expect(keys).not.toContain('cni1');
    expect(keys).not.toContain('cni2');
  });

  it('validatePrestataireStep bloque une étape localisation vide', () => {
    const values = { ...emptyPrestataireFormValues(), serviceId: 's1', prixprestataire: 100 };
    const err = validatePrestataireStep(2, values, files, existingKyc, false);
    expect(err.localisation).toBeTruthy();
  });

  it('stripKycForListRow convertit en booléens', () => {
    const row = stripKycForListRow({
      _id: '1',
      cni1: 'https://evil.example/doc.jpg',
      cni2: true,
      selfie: '',
    });
    expect(row.cni1).toBe(true);
    expect(row.cni2).toBe(true);
    expect(row.selfie).toBe(false);
  });

  it('mapPrestataireApiError mappe 400', () => {
    const msg = mapPrestataireApiError({
      response: { status: 400, data: { error: 'localisation requise' } },
    });
    expect(msg).toBe('localisation requise');
  });
});
