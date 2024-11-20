
import * as controller from '../controller/authController.js'
import {Router} from  "express"
import  multer from "multer"
// const userController = require("../controller/utilisateurController");

const router = Router()



const upload = multer({ dest: 'uploads/' });

router.post("/register", controller.signUp);
router.post("/login", controller.signIn);
router.get("/logout", controller.logout);


// router.get("/allUser", userController.getAllUser);
// router.get("/:id", userController.userInfo);

export default router;