import bcrypt from "bcrypt";
import mongoose from "mongoose";
import validator from "validator";
import jwt from "jsonwebtoken";

// Config Cloudinary depuis les variables d'environnement
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Hash du mot de passe avant sauvegarde
UtilisateurSchema.pre("save", async function(next) {
  const user = this;
  if (user.isModified('password')) {
    user.password = await bcrypt.hash(user.password, 10);
  }
  next();
});

// Génération token JWT incluant le rôle
UtilisateurSchema.methods.generateAuthToken = async function() {
  const user = this;
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET manquant dans les variables d\'environnement');
  const token = jwt.sign(
    { _id: user._id.toString(), id: user._id.toString(), role: user.role },
    secret,
    { expiresIn: '7d' }
  );
  user.tokens = user.tokens.concat({ token });
  await user.save();
  return token;
};

// Méthode statique pour login par email ou téléphone
UtilisateurSchema.statics.findByCredentials = async function(identifiant, password) {
  let user = null;
  if (validator.isEmail(identifiant)) {
    user = await this.findOne({ email: identifiant });
  } else {
    user = await this.findOne({ telephone: identifiant });
  }

  if (!user) throw new Error('Identifiants incorrects');

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new Error('Identifiants incorrects');

  return user;
};


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
  }
};

// Virtuals pour relations
UtilisateurSchema.virtual('articles', {
  ref: 'Article',
  localField: '_id',
  foreignField: 'utilisateur'
});
UtilisateurSchema.virtual('prestataire', {
  ref: 'Prestataire',
  localField: '_id',
  foreignField: 'utilisateur'
});
UtilisateurSchema.virtual('freelance', {
  ref: 'Freelance',
  localField: '_id',
  foreignField: 'utilisateur'
});
UtilisateurSchema.virtual('vendeur', {
  ref: 'Vendeur',
  localField: '_id',
  foreignField: 'utilisateur'
});

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
    // 🛡️ IDOR : l'utilisateur ne peut modifier que son propre profil (sauf admin)
    const requesterId = req.utilisateur?._id?.toString();
    const targetId = req.params.id;
    if (requesterId !== targetId && req.utilisateur?.role !== 'Admin') {
      return res.status(403).json({ error: 'Accès refusé : vous ne pouvez modifier que votre propre profil' });
    }

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
    const validRoles = ['Admin', 'Prestataire', 'Vendeur', 'Freelance', 'Client'];
    if (safeUpdates.role && !validRoles.includes(safeUpdates.role)) {
      return res.status(400).json({ error: 'Rôle invalide' });
    }
    if (safeUpdates.role === 'Admin' && req.utilisateur?.role !== 'Admin') {
      return res.status(403).json({ error: 'Seul un administrateur peut attribuer le rôle Admin' });
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

    const safeUser = user.toObject();
    delete safeUser.password;
    delete safeUser.tokens;
    res.status(200).json(safeUser);
  } catch (err) {
    console.error("❌ Erreur updateUserById:", err);
    res.status(500).json({ error: err.message });
  }
};

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
