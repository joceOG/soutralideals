import React from 'react';
import { 
  Typography, 
  Grid, 
  Paper, 
  Box,
  Card,
  CardContent,
  useTheme,
  alpha,
} from '@mui/material';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import StorefrontIcon from '@mui/icons-material/Storefront';
import PeopleIcon from '@mui/icons-material/People';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

// Types pour les cartes statistiques modernisées
interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  trend?: number; // Pourcentage d'évolution (positif ou négatif)
  chartData?: {name: string; value: number}[];
}

const Home: React.FC = () => {
  const theme = useTheme();
  // Données simulées pour les graphiques
  const monthlyData = [
    { month: 'JAN', sales: 4000000, target: 4200000 },
    { month: 'FEB', sales: 4100000, target: 4200000 },
    { month: 'MAR', sales: 4300000, target: 4200000 },
    { month: 'APR', sales: 4200000, target: 4200000 },
    { month: 'MAI', sales: 4500000, target: 4200000 },
    { month: 'JUN', sales: 4300000, target: 4200000 },
    { month: 'JUL', sales: 4400000, target: 4200000 },
    { month: 'AUG', sales: 4100000, target: 4200000 },
    { month: 'SEP', sales: 4600000, target: 4200000 },
    { month: 'OCT', sales: 4300000, target: 4200000 },
    { month: 'NOV', sales: 4000000, target: 4200000 },
    { month: 'DEC', sales: 4400000, target: 4200000 },
  ];

  const serviceData = [
    { name: 'Jocelyn', value: 12740161 },
    { name: 'Yann', value: 11926320 },
    { name: 'Oka', value: 9957688 },
    { name: 'Performer', value: 9871412 },
    { name: 'Michoui', value: 9614017 },
  ];

  // Données simulées pour les mini-graphiques dans les cartes
  const generateMiniChartData = (trend: number) => {
    const baseValue = 100;
    const data = [];
    
    for (let i = 0; i < 10; i++) {
      // Générer une valeur avec une tendance générale basée sur le paramètre trend
      const randomVariation = Math.random() * 10 - 5; // Variation aléatoire entre -5 et +5
      const trendEffect = (i / 10) * trend * 2; // L'effet de la tendance augmente progressivement
      const value = baseValue + trendEffect + randomVariation;
      
      data.push({
        name: `P${i}`,
        value: Math.max(0, value) // Empêcher les valeurs négatives
      });
    }
    
    return data;
  };

  // Composant de carte statistique moderne avec animation et indicateur de tendance
  const StatCard = ({ title, value, icon, color, trend = 0, chartData }: StatCardProps) => {
    const data = chartData || generateMiniChartData(trend);
    const cardColor = theme.palette.mode === 'dark' ? alpha(color, 0.2) : alpha(color, 0.05);
    const iconBgColor = theme.palette.mode === 'dark' ? alpha(color, 0.5) : color;
    const trendColor = trend >= 0 ? theme.palette.success.main : theme.palette.error.main;
    
    return (
      <Card 
        sx={{ 
          height: '100%',
          position: 'relative',
          overflow: 'visible',
          borderRadius: 4,
          p: 1,
          background: `linear-gradient(135deg, ${cardColor} 0%, ${alpha(cardColor, 0.3)} 100%)`,
          boxShadow: theme.palette.mode === 'dark' 
            ? `0 8px 24px 0 ${alpha(color, 0.3)}` 
            : `0 10px 30px -5px ${alpha(color, 0.15)}`,
          transition: 'transform 0.3s, box-shadow 0.3s',
          '&:hover': {
            transform: 'translateY(-5px)',
            boxShadow: `0 20px 30px -10px ${alpha(color, 0.3)}`,
            '& .icon-container': {
              transform: 'scale(1.1) rotateY(10deg)'
            }
          }
        }}
      >
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, justifyContent: 'space-between' }}>
            <Typography 
              color="textSecondary" 
              variant="subtitle1"
              sx={{ 
                fontWeight: 500,
                fontSize: '0.9rem',
              }}
            >
              {title}
            </Typography>
            <Box 
              className="icon-container"
              sx={{ 
                backgroundColor: iconBgColor,
                borderRadius: '12px',
                width: 40,
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                transition: 'all 0.3s ease',
                transform: 'perspective(800px)'
              }}
            >
              {icon}
            </Box>
          </Box>
          
          <Box sx={{ mb: 1 }}>
            <Typography 
              variant="h4" 
              component="div" 
              sx={{ 
                fontWeight: 600,
                color: theme.palette.text.primary,
                mb: 0.5,
              }}
            >
              {value}
            </Typography>
            
            {trend !== undefined && (
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Box 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    color: trendColor,
                    backgroundColor: alpha(trendColor, 0.1),
                    borderRadius: 1,
                    px: 1,
                    py: 0.25,
                  }}
                >
                  {trend >= 0 ? 
                    <ArrowUpwardIcon sx={{ fontSize: 14, mr: 0.5 }} /> : 
                    <ArrowDownwardIcon sx={{ fontSize: 14, mr: 0.5 }} />}
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      fontWeight: 600, 
                      lineHeight: 1
                    }}
                  >
                    {Math.abs(trend)}%
                  </Typography>
                </Box>
                <Typography 
                  variant="caption" 
                  color="textSecondary" 
                  sx={{ ml: 1, fontWeight: 400 }}
                >
                  vs dernier mois
                </Typography>
              </Box>
            )}
          </Box>
          
          {/* Mini graphique en fond */}
          <Box sx={{ 
            height: 50, 
            mt: 2, 
            opacity: 0.8,
          }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart 
                data={data}
                margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id={`colorGradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.5}/>
                    <stop offset="95%" stopColor={color} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke={color} 
                  fillOpacity={1}
                  fill={`url(#colorGradient-${title})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box>
      {/* Titre de la page avec style moderne */}
      <Typography 
        variant="h4" 
        gutterBottom 
        sx={{ 
          fontWeight: 600,
          mb: 4,
          position: 'relative',
          '&:after': {
            content: '""',
            position: 'absolute',
            bottom: -8,
            left: 0,
            width: 40,
            height: 4,
            borderRadius: 2,
            backgroundColor: theme.palette.primary.main,
          }
        }}
      >
        Tableau de bord
      </Typography>
      
      {/* Cartes statistiques modernisées */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Services" 
            value="396" 
            icon={<StorefrontIcon />}
            color={theme.palette.primary.main}
            trend={12}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Utilisateurs" 
            value="181" 
            icon={<PeopleIcon />}
            color={theme.palette.secondary.main}
            trend={8}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Chiffre d'affaires" 
            value="54,1 M F" 
            icon={<AttachMoneyIcon />}
            color={theme.palette.info.main}
            trend={-3}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Croissance" 
            value="106%" 
            icon={<TrendingUpIcon />}
            color={theme.palette.success.main}
            trend={16}
          />
        </Grid>
      </Grid>

      {/* Graphiques */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper 
            sx={{ 
              p: 3,
              borderRadius: 4,
              overflow: 'hidden',
              background: theme.palette.mode === 'dark'
                ? `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)}, ${alpha(theme.palette.background.default, 0.7)})`
                : `linear-gradient(135deg, ${theme.palette.background.paper}, ${alpha(theme.palette.background.paper, 0.7)})`,
              boxShadow: theme.shadows[4],
              transition: 'transform 0.3s, box-shadow 0.3s',
              '&:hover': {
                boxShadow: theme.shadows[8],
                transform: 'translateY(-4px)'
              }
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 600,
                  position: 'relative',
                  '&:after': {
                    content: '""',
                    position: 'absolute',
                    width: '40%',
                    height: 3,
                    bottom: -8,
                    left: 0,
                    backgroundColor: theme.palette.primary.main,
                    borderRadius: 3,
                  }
                }}
              >
                Objectif vs. Chiffre d'affaires
              </Typography>
              
              <Box 
                sx={{ 
                  display: 'flex', 
                  gap: 1, 
                  backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  borderRadius: 2,
                  p: 0.5,
                }}
              >
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  px: 1, 
                  borderRadius: 1,
                }}>
                  <Box 
                    sx={{ 
                      width: 10, 
                      height: 10, 
                      backgroundColor: theme.palette.primary.main,
                      borderRadius: '50%',
                      mr: 0.5 
                    }} 
                  />
                  <Typography variant="caption" sx={{ fontWeight: 500 }}>Ventes</Typography>
                </Box>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  px: 1,
                  borderRadius: 1,
                }}>
                  <Box 
                    sx={{ 
                      width: 10, 
                      height: 10, 
                      backgroundColor: theme.palette.warning.main,
                      borderRadius: '50%',
                      mr: 0.5 
                    }} 
                  />
                  <Typography variant="caption" sx={{ fontWeight: 500 }}>Objectif</Typography>
                </Box>
              </Box>
            </Box>
            
            <ResponsiveContainer width="100%" height={320}>
              <BarChart 
                data={monthlyData}
                margin={{ top: 10, right: 10, bottom: 20, left: 10 }}
                barGap={8}
              >
                <defs>
                  <linearGradient id="salesColorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={theme.palette.primary.main} stopOpacity={1} />
                    <stop offset="100%" stopColor={alpha(theme.palette.primary.main, 0.6)} stopOpacity={1} />
                  </linearGradient>
                  <linearGradient id="targetColorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={theme.palette.warning.main} stopOpacity={1} />
                    <stop offset="100%" stopColor={alpha(theme.palette.warning.main, 0.6)} stopOpacity={1} />
                  </linearGradient>
                </defs>
                <CartesianGrid 
                  vertical={false} 
                  strokeDasharray="3 3" 
                  stroke={alpha(theme.palette.text.secondary, 0.2)} 
                />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: theme.palette.text.secondary, fontSize: 12 }} 
                  dy={10} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                  tickFormatter={(value) => value >= 1000000 ? `${value/1000000}M` : value} 
                />
                <RechartsTooltip 
                  cursor={false}
                  contentStyle={{ 
                    backgroundColor: theme.palette.background.paper,
                    border: 'none',
                    borderRadius: 8,
                    boxShadow: theme.shadows[3],
                  }} 
                />
                <Bar 
                  dataKey="sales" 
                  name="Ventes" 
                  fill="url(#salesColorGradient)" 
                  radius={[4, 4, 0, 0]}
                  animationDuration={1500}
                  animationEasing="ease-out"
                />
                <Bar 
                  dataKey="target" 
                  name="Objectif" 
                  fill="url(#targetColorGradient)" 
                  radius={[4, 4, 0, 0]}
                  animationDuration={1500}
                  animationEasing="ease-out"
                  animationBegin={300}
                />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper 
            sx={{ 
              p: 3,
              borderRadius: 4,
              overflow: 'hidden',
              background: theme.palette.mode === 'dark'
                ? `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)}, ${alpha(theme.palette.background.default, 0.7)})`
                : `linear-gradient(135deg, ${theme.palette.background.paper}, ${alpha(theme.palette.background.paper, 0.7)})`,
              boxShadow: theme.shadows[4],
              height: '100%',
              transition: 'transform 0.3s, box-shadow 0.3s',
              '&:hover': {
                boxShadow: theme.shadows[8],
                transform: 'translateY(-4px)'
              }
            }}
          >
            <Typography 
              variant="h6" 
              sx={{ 
                mb: 3, 
                fontWeight: 600,
                position: 'relative',
                '&:after': {
                  content: '""',
                  position: 'absolute',
                  width: '40%',
                  height: 3,
                  bottom: -8,
                  left: 0,
                  backgroundColor: theme.palette.secondary.main,
                  borderRadius: 3,
                }
              }}
            >
              Top 5 Prestataires
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart 
                data={serviceData} 
                layout="vertical"
                margin={{ top: 5, right: 20, bottom: 5, left: 40 }}
                barSize={20}
              >
                <defs>
                  <linearGradient id="prestatairesGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={alpha(theme.palette.secondary.main, 0.7)} />
                    <stop offset="100%" stopColor={theme.palette.secondary.main} />
                  </linearGradient>
                </defs>
                <CartesianGrid 
                  horizontal={true} 
                  vertical={false} 
                  stroke={alpha(theme.palette.text.secondary, 0.2)} 
                  strokeDasharray="3 3" 
                />
                <XAxis 
                  type="number" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                  tickFormatter={(value) => value >= 1000000 ? `${(value/1000000).toFixed(1)}M` : value} 
                />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: theme.palette.text.secondary, fontSize: 12, fontWeight: 500 }}
                />
                <RechartsTooltip 
                  cursor={{ fill: alpha(theme.palette.secondary.main, 0.1) }}
                  contentStyle={{ 
                    backgroundColor: theme.palette.background.paper,
                    border: 'none',
                    borderRadius: 8,
                    boxShadow: theme.shadows[3],
                  }}
                  formatter={(value: number) => [
                    new Intl.NumberFormat('fr-FR').format(value) + ' F',
                    'Chiffre d\'affaires'
                  ]}
                />
                <Bar 
                  dataKey="value" 
                  fill="url(#prestatairesGradient)" 
                  radius={[0, 4, 4, 0]} 
                  animationDuration={2000}
                  animationEasing="ease-in-out"
                />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Home;