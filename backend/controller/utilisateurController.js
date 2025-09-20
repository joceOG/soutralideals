import multer from 'multer';
import cloudinary from 'cloudinary';
import fs from 'fs';
import Utilisateur from '../models/utilisateurModel.js';
import prestataireModel from '../models/prestataireModel.js';
import freelanceModel from '../models/freelanceModel.js';
import vendeurModel from '../models/vendeurModel.js';
import validator from 'validator';

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
});
export const upload = multer({ storage });

// ✅ INSCRIPTION
export const signUp = async (req, res) => {
  try {
    const { nom, prenom, datedenaissance, email, password, telephone, genre, note } = req.body;

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
    const newUser = new Utilisateur({ nom, prenom, datedenaissance, email, password, telephone, genre, note, photoProfil });
    await newUser.save();

    const token = await newUser.generateAuthToken();

    res.status(201).json({ utilisateur: newUser, token });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};


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
};


// ✅ DECONNEXION (statique)
export const logout = (req, res) => {
  res.status(200).json({ message: 'Déconnexion réussie' });
};

// ✅ LISTER TOUS LES UTILISATEURS
export const getAllUsers = async (req, res) => {
  try {
    const utilisateurs = await Utilisateur.find({});
    res.status(200).json(utilisateurs);
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
    const updates = req.body;

    // Upload photo si présent
    if (req.file) {
      const result = await cloudinary.v2.uploader.upload(req.file.path, { folder: 'users' });
      updates.photoProfil = result.secure_url;
      fs.unlinkSync(req.file.path);
    }

    const user = await Utilisateur.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    Object.assign(user, updates);
    await user.save(); // déclenche pre('save') pour hasher le password si modifié

    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ SUPPRIMER UN UTILISATEUR
export const deleteUserById = async (req, res) => {
  try {
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
};
