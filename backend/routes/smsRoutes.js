
import {Router} from  "express"
import * as sendSms from "../Api/infobip.js";
import * as smsTwilio from "../Api/twilio.js";






const smsRouter = Router()


/**
 * @swagger
 * /api/sms:
 *   post:
 *     summary: Envoyer un SMS via Infobip
 *     tags: [SMS]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               to:
 *                 type: string
 *                 description: Numéro de téléphone du destinataire
 *               message:
 *                 type: string
 *                 description: Contenu du SMS
 *     responses:
 *       200:
 *         description: SMS envoyé avec succès
 *       400:
 *         description: Données invalides
 *       500:
 *         description: Erreur lors de l'envoi du SMS
 */
smsRouter.post("/sms", sendSms.smsPhone);

/**
 * @swagger
 * /api/send-whatsapp:
 *   post:
 *     summary: Envoyer un message WhatsApp via Infobip
 *     tags: [SMS]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               to:
 *                 type: string
 *                 description: Numéro WhatsApp du destinataire
 *               message:
 *                 type: string
 *                 description: Contenu du message WhatsApp
 *     responses:
 *       200:
 *         description: Message WhatsApp envoyé avec succès
 *       400:
 *         description: Données invalides
 *       500:
 *         description: Erreur lors de l'envoi du message
 */
smsRouter.post("/send-whatsapp", sendSms.sendWhatsAppMessage);

/**
 * @swagger
 * /api/tsend-sms:
 *   post:
 *     summary: Envoyer un SMS via Twilio
 *     tags: [SMS]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               to:
 *                 type: string
 *                 description: Numéro de téléphone du destinataire
 *               message:
 *                 type: string
 *                 description: Contenu du SMS
 *     responses:
 *       200:
 *         description: SMS envoyé avec succès via Twilio
 *       400:
 *         description: Données invalides
 *       500:
 *         description: Erreur lors de l'envoi du SMS
 */
smsRouter.post('/tsend-sms', smsTwilio.sendSMS);

/**
 * @swagger
 * /api/tsend-whatsapp:
 *   post:
 *     summary: Envoyer un message WhatsApp via Twilio
 *     tags: [SMS]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               to:
 *                 type: string
 *                 description: Numéro WhatsApp du destinataire
 *               message:
 *                 type: string
 *                 description: Contenu du message WhatsApp
 *     responses:
 *       200:
 *         description: Message WhatsApp envoyé avec succès via Twilio
 *       400:
 *         description: Données invalides
 *       500:
 *         description: Erreur lors de l'envoi du message
 */
smsRouter.post('/tsend-whatsapp', smsTwilio.sendWhatsAppMessage);




export default smsRouter;
