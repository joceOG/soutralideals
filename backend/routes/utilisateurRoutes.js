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

<<<<<<< HEAD
// --- AUTHENTIFICATION ---
utilisateurRouter.post("/register", upload.single('photoProfil'), utilisateurController.signUp);
utilisateurRouter.post("/login", utilisateurController.signIn);
utilisateurRouter.get("/logout", utilisateurController.logout);
=======
// --- AUTHENTIFICATION (publique) ---
utilisateurRouter.post('/register', upload.single('photoProfil'), validateUserRegistration, handleValidationErrors, utilisateurController.signUp);
utilisateurRouter.post('/login', validateUserLogin, handleValidationErrors, utilisateurController.signIn);
utilisateurRouter.post('/logout', utilisateurController.logout);
>>>>>>> c0e0612 (fix: durcissement sécurité API et auth)

// --- UTILISATEUR CRUD ---
utilisateurRouter.get("/utilisateur", utilisateurController.getAllUsers);
utilisateurRouter.get("/utilisateur/:id", utilisateurController.getUserById);
utilisateurRouter.get("/utilisateur/:id/roles", utilisateurController.getUserRoles);
utilisateurRouter.put("/utilisateur/:id", upload.single('photoProfil'), utilisateurController.updateUserById);
utilisateurRouter.delete("/utilisateur/:id", utilisateurController.deleteUserById);

export default utilisateurRouter;
