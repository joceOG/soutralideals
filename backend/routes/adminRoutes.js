import { Router } from 'express';
import * as adminController from '../controller/adminController.js';
import auth, { authRole } from '../middleware/authMiddleware.js';

const adminRouter = Router();

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Opérations réservées aux administrateurs
 */

/**
 * @swagger
 * /admin/dashboard/summary:
 *   get:
 *     tags: [Admin]
 *     summary: 📊 Synthèse du dashboard admin
 *     description: Récupère les compteurs réels et les données récentes pour le dashboard admin
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Synthèse récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DashboardSummary'
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non autorisé (admin requis)
 *       500:
 *         description: Erreur serveur
 */
adminRouter.get('/admin/dashboard/summary',
  auth,
  authRole(['Admin', 'ADMIN']),
  adminController.getDashboardSummary
);

adminRouter.get('/admin/dashboard/evolution',
  auth,
  authRole(['Admin', 'ADMIN']),
  adminController.getDashboardEvolution
);

adminRouter.get('/admin/navigation-summary',
  auth,
  authRole(['Admin', 'ADMIN']),
  adminController.getNavigationSummary
);

export default adminRouter;