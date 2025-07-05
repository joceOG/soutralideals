import React from 'react';
import { Route, Routes } from 'react-router-dom';
import Home from '../pages/Home';
import Groupe from '../pages/Groupe';
import Categorie from '../pages/Categorie';
import Service from '../pages/Service';
import Article from '../pages/Article';
import Prestataire from '../pages/Prestataire';
import Utilisateur from '../pages/Utilisateur';
import Connexion from '../pages/Connexion';

// Ce composant ne contient que les routes, sans le BrowserRouter
// Le BrowserRouter est maintenant dans Dashboard.tsx
const AppRouter: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/groupe" element={<Groupe />} />
      <Route path="/categorie" element={<Categorie />} />
      <Route path="/service" element={<Service />} />
      <Route path="/article" element={<Article />} />
      <Route path="/utilisateur" element={<Utilisateur />} />
      <Route path="/prestataire" element={<Prestataire />} />
      <Route path="/connexion" element={<Connexion />} />
    </Routes>
  );
};

export default AppRouter;
