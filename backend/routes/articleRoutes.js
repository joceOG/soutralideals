import { Router } from 'express';
import multer from 'multer';
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
const upload = multer({ dest: 'uploads/' });

articleRouter.get('/article/search', searchArticles);
articleRouter.get('/articles', getAllArticles);
articleRouter.get('/article/:id', getArticleById);
articleRouter.post('/article', auth, upload.single('photoArticle'), createArticle);
articleRouter.put('/article/:id', auth, upload.single('photoArticle'), updateArticleById);
articleRouter.delete('/article/:id', auth, deleteArticle);

export default articleRouter;
