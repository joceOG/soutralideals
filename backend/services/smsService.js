import axios from "axios";

/**
 * Envoie un SMS. Mode dev si aucun provider configuré (log console).
 */
export async function sendSms(to, text) {
  const normalizedTo = to;

  if (process.env.INFOBIP_API_KEY && process.env.INFOBIP_NUMBER) {
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
      },
    );
    return { success: true, provider: "infobip", data: response.data };
  }

  if (
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_NUMBER
  ) {
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
  }

  console.log(`[DEV SMS] → ${normalizedTo}: ${text}`);
  return { success: true, provider: "dev", dev: true };
}
