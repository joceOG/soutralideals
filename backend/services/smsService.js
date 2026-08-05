import axios from "axios";

/**
 * Envoie un SMS via Infobip, Twilio ou mode dev (console).
 * Les erreurs de provider sont loggées mais ne remontent pas comme erreur utilisateur
 * pour ne pas bloquer l'inscription en cas de panne SMS en production.
 */
export async function sendSms(to, text) {
  const normalizedTo = to;

  if (process.env.INFOBIP_API_KEY && process.env.INFOBIP_NUMBER) {
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
      const detail = err?.response?.data?.requestError?.serviceException?.text ?? err.message;
      console.error(`[SMS] Infobip error ${status}: ${detail}`);
      // Erreur d'authentification ou quota → remonte pour informer l'admin
      if (status === 401 || status === 403) {
        throw new Error("Service SMS temporairement indisponible. Réessayez plus tard.");
      }
      // Autres erreurs Infobip → fallback dev
      console.warn("[SMS] Fallback mode dev (Infobip indisponible)");
    }
  }

  if (
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_NUMBER
  ) {
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
      if (err.status === 401 || err.status === 403) {
        throw new Error("Service SMS temporairement indisponible. Réessayez plus tard.");
      }
      console.warn("[SMS] Fallback mode dev (Twilio indisponible)");
    }
  }

  // Mode dev : log le code dans la console backend (jamais exposé au client en prod)
  console.log(`[DEV SMS] → ${normalizedTo}: ${text}`);
  return { success: true, provider: "dev", dev: true };
}
