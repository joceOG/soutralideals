import { Router } from 'express';
import auth from '../middleware/authMiddleware.js';
import { createReport } from '../controller/reportController.js';

const reportRouter = Router();

reportRouter.post('/reports', auth, createReport);

export default reportRouter;
