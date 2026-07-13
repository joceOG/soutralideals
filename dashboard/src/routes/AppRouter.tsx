import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Home from '../pages/Home';
import Groupe from '../pages/Groupe';
import Categorie from '../pages/Categorie';
import Service from '../pages/Service';
import Article from '../pages/Article';
import Prestataire from '../pages/Prestataire';
import Freelance from '../pages/Freelance';
import FreelanceServices from '../pages/FreelanceServices';
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
// ✅ OPTION C - Page validation recensements SDEALSIDENTIFICATION
import RecensementsPending from '../pages/RecensementsPending';
import ProtectedRoute from '../components/ProtectedRoute';

const withAuth = (element: React.ReactElement) => (
  <ProtectedRoute>{element}</ProtectedRoute>
);

// Ce composant ne contient que les routes, sans le BrowserRouter
// Le BrowserRouter est maintenant dans Dashboard.tsx
const AppRouter: React.FC = () => {
  return (
    <Routes>
      <Route path="/connexion" element={<Connexion />} />
      
      {/* ✅ Routes protégées — JWT requis */}
      <Route path="/" element={withAuth(<Home />)} />
      <Route path="/groupe" element={withAuth(<Groupe />)} />
      <Route path="/categorie" element={withAuth(<Categorie />)} />
      <Route path="/service" element={withAuth(<Service />)} />
      <Route path="/article" element={withAuth(<Article />)} />
      <Route path="/utilisateur" element={withAuth(<Utilisateur />)} />
      <Route path="/prestataire" element={withAuth(<Prestataire />)} />
      <Route path="/import-prestataires" element={withAuth(<ImportPrestataires />)} />
      <Route path="/freelance" element={withAuth(<Freelance />)} />
      <Route path="/freelance-offres" element={withAuth(<FreelanceServices />)} />
      <Route path="/vendeur" element={withAuth(<Vendeur />)} />
      <Route path="/commandes" element={withAuth(<Commandes />)} />
      <Route path="/notifications" element={withAuth(<Notifications />)} />
      <Route path="/messages" element={withAuth(<Messages />)} />
      <Route path="/prestations" element={withAuth(<Prestations />)} />
      <Route path="/promotions" element={withAuth(<Promotions />)} />
      <Route path="/paiements" element={withAuth(<Paiements />)} />
      <Route path="/statistiques" element={withAuth(<Statistiques />)} />
      <Route path="/prestataires-map" element={withAuth(<PrestatairesMap />)} />
      <Route path="/vendeurs-map" element={withAuth(<VendeursMap />)} />
      <Route path="/freelances-map" element={withAuth(<FreelancesMap />)} />
      <Route path="/geographic-analytics" element={withAuth(<GeographicAnalytics />)} />
      <Route path="/avis" element={withAuth(<Avis />)} />
      <Route path="/favoris" element={withAuth(<Favoris />)} />
      <Route path="/historique" element={withAuth(<Historique />)} />
      <Route path="/parametres" element={withAuth(<Parametres />)} />
      <Route path="/recensements-pending" element={withAuth(<RecensementsPending />)} />
      
      {/* Legacy redirect */}
      <Route path="/soutralideals" element={<Navigate to="/" replace />} />
      
      {/* 🚧 ROUTES À VENIR (pages temporaires ou placeholders) */}
      <Route path="/signalements" element={<div>Module Signalements - En cours de développement</div>} />
      <Route path="/verifications" element={<div>Module Vérifications - En cours de développement</div>} />
      <Route path="/support" element={<div>Module Support - En cours de développement</div>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRouter;