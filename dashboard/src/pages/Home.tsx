import React from 'react';
import { Typography } from '@mui/material';

const Home: React.FC = () => {
  return (
    <div>
      <Typography variant="h4" gutterBottom>
        Accueil
      </Typography>
      <Typography variant="body1">
       Bienvenue sur le Dashboard de Soutrali DEALS
      </Typography>
    </div>
  );
};

export default Home;