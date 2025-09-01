import twilio from 'twilio'


const accountSid=''
const authToken='';
const client=twilio(accountSid,authToken);

client.messages.create({
    body:'Bonjour, Vous êtes bien inscrit',
    from:'+141766551**',
    to:'*********'
}).then(message=>console.log(message.sid))
.catch(error=>console.log(error))