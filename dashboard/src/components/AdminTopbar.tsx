import * as React from 'react';
import {
  Avatar,
  Badge,
  Box,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import { useNavigate } from 'react-router-dom';
import { alpha } from '@mui/material/styles';
import { colors } from '../tokens/colors';
import { useAdminNavigationBadges } from '../context/AdminNavigationContext';
import { useAdminAccount } from '../hooks/useAdminAccount';
import { AdminNavSearch } from './AdminNavSearch';
import { TOPBAR_MIN_H } from '../constants/adminShellLayout';

export { TOPBAR_MIN_H, TOPBAR_H } from '../constants/adminShellLayout';

export interface AdminTopbarProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  pageTitle: string;
  pageDescription: string;
  onLogout: () => void | Promise<void>;
}

function formatNotifBadge(count: number | null): number | undefined {
  if (count === null || count <= 0) return undefined;
  return count;
}

export function AdminTopbar({
  sidebarOpen,
  onToggleSidebar,
  pageTitle,
  pageDescription,
  onLogout,
}: AdminTopbarProps) {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  const isSmUp = useMediaQuery(theme.breakpoints.up('sm'));
  const navigate = useNavigate();
  const { getBadgeCount } = useAdminNavigationBadges();
  const notifCount = getBadgeCount('notificationsUnread');
  const account = useAdminAccount();

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);

  const notifLabel =
    notifCount != null && notifCount > 0
      ? `${notifCount > 99 ? '99+' : notifCount} notification${notifCount > 1 ? 's' : ''} non lue${notifCount > 1 ? 's' : ''}`
      : 'Notifications';

  return (
    <Box
      component="header"
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 1100,
        minHeight: TOPBAR_MIN_H,
        display: 'flex',
        alignItems: 'center',
        flexWrap: { xs: 'wrap', md: 'nowrap' },
        px: { xs: 1.5, sm: 2, md: 3 },
        py: { xs: 1, md: 0 },
        gap: { xs: 1, md: 2 },
        backgroundColor: colors.topbarBg,
        borderBottom: `1px solid ${colors.topbarBorder}`,
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
      }}
    >
      {/* Gauche : toggle + titres */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          minWidth: 0,
          flex: { xs: '1 1 100%', md: '0 1 auto' },
          order: { xs: 1, md: 0 },
        }}
      >
        <Tooltip title={sidebarOpen ? 'Réduire le menu' : 'Développer le menu'} arrow>
          <IconButton
            onClick={onToggleSidebar}
            aria-label={sidebarOpen ? 'Réduire le menu' : 'Développer le menu'}
            sx={{
              width: 40,
              height: 40,
              color: colors.textSecondary,
              flexShrink: 0,
              '&:hover': { backgroundColor: colors.bgWarm },
            }}
          >
            {sidebarOpen ? <MenuOpenIcon fontSize="small" /> : <MenuIcon fontSize="small" />}
          </IconButton>
        </Tooltip>

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            component="h1"
            variant="h6"
            noWrap
            sx={{
              fontWeight: 700,
              color: colors.textPrimary,
              lineHeight: 1.2,
              fontSize: { xs: '1rem', sm: '1.15rem' },
            }}
          >
            {pageTitle}
          </Typography>
          {isMdUp && pageDescription ? (
            <Typography
              variant="body2"
              noWrap
              sx={{
                color: colors.textSecondary,
                fontSize: '0.8rem',
                mt: 0.25,
                display: { md: 'block', lg: 'block' },
              }}
            >
              {pageDescription}
            </Typography>
          ) : null}
        </Box>
      </Box>

      {/* Centre : recherche desktop / tablette large */}
      <Box
        sx={{
          flex: { md: '1 1 auto' },
          display: 'flex',
          justifyContent: 'center',
          minWidth: 0,
          order: { xs: 3, md: 1 },
          width: { xs: '100%', md: 'auto' },
          px: { xs: 0, md: 1 },
        }}
      >
        {isMdUp ? (
          <AdminNavSearch variant="inline" />
        ) : (
          <AdminNavSearch variant="dialog-trigger" />
        )}
      </Box>

      {/* Droite : notifications + profil */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 0.5, sm: 1 },
          flexShrink: 0,
          ml: { md: 'auto' },
          order: { xs: 2, md: 2 },
        }}
      >
        <Tooltip title={notifLabel} arrow>
          <IconButton
            aria-label={notifLabel}
            onClick={() => navigate('/notifications')}
            sx={{
              width: 40,
              height: 40,
              color: colors.textSecondary,
              '&:hover': { backgroundColor: colors.bgWarm },
            }}
          >
            <Badge
              badgeContent={formatNotifBadge(notifCount)}
              max={99}
              invisible={notifCount === null || notifCount <= 0}
              sx={{
                '& .MuiBadge-badge': {
                  backgroundColor: colors.error,
                  color: colors.white,
                  fontWeight: 700,
                  fontSize: '0.65rem',
                },
              }}
            >
              <NotificationsOutlinedIcon fontSize="small" />
            </Badge>
          </IconButton>
        </Tooltip>

        <Divider orientation="vertical" flexItem sx={{ borderColor: colors.border, mx: 0.25, display: { xs: 'none', sm: 'block' } }} />

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            cursor: 'pointer',
            borderRadius: 2,
            pl: 0.5,
            pr: isSmUp ? 1 : 0.5,
            py: 0.5,
            '&:hover': { backgroundColor: colors.bgWarm },
          }}
          onClick={(e) => setAnchorEl(e.currentTarget)}
          role="button"
          tabIndex={0}
          aria-haspopup="true"
          aria-expanded={menuOpen ? 'true' : 'false'}
          aria-controls={menuOpen ? 'topbar-account-menu' : undefined}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setAnchorEl(e.currentTarget as unknown as HTMLElement);
            }
          }}
        >
          <Avatar
            sx={{
              width: 40,
              height: 40,
              bgcolor: colors.forestGreen,
              fontSize: 13,
              fontWeight: 700,
              border: `2px solid ${colors.greenLight}`,
            }}
          >
            {account.initials}
          </Avatar>
          {isSmUp ? (
            <Box sx={{ minWidth: 0, display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="body2" noWrap sx={{ fontWeight: 600, color: colors.textPrimary, lineHeight: 1.2, maxWidth: 160 }}>
                {account.displayName}
              </Typography>
              <Typography variant="caption" noWrap sx={{ color: colors.textMuted, maxWidth: 160, display: 'block' }}>
                {account.roleLabel}
              </Typography>
            </Box>
          ) : null}
        </Box>

        <Menu
          id="topbar-account-menu"
          anchorEl={anchorEl}
          open={menuOpen}
          onClose={() => setAnchorEl(null)}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          slotProps={{
            paper: {
              elevation: 3,
              sx: { mt: 1, minWidth: 200, borderRadius: 2, border: `1px solid ${colors.border}` },
            },
          }}
        >
          <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${colors.border}` }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {account.displayName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {account.roleLabel}
            </Typography>
          </Box>
          <MenuItem
            onClick={async () => {
              setAnchorEl(null);
              await onLogout();
            }}
            sx={{ color: 'error.main', gap: 1.5, fontSize: '0.875rem', mt: 0.5 }}
          >
            <ListItemIcon sx={{ minWidth: 0 }}>
              <LogoutIcon fontSize="small" sx={{ color: 'error.main' }} />
            </ListItemIcon>
            Se déconnecter
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  );
}
