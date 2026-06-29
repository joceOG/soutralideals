import { Router } from 'express';
import auth from '../middleware/authMiddleware.js';
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
  cleanOldHistory,
} from '../controller/historyController.js';

const historyRouter = Router();

historyRouter.post('/history', auth, addHistory);
historyRouter.get('/history', auth, listHistory);
historyRouter.get('/history/search', auth, searchHistory);
historyRouter.put('/history/:id', auth, updateHistory);
historyRouter.delete('/history/:id', auth, removeHistory);

historyRouter.get('/history/stats', auth, getHistoryStats);
historyRouter.get('/history/recent', auth, getRecentHistory);
historyRouter.get('/history/by-type', auth, getHistoryByType);
historyRouter.patch('/history/:id/archive', auth, archiveHistory);
historyRouter.delete('/history/clean', auth, cleanOldHistory);

export default historyRouter;
