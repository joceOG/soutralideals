import React from 'react';
import { 
  Typography, 
  Grid, 
  Paper, 
  Box,
  Card,
  CardContent,
} from '@mui/material';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  LineChart,
  Line,
  ResponsiveContainer 
} from 'recharts';
import StorefrontIcon from '@mui/icons-material/Storefront';
import PeopleIcon from '@mui/icons-material/People';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

const Home: React.FC = () => {
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

  const StatCard = ({ title, value, icon, color }: { title: string; value: string; icon: React.ReactNode; color: string }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box sx={{ 
            backgroundColor: color,
            borderRadius: '50%',
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            mr: 2
          }}>
            {icon}
          </Box>
          <Typography color="textSecondary" variant="h6">
            {title}
          </Typography>
        </Box>
        <Typography variant="h4" component="div">
          {value}
        </Typography>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Tableau de bord
      </Typography>
      
      {/* Cartes statistiques */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Services" 
            value="396" 
            icon={<StorefrontIcon />}
            color="#00bcd4"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Utilisateurs" 
            value="181" 
            icon={<PeopleIcon />}
            color="#4caf50"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Chiffre d'affaires" 
            value="54,109,598 F" 
            icon={<AttachMoneyIcon />}
            color="#f44336"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Croissance" 
            value="106%" 
            icon={<TrendingUpIcon />}
            color="#ff9800"
          />
        </Grid>
      </Grid>

      {/* Graphiques */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Objectif vs. Chiffre d'affaires
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="sales" fill="#00bcd4" name="Ventes" />
                <Bar dataKey="target" fill="#ff9800" name="Objectif" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Top 5 Prestataires
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={serviceData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" />
                <Tooltip />
                <Bar dataKey="value" fill="#00bcd4" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Home;