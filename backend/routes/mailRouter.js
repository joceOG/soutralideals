
import {Router} from  "express"
import { sendEmail } from "../api/nodemailer.js";

const mailRouter = Router()

mailRouter.post("/email", sendEmail);

export default mailRouter;
