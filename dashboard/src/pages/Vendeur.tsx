import React from 'react';
import { Box, Typography } from '@mui/material';

/**
 * Page Vendeur (Gestion des vendeurs)
 * À compléter avec la logique métier (liste des vendeurs, profils, etc.)
 */
const Vendeur: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Gestion des vendeurs
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Cette page est en construction. Vous pourrez bientôt gérer les vendeurs ici.
      </Typography>
    </Box>
  );
};

export default Vendeur;
