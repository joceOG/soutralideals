import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Apropos from '../pages/Apropos';
import Accueil from '../pages/Accueil';
import Prestataire from '../pages/Prestataire';


const AppRouter: React.FC = () => {
  return (
    <Router>
        <Routes>
        <Route path ="/" element={<Accueil />} />
        <Route path="/Apropos" element={<Apropos />} />
        <Route path="/Prestataire" element={<Prestataire />} />
        </Routes>
    </Router>
  );
};

export default AppRouter;