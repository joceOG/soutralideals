// @refresh reset
import * as React from 'react';
import { styled } from '@mui/material/styles';
import MuiDrawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import LogoutIcon from '@mui/icons-material/Logout';
import { Avatar, Tooltip } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { colors } from '../tokens/colors';
import { MainListItems } from './ListItems';
import { AdminTopbar } from './AdminTopbar';
import { TOPBAR_MIN_H } from '../constants/adminShellLayout';
import { useAdminAccount } from '../hooks/useAdminAccount';
import { clearSession } from '../services/setupApi';
import type { NavigateFunction } from 'react-router-dom';
import AppRouter from '../routes/AppRouter';

const DRAWER_W_OPEN = 252;
const DRAWER_W_CLOSED = 68;

const Drawer = styled(MuiDrawer, { shouldForwardProp: (p) => p !== 'open' })(
  ({ theme, open }) => ({
    '& .MuiDrawer-paper': {
      position: 'fixed',
      top: 0,
      left: 0,
      bottom: 0,
      height: '100vh',
      whiteSpace: 'nowrap',
      width: DRAWER_W_OPEN,
      backgroundColor: colors.forestGreen,
      color: colors.white,
      border: 'none',
      overflowX: 'hidden',
      transition: theme.transitions.create('width', {
        easing: theme.transitions.easing.sharp,
        duration: 200,
      }),
      boxSizing: 'border-box',
      zIndex: theme.zIndex.drawer,
      ...(!open && {
        width: DRAWER_W_CLOSED,
      }),
    },
  }),
);

export interface AdminDashboardLayoutProps {
  open: boolean;
  setOpen: (v: boolean) => void;
  pageTitle: string;
  pageDescription: string;
  navigate: NavigateFunction;
}

export function AdminDashboardLayout({
  open,
  setOpen,
  pageTitle,
  pageDescription,
  navigate,
}: AdminDashboardLayoutProps) {
  const account = useAdminAccount();

  const handleLogout = async () => {
    await clearSession();
    navigate('/connexion', { replace: true });
  };

  const drawerW = open ? DRAWER_W_OPEN : DRAWER_W_CLOSED;

  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh', backgroundColor: colors.bgWarm }}>
      <Drawer variant="permanent" open={open}>
        <Box
          sx={{
            height: TOPBAR_MIN_H,
            display: 'flex',
            alignItems: 'center',
            px: open ? 2 : 1.25,
            gap: 1.25,
            flexShrink: 0,
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: '10px',
              background: `linear-gradient(135deg, ${colors.emerald} 0%, ${colors.primary600} 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontWeight: 900,
              fontSize: 14,
              color: colors.white,
              letterSpacing: '-0.02em',
            }}
          >
            SD
          </Box>
          {open && (
            <Box sx={{ overflow: 'hidden' }}>
              <Typography
                sx={{ fontWeight: 700, fontSize: '0.9rem', color: colors.white, lineHeight: 1.25, whiteSpace: 'nowrap' }}
              >
                Soutrali Deals
              </Typography>
              <Typography
                sx={{ fontWeight: 400, fontSize: '0.65rem', color: alpha(colors.white, 0.55), letterSpacing: '0.07em', textTransform: 'uppercase' }}
              >
                Administration
              </Typography>
            </Box>
          )}
        </Box>

        <Divider sx={{ borderColor: alpha(colors.white, 0.08), mx: open ? 1.5 : 0.75 }} />

        <Box sx={{ flexGrow: 1, overflowY: 'auto', overflowX: 'hidden', py: 1.5 }}>
          <MainListItems sidebarOpen={open} />
        </Box>

        <Divider sx={{ borderColor: alpha(colors.white, 0.08), mx: open ? 1.5 : 0.75 }} />

        <Box sx={{ p: open ? 1.5 : 1, flexShrink: 0 }}>
          <Tooltip title={open ? '' : 'Se déconnecter'} placement="right" arrow>
            <Box
              onClick={handleLogout}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                p: 1,
                borderRadius: 2,
                cursor: 'pointer',
                overflow: 'hidden',
                transition: 'background 150ms',
                '&:hover': { backgroundColor: alpha(colors.white, 0.08) },
              }}
            >
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: colors.emerald,
                  fontSize: 13,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {account.initials}
              </Avatar>
              {open && (
                <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
                  <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: colors.white, lineHeight: 1.2 }} noWrap>
                    {account.displayName}
                  </Typography>
                  <Typography sx={{ fontSize: '0.68rem', color: alpha(colors.white, 0.5) }} noWrap>
                    {account.roleLabel}
                  </Typography>
                </Box>
              )}
              {open && (
                <LogoutIcon sx={{ fontSize: 16, color: alpha(colors.white, 0.45), flexShrink: 0 }} />
              )}
            </Box>
          </Tooltip>
        </Box>
      </Drawer>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          minWidth: 0,
          ml: `${drawerW}px`,
          transition: 'margin-left 200ms',
        }}
      >
        <AdminTopbar
          sidebarOpen={open}
          onToggleSidebar={() => setOpen(!open)}
          pageTitle={pageTitle}
          pageDescription={pageDescription}
          onLogout={handleLogout}
        />

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: { xs: 2, sm: 3 },
            overflowY: 'auto',
          }}
        >
          <Box sx={{ maxWidth: 1600, mx: 'auto' }}>
            <AppRouter />
          </Box>
        </Box>

        <Box
          sx={{
            px: 3,
            py: 1.25,
            borderTop: `1px solid ${colors.border}`,
            backgroundColor: colors.bgCard,
            flexShrink: 0,
          }}
        >
          <Typography variant="caption" color="text.disabled">
            © {new Date().getFullYear()} Soutrali Deals — Administration
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
