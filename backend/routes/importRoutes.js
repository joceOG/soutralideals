import express from 'express';
import { importPrestatairesCSV, getImportStats, clearImportCache } from '../controller/importController.js';
import auth, { authAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// STAB-11 : opérations import réservées admin
router.post('/prestataires/import-csv', ...authAdmin, importPrestatairesCSV);
router.get('/import/stats', ...authAdmin, getImportStats);
router.delete('/import/cache', ...authAdmin, clearImportCache);

export default router;
