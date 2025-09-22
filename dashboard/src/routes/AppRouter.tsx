import React from 'react';
import { Route, Routes } from 'react-router-dom';
import Home from '../pages/Home';
import Groupe from '../pages/Groupe';
import Categorie from '../pages/Categorie';
import Service from '../pages/Service';
import Article from '../pages/Article';
import Prestataire from '../pages/Prestataire';
import Freelance from '../pages/Freelance';
import Vendeur from '../pages/Vendeur';
import Utilisateur from '../pages/Utilisateur';
import Connexion from '../pages/Connexion';
// ✅ NOUVEAUX IMPORTS POUR LES MODULES AJOUTÉS
import Commandes from '../pages/Commandes';
import Notifications from '../pages/Notifications';
import Messages from '../pages/Messages';
import Prestations from '../pages/Prestations';

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
      <Route path="/freelance" element={<Freelance />} />
      <Route path="/vendeur" element={<Vendeur />} />
      <Route path="/connexion" element={<Connexion />} />
      
      {/* ✅ NOUVELLES ROUTES POUR LES MODULES AJOUTÉS */}
      <Route path="/commandes" element={<Commandes />} />
      <Route path="/notifications" element={<Notifications />} />
      <Route path="/messages" element={<Messages />} />
      
      {/* ✅ PRESTATIONS MODULE COMPLET */}
      <Route path="/prestations" element={<Prestations />} />
      
      {/* 🚧 ROUTES À VENIR (pages temporaires ou placeholders) */}
      <Route path="/paiements" element={<div>Module Paiements - En cours de développement</div>} />
      <Route path="/avis" element={<div>Module Avis & Notes - En cours de développement</div>} />
      <Route path="/signalements" element={<div>Module Signalements - En cours de développement</div>} />
      <Route path="/verifications" element={<div>Module Vérifications - En cours de développement</div>} />
      <Route path="/statistiques" element={<div>Module Statistiques - En cours de développement</div>} />
      <Route path="/parametres" element={<div>Module Paramètres - En cours de développement</div>} />
      <Route path="/support" element={<div>Module Support - En cours de développement</div>} />
    </Routes>
  );
};

export default AppRouter;
