import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh';

interface AdminErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const AdminErrorState: React.FC<AdminErrorStateProps> = ({
  title = 'Une erreur est survenue',
  message,
  onRetry,
}) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      py: 8,
      gap: 1.5,
    }}
  >
    <ErrorOutlineIcon sx={{ fontSize: 48, color: 'error.light' }} />
    <Typography variant="body1" sx={{ fontWeight: 500 }}>
      {title}
    </Typography>
    {message && (
      <Typography variant="body2" color="text.disabled" align="center" sx={{ maxWidth: 340 }}>
        {message}
      </Typography>
    )}
    {onRetry && (
      <Button
        variant="outlined"
        size="small"
        startIcon={<RefreshIcon />}
        onClick={onRetry}
        sx={{ mt: 1 }}
      >
        Réessayer
      </Button>
    )}
  </Box>
);
