import nodemailer from 'nodemailer';
import { config } from 'dotenv';
import { resolve } from 'path';


config();


// Configuration SMTP
const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465, // ou 587 si `secure: false`
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    tls: {
      // do not fail on invalid certs
      rejectUnauthorized: false,
    },
});

const test=()=>transporter.verify(function (error, success) {
    if (error) {
      console.log(error);
    } else {
      console.log("Server is ready to take our messages");
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


// test();