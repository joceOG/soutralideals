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
// ✅ NOUVELLES PAGES CRÉÉES
import Promotions from '../pages/Promotions';
import Paiements from '../pages/Paiements';
import Statistiques from '../pages/Statistiques';
import Avis from '../pages/Avis';
import Favoris from '../pages/Favoris';
import Historique from '../pages/Historique';
// ✅ GOOGLE MAPS COMPONENTS
import PrestatairesMap from '../components/GoogleMaps/PrestatairesMap';
import VendeursMap from '../components/GoogleMaps/VendeursMap';
import FreelancesMap from '../components/GoogleMaps/FreelancesMap';
import GeographicAnalytics from '../components/GoogleMaps/GeographicAnalytics';
import Parametres from '../pages/Parametres/Parametres';
import ImportPrestataires from '../pages/ImportPrestataires';

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
      <Route path="/import-prestataires" element={<ImportPrestataires />} />
      <Route path="/freelance" element={<Freelance />} />
      <Route path="/vendeur" element={<Vendeur />} />
      <Route path="/connexion" element={<Connexion />} />
      
      {/* ✅ NOUVELLES ROUTES POUR LES MODULES AJOUTÉS */}
      <Route path="/commandes" element={<Commandes />} />
      <Route path="/notifications" element={<Notifications />} />
      <Route path="/messages" element={<Messages />} />
      
      {/* ✅ PRESTATIONS MODULE COMPLET */}
      <Route path="/prestations" element={<Prestations />} />
      
      {/* ✅ NOUVELLES PAGES CRÉÉES */}
      <Route path="/promotions" element={<Promotions />} />
      <Route path="/paiements" element={<Paiements />} />
      <Route path="/statistiques" element={<Statistiques />} />
      
      {/* ✅ GOOGLE MAPS ROUTES */}
      <Route path="/prestataires-map" element={<PrestatairesMap />} />
      <Route path="/vendeurs-map" element={<VendeursMap />} />
      <Route path="/freelances-map" element={<FreelancesMap />} />
      <Route path="/geographic-analytics" element={<GeographicAnalytics />} />
      
      {/* ✅ MODULES QUALITÉ & MODÉRATION */}
      <Route path="/avis" element={<Avis />} />
      <Route path="/favoris" element={<Favoris />} />
      <Route path="/historique" element={<Historique />} />
      
      {/* ✅ PAGES CONFIGURÉES */}
      <Route path="/parametres" element={<Parametres />} />
      
      {/* 🚧 ROUTES À VENIR (pages temporaires ou placeholders) */}
      <Route path="/signalements" element={<div>Module Signalements - En cours de développement</div>} />
      <Route path="/verifications" element={<div>Module Vérifications - En cours de développement</div>} />
      <Route path="/support" element={<div>Module Support - En cours de développement</div>} />
    </Routes>
  );
};

export default AppRouter;
