import { Router } from "express";
import rateLimit from "express-rate-limit";
import { sendOtp, verifyOtp } from "../controller/otpController.js";

const otpRouter = Router();

const otpSendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Trop de demandes OTP. Réessayez dans 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Trop de tentatives de vérification." },
  standardHeaders: true,
  legacyHeaders: false,
});

otpRouter.post("/otp/send", otpSendLimiter, sendOtp);
otpRouter.post("/otp/verify", otpVerifyLimiter, verifyOtp);

export default otpRouter;
