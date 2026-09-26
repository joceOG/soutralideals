import { Router } from 'express';
import { imageUpload } from '../utils/uploadMiddleware.js';
import auth, { optionalAuth } from '../middleware/authMiddleware.js';
import { requireProfessionalCapability } from '../middleware/requireProfessionalCapability.js';

const requireOperationalVendeur = requireProfessionalCapability('Vendeur', {
  requireOperational: true,
  allowAdmin: true,
});
import {
    createArticle,
    getAllArticles,
    getArticleById,
    updateArticleById,
    deleteArticle,
    searchArticles
} from '../controller/articleController.js';

const articleRouter = Router();

articleRouter.get('/article/search', searchArticles);
articleRouter.get('/articles', optionalAuth, getAllArticles);
articleRouter.get('/article/:id', getArticleById);
articleRouter.post('/article', auth, requireOperationalVendeur, imageUpload.single('photoArticle'), createArticle);
articleRouter.put('/article/:id', auth, requireOperationalVendeur, imageUpload.single('photoArticle'), updateArticleById);
articleRouter.delete('/article/:id', auth, requireOperationalVendeur, deleteArticle);

export default articleRouter;
