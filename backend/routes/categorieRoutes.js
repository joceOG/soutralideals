import { Router } from "express";
import multer from "multer";
import * as controller from "../controller/categorieController.js";

const categorieRouter = Router();

// Configure Multer
const upload = multer({ dest: 'uploads/' });

/**
 * @swagger
 * /api/categorie:
 *   post:
 *     summary: Créer une nouvelle catégorie
 *     tags: [Catégories]
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: imagecategorie
 *         type: file
 *         description: Image de la catégorie
 *       - in: formData
 *         name: nom
 *         type: string
 *         required: true
 *         description: Nom de la catégorie
 *       - in: formData
 *         name: description
 *         type: string
 *         required: true
 *         description: Description de la catégorie
 *     responses:
 *       201:
 *         description: Catégorie créée avec succès
 *       400:
 *         description: Données invalides
 */
categorieRouter.post("/categorie", upload.single('imagecategorie'), controller.createCategory);

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Récupérer toutes les catégories
 *     tags: [Catégories]
 *     responses:
 *       200:
 *         description: Liste des catégories récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   nom:
 *                     type: string
 *                   description:
 *                     type: string
 *                   imagecategorie:
 *                     type: string
 */
categorieRouter.get("/categories", controller.getAllCategories);

/**
 * @swagger
 * /api/categorie/{id}:
 *   get:
 *     summary: Récupérer une catégorie par son ID
 *     tags: [Catégories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID de la catégorie
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Catégorie trouvée avec succès
 *       404:
 *         description: Catégorie non trouvée
 */
categorieRouter.get("/categorie/:id", controller.getCategoryById);

/**
 * @swagger
 * /api/categorie/{id}:
 *   put:
 *     summary: Mettre à jour une catégorie
 *     tags: [Catégories]
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID de la catégorie
 *         schema:
 *           type: string
 *       - in: formData
 *         name: imagecategorie
 *         type: file
 *         description: Nouvelle image de la catégorie
 *       - in: formData
 *         name: nom
 *         type: string
 *         description: Nouveau nom de la catégorie
 *       - in: formData
 *         name: description
 *         type: string
 *         description: Nouvelle description de la catégorie
 *     responses:
 *       200:
 *         description: Catégorie mise à jour avec succès
 *       404:
 *         description: Catégorie non trouvée
 */
categorieRouter.put("/categorie/:id", upload.single('imagecategorie'), controller.updateCategoryById);



/**
 * @swagger
 * /api/categorie/groupe/{nomgroupe}:
 *   get:
 *     summary: Récupérer les catégories par nom de groupe
 *     tags: [Catégories]
 *     parameters:
 *       - in: path
 *         name: nomgroupe
 *         required: true
 *         description: Nom du groupe
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Liste des catégories du groupe récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   nom:
 *                     type: string
 *                   description:
 *                     type: string
 *                   imagecategorie:
 *                     type: string
 *       404:
 *         description: Groupe non trouvé
 */
categorieRouter.get("/categorie/groupe/:nomgroupe", controller.getCategoriesByGroupe);

/**
 * @swagger
 * /api/categorie/{id}:
 *   delete:
 *     summary: Supprimer une catégorie
 *     tags: [Catégories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID de la catégorie
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Catégorie supprimée avec succès
 *       404:
 *         description: Catégorie non trouvée
 */
categorieRouter.delete("/categorie/:id", controller.deleteCategoryById);

export default categorieRouter;