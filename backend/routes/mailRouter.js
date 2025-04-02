
import {Router} from  "express"
import { sendEmail } from "../Api/nodemailer.js";


const mailRouter = Router()


mailRouter.post("/email", sendEmail);



export default mailRouter;
