import {
  sendPhoneOtp,
  verifyPhoneOtp,
  requireCanonicalPhone,
} from "../services/otpService.js";
import { getPhoneVerificationMode } from "../services/phoneVerificationPolicy.js";
import { findVerifiedPhoneOwner } from "../services/phoneIdentityService.js";
import Utilisateur from "../models/utilisateurModel.js";

export const sendOtp = async (req, res) => {
  try {
    const { telephone, phoneCountry } = req.body;
    if (!telephone) {
      return res.status(400).json({ error: "Numéro de téléphone requis" });
    }

    let normalized;
    try {
      normalized = requireCanonicalPhone(telephone, phoneCountry || undefined);
    } catch {
      return res.status(400).json({
        error: "Numéro de téléphone invalide pour le pays sélectionné.",
      });
    }

    const verifiedOwner = await findVerifiedPhoneOwner(normalized);
    // Numéro déjà prouvé par un autre compte → bloquer l'envoi OTP.
    if (verifiedOwner) {
      return res.status(409).json({ error: "Ce numéro est déjà utilisé" });
    }

    const result = await sendPhoneOtp(telephone, phoneCountry || undefined);
    res.status(200).json({
      success: true,
      message: "Code envoyé par SMS",
      ...result,
    });
  } catch (err) {
    const clientErrors = [
      "Numéro de téléphone invalide",
      "Veuillez patienter",
      "Trop de tentatives",
    ];
    const isClientError = clientErrors.some((msg) =>
      err.message?.startsWith(msg),
    );
    const status = isClientError ? 400 : 503;
    const deferred = getPhoneVerificationMode() === 'deferred';
    const errorMessage =
      deferred && status === 503
        ? "Impossible d'envoyer le SMS pour le moment. Vous pourrez vérifier votre numéro plus tard."
        : err.message;
    console.error(`[OTP sendOtp] ${status} — ${err.message}`);
    res.status(status).json({ error: errorMessage });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { telephone, code, phoneCountry } = req.body;
    if (!telephone || !code) {
      return res.status(400).json({ error: "Téléphone et code requis" });
    }

    const result = await verifyPhoneOtp(
      telephone,
      code,
      phoneCountry || undefined,
    );
    res.status(200).json({
      success: true,
      message: "Téléphone vérifié",
      ...result,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
