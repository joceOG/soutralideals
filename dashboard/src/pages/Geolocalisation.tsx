import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  useTheme,
  alpha,
  Chip,
  Avatar
} from '@mui/material';
import {
  Map as MapIcon,
  LocationOn as LocationOnIcon,
  Public as PublicIcon,
  Analytics as AnalyticsIcon,
  Directions as DirectionsIcon,
  Search as SearchIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { Link } from 'react-router-dom';

const Geolocalisation: React.FC = () => {
  const theme = useTheme();

  // Données des cartes disponibles
  const mapCards = [
    {
      title: "Prestataires Map",
      description: "Visualisez tous les prestataires sur la carte avec leurs zones d'intervention",
      icon: <LocationOnIcon />,
      path: "/prestataires-map",
      color: theme.palette.primary.main,
      features: ["Filtres par service", "Calcul de distance", "Zones d'intervention", "Contact direct"],
      stats: "127 prestataires actifs"
    },
    {
      title: "Vendeurs Map", 
      description: "Localisez les vendeurs et leurs zones de livraison",
      icon: <PublicIcon />,
      path: "/vendeurs-map",
      color: theme.palette.secondary.main,
      features: ["Zones de livraison", "Disponibilité", "Produits disponibles", "Évaluations"],
      stats: "89 vendeurs en ligne"
    },
    {
      title: "Freelances Map",
      description: "Trouvez les freelances disponibles par compétence et localisation",
      icon: <LocationOnIcon />,
      path: "/freelances-map", 
      color: theme.palette.info.main,
      features: ["Compétences", "Disponibilité", "Tarifs", "Portfolio"],
      stats: "156 freelances actifs"
    },
    {
      title: "Analytics Géographiques",
      description: "Analysez les performances et tendances par zone géographique",
      icon: <AnalyticsIcon />,
      path: "/geographic-analytics",
      color: theme.palette.success.main,
      features: ["Heatmaps", "Statistiques", "Tendances", "Rapports"],
      stats: "12 zones analysées"
    }
  ];

  // Services disponibles
  const services = [
    {
      title: "Géocodage",
      description: "Convertir adresses en coordonnées",
      icon: <SearchIcon />
    },
    {
      title: "Calcul de Distance", 
      description: "Distance et durée entre points",
      icon: <DirectionsIcon />
    },
    {
      title: "Filtres Avancés",
      description: "Recherche par critères multiples",
      icon: <FilterIcon />
    }
  ];

  return (
    <Box>
      {/* En-tête de la page */}
      <Box sx={{ mb: 4 }}>
        <Typography 
          variant="h4" 
          gutterBottom 
          sx={{ 
            fontWeight: 600,
            mb: 2,
            position: 'relative',
            '&:after': {
              content: '""',
              position: 'absolute',
              bottom: -8,
              left: 0,
              width: 60,
              height: 4,
              borderRadius: 2,
              backgroundColor: theme.palette.primary.main,
            }
          }}
        >
          🗺️ Géolocalisation
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600 }}>
          Gérez et visualisez toutes les données géographiques de votre plateforme. 
          Accédez aux cartes interactives, analytics et services de localisation.
        </Typography>
      </Box>

      {/* Cartes des fonctionnalités principales */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {mapCards.map((card, index) => (
          <Grid item xs={12} md={6} key={index}>
            <Card 
              sx={{ 
                height: '100%',
                borderRadius: 3,
                overflow: 'hidden',
                background: `linear-gradient(135deg, ${alpha(card.color, 0.05)} 0%, ${alpha(card.color, 0.1)} 100%)`,
                border: `1px solid ${alpha(card.color, 0.2)}`,
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: `0 8px 25px ${alpha(card.color, 0.3)}`,
                  border: `1px solid ${alpha(card.color, 0.4)}`,
                }
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar 
                    sx={{ 
                      bgcolor: card.color, 
                      mr: 2,
                      width: 48,
                      height: 48
                    }}
                  >
                    {card.icon}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {card.title}
                    </Typography>
                    <Chip 
                      label={card.stats} 
                      size="small" 
                      sx={{ 
                        bgcolor: alpha(card.color, 0.1),
                        color: card.color,
                        fontWeight: 500
                      }} 
                    />
                  </Box>
                </Box>
                
                <Typography 
                  variant="body2" 
                  color="text.secondary" 
                  sx={{ mb: 2 }}
                >
                  {card.description}
                </Typography>

                <Box sx={{ mb: 2 }}>
                  {card.features.map((feature, idx) => (
                    <Chip
                      key={idx}
                      label={feature}
                      size="small"
                      variant="outlined"
                      sx={{ 
                        mr: 1, 
                        mb: 1,
                        borderColor: alpha(card.color, 0.3),
                        color: card.color
                      }}
                    />
                  ))}
                </Box>
              </CardContent>
              
              <CardActions sx={{ p: 3, pt: 0 }}>
                <Button
                  component={Link}
                  to={card.path}
                  variant="contained"
                  sx={{
                    bgcolor: card.color,
                    '&:hover': {
                      bgcolor: alpha(card.color, 0.8)
                    }
                  }}
                  startIcon={<MapIcon />}
                >
                  Accéder à la carte
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Services disponibles */}
      <Box sx={{ mb: 4 }}>
        <Typography 
          variant="h5" 
          sx={{ 
            fontWeight: 600, 
            mb: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          <DirectionsIcon color="primary" />
          Services de Géolocalisation
        </Typography>
        
        <Grid container spacing={2}>
          {services.map((service, index) => (
            <Grid item xs={12} sm={4} key={index}>
              <Card 
                sx={{ 
                  p: 2,
                  textAlign: 'center',
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                  '&:hover': {
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                    transform: 'translateY(-2px)'
                  },
                  transition: 'all 0.2s ease'
                }}
              >
                <Avatar 
                  sx={{ 
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: theme.palette.primary.main,
                    mx: 'auto',
                    mb: 1,
                    width: 40,
                    height: 40
                  }}
                >
                  {service.icon}
                </Avatar>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {service.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {service.description}
                </Typography>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Statistiques rapides */}
      <Card 
        sx={{ 
          p: 3,
          borderRadius: 3,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
        }}
      >
        <Typography 
          variant="h6" 
          sx={{ 
            fontWeight: 600, 
            mb: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          <AnalyticsIcon color="primary" />
          Vue d'ensemble
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
                372
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Points géolocalisés
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.secondary.main }}>
                15
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Zones couvertes
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.info.main }}>
                98%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Précision GPS
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.success.main }}>
                24/7
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Surveillance
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Card>
    </Box>
  );
};

export default Geolocalisation;




