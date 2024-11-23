
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


<<<<<<< HEAD
<<<<<<< HEAD
export default userRouter;
=======
=======
>>>>>>> 1b487c7 (Connexion effective entre front et back)

const upload = multer({ dest: 'uploads/' });

router.post("/register", controller.signUp);
router.post("/login", controller.signIn);
router.get("/logout", controller.logout);

router.get("/utilisateurs", userController.getAllUsers);


export default router;
<<<<<<< HEAD
>>>>>>> 0b7e280 (Connexion effective entre front et back)
=======
=======
export default userRouter;
>>>>>>> a814426 (Connexion effective entre front et back)
>>>>>>> 1b487c7 (Connexion effective entre front et back)
