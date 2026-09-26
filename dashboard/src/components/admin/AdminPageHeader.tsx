import React from 'react';
import { Box, Typography, Button, Divider, Skeleton } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';

interface AdminPageHeaderProps {
  title: string;
  subtitle?: string;
  /** Compteur affiché après le titre */
  count?: number;
  countLoading?: boolean;
  /** Libellé du bouton primaire (ex. « Ajouter un prestataire ») */
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  /** Contenu libre (filtres, recherche…) injecté à droite */
  toolbar?: React.ReactNode;
}

export const AdminPageHeader: React.FC<AdminPageHeaderProps> = ({
  title,
  subtitle,
  count,
  countLoading,
  primaryActionLabel,
  onPrimaryAction,
  onRefresh,
  refreshing,
  toolbar,
}) => (
  <Box sx={{ mb: 3 }}>
    <Box
      sx={{
        display: 'flex',
        alignItems: { xs: 'flex-start', sm: 'center' },
        flexDirection: { xs: 'column', sm: 'row' },
        gap: 2,
        mb: subtitle ? 0.5 : 0,
      }}
    >
      {/* Titre + compteur */}
      <Box sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5 }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
          {countLoading ? (
            <Skeleton variant="text" width={40} height={24} />
          ) : count !== undefined ? (
            <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400 }}>
              {count.toLocaleString('fr-FR')}
            </Typography>
          ) : null}
        </Box>
      </Box>

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexShrink: 0 }}>
        {toolbar}
        {onRefresh && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={onRefresh}
            disabled={refreshing}
          >
            Actualiser
          </Button>
        )}
        {primaryActionLabel && onPrimaryAction && (
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={onPrimaryAction}
          >
            {primaryActionLabel}
          </Button>
        )}
      </Box>
    </Box>

    {subtitle && (
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        {subtitle}
      </Typography>
    )}

    <Divider sx={{ mt: 2 }} />
  </Box>
);
