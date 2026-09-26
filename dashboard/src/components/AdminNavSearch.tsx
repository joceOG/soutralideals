import * as React from 'react';
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Popper,
  TextField,
  Typography,
  ClickAwayListener,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import { useNavigate } from 'react-router-dom';
import { alpha } from '@mui/material/styles';
import { colors } from '../tokens/colors';
import {
  ADMIN_NAV_SECTION_LABELS,
  AdminNavigationItem,
  filterAdminNavSearch,
} from '../config/adminNavigation';

interface AdminNavSearchProps {
  /** Sur desktop : champ inline dans la topbar. */
  variant: 'inline' | 'dialog-trigger';
  onDialogOpenChange?: (open: boolean) => void;
}

function NavSearchResults({
  results,
  highlightIndex,
  onSelect,
  listId,
}: {
  results: AdminNavigationItem[];
  highlightIndex: number;
  onSelect: (item: AdminNavigationItem) => void;
  listId: string;
}) {
  if (results.length === 0) {
    return (
      <Box sx={{ px: 2, py: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Aucun résultat
        </Typography>
      </Box>
    );
  }

  return (
    <List dense id={listId} role="listbox" aria-label="Résultats de recherche">
      {results.map((item, index) => {
        const Icon = item.icon;
        return (
          <ListItemButton
            key={item.key}
            role="option"
            aria-selected={index === highlightIndex}
            selected={index === highlightIndex}
            onClick={() => onSelect(item)}
            sx={{
              py: 1,
              '&.Mui-selected': { backgroundColor: alpha(colors.primary, 0.08) },
            }}
          >
            <ListItemIcon sx={{ minWidth: 36, color: colors.primary }}>
              <Icon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={item.label}
              secondary={ADMIN_NAV_SECTION_LABELS[item.section]}
              primaryTypographyProps={{ fontWeight: 600, fontSize: '0.875rem' }}
              secondaryTypographyProps={{ fontSize: '0.72rem' }}
            />
          </ListItemButton>
        );
      })}
    </List>
  );
}

export function AdminNavSearch({ variant, onDialogOpenChange }: AdminNavSearchProps) {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobileDialog = useMediaQuery(theme.breakpoints.down('md'));
  const useDialog = variant === 'dialog-trigger' || isMobileDialog;

  const [query, setQuery] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [highlightIndex, setHighlightIndex] = React.useState(0);
  const anchorRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const results = React.useMemo(() => filterAdminNavSearch(query), [query]);
  const listId = 'admin-nav-search-results';

  const closeAll = React.useCallback(() => {
    setOpen(false);
    setQuery('');
    setHighlightIndex(0);
    onDialogOpenChange?.(false);
  }, [onDialogOpenChange]);

  const goTo = React.useCallback(
    (item: AdminNavigationItem) => {
      navigate(item.path);
      closeAll();
    },
    [navigate, closeAll],
  );

  React.useEffect(() => {
    setHighlightIndex(0);
  }, [query]);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (useDialog) {
          setOpen(true);
          onDialogOpenChange?.(true);
          window.setTimeout(() => inputRef.current?.focus(), 50);
        } else {
          inputRef.current?.focus();
          setOpen(true);
        }
        return;
      }

      if (!open && !useDialog) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        closeAll();
        return;
      }

      if (results.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && open) {
        e.preventDefault();
        const item = results[highlightIndex];
        if (item) goTo(item);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, results, highlightIndex, goTo, closeAll, useDialog, onDialogOpenChange]);

  const searchField = (
    <TextField
      inputRef={inputRef}
      size="small"
      fullWidth
      value={query}
      onChange={(e) => {
        setQuery(e.target.value);
        setOpen(true);
      }}
      onFocus={() => setOpen(true)}
      placeholder="Rechercher une page ou une action…"
      aria-label="Rechercher une page ou une action"
      aria-expanded={open}
      aria-controls={open ? listId : undefined}
      aria-autocomplete="list"
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon sx={{ fontSize: 20, color: colors.textMuted }} />
          </InputAdornment>
        ),
        endAdornment: (
          <InputAdornment position="end">
            <Typography
              component="span"
              variant="caption"
              sx={{
                display: { xs: 'none', sm: 'inline' },
                color: colors.textMuted,
                border: `1px solid ${colors.border}`,
                borderRadius: 1,
                px: 0.75,
                py: 0.25,
                fontSize: '0.65rem',
                bgcolor: colors.bgWarm,
              }}
            >
              Ctrl+K
            </Typography>
          </InputAdornment>
        ),
        sx: {
          minHeight: 40,
          borderRadius: 2,
          backgroundColor: colors.bgWarm,
          fontSize: '0.875rem',
          '& fieldset': { borderColor: colors.border },
          '&:hover fieldset': { borderColor: alpha(colors.primary, 0.35) },
          '&.Mui-focused fieldset': { borderColor: colors.primary },
        },
      }}
    />
  );

  if (useDialog && variant === 'dialog-trigger') {
    return (
      <>
        <IconButton
          aria-label="Ouvrir la recherche"
          onClick={() => {
            setOpen(true);
            onDialogOpenChange?.(true);
          }}
          sx={{
            width: 40,
            height: 40,
            color: colors.textSecondary,
            border: `1px solid ${colors.border}`,
            borderRadius: 2,
            bgcolor: colors.bgWarm,
          }}
        >
          <SearchIcon fontSize="small" />
        </IconButton>
        <Dialog open={open} onClose={closeAll} fullWidth maxWidth="sm">
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
            Recherche
            <IconButton aria-label="Fermer" onClick={closeAll} size="small">
              <CloseIcon fontSize="small" />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ pt: 0 }}>
            {searchField}
            <Paper elevation={0} sx={{ mt: 1.5, border: `1px solid ${colors.border}`, borderRadius: 2 }}>
              <NavSearchResults
                results={results}
                highlightIndex={highlightIndex}
                onSelect={goTo}
                listId={listId}
              />
            </Paper>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <Box ref={anchorRef} sx={{ width: '100%', maxWidth: { md: 380, lg: 420 }, minWidth: 0 }}>
      {searchField}
      <Popper
        open={open && query.length > 0}
        anchorEl={anchorRef.current}
        placement="bottom"
        style={{ width: anchorRef.current?.offsetWidth, zIndex: 1300 }}
      >
        <ClickAwayListener onClickAway={() => setOpen(false)}>
          <Paper
            elevation={2}
            sx={{
              mt: 0.5,
              border: `1px solid ${colors.border}`,
              borderRadius: 2,
              maxHeight: 320,
              overflow: 'auto',
            }}
          >
            <NavSearchResults
              results={results}
              highlightIndex={highlightIndex}
              onSelect={goTo}
              listId={listId}
            />
          </Paper>
        </ClickAwayListener>
      </Popper>
    </Box>
  );
}
