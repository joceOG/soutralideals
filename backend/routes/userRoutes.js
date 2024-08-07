
const authController = require("../controller/authController");
const userController = require("../controller/utilisateurController");

const router = require("express").Router();




router.post("/register", authController.signUp);
router.post("/login", authController.signIn);
router.get("/logout", authController.logout);


router.get("/allUser", userController.getAllUser);
router.get("/:id", userController.userInfo);

module.exports = router; 