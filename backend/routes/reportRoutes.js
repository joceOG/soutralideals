import { Router } from 'express';
import { createReport } from '../controller/reportController.js';

const reportRouter = Router();

reportRouter.post('/reports', createReport);

export default reportRouter;


