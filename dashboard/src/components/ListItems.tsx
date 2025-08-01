import * as React from 'react';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import PeopleIcon from '@mui/icons-material/People';
import GroupIcon from '@mui/icons-material/Group';
import CategoryIcon from '@mui/icons-material/Category';
import DesignServicesIcon from '@mui/icons-material/DesignServices';
import CoPresentIcon from '@mui/icons-material/CoPresent';
import HomeIcon from '@mui/icons-material/Home';
import WorkIcon from '@mui/icons-material/Work'; // Freelance
import StorefrontIcon from '@mui/icons-material/Storefront'; // Vendeur
import { Link, useLocation } from 'react-router-dom';
import { Tooltip, Typography, Box } from '@mui/material';

export const MainListItems = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  const navItems = [
    { 
      title: "Tableau de bord",
      path: "/", 
      icon: <HomeIcon />,
      exact: true
    },
    { 
      title: "Groupes", 
      path: "/groupe", 
      icon: <GroupIcon /> 
    },
    { 
      title: "Catégories", 
      path: "/categorie", 
      icon: <CategoryIcon /> 
    },
    { 
      title: "Services", 
      path: "/service", 
      icon: <DesignServicesIcon /> 
    },
    { 
      title: "Articles", 
      path: "/article", 
      icon: <ShoppingCartIcon /> 
    },
    { 
      title: "Prestataires", 
      path: "/prestataire", 
      icon: <CoPresentIcon /> 
    },
    { 
      title: "Freelances", 
      path: "/freelance", 
      icon: <WorkIcon /> 
    },
    { 
      title: "Vendeurs", 
      path: "/vendeur", 
      icon: <StorefrontIcon /> 
    },
    { 
      title: "Utilisateurs", 
      path: "/utilisateur", 
      icon: <PeopleIcon /> 
    },
  ];

  const isActive = (path: string, exact: boolean = false) => {
    if (exact) return currentPath === path;
    return (currentPath.startsWith(path) && path !== '/') || currentPath === path;
  };

  return (
    <React.Fragment>
      <Box sx={{ px: 3, py: 2 }}>
        <Typography 
          variant="subtitle2" 
          sx={{ 
            fontSize: '0.75rem',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'text.secondary',
            mb: 1
          }}
        >
          Navigation principale
        </Typography>
      </Box>
      
      {navItems.map((item) => (
        <Tooltip 
          key={item.path}
          title={item.title} 
          placement="right"
          arrow
          enterDelay={500}
        >
          <ListItemButton 
            component={Link} 
            to={item.path}
            selected={isActive(item.path, item.exact)}
          >
            <ListItemIcon>
              {item.icon}
            </ListItemIcon>
            <ListItemText 
              primary={item.title} 
            />
          </ListItemButton>
        </Tooltip>
      ))}
    </React.Fragment>
  );
};

export const mainListItems = <MainListItems />;
