import React from 'react';
import { Box, Typography } from '@mui/material';

/**
 * Page Commande (Gestion des commandes)
 * À compléter avec la logique métier (liste des commandes, détails, etc.)
 */
const Commande: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Gestion des commandes
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Cette page est en construction. Vous pourrez bientôt gérer les commandes ici.
      </Typography>
    </Box>
  );
};

export default Commande;
