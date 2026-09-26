import React from 'react';
import './styles/App.css';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import Dashboard from './routes/Dashboard';
import CssBaseline from '@mui/material/CssBaseline';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import 'primeflex/primeflex.css';
import { PrimeReactProvider } from 'primereact/api';
import 'primereact/resources/themes/lara-light-teal/theme.css';
import { colors } from './tokens/colors';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: colors.primary, light: colors.greenLight, dark: colors.forestGreen, contrastText: '#fff' },
    secondary: { main: colors.emerald, contrastText: '#fff' },
    background: { default: colors.bgWarm, paper: colors.bgCard },
    text: { primary: colors.textPrimary, secondary: colors.textSecondary },
    warning: { main: colors.warning },
    error: { main: colors.error },
    success: { main: colors.success },
    info: { main: colors.info },
    divider: colors.border,
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 700, fontSize: '1.5rem' },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
    button: { fontWeight: 600, textTransform: 'none' as const },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 8, boxShadow: 'none', textTransform: 'none' as const, '&:hover': { boxShadow: 'none' } },
        containedPrimary: { backgroundColor: colors.primary, '&:hover': { backgroundColor: colors.primary700 } },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: `1px solid ${colors.border}` },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { borderRadius: 14 },
        elevation0: { border: `1px solid ${colors.border}`, boxShadow: 'none' },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            backgroundColor: colors.bgWarm,
            fontWeight: 600,
            color: colors.textSecondary,
            fontSize: '0.75rem',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.05em',
            borderBottom: `1px solid ${colors.border}`,
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: { '&:hover': { backgroundColor: colors.bgHover } },
      },
    },
    MuiChip: {
      styleOverrides: { root: { borderRadius: 6, fontWeight: 500, fontSize: '0.75rem' } },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <PrimeReactProvider>
        <main>
          <Dashboard />
        </main>
      </PrimeReactProvider>
    </ThemeProvider>
  );
}

export default App;
