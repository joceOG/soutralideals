import { Router } from 'express';
import { imageUpload } from '../utils/uploadMiddleware.js';
import auth from '../middleware/authMiddleware.js';
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
articleRouter.get('/articles', getAllArticles);
articleRouter.get('/article/:id', getArticleById);
articleRouter.post('/article', auth, imageUpload.single('photoArticle'), createArticle);
articleRouter.put('/article/:id', auth, imageUpload.single('photoArticle'), updateArticleById);
articleRouter.delete('/article/:id', auth, deleteArticle);

export default articleRouter;
