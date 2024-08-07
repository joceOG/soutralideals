import React from 'react';
import { Typography } from '@mui/material';

const Article: React.FC = () => {
  return (
    <div>
      <Typography variant="h4" gutterBottom>
        Articles
      </Typography>
      <Typography variant="body1">
        Liste des ARticles
      </Typography>
    </div>
  );
};

export default Article;