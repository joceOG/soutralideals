import { Router } from 'express';
import multer from 'multer';
import {
    createArticle,
    getAllArticles,
    getArticleById,
    updateArticleById,
    deleteArticle,
} from '../controller/articleController.js';

const articleRouter = Router();
const upload = multer({ dest: 'uploads/' });

/**
 * @swagger
 * /api/article:
 *   post:
 *     summary: Créer un nouvel article
 *     tags: [Articles]
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: photoArticle
 *         type: file
 *         description: Image de l'article
 *       - in: formData
 *         name: titre
 *         type: string
 *         required: true
 *         description: Titre de l'article
 *       - in: formData
 *         name: description
 *         type: string
 *         required: true
 *         description: Description de l'article
 *       - in: formData
 *         name: prix
 *         type: number
 *         required: true
 *         description: Prix de l'article
 *     responses:
 *       201:
 *         description: Article créé avec succès
 *       400:
 *         description: Données invalides
 */
articleRouter.post('/article', upload.single('photoArticle'), createArticle);

/**
 * @swagger
 * /api/articles:
 *   get:
 *     summary: Récupérer tous les articles
 *     tags: [Articles]
 *     responses:
 *       200:
 *         description: Liste des articles récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   titre:
 *                     type: string
 *                   description:
 *                     type: string
 *                   prix:
 *                     type: number
 *                   photoArticle:
 *                     type: string
 */
articleRouter.get('/articles', getAllArticles);

/**
 * @swagger
 * /api/article/{id}:
 *   get:
 *     summary: Récupérer un article par son ID
 *     tags: [Articles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID de l'article
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Article trouvé avec succès
 *       404:
 *         description: Article non trouvé
 */
articleRouter.get('/article/:id', getArticleById);

/**
 * @swagger
 * /api/article/{id}:
 *   put:
 *     summary: Mettre à jour un article
 *     tags: [Articles]
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID de l'article
 *         schema:
 *           type: string
 *       - in: formData
 *         name: photoArticle
 *         type: file
 *         description: Nouvelle image de l'article
 *       - in: formData
 *         name: titre
 *         type: string
 *         description: Nouveau titre de l'article
 *       - in: formData
 *         name: description
 *         type: string
 *         description: Nouvelle description de l'article
 *       - in: formData
 *         name: prix
 *         type: number
 *         description: Nouveau prix de l'article
 *     responses:
 *       200:
 *         description: Article mis à jour avec succès
 *       404:
 *         description: Article non trouvé
 */
articleRouter.put('/article/:id', upload.single('photoArticle'), updateArticleById);


/**
 * @swagger
 * /api/article/{id}:
 *   delete:
 *     summary: Supprimer un article
 *     tags: [Articles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID de l'article
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Article supprimé avec succès
 *       404:
 *         description: Article non trouvé
 */
articleRouter.delete('/article/:id', deleteArticle);



export default articleRouter;
