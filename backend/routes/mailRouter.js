
import {Router} from  "express"
import { sendEmail } from "../Api/nodemailer";






const mailRouter = Router()


mailRouter.post("/email", sendEmail);



export default mailRouter;
