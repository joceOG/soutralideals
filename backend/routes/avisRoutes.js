import { Router } from 'express';
import multer from 'multer';
import {
  createAvis,
  getAllAvis,
  getAvisById,
  updateAvis,
  deleteAvis,
  getStatsObjet,
  marquerUtile,
  repondreAvis,
  signalerAvis,
  getAvisRecents,
  searchAvis
} from '../controller/avisController.js';

const avisRouter = Router();

// Configuration multer pour les médias
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 5 // Max 5 fichiers
  },
  fileFilter: (req, file, cb) => {
    // Accepter images et vidéos
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non supporté'), false);
    }
  }
});

// 🔐 MIDDLEWARE D'AUTHENTIFICATION (à adapter selon votre système)
const requireAuth = (req, res, next) => {
  // Votre logique d'authentification ici
  // Pour l'instant, on simule un userId
  req.userId = req.headers['user-id'] || '507f1f77bcf86cd799439011';
  next();
};

// 📝 ROUTES CRUD AVIS
avisRouter.post('/avis', requireAuth, upload.array('medias', 5), createAvis);
avisRouter.get('/avis', getAllAvis);
avisRouter.get('/avis/:id', getAvisById);
avisRouter.put('/avis/:id', requireAuth, updateAvis);
avisRouter.delete('/avis/:id', requireAuth, deleteAvis);

// 📊 ROUTES STATISTIQUES
avisRouter.get('/avis/stats/:objetType/:objetId', getStatsObjet);

// 👍 ROUTES INTERACTION
avisRouter.post('/avis/:id/utile', marquerUtile);
avisRouter.post('/avis/:id/reponse', requireAuth, repondreAvis);
avisRouter.post('/avis/:id/signaler', requireAuth, signalerAvis);

// 🔍 ROUTES RECHERCHE
avisRouter.get('/avis/recents', getAvisRecents);
avisRouter.get('/avis/search', searchAvis);

export default avisRouter;



