import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Apropos from '../pages/Apropos';
import Accueil from '../pages/Accueil';
import Prestataire from '../pages/Prestataire';
import Inscription from '../pages/Inscription';
import Connexion from '../pages/Connexion';
import DetailsMetiers from '../pages/DetailsMetiers';
import Ecommerce from '../pages/Ecommerce';

const AppRouter: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Accueil />} />
        <Route path="/Apropos" element={<Apropos />} />
        <Route path="/Prestataire" element={<Prestataire />} />
        <Route path="/Inscription" element={<Inscription />} />
        <Route path="/Connexion" element={<Connexion/>} />
        <Route path="/DetailsMetiers" element={<DetailsMetiers/>} />
        <Route path="/Ecommerce" element={<Ecommerce/>} />
      </Routes>
    </Router>
  );
};

export default AppRouter;
