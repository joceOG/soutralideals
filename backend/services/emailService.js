import nodemailer from "nodemailer";

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (!user || !pass) return null;

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
  return transporter;
}

export async function sendWelcomeEmail(to, prenom) {
  const tx = getTransporter();
  if (!tx || !to) {
    return { sent: false, reason: "email_not_configured" };
  }

  try {
    await tx.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject: "Bienvenue sur Soutrali Deals",
      text: `Bonjour ${prenom || ""},\n\nVotre compte Soutrali Deals a été créé avec succès.\n\nL'équipe Soutrali Deals`,
      html: `<p>Bonjour <strong>${prenom || ""}</strong>,</p><p>Votre compte <strong>Soutrali Deals</strong> a été créé avec succès.</p><p>À bientôt,<br/>L'équipe Soutrali Deals</p>`,
    });
    return { sent: true };
  } catch (err) {
    console.warn("Email bienvenue non envoyé:", err.message);
    return { sent: false, reason: err.message };
  }
}
