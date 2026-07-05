<<<<<<< HEAD
=======
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 1cbdf58 (Amelioration du Dashboard Prestataire 2026)
>>>>>>> af7ea57 (Amelioration du Dashboard Prestataire 2026)
import multer from 'multer';
import cloudinary from 'cloudinary';
import fs from 'fs';
import Utilisateur from '../models/utilisateurModel.js';
import prestataireModel from '../models/prestataireModel.js';
import freelanceModel from '../models/freelanceModel.js';
import vendeurModel from '../models/vendeurModel.js';
import validator from 'validator';
<<<<<<< HEAD
=======
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 7a152ec (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
>>>>>>> af7ea57 (Amelioration du Dashboard Prestataire 2026)
import { assertPhoneVerificationToken, normalizePhone } from '../services/otpService.js';
import { sendWelcomeEmail } from '../services/emailService.js';

// Config Cloudinary depuis les variables d'environnement
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Config Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/utilisateurs'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
export const upload = multer({ storage });

// ✅ INSCRIPTION
export const signUp = async (req, res) => {
  try {
    const { nom, prenom, datedenaissance, email, password, telephone, genre, note, role, phoneVerificationToken } = req.body;

    const otpEnforced = process.env.OTP_REQUIRED === 'true';
    let normalizedPhone = telephone ? normalizePhone(telephone) : null;
    let telephoneVerified = false;

    if (otpEnforced && !phoneVerificationToken) {
      return res.status(400).json({ error: 'Vérification du téléphone requise (code OTP)' });
    }

    if (phoneVerificationToken) {
      try {
        normalizedPhone = assertPhoneVerificationToken(phoneVerificationToken, telephone);
        telephoneVerified = true;
      } catch (otpErr) {
        return res.status(400).json({ error: otpErr.message });
      }
    } else if (normalizedPhone) {
      normalizedPhone = normalizePhone(telephone);
    }

    // ✅ Accepter les rôles en minuscules et les convertir
    const validRoles = ["prestataire", "vendeur", "freelance", "client"];
    const roleMap = {
      "prestataire": "Prestataire",
      "vendeur": "Vendeur", 
      "freelance": "Freelance",
      "client": "Client"
    };
    
    if (!role || !validRoles.includes(role.toLowerCase())) {
      return res.status(400).json({ error: "Rôle invalide ou manquant" });
    }
    
    // Convertir le rôle en format backend
    const normalizedRole = roleMap[role.toLowerCase()];

    // Vérification unicité email/téléphone
    const conditions = [];
    if (email) conditions.push({ email });
    if (telephone) conditions.push({ telephone: normalizedPhone || telephone });
    const existingUser = conditions.length > 0 ? await Utilisateur.findOne({ $or: conditions }) : null;

    if (existingUser) {
      let error = '';
      if (email && existingUser.email === email) error = 'Email déjà utilisé';
      else if (telephone && existingUser.telephone === telephone) error = 'Numéro de téléphone déjà utilisé';
      return res.status(400).json({ error });
    }

    // Upload photo si présent
    let photoProfil = '';
    if (req.file) {
      const result = await cloudinary.v2.uploader.upload(req.file.path, { folder: 'users' });
      photoProfil = result.secure_url;
      fs.unlinkSync(req.file.path);
    }

    // Création de l'utilisateur
    const newUser = new Utilisateur({
      nom,
      prenom,
      datedenaissance,
      email,
      password,
      telephone: normalizedPhone || telephone,
      telephoneVerified: telephoneVerified,
      genre,
      note,
      photoProfil,
      role: normalizedRole,
    });
    await newUser.save();

    if (email) {
      sendWelcomeEmail(email, prenom).catch(() => {});
    }

    const token = await newUser.generateAuthToken();

    res.status(201).json({ utilisateur: newUser, token });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
<<<<<<< HEAD
};
=======
  next();
=======

// Config Cloudinary
cloudinary.v2.config({
  cloud_name: 'dm0c8st6k',
  api_key: '541481188898557',
  api_secret: '6ViefK1wxoJP50p8j2pQ7IykIYY',
});

// Config Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/utilisateurs'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
>>>>>>> 1cbdf58 (Amelioration du Dashboard Prestataire 2026)
});
export const upload = multer({ storage });

