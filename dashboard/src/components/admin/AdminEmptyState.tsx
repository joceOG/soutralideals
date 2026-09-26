import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import InboxIcon from '@mui/icons-material/Inbox';

interface AdminEmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const AdminEmptyState: React.FC<AdminEmptyStateProps> = ({
  title = 'Aucun résultat',
  description,
  actionLabel,
  onAction,
  icon,
}) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      py: 8,
      gap: 1.5,
      color: 'text.disabled',
    }}
  >
    {icon ?? <InboxIcon sx={{ fontSize: 48, opacity: 0.4 }} />}
    <Typography variant="body1" sx={{ fontWeight: 500 }}>
      {title}
    </Typography>
    {description && (
      <Typography variant="body2" color="text.disabled" align="center" sx={{ maxWidth: 340 }}>
        {description}
      </Typography>
    )}
    {actionLabel && onAction && (
      <Button variant="outlined" size="small" onClick={onAction} sx={{ mt: 1 }}>
        {actionLabel}
      </Button>
    )}
  </Box>
);
