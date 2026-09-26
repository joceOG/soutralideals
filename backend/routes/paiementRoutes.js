import { Router } from 'express';
import { authAdmin } from '../middleware/authMiddleware.js';
import {
  listPaiementsAdmin,
  getPaiementsStatsAdmin,
  getPaiementByIdAdmin,
} from '../controller/paiementAdminController.js';

const paiementRouter = Router();

paiementRouter.get('/paiements/stats', ...authAdmin, getPaiementsStatsAdmin);
paiementRouter.get('/paiements', ...authAdmin, listPaiementsAdmin);
paiementRouter.get('/paiements/:id', ...authAdmin, getPaiementByIdAdmin);

export default paiementRouter;
