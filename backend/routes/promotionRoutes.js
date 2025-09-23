import { Router } from 'express';
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

// ✅ ROUTES CRUD PROMOTIONS
promotionRouter.post('/promotion', createPromotion);
promotionRouter.get('/promotions', getAllPromotions);
promotionRouter.get('/promotions/actives', getPromotionsActives);
promotionRouter.get('/promotion/:id', getPromotionById);
promotionRouter.put('/promotion/:id', updatePromotion);
promotionRouter.delete('/promotion/:id', deletePromotion);

// ✅ ROUTES STATISTIQUES
promotionRouter.get('/promotions/stats', getPromotionStats);

// ✅ ROUTES ANALYTICS
promotionRouter.patch('/promotion/:id/vue', incrementerVues);
promotionRouter.patch('/promotion/:id/clic', incrementerClics);
promotionRouter.patch('/promotion/:id/conversion', incrementerConversions);

export default promotionRouter;
