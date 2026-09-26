import { Router } from 'express';
import * as statistiquesController from '../controller/statistiquesController.js';
import { authAdmin } from '../middleware/authMiddleware.js';

const statistiquesRouter = Router();

statistiquesRouter.get('/statistiques/generales', ...authAdmin, statistiquesController.getGenerales);
statistiquesRouter.get('/statistiques/temporelles', ...authAdmin, statistiquesController.getTemporelles);
statistiquesRouter.get('/statistiques/categories', ...authAdmin, statistiquesController.getCategories);
statistiquesRouter.get('/statistiques/paiements', ...authAdmin, statistiquesController.getPaiements);
statistiquesRouter.get('/statistiques/geographiques', ...authAdmin, statistiquesController.getGeographiques);

export default statistiquesRouter;
