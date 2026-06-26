import { Router } from 'express';
import auth from '../middleware/authMiddleware.js';
import * as sendSms from '../api/infobip.js';
import * as smsTwilio from '../api/twilio.js';

const smsRouter = Router();

smsRouter.post('/sms', auth, sendSms.smsPhone);
smsRouter.post('/send-whatsapp', auth, sendSms.sendWhatsAppMessage);
smsRouter.post('/tsend-sms', auth, smsTwilio.sendSMS);
smsRouter.post('/tsend-whatsapp', auth, smsTwilio.sendWhatsAppMessage);

export default smsRouter;
