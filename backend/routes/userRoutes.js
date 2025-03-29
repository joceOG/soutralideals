
import * as controller from '../controller/authController.js'
import {Router} from  "express"
import  multer from "multer"
// const userController = require("../controller/utilisateurController");
import * as userController from '../controller/utilisateurController.js'

const userRouter = Router()

const upload = multer({ dest: 'uploads/user' });

router.post("/register", upload.single('photoProfil'), controller.signUp);
router.post("/login", controller.signIn);
router.get("/logout", controller.logout);

router.get("/utilisateurs", userController.getAllUsers);


export default userRouter;