import multer from 'multer';
import cloudinary from 'cloudinary';
import fs from 'fs';
import mongoose from 'mongoose';
import categorieModel from '../models/categorieModel.js';

// Configure Cloudinary
cloudinary.v2.config({
    cloud_name: "dm0c8st6k",
    api_key: "541481188898557",
    api_secret: "6ViefK1wxoJP50p8j2pQ7IykIYY",
});

// Configure Multer
const upload = multer({ dest: 'uploads/' });

// Mettre à jour une catégorie par ID
export const updateCategoryById = async (req, res) => {
    try {
        const { nomcategorie, groupe } = req.body;
        const { path: filePath } = req.file || {};

        let categorie = await categorieModel.findById(req.params.id); // 🔁 utiliser let ici

        if (!categorie) {
            return res.status(404).json({ error: 'Catégorie non trouvée' });
        }

        if (filePath) {
            const result = await cloudinary.v2.uploader.upload(filePath);
            fs.unlinkSync(filePath);

            if (categorie.imagecategorie) {
                const publicId = categorie.imagecategorie.split('/').pop().split('.')[0];
                await cloudinary.v2.uploader.destroy(publicId);
            }

            categorie.imagecategorie = result.secure_url;
        }

        categorie.nomcategorie = nomcategorie || categorie.nomcategorie;
        categorie.groupe = groupe ? mongoose.Types.ObjectId(groupe) : categorie.groupe;

        const updatedCategorie = await categorie.save(); // ✅ ici on appelle .save() sur l'instance

        res.status(200).json(updatedCategorie);
    } catch (err) {
        res.status(500).json({ error: err.message });
        console.log("Erreur : " + err.message);
    }
};


// Créer une nouvelle catégorie
export const createCategory = async (req, res) => {
    try {
        const { nomcategorie, groupe } = req.body;
        const result = await cloudinary.v2.uploader.upload(req.file.path);
        fs.unlinkSync(req.file.path);

        var groupeId = mongoose.Types.ObjectId(groupe);
        console.log("Id Groupe" , groupeId); 

        const newCategorie = new categorieModel({
            nomcategorie,
            imagecategorie: result.secure_url,
            groupe: groupeId,
        });

        await newCategorie.save();
        res.status(201).json(newCategorie);
    } catch (err) {
        res.status(500).json({ error: err.message });
        console.log("Erreur:", err.message);
    }
};

// Obtenir toutes les catégories
export const getAllCategories = async (req, res) => {
    try {
        const categories = await categorieModel.find({}).populate('groupe');
        res.status(200).json(categories);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Obtenir une catégorie par ID
export const getCategoryById = async (req, res) => {
    try {
        const categorie = await categorieModel.findById(req.params.id).populate('groupe');
        if (!categorie) {
            return res.status(404).json({ error: 'Catégorie non trouvée' });
        }
        res.status(200).json(categorie);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// controllers/categorieController.js

export const getCategoriesByGroupe = async (req, res) => {
  try {
    const { nomgroupe } = req.params;

    const categories = await categorieModel.find()
      .populate({
        path: 'groupe',
        match: { nomgroupe },
        select: 'nomgroupe',
      });

    const filteredCategories = categories.filter(cat => cat.groupe);

    res.json(filteredCategories);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err });
  }
};


// Supprimer une catégorie par ID
export const deleteCategoryById = async (req, res) => {
    try {
        const categorie = await categorieModel.findByIdAndDelete(req.params.id);
        if (!categorie) {
            return res.status(404).json({ error: 'Catégorie non trouvée' });
        }
        res.status(200).json({ message: 'Catégorie supprimée avec succès' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};