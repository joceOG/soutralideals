// Par exemple, dans le fichier src/Home.tsx

import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

const Accueil: React.FC = () => {
  return (
    <div>
      <Navbar></Navbar>
      <br></br>
      <br></br>
      <h2>Page d'accueil</h2>
      <Link to="/Apropos">Aller à la page À propos</Link>
    </div>
  );
}

export default Accueil;