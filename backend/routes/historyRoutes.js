import { Router } from 'express';
import {
  addHistory,
  listHistory,
  searchHistory,
  updateHistory,
  removeHistory,
  getHistoryStats,
  getRecentHistory,
  getHistoryByType,
  archiveHistory,
  cleanOldHistory
} from '../controller/historyController.js';

const historyRouter = Router();

// ✅ ROUTES CRUD HISTORIQUE
historyRouter.post('/history', addHistory);
historyRouter.get('/history', listHistory);
historyRouter.get('/history/search', searchHistory);
historyRouter.put('/history/:id', updateHistory);
historyRouter.delete('/history/:id', removeHistory);

// ✅ ROUTES SPÉCIFIQUES
historyRouter.get('/history/stats', getHistoryStats);
historyRouter.get('/history/recent', getRecentHistory);
historyRouter.get('/history/by-type', getHistoryByType);
historyRouter.patch('/history/:id/archive', archiveHistory);
historyRouter.delete('/history/clean', cleanOldHistory);

export default historyRouter;



