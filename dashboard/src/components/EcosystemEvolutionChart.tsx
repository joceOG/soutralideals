import * as React from 'react';
import {
  Box,
  Button,
  Paper,
  Skeleton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import RefreshIcon from '@mui/icons-material/Refresh';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import { colors } from '../tokens/colors';
import {
  DashboardEvolution,
  DashboardEvolutionPeriod,
  DASHBOARD_EVOLUTION_PERIODS,
  fetchDashboardEvolution,
} from '../services/dashboardService';

type LoadState = 'idle' | 'loading' | 'success' | 'error';

const SERIES_META = [
  { key: 'clients' as const, name: 'Clients', color: colors.forestGreen },
  { key: 'prestataires' as const, name: 'Prestataires', color: colors.emerald },
  { key: 'freelances' as const, name: 'Freelances', color: colors.primary600 },
  { key: 'vendeurs' as const, name: 'Vendeurs', color: colors.beigeAccent },
];

const PERIOD_LABELS: Record<DashboardEvolutionPeriod, string> = {
  '30d': '30 j',
  '3m': '3 mois',
  '6m': '6 mois',
  '12m': '12 mois',
};

function buildChartRows(data: DashboardEvolution) {
  return data.buckets.map((bucket, index) => ({
    label: bucket.label,
    clients: data.series.clients[index],
    prestataires: data.series.prestataires[index],
    freelances: data.series.freelances[index],
    vendeurs: data.series.vendeurs[index],
  }));
}

function isEvolutionEmpty(data: DashboardEvolution): boolean {
  return SERIES_META.every(({ key }) => data.series[key].every((v) => v === 0));
}

export function EcosystemEvolutionChart() {
  const [period, setPeriod] = React.useState<DashboardEvolutionPeriod>('12m');
  const [state, setState] = React.useState<LoadState>('idle');
  const [data, setData] = React.useState<DashboardEvolution | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [hidden, setHidden] = React.useState<Record<string, boolean>>({});
  const requestIdRef = React.useRef(0);

  React.useEffect(() => {
    const controller = new AbortController();
    const requestId = ++requestIdRef.current;
    setState('loading');
    setError(null);

    fetchDashboardEvolution(period, controller.signal)
      .then((result) => {
        if (requestId !== requestIdRef.current) return;
        setData(result);
        setState('success');
      })
      .catch((err: unknown) => {
        if (requestId !== requestIdRef.current) return;
        const e = err as { name?: string; message?: string };
        if (e?.name === 'CanceledError' || e?.name === 'AbortError') return;
        setData(null);
        setState('error');
        setError(e?.message ?? 'Erreur de chargement');
      });

    return () => {
      controller.abort();
      requestIdRef.current += 1;
    };
  }, [period]);

  const chartRows = React.useMemo(() => (data ? buildChartRows(data) : []), [data]);

  const retry = () => {
    requestIdRef.current += 1;
    const controller = new AbortController();
    const requestId = requestIdRef.current;
    setState('loading');
    setError(null);
    fetchDashboardEvolution(period, controller.signal)
      .then((result) => {
        if (requestId !== requestIdRef.current) return;
        setData(result);
        setState('success');
      })
      .catch((err: unknown) => {
        if (requestId !== requestIdRef.current) return;
        const e = err as { name?: string; message?: string };
        if (e?.name === 'CanceledError' || e?.name === 'AbortError') return;
        setData(null);
        setState('error');
        setError(e?.message ?? 'Erreur de chargement');
      });
  };

  const toggleSeries = (dataKey: string) => {
    setHidden((prev) => ({ ...prev, [dataKey]: !prev[dataKey] }));
  };

  const loading = state === 'loading' && !data;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        height: '100%',
        minHeight: 360,
        display: 'flex',
        flexDirection: 'column',
        border: `1px solid ${colors.border}`,
        backgroundColor: colors.bgCard,
      }}
    >
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5, mb: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Évolution de l&apos;écosystème
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
            Nouvelles inscriptions par période (UTC)
          </Typography>
        </Box>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={period}
          onChange={(_, v) => v && setPeriod(v as DashboardEvolutionPeriod)}
          sx={{
            flexWrap: 'wrap',
            '& .MuiToggleButton-root': {
              px: 1.25,
              py: 0.35,
              fontSize: '0.72rem',
              fontWeight: 600,
              borderColor: colors.border,
              color: colors.textSecondary,
              '&.Mui-selected': {
                backgroundColor: alpha(colors.primary, 0.1),
                color: colors.primary,
                borderColor: alpha(colors.primary, 0.35),
              },
            },
          }}
        >
          {DASHBOARD_EVOLUTION_PERIODS.map((p) => (
            <ToggleButton key={p} value={p}>
              {PERIOD_LABELS[p]}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {loading ? (
        <Skeleton variant="rounded" sx={{ flex: 1, minHeight: 260 }} />
      ) : state === 'error' ? (
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1.5,
            py: 4,
            backgroundColor: alpha(colors.error, 0.04),
            borderRadius: 2,
            border: `1px solid ${alpha(colors.error, 0.15)}`,
          }}
        >
          <Typography variant="body2" color="error" sx={{ textAlign: 'center', maxWidth: 320 }}>
            {error}
          </Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => retry()}
            sx={{ borderColor: colors.border, color: colors.primary }}
          >
            Réessayer
          </Button>
        </Box>
      ) : data && isEvolutionEmpty(data) ? (
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            py: 5,
            backgroundColor: colors.greenPale,
            borderRadius: 2,
            border: `1px solid ${alpha(colors.emerald, 0.2)}`,
          }}
        >
          <ShowChartIcon sx={{ fontSize: 40, color: colors.textMuted, opacity: 0.5 }} />
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', maxWidth: 280 }}>
            Aucune création enregistrée sur cette période.
          </Typography>
        </Box>
      ) : data ? (
        <Box sx={{ flex: 1, minHeight: 260, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%" minHeight={260}>
            <LineChart data={chartRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={alpha(colors.border, 0.8)} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: colors.textSecondary }}
                interval="preserveStartEnd"
                minTickGap={16}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: colors.textSecondary }}
                width={36}
              />
              <RechartsTooltip
                formatter={(value: number, name: string) => [value.toLocaleString('fr-FR'), name]}
                contentStyle={{
                  borderRadius: 8,
                  border: `1px solid ${colors.border}`,
                  fontSize: 13,
                }}
              />
              <Legend
                onClick={(e) => toggleSeries(String(e.dataKey))}
                wrapperStyle={{ fontSize: 12, cursor: 'pointer', paddingTop: 8 }}
              />
              {SERIES_META.map(({ key, name, color }) =>
                hidden[key] ? null : (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    name={name}
                    stroke={color}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                    isAnimationActive={false}
                  />
                ),
              )}
            </LineChart>
          </ResponsiveContainer>
        </Box>
      ) : null}

      {state === 'success' && data && !isEvolutionEmpty(data) && (
        <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 1.5 }}>
          {SERIES_META.map(({ key, name, color }) => (
            <Box
              key={key}
              component="button"
              type="button"
              onClick={() => toggleSeries(key)}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.75,
                border: `1px solid ${colors.border}`,
                borderRadius: 1,
                px: 1,
                py: 0.35,
                bgcolor: hidden[key] ? colors.bgWarm : colors.bgCard,
                opacity: hidden[key] ? 0.55 : 1,
                cursor: 'pointer',
                fontSize: '0.72rem',
                color: colors.textSecondary,
              }}
            >
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
              {name}
            </Box>
          ))}
        </Stack>
      )}
    </Paper>
  );
}
