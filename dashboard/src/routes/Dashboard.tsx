import * as React from 'react';
import { styled } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import MuiDrawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import MuiAppBar, { AppBarProps as MuiAppBarProps } from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Badge from '@mui/material/Badge';
import Link from '@mui/material/Link';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import NotificationsIcon from '@mui/icons-material/Notifications';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { List, Avatar, Tooltip, Zoom } from '@mui/material';
import { mainListItems } from '../components/ListItems';
<<<<<<< HEAD
import { BrowserRouter as Router } from 'react-router-dom';
import AppRouter from './AppRouter';
import { alpha } from '@mui/material/styles';
=======
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from '../pages/Home';
import Groupe from '../pages/Groupe';
import Categorie from '../pages/Categorie';
import Service from '../pages/Service';
import Article from '../pages/Article';
import Prestataire from '../pages/Prestataire';
import Utilisateur from '../pages/Utilisateur';
import Connexion from '../pages/Connexion';
<<<<<<< HEAD
import Test from '../pages/text';
=======
>>>>>>> 7f93ecd (Connexion effective entre front et back)
//import { mainListItems, secondaryListItems } from './listItems';
//import Chart from './Chart';
//import Deposits from './Deposits';
//import Orders from './Orders';
>>>>>>> 23067a3 (Connexion effective entre front et back)

function Copyright(props: any) {
  return (
    <Typography variant="body2" color="text.secondary" align="center" {...props}>
      {'Copyright '}
      <Link color="inherit" href="https://mui.com/">
        Your Website
      </Link>{' '}
      {new Date().getFullYear()}
      {'.'}
    </Typography>
  );
}

const drawerWidth: number = 240;

