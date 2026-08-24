import { Router } from 'express';
import auth, { authAdmin } from '../middleware/authMiddleware.js';
import * as sendSms from '../api/infobip.js';
import * as smsTwilio from '../api/twilio.js';

const smsRouter = Router();

// STAB-11 : envoi SMS/WhatsApp réservé admin (évite abus JWT client)
smsRouter.post('/sms', ...authAdmin, sendSms.smsPhone);
smsRouter.post('/send-whatsapp', ...authAdmin, sendSms.sendWhatsAppMessage);
smsRouter.post('/tsend-sms', ...authAdmin, smsTwilio.sendSMS);
smsRouter.post('/tsend-whatsapp', ...authAdmin, smsTwilio.sendWhatsAppMessage);

export default smsRouter;
