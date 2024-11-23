import fs from 'fs';
import cloudinary from 'cloudinary';
import articleModel from '../models/articleModel.js';
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 1b487c7 (Connexion effective entre front et back)
import fs from 'fs';
import cloudinary from 'cloudinary';
import articleModel from '../models/articleModel.js';

// Configuration de Cloudinary
cloudinary.v2.config({
// Configuration de Cloudinary
cloudinary.v2.config({
<<<<<<< HEAD
=======

// Configuration de Cloudinary
cloudinary.v2.config({
>>>>>>> 0b7e280 (Connexion effective entre front et back)
=======
>>>>>>> 1b487c7 (Connexion effective entre front et back)
    cloud_name: "dm0c8st6k",
    api_key: "541481188898557",
    api_secret: "6ViefK1wxoJP50p8j2pQ7IykIYY",
});
<<<<<<< HEAD
<<<<<<< HEAD
});

// Met à jour un article (avec upload d'image)
export const updateArticle = async (req, res) => {
// Met à jour un article (avec upload d'image)
export const updateArticle = async (req, res) => {
    try {
        const { nomArticle, prixArticle, quantiteArticle, categorie } = req.body;

        // l'article existe
        const articleToUpdate = await articleModel.findById(req.params.id);
        if (!articleToUpdate) {
            return res.status(404).json({ error: 'Article non trouvé' });
        }

        //  au cas ou
        // if (articleToUpdate.owner.toString() !== req.user._id.toString()) {
        //     return res.status(403).json({ error: "Vous n'avez pas les droits pour modifier cet article." });
        // }

        let updatedFields = { nomArticle, prixArticle, quantiteArticle, categorie };


=======
=======
});
>>>>>>> 1b487c7 (Connexion effective entre front et back)

// Met à jour un article (avec upload d'image)
export const updateArticle = async (req, res) => {
// Met à jour un article (avec upload d'image)
export const updateArticle = async (req, res) => {
    try {
        const { nomArticle, prixArticle, quantiteArticle, categorie } = req.body;

>>>>>>> 0b7e280 (Connexion effective entre front et back)
        let updatedFields = {
            nomArticle,
            prixArticle,
            quantiteArticle,
            categorie,
        };


        let updatedFields = {
            nomArticle,
            prixArticle,
            quantiteArticle,
            categorie,
        };

        if (req.file) {
            // Upload nouvelle image
<<<<<<< HEAD
<<<<<<< HEAD
            const result = await cloudinary.v2.uploader.upload(req.file.path, { folder: 'articles' });
            // Upload nouvelle image
=======
>>>>>>> 0b7e280 (Connexion effective entre front et back)
=======
=======
            const result = await cloudinary.v2.uploader.upload(req.file.path, { folder: 'articles' });
            // Upload nouvelle image
>>>>>>> a814426 (Connexion effective entre front et back)
>>>>>>> 1b487c7 (Connexion effective entre front et back)
            const result = await cloudinary.v2.uploader.upload(req.file.path, {
                folder: 'articles',
            });

            // Supprimer l'image temporaire
<<<<<<< HEAD
<<<<<<< HEAD
            // Supprimer l'image temporaire
            fs.unlinkSync(req.file.path);

            // Ajouter l'URL de l'image au champ mis à jour
            // Ajouter l'URL de l'image au champ mis à jour
            updatedFields.photoArticle = result.secure_url;

            // Supprimer l'ancienne image sur Cloudinary si elle existe
            if (articleToUpdate?.photoArticle) {
=======
=======
            // Supprimer l'image temporaire
>>>>>>> 1b487c7 (Connexion effective entre front et back)
            fs.unlinkSync(req.file.path);

            // Ajouter l'URL de l'image au champ mis à jour
            // Ajouter l'URL de l'image au champ mis à jour
            updatedFields.photoArticle = result.secure_url;

>>>>>>> 0b7e280 (Connexion effective entre front et back)
            // Supprimer l'ancienne image dans Cloudinary si elle existe
            const articleToUpdate = await articleModel.findById(req.params.id);
            if (articleToUpdate?.photoArticle) {
            // Supprimer l'ancienne image dans Cloudinary si elle existe
            const articleToUpdate = await articleModel.findById(req.params.id);
            if (articleToUpdate?.photoArticle) {
                const publicId = articleToUpdate.photoArticle.split('/').slice(-2).join('/').split('.')[0];
                await cloudinary.v2.uploader.destroy(publicId);
            }
        }

<<<<<<< HEAD
<<<<<<< HEAD
=======
=======
>>>>>>> 1b487c7 (Connexion effective entre front et back)
        const updatedArticle = await articleModel.findByIdAndUpdate(req.params.id, updatedFields, { new: true });
                await cloudinary.v2.uploader.destroy(publicId);
            }
        }

<<<<<<< HEAD
=======
>>>>>>> 0b7e280 (Connexion effective entre front et back)
=======
>>>>>>> a814426 (Connexion effective entre front et back)
>>>>>>> 1b487c7 (Connexion effective entre front et back)
        const updatedArticle = await articleModel.findByIdAndUpdate(
            req.params.id,
            updatedFields,
            { new: true }
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
        ).populate('categorie');
<<<<<<< HEAD
<<<<<<< HEAD
        )
=======
>>>>>>> 0b7e280 (Connexion effective entre front et back)
=======
=======
        )
>>>>>>> 6ae59ac (Connexion effective entre front et back)
>>>>>>> 7f93ecd (Connexion effective entre front et back)
=======
        )
>>>>>>> ed23bf8 (Soutrali Dashboard V1)
=======
        )
=======
        ).populate('categorie');
>>>>>>> a814426 (Connexion effective entre front et back)
>>>>>>> 1b487c7 (Connexion effective entre front et back)

        if (!updatedArticle) {
            return res.status(404).json({ error: 'Article non trouvé' });
        }

        res.status(200).json(updatedArticle);
    } catch (err) {
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
        // console.error('Erreur lors de la mise à jour de l\'article:', err.message);
=======
        console.error('Erreur lors de la mise à jour de l\'article:', err.message);
>>>>>>> 0b7e280 (Connexion effective entre front et back)
=======
        console.error('Erreur lors de la mise à jour de l\'article:', err.message);
=======
        // console.error('Erreur lors de la mise à jour de l\'article:', err.message);
>>>>>>> 6ae59ac (Connexion effective entre front et back)
>>>>>>> 7f93ecd (Connexion effective entre front et back)
=======
        // console.error('Erreur lors de la mise à jour de l\'article:', err.message);
>>>>>>> ed23bf8 (Soutrali Dashboard V1)
=======
        // console.error('Erreur lors de la mise à jour de l\'article:', err.message);
=======
        console.error('Erreur lors de la mise à jour de l\'article:', err.message);
>>>>>>> a814426 (Connexion effective entre front et back)
>>>>>>> 1b487c7 (Connexion effective entre front et back)
        res.status(500).json({ error: err.message });
    }
};

