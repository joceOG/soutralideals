// Par exemple, dans le fichier src/Home.tsx

import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Box from '@mui/material/Box';
import FlexibleImage from '../components/flexibleImage/FlexibleImage';
import accueil from '../assets/accueil.jpg';
import SimpleSlider from '../components/SImpleSlider';

const Accueil: React.FC = () => {

  return (
    <div>
      <Navbar></Navbar>
      
      <div>
        <Box sx={{ mt:12 }}>
          <div className="textHome">
          <h3>Des centaines de services et autant de prestations de qualité .</h3>
          </div>
        </Box>

        <Box sx={{ mt:2 }} >
          <div className="imageAccueil">
          <FlexibleImage src={accueil} alt="Accueil" />
          </div>  
        </Box>

        <Box sx={{ mt:6, pr: 6 , pl : 6 }} >
          <SimpleSlider></SimpleSlider>

        </Box>

        <Box sx={{ mt:16 }} >
           <h2 >Page d'accueil</h2>
          <Link to="/Apropos">Aller à la page À propos</Link>
        </Box>
      
      </div>
      
    </div>
  );
}

export default Accueil;