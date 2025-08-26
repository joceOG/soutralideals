import multer from 'multer';
import cloudinary from 'cloudinary';
import fs from 'fs';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Utilisateur from '../models/utilisateurModel.js';

// Config Cloudinary
cloudinary.v2.config({
  cloud_name: 'dm0c8st6k',
  api_key: '541481188898557',
  api_secret: '6ViefK1wxoJP50p8j2pQ7IykIYY',
});

// Config Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/utilisateurs');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

export const upload = multer({ storage });

const maxAge = 3 * 24 * 60 * 60 * 1000;
const createToken = (id) => {
  return jwt.sign({ id }, process.env.TOKEN_SECRET || '123456', { expiresIn: maxAge });
};

// ✅ INSCRIPTION
export const signUp = async (req, res) => {
  try {
    const {
      nom, prenom, datedenaissance, email,
      motdepasse, telephone, genre, note
    } = req.body;

    console.log("📥 Données reçues:", req.body);

    const conditions = [];
    if (email && email.trim() !== "") {
      conditions.push({ email: email });
    }
    if (telephone && telephone.trim() !== "") {
      conditions.push({ telephone: telephone });
    }

    let existingUser = null;
    if (conditions.length > 0) {
      existingUser = await Utilisateur.findOne({ $or: conditions });
    }

if (existingUser) {
  let error = '';
  if (email && existingUser.email === email) error = 'Email déjà utilisé';
  else if (telephone && existingUser.telephone === telephone) error = 'Numéro de téléphone déjà utilisé';

  return res.status(400).json({ error });
}

    let photoProfil = '';
    if (req.file) {
      const result = await cloudinary.v2.uploader.upload(req.file.path, {
        folder: 'users',
      });
      photoProfil = result.secure_url;
      fs.unlinkSync(req.file.path);
    }

    const hashedPassword = await bcrypt.hash(motdepasse, 10);

    const newUser = new Utilisateur({
      nom, prenom, datedenaissance, email,
      password: hashedPassword, telephone,
      genre, note, photoProfil
    });

    await newUser.save();
    const token = createToken(newUser._id);

    res.status(201).json({ utilisateur: newUser, token });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

// ✅ CONNEXION
export const signIn = async (req, res) => {
  const { email, password } = req.body;

  try {
    const utilisateur = await Utilisateur.findOne({ email });
    if (!utilisateur) {
      return res.status(400).json({ error: "Utilisateur non trouvé" });
    }

    const isMatch = await bcrypt.compare(password, utilisateur.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Mot de passe incorrect" });
    }

    const token = createToken(utilisateur._id);
    res.status(200).json({ utilisateur, token });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// ✅ DECONNEXION
export const logout = (req, res) => {
  res.status(200).json({ message: 'Déconnexion réussie (statique)' });
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
    if (!utilisateur) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    res.status(200).json(utilisateur);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ MODIFIER UN UTILISATEUR
export const updateUserById = async (req, res) => {
  try {
    const updates = req.body;

    if (req.file) {
      const result = await cloudinary.v2.uploader.upload(req.file.path, {
        folder: 'users',
      });
      updates.photoProfil = result.secure_url;
      fs.unlinkSync(req.file.path);
    }

    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    const utilisateur = await Utilisateur.findByIdAndUpdate(req.params.id, updates, { new: true });

    if (!utilisateur) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.status(200).json(utilisateur);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ SUPPRIMER UN UTILISATEUR
export const deleteUserById = async (req, res) => {
  try {
    const utilisateur = await Utilisateur.findByIdAndDelete(req.params.id);
    if (!utilisateur) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    res.status(200).json({ message: 'Utilisateur supprimé avec succès' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
