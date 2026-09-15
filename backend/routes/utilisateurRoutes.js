import { Router } from 'express';
import multer from 'multer';
import * as utilisateurController from '../controller/utilisateurController.js';
import * as fieldAgentAdminController from '../controller/fieldAgentAdminController.js';
import auth, { authRole } from '../middleware/authMiddleware.js';
import { requireSelfOrAdminParam } from '../middleware/entityAccess.js';
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
utilisateurRouter.post('/login/google', utilisateurController.signInWithGoogle);
utilisateurRouter.post('/login/google/complete', utilisateurController.completeGoogleSignIn);
utilisateurRouter.post(
  '/utilisateur/phone/verify-complete',
  auth,
  utilisateurController.verifyAuthenticatedUserPhone,
);
utilisateurRouter.post('/logout', utilisateurController.logout);
utilisateurRouter.post('/forgot-password', utilisateurController.forgotPassword);
utilisateurRouter.post('/reset-password', utilisateurController.resetPassword);

// --- TOKEN VALIDATION (vérifier que le token est encore valide) ---
utilisateurRouter.get('/utilisateur/profile', auth, (req, res) => {
  res.status(200).json({
    valid: true,
    userId: req.utilisateur._id,
    role: req.utilisateur.role,
    canCreateRecensement: req.utilisateur.canCreateRecensement === true,
  });
});

// --- UTILISATEUR (protégé) ---
utilisateurRouter.get('/utilisateur', auth, authRole(['Admin', 'ADMIN']), utilisateurController.getAllUsers);

// R3-05 — Agents recenseurs (avant /:id pour éviter le conflit de param)
utilisateurRouter.get(
  '/utilisateur/field-agents',
  auth,
  authRole(['Admin', 'ADMIN']),
  fieldAgentAdminController.listFieldAgents,
);
utilisateurRouter.post(
  '/utilisateur/field-agents',
  auth,
  authRole(['Admin', 'ADMIN']),
  fieldAgentAdminController.createFieldAgent,
);

utilisateurRouter.get(
  '/utilisateur/:id/roles',
  auth,
  requireSelfOrAdminParam('id'),
  utilisateurController.getUserRoles,
);
utilisateurRouter.get('/utilisateur/:id', auth, utilisateurController.getUserById);
utilisateurRouter.put('/utilisateur/:id', auth, upload.single('photoProfil'), utilisateurController.updateUserById);
utilisateurRouter.patch(
  '/utilisateur/:id/can-create-recensement',
  auth,
  authRole(['Admin', 'ADMIN']),
  fieldAgentAdminController.setFieldAgentAuthorization,
);
utilisateurRouter.patch(
  '/utilisateur/:id/field-agent-active',
  auth,
  authRole(['Admin', 'ADMIN']),
  fieldAgentAdminController.setFieldAgentActive,
);
utilisateurRouter.patch(
  '/utilisateur/:id/agent-password',
  auth,
  authRole(['Admin', 'ADMIN']),
  fieldAgentAdminController.resetAgentPassword,
);
utilisateurRouter.patch('/utilisateur/password', auth, utilisateurController.changePassword);
utilisateurRouter.post('/utilisateur/deactivate', auth, utilisateurController.deactivateAccount);
utilisateurRouter.post(
  '/utilisateur/request-account-deletion',
  auth,
  utilisateurController.requestAccountDeletion,
);
utilisateurRouter.post(
  '/utilisateur/public-deletion-request',
  utilisateurController.publicAccountDeletionRequest,
);
utilisateurRouter.post('/utilisateur/fcm-token', auth, utilisateurController.registerFcmToken);
utilisateurRouter.delete('/utilisateur/fcm-token', auth, utilisateurController.unregisterFcmToken);
utilisateurRouter.delete('/utilisateur/:id', auth, utilisateurController.deleteUserById);

export default utilisateurRouter;