interface AppBarProps extends MuiAppBarProps {
  open?: boolean;
}

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})<AppBarProps>(({ theme, open }) => ({
  zIndex: theme.zIndex.drawer + 1,
  transition: theme.transitions.create(['width', 'margin'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

const Drawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    '& .MuiDrawer-paper': {
      position: 'relative',
      whiteSpace: 'nowrap',
      width: drawerWidth,
      transition: theme.transitions.create('width', {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.enteringScreen,
      }),
      boxSizing: 'border-box',
      backgroundColor: theme.palette.mode === 'light' ? '#f8f9fa' : '#1e1e2f',
      borderRight: `1px solid ${theme.palette.mode === 'light' ? '#e0e0e0' : '#2d2d3f'}`,
      boxShadow: theme.palette.mode === 'light' 
        ? '2px 0 10px rgba(0,0,0,0.03)' 
        : '2px 0 10px rgba(0,0,0,0.2)',
      ...(!open && {
        overflowX: 'hidden',
        transition: theme.transitions.create('width', {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.leavingScreen,
        }),
        width: theme.spacing(7),
        [theme.breakpoints.up('sm')]: {
          width: theme.spacing(9),
        },
      }),
    },
  }),
);

interface DashboardProps {
  toggleThemeMode: () => void;  
  themeMode: 'light' | 'dark';  
}

const Dashboard: React.FC<DashboardProps> = ({ toggleThemeMode, themeMode }) => {
  const [open, setOpen] = React.useState(true);
  const toggleDrawer = () => {
    setOpen(!open);
  };

  return (
    <Router>
      <Box sx={{ display: 'flex' }}>
        <CssBaseline />
        <AppBar position="absolute" open={open}>
          <Toolbar
            sx={{
              pr: '24px', 
            }}
          >
            <IconButton
              edge="start"
              color="inherit"
              aria-label="open drawer"
              onClick={toggleDrawer}
              sx={{
                marginRight: '36px',
                ...(open && { display: 'none' }),
              }}
            >
              <MenuIcon />
            </IconButton>
            <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
              <Typography
                component="h1"
                variant="h5"
                color="inherit"
                noWrap
                sx={{ 
                  fontWeight: 700,
                  backgroundImage: themeMode === 'light' ? 
                    'linear-gradient(90deg, #FFFFFF 0%, #F0F0F0 100%)' : 
                    'linear-gradient(90deg, #FFFFFF 30%, #B0B0B0 100%)',
                  backgroundClip: 'text',
                  textFillColor: 'transparent',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mr: 2
                }}
              >
                SOUTRALI DEALS
              </Typography>
            </Box>
            
            <Tooltip 
              title={themeMode === 'light' ? "Passer en mode sombre" : "Passer en mode clair"}
              TransitionComponent={Zoom}
              arrow
            >
              <IconButton 
                onClick={toggleThemeMode} 
                color="inherit"
                sx={{
                  mr: 2,
                  transition: 'all 0.3s',
                  '&:hover': {
                    transform: 'rotate(30deg)'
                  }
                }}
              >
                {themeMode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Notifications" TransitionComponent={Zoom} arrow>
              <IconButton color="inherit">
                <Badge 
                  badgeContent={4} 
                  color="secondary"
                  sx={{
                    '& .MuiBadge-badge': {
                      animation: 'pulse 2s infinite',
                      '@keyframes pulse': {
                        '0%': { transform: 'scale(1)' },
                        '50%': { transform: 'scale(1.1)' },
                        '100%': { transform: 'scale(1)' },
                      }
                    }
                  }}
                >
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Profil utilisateur" TransitionComponent={Zoom} arrow>
              <Avatar 
                sx={{ 
                  cursor: 'pointer',
                  ml: 1, 
                  bgcolor: alpha('#fff', 0.15),
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'scale(1.1)',
                    boxShadow: '0 0 8px rgba(255,255,255,0.5)'
                  }
                }}
              >
                SD
              </Avatar>
            </Tooltip>
          </Toolbar>
        </AppBar>
        <Drawer variant="permanent" open={open}>
          <Toolbar
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              px: [1],
            }}
          >
            <IconButton onClick={toggleDrawer}>
              <ChevronLeftIcon />
            </IconButton>
          </Toolbar>
          <Divider />

          <Box
            sx={{
              height: '100%',
              display: 'flex',
<<<<<<< HEAD
<<<<<<< HEAD
              flexDirection: 'column',
              py: 2
=======
              flexDirection: 'column'
<<<<<<< HEAD
>>>>>>> 382dd35 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
=======
>>>>>>> 1a1b001 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
<<<<<<< HEAD
>>>>>>> 94cf045 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
=======
=======
              flexDirection: 'column',
              py: 2
>>>>>>> 58ba033 (categorie)
>>>>>>> d4cb6e1 (categorie)
            }}
          >
            <List 
              component="nav"
              sx={{
<<<<<<< HEAD
<<<<<<< HEAD
                py: 1,
                px: 1.5,
                '& .MuiListItemButton-root': {
                  my: 1,  // Espacement aéré entre les éléments (augmenté de 0.5 à 1)
                  mx: 1,
                  borderRadius: 2,
                  transition: 'all 0.2s',
                  
                  // Effet de hover amélioré
=======
=======
                py: 1,
                px: 1.5,
>>>>>>> 58ba033 (categorie)
                '& .MuiListItemButton-root': {
                  my: 1,  // Espacement aéré entre les éléments (augmenté de 0.5 à 1)
                  mx: 1,
                  borderRadius: 2,
                  transition: 'all 0.2s',
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> 382dd35 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
=======
>>>>>>> 1a1b001 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
>>>>>>> 94cf045 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
=======
>>>>>>> 1a1b001 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
=======
                  
                  // Effet de hover amélioré
>>>>>>> 58ba033 (categorie)
>>>>>>> d4cb6e1 (categorie)
                  '&:hover': {
                    backgroundColor: themeMode === 'light' ? 'rgba(0, 157, 179, 0.08)' : 'rgba(0, 157, 179, 0.15)',
                    transform: 'translateX(4px)'
                  },
<<<<<<< HEAD
<<<<<<< HEAD
                  
                  // Mise en évidence renforcée de l'élément actif
=======
<<<<<<< HEAD
>>>>>>> 382dd35 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
=======
>>>>>>> 1a1b001 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
<<<<<<< HEAD
>>>>>>> 94cf045 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
=======
=======
                  
                  // Mise en évidence renforcée de l'élément actif
>>>>>>> 58ba033 (categorie)
>>>>>>> d4cb6e1 (categorie)
                  '&.Mui-selected': {
                    backgroundColor: themeMode === 'light' ? 'rgba(0, 157, 179, 0.12)' : 'rgba(0, 157, 179, 0.2)',
                    '&:hover': {
                      backgroundColor: themeMode === 'light' ? 'rgba(0, 157, 179, 0.18)' : 'rgba(0, 157, 179, 0.25)',
                    },
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      left: 0,
<<<<<<< HEAD
<<<<<<< HEAD
                      top: '20%',  // Bordure plus grande (25% → 20%)
                      height: '60%', // Bordure plus grande (50% → 60%)
                      width: 4,     // Bordure plus épaisse (3px → 4px)
=======
                      top: '25%',
                      height: '50%',
                      width: 3,
<<<<<<< HEAD
>>>>>>> 382dd35 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
=======
>>>>>>> 1a1b001 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
<<<<<<< HEAD
>>>>>>> 94cf045 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
=======
=======
                      top: '20%',  // Bordure plus grande (25% → 20%)
                      height: '60%', // Bordure plus grande (50% → 60%)
                      width: 4,     // Bordure plus épaisse (3px → 4px)
>>>>>>> 58ba033 (categorie)
>>>>>>> d4cb6e1 (categorie)
                      backgroundColor: themeMode === 'light' ? '#009DB3' : '#33B5CC',
                      borderTopRightRadius: 4,
                      borderBottomRightRadius: 4
                    }
                  }
                },
<<<<<<< HEAD
<<<<<<< HEAD
                
                // Icônes plus grandes et expressives
                '& .MuiListItemIcon-root': {
                  minWidth: 44,  // Légèrement plus grand (40 → 44)
                  color: themeMode === 'light' ? '#009DB3' : '#33B5CC',
                  '& .MuiSvgIcon-root': {
                    fontSize: '1.4rem'  // Icônes plus grandes
                  }
                },
                
                // Meilleure lisibilité des textes
                '& .MuiListItemText-primary': {
                  fontSize: '1rem',  // 16px minimum
                  letterSpacing: '0.01em',
                  '.Mui-selected &': {
                    fontWeight: 600  // Texte en gras si actif
                  }
=======
=======
                
                // Icônes plus grandes et expressives
>>>>>>> 58ba033 (categorie)
                '& .MuiListItemIcon-root': {
                  minWidth: 44,  // Légèrement plus grand (40 → 44)
                  color: themeMode === 'light' ? '#009DB3' : '#33B5CC',
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> 382dd35 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
=======
>>>>>>> 1a1b001 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
>>>>>>> 94cf045 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
=======
>>>>>>> 1a1b001 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
=======
                  '& .MuiSvgIcon-root': {
                    fontSize: '1.4rem'  // Icônes plus grandes
                  }
                },
                
                // Meilleure lisibilité des textes
                '& .MuiListItemText-primary': {
                  fontSize: '1rem',  // 16px minimum
                  letterSpacing: '0.01em',
                  '.Mui-selected &': {
                    fontWeight: 600  // Texte en gras si actif
                  }
>>>>>>> 58ba033 (categorie)
>>>>>>> d4cb6e1 (categorie)
                },
              }}
            >
              {mainListItems}
            </List>
            
            <Box sx={{ flexGrow: 1 }} />
            
            <Box sx={{ 
              p: 2, 
              opacity: 0.6,
              textAlign: 'center',
              fontSize: '0.75rem'
            }}>
              Version 1.0.0
            </Box>
          </Box>
        </Drawer>
        <Box
          component="main"
          sx={{
            backgroundColor: (theme) =>
              theme.palette.mode === 'light'
                ? theme.palette.grey[100]
                : theme.palette.grey[900],
            flexGrow: 1,
            height: '100vh',
            overflow: 'auto',
          }}
        >
          <Toolbar />
          <Box sx={{ mt: 5, mb: 4, mr:4, ml:4 }}>
            <AppRouter />
          </Box>
          <Copyright sx={{ pt: 4 }} />
        </Box>
      </Box>

      </Router>
  );
}


export default Dashboard;