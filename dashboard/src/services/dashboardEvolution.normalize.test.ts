import { normalizeDashboardEvolution } from './dashboardService';

describe('normalizeDashboardEvolution', () => {
  const validPayload = {
    success: true,
    data: {
      period: '12m',
      granularity: 'month',
      buckets: [
        { key: '2026-01', label: 'Jan. 2026' },
        { key: '2026-02', label: 'Fév. 2026' },
      ],
      series: {
        clients: [1, 0],
        prestataires: [0, 2],
        freelances: [0, 0],
        vendeurs: [1, 1],
      },
      generatedAt: '2026-03-01T00:00:00.000Z',
    },
  };

  it('accepte un payload valide', () => {
    const out = normalizeDashboardEvolution(validPayload, '12m');
    expect(out.buckets).toHaveLength(2);
    expect(out.series.clients).toEqual([1, 0]);
  });

  it('rejette un payload avec uniquement l’ancienne clé users', () => {
    const legacy = {
      success: true,
      data: {
        ...validPayload.data,
        series: {
          users: [1, 0],
          prestataires: [0, 2],
          freelances: [0, 0],
          vendeurs: [1, 1],
        },
      },
    };
    expect(() => normalizeDashboardEvolution(legacy)).toThrow(/clients/);
  });

  it('rejette une série manquante', () => {
    const bad = {
      success: true,
      data: {
        ...validPayload.data,
        series: { clients: [1, 0], prestataires: [0, 0], freelances: [0, 0] },
      },
    };
    expect(() => normalizeDashboardEvolution(bad)).toThrow(/vendeurs/);
  });

  it('rejette clients si la série manque', () => {
    const bad = {
      success: true,
      data: {
        ...validPayload.data,
        series: {
          prestataires: [0, 0],
          freelances: [0, 0],
          vendeurs: [0, 0],
        },
      },
    };
    expect(() => normalizeDashboardEvolution(bad)).toThrow(/clients/);
  });

  it('rejette une longueur de série incorrecte', () => {
    const bad = {
      success: true,
      data: {
        ...validPayload.data,
        series: {
          clients: [1],
          prestataires: [0, 0],
          freelances: [0, 0],
          vendeurs: [0, 0],
        },
      },
    };
    expect(() => normalizeDashboardEvolution(bad)).toThrow(/longueur/);
  });

  it('rejette une valeur non numérique', () => {
    const bad = {
      success: true,
      data: {
        ...validPayload.data,
        series: {
          clients: [1, NaN],
          prestataires: [0, 0],
          freelances: [0, 0],
          vendeurs: [0, 0],
        },
      },
    };
    expect(() => normalizeDashboardEvolution(bad)).toThrow(/non numérique/);
  });

  it('rejette une période inconnue', () => {
    const bad = {
      success: true,
      data: { ...validPayload.data, period: '2y' },
    };
    expect(() => normalizeDashboardEvolution(bad)).toThrow(/inconnue/);
  });

  it('rejette un envelope incomplet', () => {
    expect(() => normalizeDashboardEvolution({ success: false })).toThrow(/incomplète/);
  });
});
