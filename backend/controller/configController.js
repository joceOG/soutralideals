import { getPublicPhoneVerificationConfig } from '../services/phoneVerificationPolicy.js';

/** GET /api/config/phone-verification — public, pas de secrets. */
export const getPhoneVerificationConfig = (req, res) => {
  res.status(200).json(getPublicPhoneVerificationConfig());
};
