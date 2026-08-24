import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import phoneOtpModel from "../models/phoneOtpModel.js";
import { sendSms } from "./smsService.js";
import {
  canonicalizePhone,
  normalizePhone as normalizePhoneE164,
  PhoneValidationError,
} from "../utils/phone.js";

const OTP_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

/**
 * STAB-07 — Canonique E.164.
 * @param {string} raw
 * @param {string} [defaultCountry] ISO (ex: 'CI', 'TN') — requis si numéro national
 * @returns {string} E.164 ou ""
 */
export function normalizePhone(raw, defaultCountry) {
  return normalizePhoneE164(raw, defaultCountry);
}

/**
 * Parse strict : throw PhoneValidationError si invalide.
 * @param {string} raw
 * @param {string} [defaultCountry]
 */
export function requireCanonicalPhone(raw, defaultCountry) {
  return canonicalizePhone(raw, { defaultCountry }).e164;
}

export { PhoneValidationError };

/** @deprecated Prefer canonicalizePhone — conservé pour appels CI explicites. */
export function isValidCiPhone(raw) {
  try {
    const e164 = canonicalizePhone(raw, {
      defaultCountry: String(raw ?? '').trim().startsWith('+') ||
        String(raw ?? '').trim().startsWith('00')
        ? undefined
        : 'CI',
    }).e164;
    return e164.startsWith('+225');
  } catch {
    return false;
  }
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function sendPhoneOtp(telephone, defaultCountry) {
  let normalized;
  try {
    normalized = requireCanonicalPhone(telephone, defaultCountry);
  } catch {
    throw new Error("Numéro de téléphone invalide pour le pays sélectionné.");
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

export async function verifyPhoneOtp(telephone, code, defaultCountry) {
  let normalized;
  try {
    normalized = requireCanonicalPhone(telephone, defaultCountry);
  } catch {
    throw new Error("Numéro de téléphone invalide pour le pays sélectionné.");
  }
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

export function assertPhoneVerificationToken(
  token,
  telephone,
  defaultCountry,
) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Configuration serveur incorrecte");

  let decoded;
  try {
    decoded = jwt.verify(token, secret);
  } catch (err) {
    if (err?.name === "TokenExpiredError") {
      throw new Error("Token de vérification expiré");
    }
    throw new Error("Token de vérification invalide");
  }
  if (decoded.type !== "phone_verification") {
    throw new Error("Token de vérification invalide");
  }
  let normalized;
  try {
    // Token JWT porte déjà l'E.164 ; le body peut être international ou national+pays
    normalized = requireCanonicalPhone(
      telephone,
      defaultCountry || undefined,
    );
  } catch {
    throw new Error("Numéro de téléphone invalide pour le pays sélectionné.");
  }
  if (decoded.telephone !== normalized) {
    throw new Error("Le token ne correspond pas au numéro de téléphone");
  }
  return normalized;
}

/** Flag d'autorité serveur — le mobile ne doit pas le contourner. */
export function isOtpRequiredForSignup() {
  return process.env.OTP_REQUIRED === "true";
}

export const OTP_POLICY = {
  ttlMs: OTP_TTL_MS,
  resendCooldownMs: RESEND_COOLDOWN_MS,
  maxAttempts: MAX_ATTEMPTS,
  verificationTokenExpiresIn: "15m",
};
