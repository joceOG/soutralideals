import {
  sendPhoneOtp,
  verifyPhoneOtp,
  normalizePhone,
} from "../services/otpService.js";
import Utilisateur from "../models/utilisateurModel.js";

export const sendOtp = async (req, res) => {
  try {
    const { telephone } = req.body;
    if (!telephone) {
      return res.status(400).json({ error: "Numéro de téléphone requis" });
    }

    const normalized = normalizePhone(telephone);
    const existing = await Utilisateur.findOne({ telephone: normalized });
    if (existing) {
      return res.status(409).json({ error: "Ce numéro est déjà utilisé" });
    }

    const result = await sendPhoneOtp(telephone);
    res.status(200).json({
      success: true,
      message: "Code envoyé par SMS",
      ...result,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { telephone, code } = req.body;
    if (!telephone || !code) {
      return res.status(400).json({ error: "Téléphone et code requis" });
    }

    const result = await verifyPhoneOtp(telephone, code);
    res.status(200).json({
      success: true,
      message: "Téléphone vérifié",
      ...result,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
