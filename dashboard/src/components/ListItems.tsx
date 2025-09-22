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
// ✅ NOUVEAUX IMPORTS POUR LES MODULES AJOUTÉS
import ReceiptIcon from '@mui/icons-material/Receipt';
import NotificationsIcon from '@mui/icons-material/Notifications';
import ChatIcon from '@mui/icons-material/Chat';
import HandymanIcon from '@mui/icons-material/Handyman';
import PaymentIcon from '@mui/icons-material/Payment';
import AssessmentIcon from '@mui/icons-material/Assessment';
import StarIcon from '@mui/icons-material/Star';
import ReportIcon from '@mui/icons-material/Report';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import SettingsIcon from '@mui/icons-material/Settings';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import { Link, useLocation } from 'react-router-dom';
import { Tooltip, Typography, Box, Badge } from '@mui/material';

// ✅ INTERFACE TYPESCRIPT POUR LES ÉLÉMENTS DE NAVIGATION
interface NavItem {
  title: string;
  path: string;
  icon: React.ReactElement;
  exact?: boolean;
  badge?: number;
}

export const MainListItems = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  const navItems: NavItem[] = [
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
      title: "Utilisateurs", 
      path: "/utilisateur", 
      icon: <PeopleIcon /> 
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
    // ✅ NOUVEAUX MODULES BUSINESS
    { 
      title: "Commandes", 
      path: "/commandes", 
      icon: <ReceiptIcon />,
      badge: 5 // Exemple de badge pour nouvelles commandes
    },
    { 
      title: "Prestations", 
      path: "/prestations", 
      icon: <HandymanIcon /> 
    },
    { 
      title: "Paiements", 
      path: "/paiements", 
      icon: <PaymentIcon /> 
    },
    // ✅ COMMUNICATION
    { 
      title: "Messages", 
      path: "/messages", 
      icon: <ChatIcon />,
      badge: 12 // Exemple de badge pour messages non lus
    },
    { 
      title: "Notifications", 
      path: "/notifications", 
      icon: <NotificationsIcon />,
      badge: 3 // Exemple de badge pour notifications
    },
    // ✅ QUALITÉ & MODÉRATION
    { 
      title: "Avis & Notes", 
      path: "/avis", 
      icon: <StarIcon /> 
    },
    { 
      title: "Signalements", 
      path: "/signalements", 
      icon: <ReportIcon /> 
    },
    { 
      title: "Vérifications", 
      path: "/verifications", 
      icon: <VerifiedUserIcon /> 
    },
    // ✅ ANALYTICS & CONFIGURATION
    { 
      title: "Statistiques", 
      path: "/statistiques", 
      icon: <AssessmentIcon /> 
    },
    { 
      title: "Paramètres", 
      path: "/parametres", 
      icon: <SettingsIcon /> 
    },
    { 
      title: "Support", 
      path: "/support", 
      icon: <SupportAgentIcon /> 
    }
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
              {item.badge ? (
                <Badge badgeContent={item.badge} color="error">
                  {item.icon}
                </Badge>
              ) : (
                item.icon
              )}
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
