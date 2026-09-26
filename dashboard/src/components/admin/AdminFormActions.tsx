import React from 'react';
import { Box, Button, CircularProgress } from '@mui/material';
import { colors } from '../../tokens/colors';

export interface AdminFormActionsProps {
  onBack?: () => void;
  onNext?: () => void;
  onSubmit?: () => void;
  backLabel?: string;
  nextLabel?: string;
  submitLabel?: string;
  showBack?: boolean;
  showNext?: boolean;
  showSubmit?: boolean;
  loading?: boolean;
  disableNext?: boolean;
  disableSubmit?: boolean;
}

export const AdminFormActions: React.FC<AdminFormActionsProps> = ({
  onBack,
  onNext,
  onSubmit,
  backLabel = 'Précédent',
  nextLabel = 'Continuer',
  submitLabel = 'Enregistrer',
  showBack = true,
  showNext = false,
  showSubmit = false,
  loading = false,
  disableNext = false,
  disableSubmit = false,
}) => (
  <Box
    sx={{
      position: 'sticky',
      bottom: 0,
      left: 0,
      right: 0,
      display: 'flex',
      gap: 1,
      justifyContent: 'flex-end',
      flexWrap: 'wrap',
      py: 2,
      px: { xs: 0, sm: 1 },
      mt: 2,
      bgcolor: colors.bgCard,
      borderTop: `1px solid ${colors.border}`,
      zIndex: 2,
    }}
  >
    {showBack && onBack ? (
      <Button variant="outlined" onClick={onBack} disabled={loading} sx={{ borderRadius: '10px' }}>
        {backLabel}
      </Button>
    ) : null}
    {showNext && onNext ? (
      <Button
        variant="contained"
        onClick={onNext}
        disabled={loading || disableNext}
        sx={{ borderRadius: '10px' }}
      >
        {nextLabel}
      </Button>
    ) : null}
    {showSubmit && onSubmit ? (
      <Button
        variant="contained"
        onClick={onSubmit}
        disabled={loading || disableSubmit}
        startIcon={loading ? <CircularProgress size={18} color="inherit" /> : undefined}
        sx={{ borderRadius: '10px', minWidth: 180 }}
      >
        {loading ? 'Enregistrement…' : submitLabel}
      </Button>
    ) : null}
  </Box>
);
