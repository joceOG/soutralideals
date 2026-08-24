import axios from "axios";

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function smsUnavailableError() {
  return new Error(
    "Service SMS temporairement indisponible. Réessayez plus tard.",
  );
}

/**
 * Envoie un SMS via Infobip, puis Twilio.
 * En production : aucun fallback console — échec provider = erreur réelle.
 * Hors production : fallback console (dev) uniquement si aucun provider n'a réussi.
 */
export async function sendSms(to, text) {
  const normalizedTo = to;
  let lastProviderError = null;
  let attemptedProvider = false;

  if (process.env.INFOBIP_API_KEY && process.env.INFOBIP_NUMBER) {
    attemptedProvider = true;
    try {
      const response = await axios.post(
        "https://698528.api.infobip.com/sms/2/text/advanced",
        {
          messages: [
            {
              destinations: [{ to: normalizedTo }],
              from: process.env.INFOBIP_NUMBER,
              text,
            },
          ],
        },
        {
          headers: {
            Authorization: `App ${process.env.INFOBIP_API_KEY}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          timeout: 10000,
        },
      );
      return { success: true, provider: "infobip", data: response.data };
    } catch (err) {
      const status = err?.response?.status;
      const detail =
        err?.response?.data?.requestError?.serviceException?.text ??
        err.message;
      console.error(`[SMS] Infobip error ${status}: ${detail}`);
      lastProviderError = err;
      if (status === 401 || status === 403) {
        // Auth provider cassée : tenter Twilio si configuré, sinon erreur.
      }
    }
  }

  if (
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_NUMBER
  ) {
    attemptedProvider = true;
    try {
      const twilio = (await import("twilio")).default;
      const client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN,
      );
      const message = await client.messages.create({
        body: text,
        from: process.env.TWILIO_NUMBER,
        to: normalizedTo,
      });
      return { success: true, provider: "twilio", messageId: message.sid };
    } catch (err) {
      console.error(`[SMS] Twilio error: ${err.message}`);
      lastProviderError = err;
    }
  }

  if (isProduction()) {
    console.error(
      `[SMS] Production: aucun provider n'a délivré le SMS` +
        (attemptedProvider ? " (échec Infobip/Twilio)" : " (aucune clé configurée)"),
    );
    throw smsUnavailableError();
  }

  // Hors prod uniquement — jamais en production
  console.log(`[DEV SMS] → ${normalizedTo}: ${text}`);
  if (lastProviderError) {
    console.warn("[SMS] Fallback mode dev (providers indisponibles)");
  }
  return { success: true, provider: "dev", dev: true };
}
