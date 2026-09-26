import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  CircularProgress,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { colors } from '../../tokens/colors';

interface AdminConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  /** Libellé du bouton de confirmation (défaut : « Confirmer ») */
  confirmLabel?: string;
  /** 'danger' pour action destructive, 'warning' pour prudence */
  severity?: 'danger' | 'warning' | 'info';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const AdminConfirmDialog: React.FC<AdminConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel = 'Confirmer',
  severity = 'info',
  loading = false,
  onConfirm,
  onCancel,
}) => {
  const confirmColor = severity === 'danger' ? 'error' : severity === 'warning' ? 'warning' : 'primary';

  return (
    <Dialog open={open} onClose={loading ? undefined : onCancel} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {(severity === 'danger' || severity === 'warning') && (
          <WarningAmberIcon color={confirmColor} />
        )}
        {title}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel} disabled={loading} color="inherit">
          Annuler
        </Button>
        <Button
          variant="contained"
          color={confirmColor}
          onClick={onConfirm}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {loading ? 'En cours…' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
