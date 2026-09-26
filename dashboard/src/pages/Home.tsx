/**
 * Home.tsx — Cockpit administratif Soutrali Deals
 *
 * Zones :
 *  A — En-tête avec sélecteur de période + actualisation
 *  B — KPI principaux (6 cartes)
 *  C — KPI secondaires (bandeau compact)
 *  D — Évolution écosystème + donut répartition profils
 *  E — Carte Côte d'Ivoire
 *  F — Activité récente (tableau) + Flux d'activité (liste)
 *  G — À traiter (panneau adaptatif)
 */
import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from 'react';
import {
  Box, Grid, Typography, Paper, Card, Skeleton,
  Button, IconButton, Tooltip, Chip, Stack,
  Avatar, Divider, CircularProgress, Table,
  TableBody, TableCell, TableContainer, TableHead,
  TableRow, ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  People as PeopleIcon,
  Storefront as StorefrontIcon,
  Work as WorkIcon,
  ShoppingCart as ShoppingCartIcon,
  PendingActions as PendingActionsIcon,
  Receipt as ReceiptIcon,
  Refresh as RefreshIcon,
  ErrorOutline as ErrorOutlineIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Badge as BadgeIcon,
  LocalMall as LocalMallIcon,
  Schedule as ScheduleIcon,
  Assessment as AssessmentIcon,
  ArrowForward as ArrowForwardIcon,
  TravelExplore as TravelExploreIcon,
  NotificationsOutlined as NotifIcon,
  Category as CategoryIcon,
  DesignServices as DesignServicesIcon,
  Article as ArticleIcon,
  CheckCircle as CheckCircleIcon,
  TaskAlt as TaskAltIcon,
  RadioButtonUnchecked as DotIcon,
  InfoOutlined as InfoIcon,
} from '@mui/icons-material';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTip } from 'recharts';

import { colors } from '../tokens/colors';
import { EcosystemEvolutionChart } from '../components/EcosystemEvolutionChart';
import {
  fetchDashboardSummary,
  DashboardSummary,
  GeoPoint,
  TopLocation,
  RecentActivity,
  formatNumber,
  formatDate,
  getLabelForType,
  localizeStatus,
} from '../services/dashboardService';

const HomeCIMap = lazy(() => import('../components/HomeCIMap'));

// ─── Constantes ────────────────────────────────────────────────────────────────

type Period = '7d' | '30d' | '90d' | '1y';
type LoadState = 'idle' | 'loading' | 'success' | 'error';

const DONUT_COLORS = [colors.forestGreen, colors.emerald, colors.primary600, colors.primary700];

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  title: string;
  /** null = données optionnelles non disponibles */
  value: number | null;
  icon: React.ReactNode;
  /** Couleur de l'accent */
  accent: string;
  /** Fond de la carte */
  bg?: string;
  loading: boolean;
  href?: string;
  /** Tooltip d'info sur la définition du KPI */
  definition?: string;
}

const KpiCard: React.FC<KpiCardProps> = ({
  title, value, icon, accent, bg = colors.bgCard, loading, href, definition,
}) => (
  <Card
    component={href ? 'a' : 'div'}
    {...(href ? { href } : {})}
    elevation={0}
    sx={{
      display: 'flex',
      flexDirection: 'column',
      p: 2.5,
      height: '100%',
      textDecoration: 'none',
      backgroundColor: bg,
      borderLeft: `3px solid ${accent}`,
      cursor: href ? 'pointer' : 'default',
      transition: 'box-shadow 150ms, transform 150ms',
      '&:hover': href ? {
        boxShadow: `0 4px 16px ${alpha(accent, 0.15)}`,
        transform: 'translateY(-2px)',
      } : {},
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: 2,
          backgroundColor: alpha(accent, 0.1),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: accent,
        }}
      >
        {icon}
      </Box>
      {definition && (
        <Tooltip title={definition} arrow placement="top">
          <InfoIcon sx={{ fontSize: 15, color: colors.textMuted, cursor: 'help' }} />
        </Tooltip>
      )}
    </Box>

    <Typography
      variant="caption"
      sx={{
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: colors.textSecondary,
        display: 'block',
        mb: 0.5,
      }}
    >
      {title}
    </Typography>

    {loading ? (
      <Skeleton variant="text" width={70} height={38} />
    ) : (
      <Typography sx={{ fontSize: '1.75rem', fontWeight: 800, color: colors.textPrimary, lineHeight: 1 }}>
        {value !== null ? formatNumber(value) : '—'}
      </Typography>
    )}
  </Card>
);

