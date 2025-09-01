import React, { useMemo, useState } from 'react';
import './styles/App.css';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import Dashboard from './routes/Dashboard';
import CssBaseline from '@mui/material/CssBaseline';
import 'primereact/resources/primereact.min.css';          // Core CSS
import 'primeicons/primeicons.css';                        // Icons
import 'primeflex/primeflex.css'; 
import { PrimeReactProvider } from 'primereact/api';
import 'primereact/resources/themes/lara-light-teal/theme.css';  // Thème PrimeReact coordonné

// Couleurs du logo Soutrali Deals
const soutraliColors = {
  turquoise: '#009DB3',      // Bleu turquoise du texte "SOUTRALI DEALS"
  emerald: '#00A046',        // Vert émeraude de la carte africaine
  darkEmerald: '#007C34',    // Version plus foncée pour les contrastes
  lightTurquoise: '#33B5CC', // Version plus claire pour les survols
};

// Système typographique moderne avec typage correct pour MUI
const typography = {
  fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  h1: {
    fontWeight: 700,
    fontSize: '2.5rem',
    letterSpacing: '-0.01562em',
  },
  h2: {
    fontWeight: 600,
    fontSize: '2rem',
    letterSpacing: '-0.00833em',
  },
  h3: {
    fontWeight: 600,
    fontSize: '1.75rem',
    letterSpacing: '0em',
  },
  h4: {
    fontWeight: 600,
    fontSize: '1.5rem',
    letterSpacing: '0.00735em',
  },
  h5: {
    fontWeight: 500,
    fontSize: '1.25rem',
    letterSpacing: '0em',
  },
  h6: {
    fontWeight: 500,
    fontSize: '1rem',
    letterSpacing: '0.0075em',
  },
  button: {
    fontWeight: 600,
    fontSize: '0.875rem',
    letterSpacing: '0.02857em',
  },
};

// Système de shadows amélioré pour effet neumorphique
const shadows = [
  'none',
  '0px 2px 4px rgba(0,0,0,0.02), 0px 1px 2px rgba(0,0,0,0.04)', '0px 4px 8px rgba(0,0,0,0.04), 0px 2px 4px rgba(0,0,0,0.08)', '0px 6px 12px rgba(0,0,0,0.06), 0px 3px 6px rgba(0,0,0,0.1)',  '0px 8px 16px rgba(0,0,0,0.08), 0px 4px 8px rgba(0,0,0,0.12)',
  '0px 10px 20px rgba(0,0,0,0.1), 0px 5px 10px rgba(0,0,0,0.14)', '0px 12px 24px rgba(0,0,0,0.12), 0px 6px 12px rgba(0,0,0,0.16)', '0px 14px 28px rgba(0,0,0,0.14), 0px 7px 14px rgba(0,0,0,0.18)', '0px 16px 32px rgba(0,0,0,0.16), 0px 8px 16px rgba(0,0,0,0.2)',
  '0px 18px 36px rgba(0,0,0,0.18), 0px 9px 18px rgba(0,0,0,0.22)', '0px 20px 40px rgba(0,0,0,0.2), 0px 10px 20px rgba(0,0,0,0.24)', '0px 22px 44px rgba(0,0,0,0.22), 0px 11px 22px rgba(0,0,0,0.26)', '0px 24px 48px rgba(0,0,0,0.24), 0px 12px 24px rgba(0,0,0,0.28)',
  '0px 26px 52px rgba(0,0,0,0.26), 0px 13px 26px rgba(0,0,0,0.3)', '0px 28px 56px rgba(0,0,0,0.28), 0px 14px 28px rgba(0,0,0,0.32)', '0px 30px 60px rgba(0,0,0,0.3), 0px 15px 30px rgba(0,0,0,0.34)', '0px 32px 64px rgba(0,0,0,0.32), 0px 16px 32px rgba(0,0,0,0.36)',
  '0px 34px 68px rgba(0,0,0,0.34), 0px 17px 34px rgba(0,0,0,0.38)', '0px 36px 72px rgba(0,0,0,0.36), 0px 18px 36px rgba(0,0,0,0.4)', '0px 38px 76px rgba(0,0,0,0.38), 0px 19px 38px rgba(0,0,0,0.42)', '0px 40px 80px rgba(0,0,0,0.4), 0px 20px 40px rgba(0,0,0,0.44)',
  '0px 42px 84px rgba(0,0,0,0.42), 0px 21px 42px rgba(0,0,0,0.46)', '0px 44px 88px rgba(0,0,0,0.44), 0px 22px 44px rgba(0,0,0,0.48)', '0px 46px 92px rgba(0,0,0,0.46), 0px 23px 46px rgba(0,0,0,0.5)', '0px 48px 96px rgba(0,0,0,0.48), 0px 24px 48px rgba(0,0,0,0.52)',
];



// Thème principal avec les couleurs du logo Soutrali Deals
const createSoutraliTheme = (mode: 'light' | 'dark') => {
  return createTheme({
    palette: {
      mode,
      primary: {
        main: soutraliColors.turquoise,
        light: soutraliColors.lightTurquoise,
        dark: '#00809A',
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: soutraliColors.emerald,
        light: '#33B56C',
        dark: soutraliColors.darkEmerald,
        contrastText: '#FFFFFF',
      },
      background: {
        default: mode === 'light' ? '#F5F7FA' : '#121212',
        paper: mode === 'light' ? '#FFFFFF' : '#1E1E1E',
      },
      text: {
        primary: mode === 'light' ? '#2D3748' : '#E2E8F0',
        secondary: mode === 'light' ? '#718096' : '#A0AEC0',
      },
      success: {
        main: soutraliColors.emerald,
      },
      info: {
        main: soutraliColors.turquoise,
      },
    },
    typography,
    shape: {
      borderRadius: 12,
    },
    shadows: shadows as any,
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            padding: '8px 16px',
            boxShadow: 'none',
            '&:hover': {
              boxShadow: shadows[2],
            },
            textTransform: 'none',
          },
          containedPrimary: {
            background: `linear-gradient(135deg, ${soutraliColors.turquoise} 0%, ${soutraliColors.lightTurquoise} 100%)`,
          },
          containedSecondary: {
            background: `linear-gradient(135deg, ${soutraliColors.emerald} 0%, ${soutraliColors.darkEmerald} 100%)`,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            boxShadow: shadows[2],
            transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: shadows[4],
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 16,
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            boxShadow: shadows[3],
            background: mode === 'light' 
              ? `linear-gradient(90deg, ${soutraliColors.turquoise} 0%, ${soutraliColors.emerald} 100%)`
              : `linear-gradient(90deg, #003a41 0%, #00401c 100%)`,
          },
        },
      },
    },
  });
};


function App() {
  // État pour basculer entre le mode clair et sombre
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  
  // Créer le thème basé sur le mode actuel
  const soutraliTheme = useMemo(
    () => createSoutraliTheme(mode),
    [mode]
  );
  
  return (
    <ThemeProvider theme={soutraliTheme}>
      <CssBaseline />
      <PrimeReactProvider>
        <main>
          <Dashboard toggleThemeMode={() => setMode(mode === 'light' ? 'dark' : 'light')} themeMode={mode} />
        </main>
      </PrimeReactProvider>
    </ThemeProvider>
  );
}

export default App;
