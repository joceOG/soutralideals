/**
 * ListItems.tsx — Navigation sidebar Soutrali Admin 2026
 */
import * as React from 'react';
import { Typography, Box, Collapse, List } from '@mui/material';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import { Link, useLocation } from 'react-router-dom';
import { alpha } from '@mui/material/styles';
import { colors } from '../tokens/colors';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import Badge from '@mui/material/Badge';
import Tooltip from '@mui/material/Tooltip';
import {
  useAdminNavigationBadges,
  NAV_BADGE_A11Y_LABELS,
  NavigationBadgeTone,
} from '../context/AdminNavigationContext';
import { NavigationBadgeKey } from '../services/navigationSummaryService';
import {
  AdminNavigationItem,
  getSidebarNavigationGroups,
} from '../config/adminNavigation';

interface NavItem {
  title: string;
  path: string;
  icon: React.ReactElement;
  exact?: boolean;
  children?: NavItem[];
  badgeKey?: NavigationBadgeKey;
  badgeTone?: NavigationBadgeTone;
}

function configItemToNavItem(item: AdminNavigationItem): NavItem {
  const Icon = item.icon;
  return {
    title: item.label,
    path: item.path,
    icon: <Icon />,
    exact: item.exact,
    badgeKey: item.badgeKey,
    badgeTone: item.badgeTone,
    children: item.children?.map(configItemToNavItem),
  };
}

const itemBase = {
  mx: '6px',
  my: '2px',
  borderRadius: '8px',
  minHeight: 38,
  transition: 'background 150ms',
  position: 'relative' as const,
  overflow: 'visible' as const,
};

function itemSx(active: boolean) {
  return {
    ...itemBase,
    color: active ? colors.white : alpha(colors.white, 0.65),
    backgroundColor: active ? alpha(colors.emerald, 0.18) : 'transparent',
    '&:hover': {
      backgroundColor: active ? alpha(colors.emerald, 0.22) : alpha(colors.white, 0.07),
      color: colors.white,
    },
    '&::before': active
      ? {
        content: '""',
        position: 'absolute',
        left: '-6px',
        top: '20%',
        height: '60%',
        width: '3px',
        borderRadius: '0 3px 3px 0',
        backgroundColor: colors.emerald,
      }
      : {},
    '& .MuiListItemIcon-root': {
      color: active ? colors.emerald : alpha(colors.white, 0.55),
      minWidth: 34,
      '& .MuiSvgIcon-root': { fontSize: '1.15rem' },
    },
    '& .MuiListItemText-primary': {
      fontSize: '0.855rem',
      fontWeight: active ? 600 : 400,
      letterSpacing: active ? '0.01em' : 0,
    },
  };
}

function SectionLabel({ label }: { label: string }) {
  if (!label) return null;
  return (
    <Typography
      sx={{
        px: '14px',
        pt: '14px',
        pb: '4px',
        fontSize: '0.62rem',
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: alpha(colors.white, 0.35),
        userSelect: 'none',
      }}
    >
      {label}
    </Typography>
  );
}

function badgeToneColors(tone: NavigationBadgeTone) {
  switch (tone) {
    case 'danger':
      return { bg: colors.error, fg: colors.white };
    case 'info':
      return { bg: alpha(colors.white, 0.22), fg: colors.white };
    default:
      return { bg: colors.warning, fg: colors.white };
  }
}

function formatBadgeDisplay(count: number): string {
  return count > 99 ? '99+' : String(count);
}

function NavListItemIcon({
  icon,
  badgeKey,
  badgeTone = 'warning',
  sidebarOpen,
}: {
  icon: React.ReactElement;
  badgeKey?: NavigationBadgeKey;
  badgeTone?: NavigationBadgeTone;
  sidebarOpen: boolean;
}) {
  const { getBadgeCount } = useAdminNavigationBadges();
  const count = badgeKey ? getBadgeCount(badgeKey) : null;
  const visible = count !== null && count > 0;

  if (!visible || sidebarOpen) {
    return <ListItemIcon>{icon}</ListItemIcon>;
  }

  const display = formatBadgeDisplay(count);
  const a11y = badgeKey ? NAV_BADGE_A11Y_LABELS[badgeKey](count) : '';
  const { bg, fg } = badgeToneColors(badgeTone);

  return (
    <ListItemIcon>
      <Badge
        badgeContent={display}
        overlap="circular"
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        aria-label={a11y}
        sx={{
          '& .MuiBadge-badge': {
            fontSize: '0.6rem',
            fontWeight: 700,
            height: 16,
            minWidth: 16,
            padding: '0 4px',
            backgroundColor: bg,
            color: fg,
          },
        }}
      >
        {icon}
      </Badge>
    </ListItemIcon>
  );
}

