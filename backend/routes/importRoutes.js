import express from 'express';
import { importPrestatairesCSV, getImportStats, clearImportCache } from '../controller/importController.js';
import auth from '../middleware/authMiddleware.js';

const router = express.Router();

// ✅ IMPORT CSV PRESTATAIRES (sans auth pour l'import)
router.post('/prestataires/import-csv', importPrestatairesCSV);

// ✅ STATISTIQUES D'IMPORT
router.get('/import/stats', auth, getImportStats);

// ✅ VIDER LE CACHE D'IMPORT
router.delete('/import/cache', auth, clearImportCache);

export default router;
