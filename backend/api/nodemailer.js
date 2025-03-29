import nodemailer from 'nodemailer';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve('../.env') });


// Configuration SMTP
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Fonction pour envoyer un e-mail
const sendMail = async (to) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to,
            subject:"Email de Confirmation",
            text:"Félicitation vous êtes inscrit"
        };

        const info = await transporter.sendMail(mailOptions);
        return { success: true, message: 'E-mail envoyé avec succès', info };
    } catch (error) {
        return { success: false, message: 'Erreur lors de l’envoi de l’e-mail', error };
    }
};


export const sendEmail = async (req, res) => {
    const { to } = req.body;

    if (!to  ) {
        return res.status(400).json({ message: 'Tous les champs sont requis' });
    }

    const response = await sendMail(to);

    if (response.success) {
        res.status(200).json(response);
    } else {
        res.status(500).json(response);
    }
};
