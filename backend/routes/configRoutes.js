import { Router } from 'express';
import { getPhoneVerificationConfig } from '../controller/configController.js';

const configRouter = Router();

configRouter.get('/config/phone-verification', getPhoneVerificationConfig);

export default configRouter;
