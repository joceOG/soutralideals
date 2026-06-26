import { Router } from 'express';
import multer from 'multer';
import * as utilisateurController from '../controller/utilisateurController.js';
import auth, { authRole } from '../middleware/authMiddleware.js';
import { validateUserRegistration, validateUserLogin, handleValidationErrors } from '../middleware/validation.js';

const utilisateurRouter = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// --- AUTHENTIFICATION (publique) ---
utilisateurRouter.post('/register', upload.single('photoProfil'), validateUserRegistration, handleValidationErrors, utilisateurController.signUp);
utilisateurRouter.post('/login', validateUserLogin, handleValidationErrors, utilisateurController.signIn);
utilisateurRouter.post('/logout', utilisateurController.logout);

// --- TOKEN VALIDATION (vérifier que le token est encore valide) ---
utilisateurRouter.get('/utilisateur/profile', auth, (req, res) => {
  res.status(200).json({ valid: true, userId: req.utilisateur._id });
});

// --- UTILISATEUR (protégé) ---
utilisateurRouter.get('/utilisateur', auth, authRole(['Admin', 'ADMIN']), utilisateurController.getAllUsers);
utilisateurRouter.get('/utilisateur/:id/roles', auth, utilisateurController.getUserRoles); // public pour récupération rôles après login
utilisateurRouter.get('/utilisateur/:id', auth, utilisateurController.getUserById);
utilisateurRouter.put('/utilisateur/:id', auth, upload.single('photoProfil'), utilisateurController.updateUserById);
utilisateurRouter.patch('/utilisateur/password', auth, utilisateurController.changePassword);
utilisateurRouter.delete('/utilisateur/:id', auth, utilisateurController.deleteUserById);

export default utilisateurRouter;