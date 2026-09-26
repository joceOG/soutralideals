import {
  normalizeStatsGenerales,
  normalizeStatsTemporelles,
  normalizeStatsCategories,
  normalizeStatsPaiements,
  normalizeStatsGeographiques,
  buildStatistiquesQueryParams,
  canStartStatistiquesFetch,
  formatEvolutionDisplay,
} from './statisticsService';

describe('statisticsService normalizers', () => {
  const validGenerales = {
    totalUtilisateurs: 10,
    totalCommandes: 5,
    totalPrestations: 3,
    chiffreAffaires: 1500.5,
    evolutionUtilisateurs: 12.5,
    evolutionUtilisateursStatus: 'up',
    evolutionCommandes: 0,
    evolutionCommandesStatus: 'stable',
    evolutionPrestations: -4,
    evolutionPrestationsStatus: 'down',
    evolutionCA: 100,
    evolutionCAStatus: 'up',
  };

  it('accepte un payload générales valide', () => {
    const out = normalizeStatsGenerales(validGenerales);
    expect(out.totalUtilisateurs).toBe(10);
    expect(out.evolutionUtilisateursStatus).toBe('up');
  });

  it('accepte évolution null avec statut new', () => {
    const out = normalizeStatsGenerales({
      ...validGenerales,
      evolutionUtilisateurs: null,
      evolutionUtilisateursStatus: 'new',
    });
    expect(out.evolutionUtilisateurs).toBeNull();
    expect(out.evolutionUtilisateursStatus).toBe('new');
  });

  it('rejette null avec statut incompatible', () => {
    expect(() =>
      normalizeStatsGenerales({
        ...validGenerales,
        evolutionUtilisateurs: null,
        evolutionUtilisateursStatus: 'up',
      }),
    ).toThrow(/incompatible/);
  });

  it('rejette NaN sur une évolution', () => {
    expect(() =>
      normalizeStatsGenerales({
        ...validGenerales,
        evolutionCommandes: Number.NaN,
      }),
    ).toThrow(/evolutionCommandes/);
  });

  it('rejette Infinity sur une évolution', () => {
    expect(() =>
      normalizeStatsGenerales({
        ...validGenerales,
        evolutionCA: Number.POSITIVE_INFINITY,
      }),
    ).toThrow(/evolutionCA/);
  });

  it('rejette un compteur manquant', () => {
    const { totalCommandes: _removed, ...partial } = validGenerales;
    expect(() => normalizeStatsGenerales(partial)).toThrow(/totalCommandes/);
  });

  it('rejette une valeur négative impossible', () => {
    expect(() =>
      normalizeStatsGenerales({ ...validGenerales, chiffreAffaires: -1 }),
    ).toThrow(/chiffreAffaires/);
  });

  it('formatEvolutionDisplay affiche Nouveau', () => {
    const d = formatEvolutionDisplay(null, 'new');
    expect(d.text).toBe('Nouveau');
    expect(d.tooltip).toMatch(/période précédente/);
  });

  it('buildStatistiquesQueryParams propage la période aux cinq endpoints', () => {
    const q = buildStatistiquesQueryParams({ periode: '90j' });
    expect(q).toEqual({ periode: '90j' });
    const custom = buildStatistiquesQueryParams({
      periode: 'personnalise',
      dateDebut: '2024-01-01',
      dateFin: '2024-01-31',
    });
    expect(custom.dateDebut).toBe('2024-01-01');
    expect(custom.dateFin).toBe('2024-01-31');
  });

  it('canStartStatistiquesFetch bloque personnalisé incomplet', () => {
    expect(canStartStatistiquesFetch({ periode: 'personnalise', dateDebut: '2024-01-01' })).toBe(false);
    expect(
      canStartStatistiquesFetch({
        periode: 'personnalise',
        dateDebut: '2024-01-01',
        dateFin: '2024-01-31',
      }),
    ).toBe(true);
  });

  it('accepte une série temporelle valide', () => {
    const out = normalizeStatsTemporelles([
      {
        period: '2026-03-01',
        utilisateurs: 1,
        commandes: 2,
        prestations: 0,
        chiffreAffaires: 100,
      },
    ]);
    expect(out).toHaveLength(1);
  });

  it('rejette une série non-tableau', () => {
    expect(() => normalizeStatsTemporelles({ period: 'x' })).toThrow(/Série temporelle/);
  });

  it('rejette un pourcentage paiement hors plage', () => {
    expect(() =>
      normalizeStatsPaiements([
        { methode: 'MTN', nombre: 1, montant: 10, pourcentage: 150 },
      ]),
    ).toThrow(/pourcentage/);
  });

  it('normalise servicesActifsCatalogue', () => {
    const out = normalizeStatsCategories([
      {
        categorie: 'A',
        servicesActifsCatalogue: 2,
        nombreCommandes: 0,
        chiffreAffaires: 0,
      },
    ]);
    expect(out[0].servicesActifsCatalogue).toBe(2);
  });

  it('accepte géographique vide', () => {
    expect(normalizeStatsGeographiques([])).toEqual([]);
  });
});
