import { Router } from 'express';
import auth, { authAdmin } from '../middleware/authMiddleware.js';
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

userPreferencesRouter.post('/preferences', auth, createOrUpdatePreferences);
userPreferencesRouter.get('/preferences/user/:utilisateurId', auth, getUserPreferences);
userPreferencesRouter.put('/preferences/user/:utilisateurId', auth, createOrUpdatePreferences);
userPreferencesRouter.delete('/preferences/user/:utilisateurId', auth, deletePreferences);

userPreferencesRouter.patch('/preferences/user/:utilisateurId/language', auth, updateLanguage);
userPreferencesRouter.patch('/preferences/user/:utilisateurId/currency', auth, updateCurrency);
userPreferencesRouter.patch('/preferences/user/:utilisateurId/country', auth, updateCountry);
userPreferencesRouter.patch('/preferences/user/:utilisateurId/reset', auth, resetPreferences);

userPreferencesRouter.get('/preferences', ...authAdmin, getAllPreferences);
userPreferencesRouter.get('/preferences/stats', ...authAdmin, getPreferencesStats);

export default userPreferencesRouter;
