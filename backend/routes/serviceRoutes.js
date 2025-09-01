import { Router } from "express";
import multer from "multer";
import {
    createService,
    updateService,
    getAllServices,
    getServicesByCategorie,
    deleteService,
} from "../controller/serviceController.js";

const serviceRouter = Router();
const upload = multer({ dest: "uploads/" });

/**
 * @swagger
 * /api/service:
 *   post:
 *     summary: Créer un nouveau service
 *     tags: [Services]
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: imageservice
 *         type: file
 *         description: Image du service
 *       - in: formData
 *         name: nom
 *         type: string
 *         required: true
 *         description: Nom du service
 *       - in: formData
 *         name: description
 *         type: string
 *         required: true
 *         description: Description du service
 *       - in: formData
 *         name: categorie
 *         type: string
 *         required: true
 *         description: ID de la catégorie du service
 *     responses:
 *       201:
 *         description: Service créé avec succès
 *       400:
 *         description: Données invalides
 */
serviceRouter.post("/service", upload.single("imageservice"), createService);

/**
 * @swagger
 * /api/service/{id}:
 *   put:
 *     summary: Mettre à jour un service
 *     tags: [Services]
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID du service
 *         schema:
 *           type: string
 *       - in: formData
 *         name: imageservice
 *         type: file
 *         description: Nouvelle image du service
 *       - in: formData
 *         name: nom
 *         type: string
 *         description: Nouveau nom du service
 *       - in: formData
 *         name: description
 *         type: string
 *         description: Nouvelle description du service
 *       - in: formData
 *         name: categorie
 *         type: string
 *         description: Nouvel ID de la catégorie du service
 *     responses:
 *       200:
 *         description: Service mis à jour avec succès
 *       404:
 *         description: Service non trouvé
 */
serviceRouter.put("/service/:id", upload.single("imageservice"), updateService);


/**
 * @swagger
 * /api/services:
 *   get:
 *     summary: Récupérer tous les services
 *     tags: [Services]
 *     responses:
 *       200:
 *         description: Liste des services récupérée avec succès
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
 *                   imageservice:
 *                     type: string
 *                   categorie:
 *                     type: string
 *                     description: ID de la catégorie
 */
serviceRouter.get("/services", getAllServices);

/**
 * @swagger
 * /api/service/categorie:
 *   get:
 *     summary: Récupérer les services groupés par catégorie
 *     tags: [Services]
 *     responses:
 *       200:
 *         description: Services groupés par catégorie récupérés avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     nom:
 *                       type: string
 *                     description:
 *                       type: string
 *                     imageservice:
 *                       type: string
 *                     categorie:
 *                       type: string
 */
// serviceRouter.get("/service/categorie",  getServicesGroupedByCategorie);
serviceRouter.get("/service/:categorie", getServicesByCategorie);


/**
 * @swagger
 * /api/service/{id}:
 *   delete:
 *     summary: Supprimer un service
 *     tags: [Services]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID du service
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Service supprimé avec succès
 *       404:
 *         description: Service non trouvé
 */

serviceRouter.delete("/service/:id", deleteService);

export default serviceRouter;