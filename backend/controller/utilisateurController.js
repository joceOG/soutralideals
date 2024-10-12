const express = require('express');
const router = express.Router();
const Utilisateur = require('../models/utilisateurModel');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const cloudinary = require("cloudinary").v2;
const bcrypt = require('bcrypt'); // Import bcrypt here as well if necessary

cloudinary.config({
    cloud_name: "dm0c8st6k",
    api_key: "541481188898557",
    api_secret: "6ViefK1wxoJP50p8j2pQ7IykIYY",
});

router.post('/utilisateur', upload.single('photo'), async (req, res) => {
    try {
        const { nom, prenom, email, motdepasse, telephone, genre, note } = req.body;

        let photoprofilUrl = '';

        if (req.file) {
            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: 'users',
            });
            photoprofilUrl = result.secure_url;
        } 

        // Ensure motdepasse is provided
        if (!motdepasse) {
            return res.status(400).json({ error: 'Password is required' });
        }

        // Hash the password before saving
        const hashedPassword = await bcrypt.hash(motdepasse, 10);

        const newUtilisateur = new Utilisateur({
            nom,
            prenom,
            email,
            password: hashedPassword, // Save hashed password
            telephone,
            genre,
            note,
            photoProfil: photoprofilUrl,
        });

        await newUtilisateur.save();
        res.status(201).json(newUtilisateur);
    } catch (err) {
        console.error('Erreur lors de la création de l\'utilisateur:', err);
        res.status(500).json({ error: err.message });
    }
});




// Obtenir tous les utilisateurs
router.get('/utilisateurs', async (req, res) => {
    try {
        const utilisateurs = await Utilisateur.find();
        res.status(200).json(utilisateurs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Obtenir un utilisateur par ID
router.get('/utilisateur/:id', async (req, res) => {
    try {
        const utilisateur = await Utilisateur.findById(req.params.id);
        if (!utilisateur) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }
        res.status(200).json(utilisateur);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Mettre à jour un utilisateur par ID
router.put('/utilisateur/:id', async (req, res) => {
    try {
        const { nom, prenom, email, motdepasse, telephone, genre, note, photoprofil } = req.body;
        const updatedData = {
            nom,
            prenom,
            email,
            motdepasse,
            telephone,
            genre,
            note
        };
        if (photoprofil) {
            updatedData.photoprofil = Buffer.from(photoprofil, 'base64');
        }
        const utilisateur = await Utilisateur.findByIdAndUpdate(req.params.id, updatedData, { new: true });
        if (!utilisateur) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }
        res.status(200).json(utilisateur);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Supprimer un utilisateur par ID
router.delete('/utilisateur/:id', async (req, res) => {
    try {
        const utilisateur = await Utilisateur.findByIdAndDelete(req.params.id);
        if (!utilisateur) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }
        res.status(200).json({ message: 'Utilisateur supprimé avec succès' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
