import mongoose from "mongoose";

const phoneOtpSchema = new mongoose.Schema(
  {
    telephone: { type: String, required: true, index: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: true },
    attempts: { type: Number, default: 0 },
    lastSentAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

phoneOtpSchema.index({ telephone: 1 }, { unique: true });

const phoneOtpModel = mongoose.model("PhoneOtp", phoneOtpSchema);
export default phoneOtpModel;
