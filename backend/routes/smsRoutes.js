
import {Router} from  "express"
import * as sendSms from "../api/infobip.js";
import * as smsTwilio from "../api/twilio.js";






const smsRouter = Router()


smsRouter.post("/sms", sendSms.smsPhone);
smsRouter.post("/send-whatsapp", sendSms.sendWhatsAppMessage);
smsRouter.post('/tsend-sms', smsTwilio.sendSMS);
smsRouter.post('/tsend-whatsapp', smsTwilio.sendWhatsAppMessage);




export default smsRouter;