// ─── Badge compact pour KPI secondaires ──────────────────────────────────────

const SecondaryKpi: React.FC<{
  label: string; value: number | null; accent: string; loading: boolean; href?: string;
}> = ({ label, value, accent, loading, href }) => (
  <Box
    component={href ? 'a' : 'div'}
    {...(href ? { href } : {})}
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1.25,
      px: 2,
      py: 1.25,
      borderRadius: 2,
      backgroundColor: colors.bgCard,
      border: `1px solid ${colors.border}`,
      textDecoration: 'none',
      transition: 'all 150ms',
      '&:hover': href ? { backgroundColor: alpha(accent, 0.05), borderColor: alpha(accent, 0.3) } : {},
      flex: '1 1 120px',
      minWidth: 0,
    }}
  >
    <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: accent, flexShrink: 0 }} />
    <Typography variant="body2" sx={{ color: colors.textSecondary, flexGrow: 1 }} noWrap>{label}</Typography>
    {loading
      ? <Skeleton variant="text" width={32} />
      : <Typography variant="body2" sx={{ fontWeight: 700, color: colors.textPrimary, flexShrink: 0 }}>
        {value !== null ? formatNumber(value) : '—'}
      </Typography>
    }
  </Box>
);

// ─── Couleur / icône par type d'activité ──────────────────────────────────────

const TYPE_META: Record<string, { color: string; Icon: React.FC<any> }> = {
  user: { color: colors.kpiUsers, Icon: PersonIcon },
  provider: { color: colors.kpiProviders, Icon: BusinessIcon },
  freelancer: { color: colors.kpiFreelances, Icon: BadgeIcon },
  seller: { color: colors.kpiSellers, Icon: LocalMallIcon },
  field_recensement: { color: colors.kpiOrders, Icon: TravelExploreIcon },
};
const typeMeta = (type: string) => TYPE_META[type] ?? { color: colors.textSecondary, Icon: ScheduleIcon };

// ─── Composant principal ──────────────────────────────────────────────────────

