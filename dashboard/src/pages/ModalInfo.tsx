import React from 'react';
import { Dialog, DialogActions, DialogContent, DialogTitle, Button, Typography, Box } from '@mui/material';

interface ModalInfoProps {
  open: boolean;
  onClose: () => void;
  modalData: {
    cni1: string;
    cni2: string;
    selfie: string;
  } | null;
}

const ModalInfo: React.FC<ModalInfoProps> = ({ open, onClose, modalData }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Informations sur le Prestataire</DialogTitle>
      <DialogContent>
        {modalData ? (
          <Box>
            <Typography variant="h6">CNI 1 :</Typography>
            <Box mb={2}>
              {modalData.cni1 ? (
                <img
                  src={`data:image/jpeg;base64,${modalData.cni1}`}
                  alt="CNI 1"
                  style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                />
              ) : (
                <Typography>Aucune image de CNI 1 disponible.</Typography>
              )}
            </Box>

            <Typography variant="h6">CNI 2 :</Typography>
            <Box mb={2}>
              {modalData.cni2 ? (
                <img
                  src={`data:image/jpeg;base64,${modalData.cni2}`}
                  alt="CNI 2"
                  style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                />
              ) : (
                <Typography>Aucune image de CNI 2 disponible.</Typography>
              )}
            </Box>

            <Typography variant="h6">Selfie :</Typography>
            <Box mb={2}>
              {modalData.selfie ? (
                <img
                  src={`data:image/jpeg;base64,${modalData.selfie}`}
                  alt="Selfie"
                  style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                />
              ) : (
                <Typography>Aucune image de selfie disponible.</Typography>
              )}
            </Box>
          </Box>
        ) : (
          <Typography>Pas de données disponibles.</Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ModalInfo;
