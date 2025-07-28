import { Router } from "express";
import * as controller from "../controller/groupeController.js";

const groupeRouter = Router();

/**
 * @swagger
 * /api/groupe:
 *   post:
 *     summary: Créer un nouveau groupe
 *     tags: [Groupes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nom:
 *                 type: string
 *                 description: Nom du groupe
 *               description:
 *                 type: string
 *                 description: Description du groupe
 *     responses:
 *       201:
 *         description: Groupe créé avec succès
 *       400:
 *         description: Données invalides
 */
groupeRouter.post("/groupe", controller.createGroupe);

/**
 * @swagger
 * /api/groupe:
 *   get:
 *     summary: Récupérer tous les groupes
 *     tags: [Groupes]
 *     responses:
 *       200:
 *         description: Liste des groupes récupérée avec succès
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
 */
groupeRouter.get("/groupe", controller.getAllGroupes);

/**
 * @swagger
 * /api/groupe/{id}:
 *   get:
 *     summary: Récupérer un groupe par son ID
 *     tags: [Groupes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID du groupe
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Groupe trouvé avec succès
 *       404:
 *         description: Groupe non trouvé
 */
groupeRouter.get("/groupe/:id", controller.getGroupeById);

/**
 * @swagger
 * /api/groupe/{id}:
 *   put:
 *     summary: Mettre à jour un groupe
 *     tags: [Groupes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID du groupe
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nom:
 *                 type: string
 *                 description: Nouveau nom du groupe
 *               description:
 *                 type: string
 *                 description: Nouvelle description du groupe
 *     responses:
 *       200:
 *         description: Groupe mis à jour avec succès
 *       404:
 *         description: Groupe non trouvé
 */
groupeRouter.put("/groupe/:id", controller.updateGroupe);

/**
 * @swagger
 * /api/groupe/{id}:
 *   delete:
 *     summary: Supprimer un groupe
 *     tags: [Groupes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID du groupe
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Groupe supprimé avec succès
 *       404:
 *         description: Groupe non trouvé
 */
groupeRouter.delete("/groupe/:id", controller.deleteGroupe);


export default groupeRouter;