function NavInlineBadge({
  badgeKey,
  badgeTone = 'warning',
  sidebarOpen,
}: {
  badgeKey?: NavigationBadgeKey;
  badgeTone?: NavigationBadgeTone;
  sidebarOpen: boolean;
}) {
  const { getBadgeCount } = useAdminNavigationBadges();
  if (!sidebarOpen || !badgeKey) return null;

  const count = getBadgeCount(badgeKey);
  if (count === null || count <= 0) return null;

  const display = formatBadgeDisplay(count);
  const a11y = NAV_BADGE_A11Y_LABELS[badgeKey](count);
  const { bg, fg } = badgeToneColors(badgeTone);

  return (
    <Tooltip title={a11y} placement="right" arrow describeChild>
      <Box
        component="span"
        role="status"
        aria-label={a11y}
        sx={{
          ml: 'auto',
          flexShrink: 0,
          minWidth: 20,
          height: 20,
          px: count > 99 ? 0.5 : 0.75,
          borderRadius: '10px',
          backgroundColor: bg,
          color: fg,
          fontSize: '0.68rem',
          fontWeight: 700,
          lineHeight: '20px',
          textAlign: 'center',
        }}
      >
        {display}
      </Box>
    </Tooltip>
  );
}

export interface MainListItemsProps {
  sidebarOpen?: boolean;
}

export const MainListItems = ({ sidebarOpen = true }: MainListItemsProps) => {
  const location = useLocation();
  const [expanded, setExpanded] = React.useState<string[]>([]);
  const groups = React.useMemo(() => getSidebarNavigationGroups(), []);

  const isActive = (path: string, exact = false) => {
    if (exact) return location.pathname === path;
    return (location.pathname.startsWith(path) && path !== '/') || location.pathname === path;
  };

  const toggle = (key: string) =>
    setExpanded((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]));

  const renderItem = (item: NavItem) => {
    const active = isActive(item.path, item.exact);
    const expandable = Boolean(item.children);
    const isExpanded = expanded.includes(item.path);

    return (
      <React.Fragment key={item.path}>
        {expandable ? (
          <ListItemButton onClick={() => toggle(item.path)} selected={active} sx={itemSx(active)}>
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.title} />
            {isExpanded ? (
              <ExpandLess sx={{ fontSize: 16, color: alpha(colors.white, 0.4) }} />
            ) : (
              <ExpandMore sx={{ fontSize: 16, color: alpha(colors.white, 0.4) }} />
            )}
          </ListItemButton>
        ) : (
          <ListItemButton
            component={Link}
            to={item.path}
            selected={active}
            sx={{ ...itemSx(active), ...(item.badgeKey ? { pr: 1 } : {}) }}
          >
            <NavListItemIcon
              icon={item.icon}
              badgeKey={item.badgeKey}
              badgeTone={item.badgeTone}
              sidebarOpen={sidebarOpen}
            />
            <ListItemText primary={item.title} />
            <NavInlineBadge
              badgeKey={item.badgeKey}
              badgeTone={item.badgeTone}
              sidebarOpen={sidebarOpen}
            />
          </ListItemButton>
        )}

        {expandable && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding sx={{ pl: 1 }}>
              {item.children!.map((child) => {
                const childActive = isActive(child.path);
                return (
                  <ListItemButton
                    key={child.path}
                    component={Link}
                    to={child.path}
                    selected={childActive}
                    sx={{ ...itemSx(childActive), ...(child.badgeKey ? { pr: 1 } : {}) }}
                  >
                    <NavListItemIcon
                      icon={child.icon}
                      badgeKey={child.badgeKey}
                      badgeTone={child.badgeTone}
                      sidebarOpen={sidebarOpen}
                    />
                    <ListItemText primary={child.title} />
                    <NavInlineBadge
                      badgeKey={child.badgeKey}
                      badgeTone={child.badgeTone}
                      sidebarOpen={sidebarOpen}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  return (
    <>
      {groups.map((group) => (
        <React.Fragment key={group.section}>
          <SectionLabel label={group.label} />
          {group.items.map((configItem) => renderItem(configItemToNavItem(configItem)))}
        </React.Fragment>
      ))}
    </>
  );
};
