import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import auth, { authAdmin } from '../middleware/authMiddleware.js';
import { sendEmail } from '../api/nodemailer.js';

const mailRouter = Router();

// 🛡️ Rate limiter newsletter
const newsletterLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { error: 'Trop de tentatives, réessayez dans une heure.' },
});

// STAB-11 : envoi email générique réservé admin
mailRouter.post('/email', ...authAdmin, sendEmail);

// ✅ Newsletter publique (sans auth, avec rate limit)
mailRouter.post('/newsletter/subscribe', newsletterLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Email invalide' });
  }
  try {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.default.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Bienvenue sur la newsletter Soutrali Deals !',
      html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto">
               <h2 style="color:#1b5e3b">Bienvenue sur Soutrali Deals 🇨🇮</h2>
               <p>Vous recevrez nos actualités, nouveaux prestataires et offres exclusives.</p>
               <hr style="border:none;border-top:1px solid #eee"/>
               <p style="color:#888;font-size:12px">Soutrali Deals — La marketplace ivoirienne</p>
             </div>`,
    });
    console.log(`📧 Newsletter inscription: ${email}`);
  } catch (err) {
    console.error('Newsletter SMTP error (non-bloquant):', err.message);
  }
  return res.json({ success: true, message: 'Inscription confirmée !' });
});

export default mailRouter;
