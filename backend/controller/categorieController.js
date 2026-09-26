import mongoose from 'mongoose';
import cloudinary from 'cloudinary';
import fs from 'fs';
import categorieModel from '../models/categorieModel.js';
import {
  resolveGroupeRef,
  sendControllerError,
} from '../utils/catalogValidation.js';

cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Mettre à jour une catégorie par ID
export const updateCategoryById = async (req, res) => {
    try {
        const { nomcategorie, groupe } = req.body;
        const { path: filePath } = req.file || {};

        let categorie = await categorieModel.findById(req.params.id);

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

        if (nomcategorie !== undefined) {
            if (!String(nomcategorie).trim()) {
                return res.status(400).json({ error: 'Nom de catégorie requis.' });
            }
            categorie.nomcategorie = String(nomcategorie).trim();
        }

        if (groupe !== undefined && groupe !== null && String(groupe).trim() !== '') {
            const groupeResolved = await resolveGroupeRef(groupe);
            if (groupeResolved.error) {
                return res.status(groupeResolved.status).json({ error: groupeResolved.error });
            }
            categorie.groupe = groupeResolved.id;
        }

        const updatedCategorie = await categorie.save();

        res.status(200).json(updatedCategorie);
    } catch (err) {
        return sendControllerError(res, err, 'updateCategoryById:');
    }
};


// Créer une nouvelle catégorie
export const createCategory = async (req, res) => {
    try {
        const { nomcategorie, groupe } = req.body;

        if (!nomcategorie || !String(nomcategorie).trim()) {
            return res.status(400).json({ error: 'Nom de catégorie requis.' });
        }

        if (!req.file?.path) {
            return res.status(400).json({ error: 'Image requise (champ imagecategorie).' });
        }

        const groupeResolved = await resolveGroupeRef(groupe);
        if (groupeResolved.error) {
            return res.status(groupeResolved.status).json({ error: groupeResolved.error });
        }

        const result = await cloudinary.v2.uploader.upload(req.file.path);
        fs.unlinkSync(req.file.path);

        const newCategorie = new categorieModel({
            nomcategorie: String(nomcategorie).trim(),
            imagecategorie: result.secure_url,
            groupe: groupeResolved.id,
        });

        await newCategorie.save();
        res.status(201).json(newCategorie);
    } catch (err) {
        return sendControllerError(res, err, 'createCategory:');
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
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
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
