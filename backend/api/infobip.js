import axios from 'axios';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve('../.env') });

export const smsPhone = async (req, res) => {
    try {
        const response = await axios.post(
            'https://698528.api.infobip.com/sms/2/text/advanced',
            {
                "messages": [
                    {
                        "destinations": [{ "to": `${process.env.INFOBIP_MYNUMBER}` }],
                        "from": `${process.env.INFOBIP_NUMBER}`,
                        "text": "Congratulations m"
                    }
                ]
            },
            {
                headers: {
                    'Authorization': `App ${process.env.INFOBIP_API_KEY}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            }
        );

        console.log("SMS envoyé avec succès:", response.data);
        res.status(200).json({ success: true, data: response.data });
    } catch (error) {
        console.error("Erreur lors de l'envoi du SMS:", error.response ? error.response.data : error.message);
        res.status(500).json({ success: false, error: error.response ? error.response.data : error.message });
    }
};




export const sendWhatsAppMessage = async (req, res) => {
    // console.log(process.env.INFOBIP_NUMBER_WHATSAPP)
    const postData = {
        "messages": [
            {
                "from": `${process.env.INFOBIP_NUMBER_WHATSAPP}`,
                "to": `${process.env.INFOBIP_MYNUMBER}`,
                "messageId": "beec51ff-977a-4f26-aff5-054da0e463cc",
                "content": {
                    "templateName": "test_whatsapp_template_en",
                    "templateData": {
                        "body": {
                            "placeholders": ["Emmanuel"]
                        }
                    },
                    "language": "en"
                }
            }
        ]
    };

    const config = {
        headers: {
            'Authorization': `App ${process.env.INFOBIP_API_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    };

    try {
        const response = await axios.post(
            'https://698528.api.infobip.com/whatsapp/1/message/template',
            postData,
            config
        );
        
        // Renvoie la réponse du serveur dans la réponse HTTP de l'API
        res.status(200).json({
            success: true,
            message: "Message envoyé avec succès",
            data: response.data 
        });
    } catch (error) {
        console.error("Erreur lors de l'envoi du message WhatsApp:", error.response ? error.response.data : error.message);
        
   
        res.status(500).json({
            success: false,
            message: "Erreur lors de l'envoi du message",
            error: error.response ? error.response.data : error.message
        });
    }
};


