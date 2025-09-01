import { Router } from "express";
import multer from "multer";
import {
  createPrestataire,
  getAllPrestataires,
  getPrestataireById,
  updatePrestataire,
  deletePrestataire,
} from "../controller/prestataireController.js";

const upload = multer({ dest: "uploads/" }); // stockage temporaire pour Cloudinary

const prestataireRouter = Router();


/**
 * @swagger
 * /api/prestataire:
 *   post:
 *     summary: Créer un nouveau prestataire
 *     tags: [Prestataires]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nom:
 *                 type: string
 *                 description: Nom du prestataire
 *               prenom:
 *                 type: string
 *                 description: Prénom du prestataire
 *               email:
 *                 type: string
 *                 description: Email du prestataire
 *               telephone:
 *                 type: string
 *                 description: Numéro de téléphone du prestataire
 *               adresse:
 *                 type: string
 *                 description: Adresse du prestataire
 *     responses:
 *       201:
 *         description: Prestataire créé avec succès
 *       400:
 *         description: Données invalides
 */
prestataireRouter.post("/prestataire", createPrestataire);prestataireRouter.post('/prestataire', upload.fields([
  { name: 'cni1', maxCount: 1 },
  { name: 'cni2', maxCount: 1 },
  { name: 'selfie', maxCount: 1 },
]), createPrestataire);
/**
 * @swagger
 * /api/prestataires:
 *   get:
 *     summary: Récupérer tous les prestataires
 *     tags: [Prestataires]
 *     responses:
 *       200:
 *         description: Liste des prestataires récupérée avec succès
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
 *                   prenom:
 *                     type: string
 *                   email:
 *                     type: string
 *                   telephone:
 *                     type: string
 *                   adresse:
 *                     type: string
 */
prestataireRouter.get("/prestataires", getAllPrestataires);

/**
 * @swagger
 * /api/prestataire/{id}:
 *   get:
 *     summary: Récupérer un prestataire par son ID
 *     tags: [Prestataires]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID du prestataire
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Prestataire trouvé avec succès
 *       404:
 *         description: Prestataire non trouvé
 */
prestataireRouter.get("/prestataire/:id", getPrestataireById);

/**
 * @swagger
 * /api/prestataire/{id}:
 *   put:
 *     summary: Mettre à jour un prestataire
 *     tags: [Prestataires]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID du prestataire
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
 *                 description: Nouveau nom du prestataire
 *               prenom:
 *                 type: string
 *                 description: Nouveau prénom du prestataire
 *               email:
 *                 type: string
 *                 description: Nouvel email du prestataire
 *               telephone:
 *                 type: string
 *                 description: Nouveau numéro de téléphone du prestataire
 *               adresse:
 *                 type: string
 *                 description: Nouvelle adresse du prestataire
 *     responses:
 *       200:
 *         description: Prestataire mis à jour avec succès
 *       404:
 *         description: Prestataire non trouvé
 */

prestataireRouter.put('/prestataire/:id', upload.fields([
  { name: 'cni1', maxCount: 1 },
  { name: 'cni2', maxCount: 1 },
  { name: 'selfie', maxCount: 1 },
]), updatePrestataire);

/**
 * @swagger
 * /api/prestataire/{id}:
 *   delete:
 *     summary: Supprimer un prestataire
 *     tags: [Prestataires]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID du prestataire
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Prestataire supprimé avec succès
 *       404:
 *         description: Prestataire non trouvé
 */
prestataireRouter.delete("/prestataire/:id", deletePrestataire);




export default prestataireRouter;
