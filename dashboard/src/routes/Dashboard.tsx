// @refresh reset
/**
 * Dashboard.tsx — Shell admin Soutrali 2026 (routeur + auth gate).
 */
import * as React from 'react';
import Box from '@mui/material/Box';
import { colors } from '../tokens/colors';
import { AdminNavigationProvider } from '../context/AdminNavigationContext';
import { AdminDashboardLayout } from '../components/AdminDashboardLayout';
import { resolveAdminPageMeta } from '../config/adminNavigation';
import {
  BrowserRouter as Router,
  useMatch,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import AppRouter from './AppRouter';
import { getRouterBasename } from '../utils/routerBasename';

const routerBasename = getRouterBasename();

const Dashboard: React.FC = () => {
  const [open, setOpen] = React.useState(true);
  return (
    <Router basename={routerBasename}>
      <AdminNavigationProvider>
        <DashboardShell open={open} setOpen={setOpen} />
      </AdminNavigationProvider>
    </Router>
  );
};

function DashboardShell({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  const isAuthPage = Boolean(useMatch({ path: '/connexion', end: true }));
  const navigate = useNavigate();
  const location = useLocation();
  const pageMeta = resolveAdminPageMeta(location.pathname);

  if (isAuthPage) {
    return (
      <Box sx={{ minHeight: '100dvh', backgroundColor: colors.bgWarm }}>
        <AppRouter />
      </Box>
    );
  }

  return (
    <AdminDashboardLayout
      open={open}
      setOpen={setOpen}
      pageTitle={pageMeta.title}
      pageDescription={pageMeta.description}
      navigate={navigate}
    />
  );
}

export default Dashboard;
