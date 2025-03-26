import twilio from 'twilio';
import { config } from 'dotenv';
import { resolve } from 'path';


config({ path: resolve('../.env') });

const accountSid = '';
const authToken = '';
const client = twilio(accountSid, authToken);


export async function sendSMS(req, res) {
  try {
    const { body, to } = req.body;
    const message = await client.messages.create({
      body: body || 'Bonjour',
      from: process.env.TWILIO_NUMBER,
      to: to || process.env.TWILIO_MY_NUMBER,
    });
    console.log("SMS sent:", message.sid);
    res.json({ success: true, messageId: message.sid });
  } catch (error) {
    console.error("Error sending SMS:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function sendWhatsAppMessage(req, res) {
  
  try {
    const { body, to } = req.body;
    // console.log(req.body)
    const message = await client.messages.create({
      body: body || 'Bonjour',
      from: `whatsapp:${process.env.TWILIO_NUMBER_WHATSAPP}`,
      to: `whatsapp:${to || process.env.TWILIO_MY_NUMBER_WHATSAPP}`,
    });
    console.log("WhatsApp message sent:", message.sid);
    res.json({ success: true, messageId: message.sid });
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}




