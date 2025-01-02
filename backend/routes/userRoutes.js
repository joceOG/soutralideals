
import * as controller from '../controller/authController.js'
import {Router} from  "express"
import  multer from "multer"
// const userController = require("../controller/utilisateurController");
import * as userController from '../controller/utilisateurController.js'

const router = Router()



const upload = multer({ dest: 'uploads/' });

router.post("/register", controller.signUp);
router.post("/login", controller.signIn);
router.get("/logout", controller.logout);

router.get("/utilisateurs", userController.getAllUsers);


export default router;