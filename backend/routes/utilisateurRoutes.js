import { Router } from 'express';
import multer from 'multer';
import * as utilisateurController from '../controller/utilisateurController.js';

const utilisateurRouter = Router();

// Multer setup (utilisé pour les mises à jour avec photo)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// --- AUTHENTIFICATION ---
utilisateurRouter.post("/register", upload.single('photoProfil'), utilisateurController.signUp);
utilisateurRouter.post("/login", utilisateurController.signIn);
utilisateurRouter.get("/logout", utilisateurController.logout);

// --- UTILISATEUR CRUD ---
utilisateurRouter.get("/utilisateur", utilisateurController.getAllUsers);
utilisateurRouter.get("/utilisateur/:id", utilisateurController.getUserById);
utilisateurRouter.put("/utilisateur/:id", upload.single('photoProfil'), utilisateurController.updateUserById);
utilisateurRouter.delete("/utilisateur/:id", utilisateurController.deleteUserById);

export default utilisateurRouter;
