import {
  buildFreelanceFormData,
  normalizeFreelanceForEdit,
  validateFreelanceStep,
  emptyFreelanceFormValues,
  stripFreelanceListRow,
  mapFreelanceApiError,
} from './freelanceService';

describe('freelanceService — DASH-8B', () => {
  const files = { profileImage: null, cni1: null, cni2: null, selfie: null };
  const existing = { profileImage: true, cni1: true, cni2: false, selfie: false };

  it('normalizeFreelanceForEdit mappe utilisateur et médias existants', () => {
    const { values, existingMedia } = normalizeFreelanceForEdit({
      utilisateur: { _id: 'u1', nom: 'Kou', prenom: 'Aya' },
      name: 'Aya K.',
      job: 'UX',
      category: 'Design',
      hourlyRate: 8000,
      imagePath: 'https://res.cloudinary.com/demo/public.jpg',
      verificationDocuments: { cni1: 'cld:auth:x', isVerified: true },
    });
    expect(values.utilisateurId).toBe('u1');
    expect(values.isVerified).toBe(true);
    expect(existingMedia.profileImage).toBe(true);
    expect(existingMedia.cni1).toBe(true);
  });

  it('buildFreelanceFormData sérialise les champs sans undefined', () => {
    const values = {
      ...emptyFreelanceFormValues(),
      utilisateurId: '507f1f77bcf86cd799439011',
      name: 'Test',
      job: 'Dev',
      category: 'Tech',
      location: 'Abidjan',
      hourlyRate: 5000,
      skills: ['React'],
    };
    const fd = buildFreelanceFormData(values, files, { isUpdate: false });
    const entries = Array.from(fd.entries());
    expect(entries.some(([k]) => k === 'utilisateur')).toBe(true);
    expect(entries.find(([k]) => k === 'skills')?.[1]).toBe('["React"]');
    for (const [, v] of entries) {
      expect(v).not.toBe(undefined);
    }
  });

  it('buildFreelanceFormData en update n’envoie pas les fichiers inchangés', () => {
    const values = {
      ...emptyFreelanceFormValues(),
      name: 'X',
      job: 'Y',
      category: 'Z',
      location: 'Abidjan',
      hourlyRate: 1000,
    };
    const fd = buildFreelanceFormData(values, files, { isUpdate: true });
    const keys = Array.from(fd.keys());
    expect(keys).not.toContain('cni1');
    expect(keys).not.toContain('profileImage');
  });

  it('validateFreelanceStep bloque tarif et localisation', () => {
    const values = {
      ...emptyFreelanceFormValues(),
      utilisateurId: 'u1',
      name: 'N',
      job: 'J',
      category: 'C',
      hourlyRate: 0,
    };
    const err = validateFreelanceStep(2, values, files, existing, false);
    expect(err.hourlyRate).toBeTruthy();
    expect(err.location).toBeTruthy();
  });

  it('stripFreelanceListRow convertit verificationDocuments en booléens', () => {
    const row = stripFreelanceListRow({
      _id: '1',
      verificationDocuments: {
        cni1: 'https://evil.example/doc.jpg',
        cni2: true,
        selfie: '',
        isVerified: true,
      },
    });
    expect(row.verificationDocuments?.cni1).toBe(true);
    expect(row.verificationDocuments?.selfie).toBe(false);
  });

  it('mapFreelanceApiError mappe 409', () => {
    const msg = mapFreelanceApiError({
      response: { status: 409, data: { error: 'Doublon' } },
    });
    expect(msg).toBe('Doublon');
  });
});
