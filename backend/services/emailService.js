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

export async function sendResetPasswordEmail(to, prenom, resetUrl) {
  const tx = getTransporter();
  if (!tx || !to) {
    console.warn("[EMAIL] Reset password non envoyé — SMTP non configuré");
    return { sent: false, reason: "email_not_configured" };
  }

  try {
    await tx.sendMail({
      from: `"Soutrali Deals" <${process.env.EMAIL_USER}>`,
      to,
      subject: "Réinitialisation de votre mot de passe",
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
          <h2 style="color:#1b5e3b">Réinitialiser votre mot de passe</h2>
          <p>Bonjour ${prenom || ""},</p>
          <p>Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous :</p>
          <a href="${resetUrl}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#1b5e3b;color:white;border-radius:8px;text-decoration:none;font-weight:600">
            Réinitialiser mon mot de passe
          </a>
          <p style="color:#666;font-size:13px">Ce lien expire dans <strong>1 heure</strong>. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
          <p style="color:#999;font-size:12px">Soutrali Deals — La marketplace ivoirienne</p>
        </div>
      `,
      text: `Bonjour ${prenom || ""},\n\nRéinitialisez votre mot de passe ici :\n${resetUrl}\n\nCe lien expire dans 1 heure.\n\nSoutrali Deals`,
    });
    return { sent: true };
  } catch (err) {
    console.warn("[EMAIL] Reset password non envoyé:", err.message);
    return { sent: false, reason: err.message };
  }
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
