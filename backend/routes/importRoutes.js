import express from 'express';
import { importPrestatairesCSV, getImportStats, clearImportCache } from '../controller/importController.js';
import auth, { authRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// ✅ IMPORT CSV PRESTATAIRES — réservé aux admins uniquement (opération destructive)
router.post('/prestataires/import-csv', auth, authRole(['Admin', 'ADMIN']), importPrestatairesCSV);

// ✅ STATISTIQUES D'IMPORT
router.get('/import/stats', auth, getImportStats);

// ✅ VIDER LE CACHE D'IMPORT
router.delete('/import/cache', auth, clearImportCache);

export default router;
