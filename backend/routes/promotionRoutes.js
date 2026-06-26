import { Router } from 'express';
import auth, { authAdmin } from '../middleware/authMiddleware.js';
import {
    createPromotion,
    getAllPromotions,
    getPromotionsActives,
    getPromotionById,
    updatePromotion,
    deletePromotion,
    getPromotionStats,
    incrementerVues,
    incrementerClics,
    incrementerConversions
} from '../controller/promotionController.js';

const promotionRouter = Router();

// Public — affichage marketplace
promotionRouter.get('/promotions', getAllPromotions);
promotionRouter.get('/promotions/actives', getPromotionsActives);
promotionRouter.get('/promotion/:id', getPromotionById);
promotionRouter.patch('/promotion/:id/vue', incrementerVues);
promotionRouter.patch('/promotion/:id/clic', incrementerClics);
promotionRouter.patch('/promotion/:id/conversion', incrementerConversions);

// Admin — gestion
promotionRouter.get('/promotions/stats', ...authAdmin, getPromotionStats);
promotionRouter.post('/promotion', ...authAdmin, createPromotion);
promotionRouter.put('/promotion/:id', ...authAdmin, updatePromotion);
promotionRouter.delete('/promotion/:id', ...authAdmin, deletePromotion);

export default promotionRouter;
