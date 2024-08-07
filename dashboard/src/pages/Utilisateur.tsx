import React from 'react';
import { Typography } from '@mui/material';

const Utilisateur: React.FC = () => {
  return (
    <div>
      <Typography variant="h4" gutterBottom>
        Utilisateurs
      </Typography>
      <Typography variant="body1">
        Liste des Utilisateurs
      </Typography>
    </div>
  );
};

export default Utilisateur;