// ✅ INSCRIPTION
export const signUp = async (req, res) => {
  try {
    const { nom, prenom, datedenaissance, email, password, telephone, genre, note, role } = req.body;
>>>>>>> af7ea57 (Amelioration du Dashboard Prestataire 2026)


// ✅ CONNEXION
export const signIn = async (req, res) => {
  try {
    let { identifiant, password } = req.body;

    // 🔹 Sécurité : forcer en string + trim
    identifiant = identifiant ? String(identifiant).trim() : '';
    password = password ? String(password).trim() : '';

    // 🔹 Vérification des champs
    if (!identifiant) {
      return res.status(400).json({ error: 'Email ou téléphone requis' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Mot de passe requis' });
    }

    // 🔹 Recherche utilisateur via méthode statique
    let user;
    try {
      user = await Utilisateur.findByCredentials(identifiant, password);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    // 🔹 Génération du token
    const token = await user.generateAuthToken();

    res.status(200).json({
      message: 'Connexion réussie',
      utilisateur: user,
      token
    });
  } catch (e) {
    console.error("❌ Erreur signIn:", e);
    res.status(500).json({ error: "Erreur interne du serveur" });
<<<<<<< HEAD
  }
};

=======
=======
// Méthode statique pour login par email ou téléphone
UtilisateurSchema.statics.findByCredentials = async function(identifiant, password) {
  let user = null;
  if (validator.isEmail(identifiant)) {
    user = await this.findOne({ email: identifiant });
  } else {
    user = await this.findOne({ telephone: identifiant });
>>>>>>> 1ca350b (Dashboard Complet and Merge)
=======
    // ✅ Accepter les rôles en minuscules et les convertir
    const validRoles = ["prestataire", "vendeur", "freelance", "client"];
    const roleMap = {
      "prestataire": "Prestataire",
      "vendeur": "Vendeur", 
      "freelance": "Freelance",
      "client": "Client"
    };
    
    if (!role || !validRoles.includes(role.toLowerCase())) {
      return res.status(400).json({ error: "Rôle invalide ou manquant" });
    }
    
    // Convertir le rôle en format backend
    const normalizedRole = roleMap[role.toLowerCase()];

    // Vérification unicité email/téléphone
    const conditions = [];
    if (email) conditions.push({ email });
    if (telephone) conditions.push({ telephone });
    const existingUser = conditions.length > 0 ? await Utilisateur.findOne({ $or: conditions }) : null;

    if (existingUser) {
      let error = '';
      if (email && existingUser.email === email) error = 'Email déjà utilisé';
      else if (telephone && existingUser.telephone === telephone) error = 'Numéro de téléphone déjà utilisé';
      return res.status(400).json({ error });
    }

    // Upload photo si présent
    let photoProfil = '';
    if (req.file) {
      const result = await cloudinary.v2.uploader.upload(req.file.path, { folder: 'users' });
      photoProfil = result.secure_url;
      fs.unlinkSync(req.file.path);
    }

    // Création de l'utilisateur
    const newUser = new Utilisateur({ nom, prenom, datedenaissance, email, password, telephone, genre, note, photoProfil, role: normalizedRole });
    await newUser.save();

    const token = await newUser.generateAuthToken();

    res.status(201).json({ utilisateur: newUser, token });
  } catch (e) {
    res.status(400).json({ error: e.message });
>>>>>>> 9ae6c75 (Merge Dashboard Complete 2026)
  }
};

<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> af7ea57 (Amelioration du Dashboard Prestataire 2026)

// ✅ DECONNEXION : invalide le token courant en base
export const logout = async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
      // Retirer le token actif de la liste des tokens de l'utilisateur
      await Utilisateur.updateOne(
        { 'tokens.token': token },
        { $pull: { tokens: { token } } }
      );
    }
    res.status(200).json({ message: 'Déconnexion réussie' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
// Méthode d'instance pour comparer un mot de passe en clair avec le hash
UtilisateurSchema.methods.comparePassword = async function(password) {
  return bcrypt.compare(password, this.password);
>>>>>>> 1ca350b (Dashboard Complet and Merge)
=======

// ✅ CONNEXION
export const signIn = async (req, res) => {
  try {
    let { identifiant, password } = req.body;

    // 🔹 Sécurité : forcer en string + trim
    identifiant = identifiant ? String(identifiant).trim() : '';
    password = password ? String(password).trim() : '';

    console.log("📥 Requête reçue signIn:", { identifiant, password });

    // 🔹 Vérification des champs
    if (!identifiant) {
      return res.status(400).json({ error: 'Email ou téléphone requis' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Mot de passe requis' });
    }

    // 🔹 Recherche utilisateur via méthode statique
    let user;
    try {
      user = await Utilisateur.findByCredentials(identifiant, password);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    // 🔹 Génération du token
    const token = await user.generateAuthToken();

    res.status(200).json({
      message: 'Connexion réussie',
      utilisateur: user,
      token
    });
  } catch (e) {
    console.error("❌ Erreur signIn:", e);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
>>>>>>> 1cbdf58 (Amelioration du Dashboard Prestataire 2026)
};


<<<<<<< HEAD
<<<<<<< HEAD
    const [utilisateurs, total] = await Promise.all([
      Utilisateur.find({})
        .select('-password -tokens')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Utilisateur.countDocuments({})
    ]);

    res.status(200).json({
      utilisateurs,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
=======
// ✅ DECONNEXION (statique)
export const logout = (req, res) => {
  res.status(200).json({ message: 'Déconnexion réussie' });
=======
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
>>>>>>> af7ea57 (Amelioration du Dashboard Prestataire 2026)
};

// ✅ LISTER TOUS LES UTILISATEURS (ADMIN seulement, avec pagination)
export const getAllUsers = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [utilisateurs, total] = await Promise.all([
      Utilisateur.find({})
        .select('-password -tokens')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Utilisateur.countDocuments({})
    ]);

    res.status(200).json({
      utilisateurs,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
<<<<<<< HEAD
=======
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
// ✅ DECONNEXION (statique)
export const logout = (req, res) => {
  res.status(200).json({ message: 'Déconnexion réussie' });
};

// ✅ LISTER TOUS LES UTILISATEURS
export const getAllUsers = async (req, res) => {
  try {
    const utilisateurs = await Utilisateur.find({});
    res.status(200).json(utilisateurs);
>>>>>>> 1cbdf58 (Amelioration du Dashboard Prestataire 2026)
>>>>>>> af7ea57 (Amelioration du Dashboard Prestataire 2026)
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ RÉCUPÉRER UN UTILISATEUR PAR ID
export const getUserById = async (req, res) => {
  try {
    const utilisateur = await Utilisateur.findById(req.params.id);
    if (!utilisateur) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    res.status(200).json(utilisateur);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ MODIFIER UN UTILISATEUR
export const updateUserById = async (req, res) => {
  try {
<<<<<<< HEAD
=======
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
>>>>>>> af7ea57 (Amelioration du Dashboard Prestataire 2026)
    // 🛡️ IDOR : l'utilisateur ne peut modifier que son propre profil (sauf admin)
    const requesterId = req.utilisateur?._id?.toString();
    const targetId = req.params.id;
    if (requesterId !== targetId && req.utilisateur?.role !== 'Admin') {
      return res.status(403).json({ error: 'Accès refusé : vous ne pouvez modifier que votre propre profil' });
    }

<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
=======
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
>>>>>>> 1cbdf58 (Amelioration du Dashboard Prestataire 2026)
>>>>>>> af7ea57 (Amelioration du Dashboard Prestataire 2026)
    // 1️⃣ Champs autorisés à être mis à jour par le front
    const allowedFields = [
      'nom',
      'prenom',
      'email',
      'telephone',
      'genre',
      'note',
      'datedenaissance',
      'role' // uniquement si tu veux autoriser la modification
    ];

    // 2️⃣ Construire l'objet safeUpdates avec uniquement les champs autorisés
    const safeUpdates = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) safeUpdates[key] = req.body[key];
    }

    // 3️⃣ Vérification du rôle si présent
<<<<<<< HEAD
=======
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
>>>>>>> af7ea57 (Amelioration du Dashboard Prestataire 2026)
    const validRoles = ['Admin', 'Prestataire', 'Vendeur', 'Freelance', 'Client'];
    if (safeUpdates.role && !validRoles.includes(safeUpdates.role)) {
      return res.status(400).json({ error: 'Rôle invalide' });
    }
    if (safeUpdates.role === 'Admin' && req.utilisateur?.role !== 'Admin') {
      return res.status(403).json({ error: 'Seul un administrateur peut attribuer le rôle Admin' });
<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
    if (safeUpdates.role && !['Prestataire', 'Vendeur', 'Freelance', 'Client'].includes(safeUpdates.role)) {
      return res.status(400).json({ error: "Rôle invalide" });
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
=======
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
    if (safeUpdates.role && !['Prestataire', 'Vendeur', 'Freelance', 'Client'].includes(safeUpdates.role)) {
      return res.status(400).json({ error: "Rôle invalide" });
>>>>>>> 1cbdf58 (Amelioration du Dashboard Prestataire 2026)
>>>>>>> af7ea57 (Amelioration du Dashboard Prestataire 2026)
    }

    // 4️⃣ Upload photoProfil si présent
    if (req.file) {
      const result = await cloudinary.v2.uploader.upload(req.file.path, { folder: 'users' });
      safeUpdates.photoProfil = result.secure_url;
      fs.unlinkSync(req.file.path);
    }

    // 5️⃣ Chercher l'utilisateur
    const user = await Utilisateur.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    // 6️⃣ Mettre à jour uniquement les champs autorisés
    Object.assign(user, safeUpdates);

    // 7️⃣ Sauvegarder l'utilisateur (pré-save pour hasher le mot de passe si modifié)
    await user.save();

<<<<<<< HEAD
=======
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
>>>>>>> af7ea57 (Amelioration du Dashboard Prestataire 2026)
    const safeUser = user.toObject();
    delete safeUser.password;
    delete safeUser.tokens;
    res.status(200).json(safeUser);
<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
    res.status(200).json(user);
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
=======
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
    res.status(200).json(user);
>>>>>>> 1cbdf58 (Amelioration du Dashboard Prestataire 2026)
>>>>>>> af7ea57 (Amelioration du Dashboard Prestataire 2026)
  } catch (err) {
    console.error("❌ Erreur updateUserById:", err);
    res.status(500).json({ error: err.message });
  }
};

<<<<<<< HEAD
=======
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
>>>>>>> af7ea57 (Amelioration du Dashboard Prestataire 2026)
// ✅ CHANGER LE MOT DE PASSE
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Mot de passe actuel et nouveau mot de passe requis',
      });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({
        error: 'Le nouveau mot de passe doit contenir au moins 6 caractères',
      });
    }

    const user = await Utilisateur.findById(req.utilisateur._id);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const isValid = await user.comparePassword(currentPassword);
    if (!isValid) {
      return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ message: 'Mot de passe modifié avec succès' });
  } catch (err) {
    console.error('❌ Erreur changePassword:', err);
    res.status(500).json({ error: err.message });
  }
};

// ✅ SUPPRIMER UN UTILISATEUR
export const deleteUserById = async (req, res) => {
  try {
    // 🛡️ IDOR : seul l'utilisateur lui-même ou un admin peut supprimer
    const requesterId = req.utilisateur?._id?.toString();
    const targetId = req.params.id;
    if (requesterId !== targetId && req.utilisateur?.role !== 'Admin') {
      return res.status(403).json({ error: 'Accès refusé : vous ne pouvez supprimer que votre propre compte' });
    }

<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
// ✅ SUPPRIMER UN UTILISATEUR
export const deleteUserById = async (req, res) => {
  try {
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
=======
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
// ✅ SUPPRIMER UN UTILISATEUR
export const deleteUserById = async (req, res) => {
  try {
>>>>>>> 1cbdf58 (Amelioration du Dashboard Prestataire 2026)
>>>>>>> af7ea57 (Amelioration du Dashboard Prestataire 2026)
    const utilisateur = await Utilisateur.findByIdAndDelete(req.params.id);
    if (!utilisateur) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    res.status(200).json({ message: 'Utilisateur supprimé avec succès' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ RÔLES UTILISATEUR AGRÉGÉS
export const getUserRoles = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await Utilisateur.findById(id).lean();
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    // Rôle de base
    const roles = new Set(['CLIENT']);

    // Vérifier existence des documents liés
    const [prestataire, freelance, vendeur] = await Promise.all([
      prestataireModel.findOne({ utilisateur: id }).lean(),
      freelanceModel.findOne({ utilisateur: id }).lean(),
      vendeurModel.findOne({ utilisateur: id }).lean(),
    ]);

    if (prestataire) roles.add('PRESTATAIRE');
    if (freelance) roles.add('FREELANCE');
    if (vendeur) roles.add('VENDEUR');

    // L’admin peut être déterminé par un champ futur, placeholder ici
    if (user.role === 'ADMIN' || user.isAdmin === true) roles.add('ADMIN');

    // Statuts détaillés par rôle
    const details = {
      prestataire: prestataire ? { id: prestataire._id, verifier: !!prestataire.verifier } : null,
      freelance: freelance ? { id: freelance._id, accountStatus: freelance.accountStatus || 'Pending' } : null,
      vendeur: vendeur ? { id: vendeur._id, verifier: !!vendeur.verifier } : null,
    };

    return res.status(200).json({
      utilisateur: { _id: user._id, nom: user.nom, prenom: user.prenom, email: user.email, telephone: user.telephone },
      roles: Array.from(roles),
      details,
    });
  } catch (err) {
    console.error('Erreur getUserRoles:', err.message);
    res.status(500).json({ error: err.message });
  }
<<<<<<< HEAD
};
=======
};
<<<<<<< HEAD
=======
const utilisateurModel = mongoose.model("Utilisateur", UtilisateurSchema);
export default utilisateurModel;
>>>>>>> 1ca350b (Dashboard Complet and Merge)
=======
>>>>>>> 1cbdf58 (Amelioration du Dashboard Prestataire 2026)
>>>>>>> af7ea57 (Amelioration du Dashboard Prestataire 2026)