const Home: React.FC = () => {
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [prevSummary, setPrev] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>('30d');
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async (keepData = false) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoadState(keepData ? 'loading' : 'loading');
    setError(null);
    try {
      const data = await fetchDashboardSummary(ctrl.signal);
      if (ctrl.signal.aborted) return;
      if (summary) setPrev(summary);
      setSummary(data);
      setLoadState('success');
    } catch (err: any) {
      if (err?.name === 'CanceledError' || err?.name === 'AbortError' || ctrl.signal.aborted) return;
      setError(err?.message ?? 'Erreur inconnue');
      setLoadState('error');
    }
  }, []); // eslint-disable-line

  useEffect(() => { load(); return () => abortRef.current?.abort(); }, []); // eslint-disable-line

  // Données affichées : les nouvelles si dispo, sinon les précédentes pendant le chargement
  const displayed = summary ?? prevSummary;
  const isLoading = loadState === 'idle' || loadState === 'loading';
  const counts = displayed?.counts;
  const pending = displayed?.pending ?? { total: 0, providers: 0, freelancers: 0, sellers: 0, fieldRecensements: 0 };
  const notif = displayed?.notifications?.unread ?? 0;
  const recent = displayed?.recent ?? [];
  const distrib = displayed?.profileDistribution ?? [];
  const geoPoints = displayed?.geo?.points ?? [];
  const topZones = displayed?.geo?.topLocations ?? [];
  const genAt = displayed?.generatedAt;
  const totalActors = distrib.reduce((s, d) => s + d.count, 0);

  // Panneau "À traiter" — filtrer les lignes non nulles
  const pendingLines = [
    { label: 'Prestataires en attente', value: pending.providers, href: '/recensements-pending', accent: colors.kpiPending },
    { label: 'Freelances en attente', value: pending.freelancers, href: '/recensements-pending', accent: colors.kpiPending },
    { label: 'Vendeurs en attente', value: pending.sellers, href: '/recensements-pending', accent: colors.kpiPending },
    { label: 'Recensements terrain', value: pending.fieldRecensements, href: '/recensements-pending', accent: colors.kpiProviders },
    { label: 'Notifications non lues', value: notif, href: '/notifications', accent: colors.kpiNotif },
  ];
  const nonZeroLines = pendingLines.filter(l => l.value > 0);
  const allZero = nonZeroLines.length === 0;

  // ── État d'erreur sans données précédentes ────────────────────────────────

  if (loadState === 'error' && !prevSummary) {
    const isServerError = error?.includes('serveur') || error?.includes('interne');
    const isSessionError = error?.includes('Session') || error?.includes('reconnecter');
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 380, gap: 2, p: 4 }}>
        <Box sx={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: alpha(colors.error, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ErrorOutlineIcon sx={{ fontSize: 32, color: colors.error }} />
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>Impossible de charger le tableau de bord</Typography>
        {error && (
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420, textAlign: 'center' }}>{error}</Typography>
        )}
        {isServerError && (
          <Box sx={{ px: 2.5, py: 1.5, borderRadius: 2, backgroundColor: alpha(colors.warning, 0.08), border: `1px solid ${alpha(colors.warning, 0.25)}`, textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: colors.warning, fontWeight: 600, display: 'block' }}>Action requise</Typography>
            <Typography sx={{ fontFamily: 'monospace', fontSize: '0.82rem', mt: 0.5 }}>Ctrl+C puis npm start</Typography>
          </Box>
        )}
        {isSessionError
          ? <Button variant="contained" component="a" href="/connexion" sx={{ backgroundColor: colors.primary }}>Se reconnecter</Button>
          : <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => load()} sx={{ borderColor: colors.border, color: colors.primary }}>Réessayer</Button>
        }
      </Box>
    );
  }

  return (
    <Box>

      {/* ── A — EN-TÊTE ────────────────────────────────────────────────────── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: { xs: 'flex-start', md: 'center' },
          flexDirection: { xs: 'column', md: 'row' },
          gap: 2,
          mb: 3,
        }}
      >
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Vue d'ensemble de l'écosystème Soutrali Deals
            {genAt && (
              <> &nbsp;·&nbsp; Synchronisé {formatDate(genAt)}</>
            )}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
          {/* Sélecteur de période — préparé pour le futur endpoint tendances */}
          <ToggleButtonGroup
            value={period}
            exclusive
            onChange={(_, v) => v && setPeriod(v as Period)}
            size="small"
            sx={{
              '& .MuiToggleButton-root': {
                px: 1.5,
                py: 0.5,
                fontSize: '0.78rem',
                fontWeight: 500,
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                '&.Mui-selected': {
                  backgroundColor: alpha(colors.primary, 0.1),
                  color: colors.primary,
                  fontWeight: 700,
                  borderColor: alpha(colors.primary, 0.3),
                },
              },
            }}
          >
            <ToggleButton value="7d">7 j</ToggleButton>
            <ToggleButton value="30d">30 j</ToggleButton>
            <ToggleButton value="90d">90 j</ToggleButton>
            <ToggleButton value="1y">1 an</ToggleButton>
          </ToggleButtonGroup>

          <Tooltip title={isLoading ? 'Actualisation en cours…' : 'Actualiser les données'} arrow>
            <span>
              <IconButton
                onClick={() => load(true)}
                disabled={isLoading}
                size="small"
                aria-label="Actualiser le tableau de bord"
                sx={{
                  border: `1px solid ${colors.border}`,
                  borderRadius: 2,
                  backgroundColor: colors.bgCard,
                  '&:hover': { backgroundColor: colors.greenPale },
                }}
              >
                {isLoading
                  ? <CircularProgress size={16} thickness={5} sx={{ color: colors.primary }} />
                  : <RefreshIcon fontSize="small" sx={{ color: colors.primary }} />
                }
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>

      {/* Bandeau d'erreur non bloquant (données précédentes affichées) */}
      {loadState === 'error' && prevSummary && (
        <Paper elevation={0} sx={{ px: 2.5, py: 1.5, mb: 2.5, backgroundColor: alpha(colors.warning, 0.06), border: `1px solid ${alpha(colors.warning, 0.25)}` }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <ErrorOutlineIcon sx={{ fontSize: 18, color: colors.warning }} />
            <Typography variant="body2" sx={{ flexGrow: 1, color: colors.textPrimary }}>
              {error ?? 'Erreur de rechargement'} — données précédentes affichées.
            </Typography>
            <Button size="small" onClick={() => load(true)} sx={{ color: colors.primary, fontWeight: 600 }}>Réessayer</Button>
          </Box>
        </Paper>
      )}

      {/* ── B — KPI PRINCIPAUX ──────────────────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {[
          {
            title: 'Comptes utilisateurs',
            value: counts?.users ?? 0,
            icon: <PeopleIcon />,
            accent: colors.kpiUsers,
            bg: alpha(colors.kpiUsers, 0.04),
            href: '/utilisateur',
            definition: 'Tous les comptes inscrits (clients, prestataires, freelances, vendeurs inclus)',
          },
          {
            title: 'Prestataires',
            value: counts?.providers ?? 0,
            icon: <BusinessIcon />,
            accent: colors.kpiProviders,
            bg: alpha(colors.kpiProviders, 0.04),
            href: '/prestataire',
            definition: 'Profils prestataires actifs dans la base',
          },
          {
            title: 'Freelances',
            value: counts?.freelancers ?? 0,
            icon: <WorkIcon />,
            accent: colors.kpiFreelances,
            bg: alpha(colors.kpiFreelances, 0.04),
            href: '/freelance',
            definition: 'Profils freelance actifs',
          },
          {
            title: 'Vendeurs',
            value: counts?.sellers ?? 0,
            icon: <StorefrontIcon />,
            accent: colors.kpiSellers,
            bg: alpha(colors.kpiSellers, 0.04),
            href: '/vendeur',
            definition: 'Boutiques/vendeurs enregistrés',
          },
          {
            title: 'Commandes',
            value: counts?.orders ?? null,
            icon: <ReceiptIcon />,
            accent: colors.kpiOrders,
            bg: alpha(colors.kpiOrders, 0.04),
            href: '/commandes',
            definition: 'Total commandes enregistrées',
          },
          {
            title: 'En attente',
            value: pending.total,
            icon: <PendingActionsIcon />,
            accent: pending.total > 0 ? colors.kpiPending : colors.success,
            bg: pending.total > 0 ? alpha(colors.kpiPending, 0.04) : alpha(colors.success, 0.04),
            href: '/recensements-pending',
            definition: 'Profils en attente de validation admin',
          },
        ].map(kpi => (
          <Grid item xs={6} sm={4} md={2} key={kpi.title}>
            <KpiCard {...kpi} loading={isLoading && !displayed} />
          </Grid>
        ))}
      </Grid>

      {/* ── C — KPI SECONDAIRES (bandeau compact) ────────────────────────────── */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1.25,
          mb: 3,
          p: 2,
          backgroundColor: colors.beigeLight,
          borderRadius: 2,
          border: `1px solid ${colors.border}`,
        }}
      >
        <SecondaryKpi label="Services" value={counts?.services ?? 0} accent={colors.emerald} loading={isLoading && !displayed} href="/service" />
        <SecondaryKpi label="Catégories" value={counts?.categories ?? 0} accent={colors.primary} loading={isLoading && !displayed} href="/categorie" />
        <SecondaryKpi label="Articles" value={counts?.articles ?? 0} accent={colors.primary700} loading={isLoading && !displayed} href="/article" />
        <SecondaryKpi label="Offres freelance" value={counts?.freelanceServices ?? null} accent={colors.primary600} loading={isLoading && !displayed} href="/freelance-offres" />
        <SecondaryKpi label="Prestations" value={counts?.prestations ?? null} accent={colors.forestGreen} loading={isLoading && !displayed} href="/prestations" />
        <SecondaryKpi label="Notifications" value={notif} accent={colors.kpiNotif} loading={isLoading && !displayed} href="/notifications" />
      </Box>

      {/* ── D — Évolution + donut ───────────────────────────────────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }} alignItems="stretch">
        <Grid item xs={12} lg={8}>
          <EcosystemEvolutionChart />
        </Grid>

        <Grid item xs={12} lg={4}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              height: '100%',
              minHeight: 360,
              backgroundColor: colors.greenPale,
              border: `1px solid ${alpha(colors.emerald, 0.2)}`,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Répartition des profils</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                  Clients · Prestataires · Freelances · Vendeurs
                </Typography>
              </Box>
              <Tooltip title="Les populations sont mutuellement exclusives. 'Clients' = comptes avec rôle Client uniquement." arrow>
                <InfoIcon sx={{ fontSize: 16, color: colors.textMuted, cursor: 'help' }} />
              </Tooltip>
            </Box>

            {isLoading && !displayed ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <Skeleton variant="circular" width={200} height={200} />
              </Box>
            ) : distrib.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 5 }}>
                <AssessmentIcon sx={{ fontSize: 40, color: colors.textMuted, opacity: 0.4 }} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Aucune donnée</Typography>
              </Box>
            ) : (
              <Box sx={{ position: 'relative', flex: 1, minHeight: 240 }}>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={distrib}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={88}
                      paddingAngle={2}
                      strokeWidth={0}
                    >
                      {distrib.map((_, i) => (
                        <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTip
                      formatter={(v: number, n: string) => [v.toLocaleString('fr-FR'), n]}
                      contentStyle={{ borderRadius: 8, border: `1px solid ${colors.border}`, fontSize: 13 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Total au centre */}
                <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
                  <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: colors.textPrimary, lineHeight: 1 }}>
                    {formatNumber(totalActors)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">profils</Typography>
                </Box>
              </Box>
            )}

            {/* Légende */}
            {!isLoading && distrib.length > 0 && (
              <Stack spacing={1} sx={{ mt: 1.5 }}>
                {distrib.map((d, i) => (
                  <Box key={d.type} sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                    <Box sx={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length], flexShrink: 0 }} />
                    <Typography variant="body2" sx={{ flexGrow: 1, color: colors.textSecondary, fontSize: '0.83rem' }}>{d.label}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.83rem' }}>{d.count.toLocaleString('fr-FR')}</Typography>
                    <Typography variant="caption" color="text.disabled" sx={{ minWidth: 34, textAlign: 'right' }}>
                      {totalActors > 0 ? `${Math.round((d.count / totalActors) * 100)} %` : '—'}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* ── G — À traiter ───────────────────────────────────────────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <Paper elevation={0} sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>À traiter</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>Actions en attente de votre validation</Typography>
              </Box>
              {nonZeroLines.length > 0 && (
                <Button
                  component="a"
                  href="/recensements-pending"
                  variant="outlined"
                  size="small"
                  endIcon={<ArrowForwardIcon />}
                  sx={{ borderColor: colors.border, color: colors.primary, fontWeight: 600 }}
                >
                  Voir tout
                </Button>
              )}
            </Box>

            {isLoading && !displayed ? (
              <Stack spacing={1}>{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={44} sx={{ borderRadius: 2 }} />)}</Stack>
            ) : allZero ? (
              // Tout à zéro — état positif compact
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  py: 5,
                  gap: 1,
                  backgroundColor: alpha(colors.success, 0.05),
                  borderRadius: 2,
                  border: `1px solid ${alpha(colors.success, 0.2)}`,
                }}
              >
                <TaskAltIcon sx={{ fontSize: 36, color: colors.success }} />
                <Typography variant="body1" sx={{ fontWeight: 600, color: colors.forestGreen }}>Tout est à jour</Typography>
                <Typography variant="body2" color="text.secondary">Aucun élément ne nécessite d'action.</Typography>
              </Box>
            ) : (
              <Stack spacing={1}>
                {nonZeroLines.map(({ label, value, href, accent }) => (
                  <Box
                    key={label}
                    component="a"
                    href={href}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.75,
                      px: 2,
                      py: 1.25,
                      borderRadius: 2,
                      backgroundColor: alpha(accent, 0.05),
                      border: `1px solid ${alpha(accent, 0.2)}`,
                      textDecoration: 'none',
                      transition: 'all 150ms',
                      '&:hover': { backgroundColor: alpha(accent, 0.1) },
                    }}
                  >
                    <DotIcon sx={{ fontSize: 14, color: accent, flexShrink: 0 }} />
                    <Typography variant="body2" sx={{ flexGrow: 1, fontWeight: 500, color: colors.textPrimary }}>{label}</Typography>
                    <Chip
                      label={value.toLocaleString('fr-FR')}
                      size="small"
                      sx={{ height: 22, fontWeight: 700, fontSize: '0.78rem', backgroundColor: alpha(accent, 0.12), color: accent, border: `1px solid ${alpha(accent, 0.25)}` }}
                    />
                    <ArrowForwardIcon sx={{ fontSize: 13, color: colors.textMuted }} />
                  </Box>
                ))}
                {/* Résumé des catégories à zéro */}
                {pendingLines.filter(l => l.value === 0).length > 0 && (
                  <Typography variant="caption" color="text.disabled" sx={{ pt: 0.5, pl: 0.5 }}>
                    Les autres catégories sont à jour.
                  </Typography>
                )}
              </Stack>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* ── E — CARTE CÔTE D'IVOIRE ─────────────────────────────────────────── */}
      <Paper elevation={0} sx={{ mb: 3, overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2.25 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Couverture en Côte d'Ivoire</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
              Répartition géographique des prestataires et vendeurs
            </Typography>
          </Box>
          <Chip
            label={isLoading && !displayed
              ? '…'
              : `${formatNumber(geoPoints.length)} profil${geoPoints.length !== 1 ? 's' : ''} géolocalisé${geoPoints.length !== 1 ? 's' : ''}`
            }
            size="small"
            sx={{ backgroundColor: colors.greenLight, color: colors.forestGreen, fontWeight: 600 }}
          />
        </Box>
        <Divider sx={{ borderColor: colors.border }} />
        <Grid container>
          {/* Carte */}
          <Grid item xs={12} md={8}>
            <Box sx={{ height: { xs: 260, md: 360 }, position: 'relative' }}>
              {isLoading && !displayed ? (
                <Skeleton variant="rectangular" width="100%" height="100%" />
              ) : (
                <Suspense fallback={
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', bgcolor: colors.greenPale }}>
                    <CircularProgress size={28} sx={{ color: colors.primary }} />
                  </Box>
                }>
                  <HomeCIMap points={geoPoints} />
                </Suspense>
              )}
            </Box>
          </Grid>

          {/* Zones actives */}
          <Grid item xs={12} md={4}>
            <Box sx={{ p: 2.5, borderLeft: { md: `1px solid ${colors.border}` }, height: '100%' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>Zones les plus actives</Typography>
              {isLoading && !displayed ? (
                Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height={30} sx={{ mb: 0.75 }} />)
              ) : topZones.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <Typography variant="body2" color="text.secondary">Aucune donnée géographique disponible</Typography>
                </Box>
              ) : (
                <Stack spacing={1.5}>
                  {topZones.map(({ zone, total }, i) => {
                    const max = topZones[0]?.total ?? 1;
                    const barColor = i === 0 ? colors.forestGreen : i < 3 ? colors.emerald : colors.primary;
                    const pct = Math.round((total / max) * 100);
                    return (
                      <Box key={zone}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.35 }}>
                          <Typography variant="body2" noWrap sx={{ maxWidth: '75%', fontSize: '0.82rem' }}>
                            {i + 1}. {zone}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.82rem', color: colors.textSecondary }}>
                            {total}
                          </Typography>
                        </Box>
                        <Box sx={{ height: 4, borderRadius: 2, backgroundColor: colors.greenLight }}>
                          <Box sx={{ height: '100%', width: `${pct}%`, borderRadius: 2, backgroundColor: barColor, transition: 'width 400ms' }} />
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* ── F — Activité récente + Flux ─────────────────────────────────────── */}
      <Grid container spacing={2.5}>

        {/* Tableau activité récente */}
        <Grid item xs={12} md={7}>
          <Paper elevation={0} sx={{ overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2, borderBottom: `1px solid ${colors.border}` }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Activité récente</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>Dernières inscriptions et soumissions (7 jours)</Typography>
              </Box>
              <Button component="a" href="/utilisateur" size="small" variant="text" endIcon={<ArrowForwardIcon fontSize="small" />} sx={{ color: colors.primary, fontWeight: 600 }}>
                Voir tout
              </Button>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Acteur</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Contexte</TableCell>
                    <TableCell>Statut</TableCell>
                    <TableCell>Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {isLoading && !displayed ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        {[1, 2, 3, 4, 5].map(j => <TableCell key={j}><Skeleton /></TableCell>)}
                      </TableRow>
                    ))
                  ) : recent.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 5 }}>
                        <ScheduleIcon sx={{ fontSize: 32, color: colors.textMuted, opacity: 0.3, display: 'block', mx: 'auto', mb: 0.5 }} />
                        <Typography variant="body2" color="text.secondary">Aucune activité cette semaine</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    recent.map(item => {
                      const { color, Icon } = typeMeta(item.type);
                      const statusLabel = localizeStatus(item.status);
                      return (
                        <TableRow key={item.id} hover>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar sx={{ width: 28, height: 28, backgroundColor: alpha(color, 0.12), color }}>
                                <Icon sx={{ fontSize: 14 }} />
                              </Avatar>
                              <Typography variant="body2" sx={{ fontWeight: 500, maxWidth: 130 }} noWrap>
                                {item.label}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" color="text.secondary">{getLabelForType(item.type)}</Typography>
                          </TableCell>
                          <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                            <Typography variant="caption" color="text.disabled" noWrap sx={{ maxWidth: 110, display: 'block' }}>
                              {item.subLabel || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {statusLabel && (
                              <Chip
                                label={statusLabel}
                                size="small"
                                sx={{ height: 20, fontSize: '0.7rem', backgroundColor: alpha(color, 0.1), color, fontWeight: 600 }}
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" color="text.disabled" noWrap>{formatDate(item.createdAt)}</Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Flux d'activité */}
        <Grid item xs={12} md={5}>
          <Paper elevation={0} sx={{ height: '100%', overflow: 'hidden' }}>
            <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${colors.border}` }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Flux d'activité</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>Chronologie des événements récents</Typography>
            </Box>

            <Box sx={{ px: 2.5, py: 2 }}>
              {isLoading && !displayed ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Box key={i} sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
                    <Skeleton variant="circular" width={34} height={34} />
                    <Box sx={{ flexGrow: 1 }}>
                      <Skeleton variant="text" width="60%" />
                      <Skeleton variant="text" width="40%" height={13} />
                    </Box>
                  </Box>
                ))
              ) : recent.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">Aucune activité disponible</Typography>
                </Box>
              ) : (
                <Stack spacing={0}>
                  {recent.slice(0, 6).map((item, idx) => {
                    const { color, Icon } = typeMeta(item.type);
                    const statusLabel = localizeStatus(item.status);
                    return (
                      <Box
                        key={item.id}
                        sx={{
                          display: 'flex',
                          gap: 1.5,
                          py: 1.5,
                          borderBottom: idx < Math.min(recent.length, 6) - 1 ? `1px solid ${colors.border}` : 'none',
                        }}
                      >
                        <Avatar sx={{ width: 34, height: 34, backgroundColor: alpha(color, 0.12), color, flexShrink: 0 }}>
                          <Icon sx={{ fontSize: 15 }} />
                        </Avatar>
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3 }} noWrap>
                            {item.label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                            {getLabelForType(item.type)}{item.subLabel ? ` · ${item.subLabel}` : ''}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                            <ScheduleIcon sx={{ fontSize: 11, color: colors.textMuted }} />
                            <Typography variant="caption" sx={{ color: colors.textMuted, fontSize: '0.72rem' }}>
                              {formatDate(item.createdAt)}
                            </Typography>
                          </Box>
                        </Box>
                        {statusLabel && (
                          <Chip
                            label={statusLabel}
                            size="small"
                            sx={{ height: 20, fontSize: '0.68rem', fontWeight: 600, backgroundColor: alpha(color, 0.1), color, alignSelf: 'flex-start', mt: 0.25, flexShrink: 0 }}
                          />
                        )}
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Pied de page de la page Home (distinct du footer du layout) */}
      <Box sx={{ mt: 3, pt: 1.5, borderTop: `1px solid ${colors.border}` }}>
        <Typography variant="caption" color="text.disabled">
          Soutrali Deals Administration{genAt && ` · Données du ${new Date(genAt).toLocaleTimeString('fr-FR')}`}
        </Typography>
      </Box>
    </Box>
  );
};

export default Home;
