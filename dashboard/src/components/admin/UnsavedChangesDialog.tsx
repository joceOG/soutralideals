import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';
import { AdminConfirmDialog } from './AdminConfirmDialog';

export interface UnsavedChangesDialogProps {
  open: boolean;
  onStay: () => void;
  onDiscard: () => void;
}

/** Alias léger autour du dialogue de confirmation existant. */
export const UnsavedChangesDialog: React.FC<UnsavedChangesDialogProps> = ({
  open,
  onStay,
  onDiscard,
}) => (
  <AdminConfirmDialog
    open={open}
    title="Modifications non enregistrées"
    message="Fermer le formulaire sans enregistrer ? Les changements seront perdus."
    severity="warning"
    confirmLabel="Quitter sans enregistrer"
    onConfirm={onDiscard}
    onCancel={onStay}
  />
);

/** Variante simple si besoin hors AdminConfirmDialog */
export const UnsavedChangesDialogBasic: React.FC<UnsavedChangesDialogProps> = ({
  open,
  onStay,
  onDiscard,
}) => (
  <Dialog open={open} onClose={onStay} maxWidth="xs" fullWidth>
    <DialogTitle>Modifications non enregistrées</DialogTitle>
    <DialogContent>
      <DialogContentText>
        Fermer le formulaire sans enregistrer ? Les changements seront perdus.
      </DialogContentText>
    </DialogContent>
    <DialogActions>
      <Button onClick={onStay}>Continuer la saisie</Button>
      <Button color="warning" variant="contained" onClick={onDiscard}>
        Quitter sans enregistrer
      </Button>
    </DialogActions>
  </Dialog>
);
