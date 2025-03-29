
import * as controller from '../controller/authController.js'
import {Router} from  "express"
import  multer from "multer"
// const userController = require("../controller/utilisateurController");
import * as userController from '../controller/utilisateurController.js'

const userRouter = Router()

const upload = multer({ dest: 'uploads/user' });

userRouter.post("/register", upload.single('photoProfil'), controller.signUp);
userRouter.post("/login", controller.signIn);
userRouter.get("/logout", controller.logout);

userRouter.get("/utilisateurs", userController.getAllUsers);


export default userRouter;