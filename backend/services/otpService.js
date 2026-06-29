import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import phoneOtpModel from "../models/phoneOtpModel.js";
import { sendSms } from "./smsService.js";

const OTP_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

export function normalizePhone(raw) {
  if (!raw) return "";
  let phone = String(raw).replace(/\s+/g, "").replace(/[^\d+]/g, "");
  if (phone.startsWith("00")) phone = `+${phone.slice(2)}`;
  if (phone.startsWith("0") && phone.length === 10) {
    phone = `+225${phone.slice(1)}`;
  }
  if (/^\d{10}$/.test(phone)) {
    phone = `+225${phone}`;
  }
  return phone;
}

/** Valide un numéro ivoirien (local 0545… ou international +225…). */
export function isValidCiPhone(raw) {
  const normalized = normalizePhone(raw);
  if (!normalized.startsWith("+225")) return false;
  const local = normalized.slice(4);
  return /^0[0-9]{9}$/.test(local) || /^[0-9]{8,9}$/.test(local);
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function sendPhoneOtp(telephone) {
  const normalized = normalizePhone(telephone);
  if (!normalized || normalized.length < 10) {
    throw new Error("Numéro de téléphone invalide");
  }

  const existing = await phoneOtpModel.findOne({ telephone: normalized });
  if (
    existing?.lastSentAt &&
    Date.now() - existing.lastSentAt.getTime() < RESEND_COOLDOWN_MS
  ) {
    const waitSec = Math.ceil(
      (RESEND_COOLDOWN_MS - (Date.now() - existing.lastSentAt.getTime())) / 1000,
    );
    throw new Error(`Veuillez patienter ${waitSec}s avant un nouvel envoi`);
  }

  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 8);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await phoneOtpModel.findOneAndUpdate(
    { telephone: normalized },
    {
      telephone: normalized,
      codeHash,
      expiresAt,
      attempts: 0,
      lastSentAt: new Date(),
    },
    { upsert: true, new: true },
  );

  const smsText = `Soutrali Deals — Votre code de verification : ${code}. Valide 10 minutes.`;
  const smsResult = await sendSms(normalized, smsText);

  return {
    telephone: normalized,
    expiresInSeconds: OTP_TTL_MS / 1000,
    devMode: smsResult.dev === true,
    ...(smsResult.dev && process.env.NODE_ENV !== "production"
      ? { devCode: code }
      : {}),
  };
}

export async function verifyPhoneOtp(telephone, code) {
  const normalized = normalizePhone(telephone);
  const record = await phoneOtpModel.findOne({ telephone: normalized });

  if (!record) {
    throw new Error("Aucun code envoyé pour ce numéro");
  }
  if (record.expiresAt < new Date()) {
    await phoneOtpModel.deleteOne({ _id: record._id });
    throw new Error("Code expiré. Demandez un nouveau code.");
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    throw new Error("Trop de tentatives. Demandez un nouveau code.");
  }

  const valid = await bcrypt.compare(String(code), record.codeHash);
  record.attempts += 1;
  await record.save();

  if (!valid) {
    throw new Error("Code incorrect");
  }

  await phoneOtpModel.deleteOne({ _id: record._id });

  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Configuration serveur incorrecte");

  const phoneVerificationToken = jwt.sign(
    { telephone: normalized, type: "phone_verification" },
    secret,
    { expiresIn: "15m" },
  );

  return { telephone: normalized, phoneVerificationToken };
}

export function assertPhoneVerificationToken(token, telephone) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Configuration serveur incorrecte");

  const decoded = jwt.verify(token, secret);
  if (decoded.type !== "phone_verification") {
    throw new Error("Token de vérification invalide");
  }
  const normalized = normalizePhone(telephone);
  if (decoded.telephone !== normalized) {
    throw new Error("Le token ne correspond pas au numéro de téléphone");
  }
  return normalized;
}
