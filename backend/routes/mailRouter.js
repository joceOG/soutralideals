
import {Router} from  "express"
import { sendEmail } from "../Api/nodemailer.js";


const mailRouter = Router()


/**
 * @swagger
 * /api/email:
 *   post:
 *     summary: Envoyer un email
 *     tags: [Email]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               to:
 *                 type: string
 *                 description: Adresse email du destinataire
 *               subject:
 *                 type: string
 *                 description: Sujet de l'email
 *               text:
 *                 type: string
 *                 description: Contenu de l'email en format texte
 *               html:
 *                 type: string
 *                 description: Contenu de l'email en format HTML (optionnel)
 *     responses:
 *       200:
 *         description: Email envoyé avec succès
 *       400:
 *         description: Données invalides
 *       500:
 *         description: Erreur lors de l'envoi de l'email
 */
mailRouter.post("/email", sendEmail);



export default mailRouter;