// Crée un nouvel article avec upload d'image
export const createArticle = async (req, res) => {
    try {
        const { nomArticle, prixArticle, quantiteArticle, categorie } = req.body;

        if (!req.file) {
            return res.status(400).json({ error: 'Aucun fichier image téléchargé' });
<<<<<<< HEAD
<<<<<<< HEAD
            return res.status(400).json({ error: 'Aucun fichier image téléchargé' });
=======
>>>>>>> 0b7e280 (Connexion effective entre front et back)
=======
            return res.status(400).json({ error: 'Aucun fichier image téléchargé' });
>>>>>>> 1b487c7 (Connexion effective entre front et back)
        }

        const result = await cloudinary.v2.uploader.upload(req.file.path, {
            folder: 'articles',
<<<<<<< HEAD
<<<<<<< HEAD
        const result = await cloudinary.v2.uploader.upload(req.file.path, {
            folder: 'articles',
=======
>>>>>>> 0b7e280 (Connexion effective entre front et back)
=======
        const result = await cloudinary.v2.uploader.upload(req.file.path, {
            folder: 'articles',
>>>>>>> 1b487c7 (Connexion effective entre front et back)
        });

        fs.unlinkSync(req.file.path);

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
        const newArticle = new articleModel({
<<<<<<< HEAD
=======
        const newArticle = new Article({
>>>>>>> 0b7e280 (Connexion effective entre front et back)
=======
        const newArticle = new Article({
=======
        const newArticle = new articleModel({
>>>>>>> 6ae59ac (Connexion effective entre front et back)
>>>>>>> 7f93ecd (Connexion effective entre front et back)
=======
        const newArticle = new articleModel({
>>>>>>> ed23bf8 (Soutrali Dashboard V1)
=======
        const newArticle = new Article({
>>>>>>> 1b487c7 (Connexion effective entre front et back)
            nomArticle,
            prixArticle,
            quantiteArticle,
            photoArticle: result.secure_url,
<<<<<<< HEAD
<<<<<<< HEAD
            photoArticle: result.secure_url,
=======
>>>>>>> 0b7e280 (Connexion effective entre front et back)
=======
            photoArticle: result.secure_url,
>>>>>>> 1b487c7 (Connexion effective entre front et back)
            categorie,
        });

        await newArticle.save();
        res.status(201).json(newArticle);
    } catch (err) {
        console.error('Erreur lors de la création de l\'article:', err.message);
<<<<<<< HEAD
<<<<<<< HEAD
        console.error('Erreur lors de la création de l\'article:', err.message);
=======
>>>>>>> 0b7e280 (Connexion effective entre front et back)
=======
        console.error('Erreur lors de la création de l\'article:', err.message);
>>>>>>> 1b487c7 (Connexion effective entre front et back)
        res.status(500).json({ error: err.message });
    }
};

// Récupère tous les articles
export const getAllArticles = async (req, res) => {
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 1b487c7 (Connexion effective entre front et back)
};

// Récupère tous les articles
export const getAllArticles = async (req, res) => {
<<<<<<< HEAD
    try {
        const articles = await articleModel.find({}).populate('categorie');
        
        res.status(200).json(articles);
    } catch (err) {
        // console.error('Erreur lors de la récupération des articles:', err.message);
        res.status(500).json( 'Impossible de récupérer les articles' );
    }
};
};

// Récupère un article par ID
export const getArticleById = async (req, res) => {
// Récupère un article par ID
export const getArticleById = async (req, res) => {
    try {
        const article = await articleModel.findById(req.params.id).populate('categorie');
        const article = await articleModel.findById(req.params.id).populate('categorie');
=======
=======
>>>>>>> 1b487c7 (Connexion effective entre front et back)
    try {
        const articles = await articleModel.find({}).populate('categorie');
        
        const articles = await articleModel.find().populate('categorie');
        res.status(200).json(articles);
    } catch (err) {
        // console.error('Erreur lors de la récupération des articles:', err.message);
        res.status(500).json( 'Impossible de récupérer les articles' );
        console.error('Erreur lors de la récupération des articles:', err.message);
        res.status(500).json({ error: err.message });
    }
};
};

// Récupère un article par ID
export const getArticleById = async (req, res) => {
// Récupère un article par ID
export const getArticleById = async (req, res) => {
    try {
        const article = await articleModel.findById(req.params.id).populate('categorie');
<<<<<<< HEAD
>>>>>>> 0b7e280 (Connexion effective entre front et back)
=======
        const article = await articleModel.findById(req.params.id).populate('categorie');
>>>>>>> 1b487c7 (Connexion effective entre front et back)
        if (!article) {
            return res.status(404).json({ error: 'Article non trouvé' });
        }
        res.status(200).json(article);
    } catch (err) {
        console.error('Erreur lors de la récupération de l\'article:', err.message);
<<<<<<< HEAD
<<<<<<< HEAD
        console.error('Erreur lors de la récupération de l\'article:', err.message);
        res.status(500).json({ error: err.message });
    }
};
};

// Supprime un article par ID
export const deleteArticle = async (req, res) => {
// Supprime un article par ID
export const deleteArticle = async (req, res) => {
    try {
        const article = await articleModel.findByIdAndDelete(req.params.id);

        const article = await articleModel.findByIdAndDelete(req.params.id);

=======
=======
        console.error('Erreur lors de la récupération de l\'article:', err.message);
>>>>>>> 1b487c7 (Connexion effective entre front et back)
        res.status(500).json({ error: err.message });
    }
};
};

// Supprime un article par ID
export const deleteArticle = async (req, res) => {
// Supprime un article par ID
export const deleteArticle = async (req, res) => {
    try {
        const article = await articleModel.findByIdAndDelete(req.params.id);

<<<<<<< HEAD
>>>>>>> 0b7e280 (Connexion effective entre front et back)
=======
        const article = await articleModel.findByIdAndDelete(req.params.id);

>>>>>>> 1b487c7 (Connexion effective entre front et back)
        if (!article) {
            return res.status(404).json({ error: 'Article non trouvé' });
        }

<<<<<<< HEAD
<<<<<<< HEAD

        res.status(200).json({ message: 'Article supprimé avec succès' });
    } catch (err) {
        console.error('Erreur lors de la suppression de l\'article:', err.message);
        console.error('Erreur lors de la suppression de l\'article:', err.message);
        res.status(500).json({ error: err.message });
    }
};
};
=======
=======

>>>>>>> 1b487c7 (Connexion effective entre front et back)
        res.status(200).json({ message: 'Article supprimé avec succès' });
    } catch (err) {
        console.error('Erreur lors de la suppression de l\'article:', err.message);
        console.error('Erreur lors de la suppression de l\'article:', err.message);
        res.status(500).json({ error: err.message });
    }
};
<<<<<<< HEAD
>>>>>>> 0b7e280 (Connexion effective entre front et back)
=======
};
>>>>>>> 1b487c7 (Connexion effective entre front et back)
