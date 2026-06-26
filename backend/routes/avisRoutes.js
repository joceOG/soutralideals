import { Router } from 'express';
import multer from 'multer';
import auth from '../middleware/authMiddleware.js';
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

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non supporté'), false);
    }
  }
});

// ⚠️ Routes spécifiques AVANT les routes paramétriques /:id
avisRouter.get('/avis/recents', getAvisRecents);
avisRouter.get('/avis/search', searchAvis);
avisRouter.get('/avis/stats/:objetType/:objetId', getStatsObjet);

// 📝 ROUTES CRUD AVIS
avisRouter.post('/avis', auth, upload.array('medias', 5), createAvis);
avisRouter.get('/avis', getAllAvis);
avisRouter.get('/avis/:id', getAvisById);
avisRouter.put('/avis/:id', auth, updateAvis);
avisRouter.delete('/avis/:id', auth, deleteAvis);

// 👍 ROUTES INTERACTION
avisRouter.post('/avis/:id/utile', auth, marquerUtile);
avisRouter.post('/avis/:id/reponse', auth, repondreAvis);
avisRouter.post('/avis/:id/signaler', auth, signalerAvis);

export default avisRouter;



