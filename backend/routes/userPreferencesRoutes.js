import { Router } from 'express';
import {
  createOrUpdatePreferences,
  getUserPreferences,
  updateLanguage,
  updateCurrency,
  updateCountry,
  resetPreferences,
  getAllPreferences,
  getPreferencesStats,
  deletePreferences
} from '../controller/userPreferencesController.js';

const userPreferencesRouter = Router();

// ✅ ROUTES CRUD PRÉFÉRENCES
userPreferencesRouter.post('/preferences', createOrUpdatePreferences);
userPreferencesRouter.get('/preferences/user/:utilisateurId', getUserPreferences);
userPreferencesRouter.put('/preferences/user/:utilisateurId', createOrUpdatePreferences);
userPreferencesRouter.delete('/preferences/user/:utilisateurId', deletePreferences);

// ✅ ROUTES SPÉCIFIQUES
userPreferencesRouter.patch('/preferences/user/:utilisateurId/language', updateLanguage);
userPreferencesRouter.patch('/preferences/user/:utilisateurId/currency', updateCurrency);
userPreferencesRouter.patch('/preferences/user/:utilisateurId/country', updateCountry);
userPreferencesRouter.patch('/preferences/user/:utilisateurId/reset', resetPreferences);

// ✅ ROUTES ADMIN
userPreferencesRouter.get('/preferences', getAllPreferences);
userPreferencesRouter.get('/preferences/stats', getPreferencesStats);

export default userPreferencesRouter;



