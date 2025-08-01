import { Router } from 'express';
import multer from 'multer';
import {
    createArticle,
    getAllArticles,
    getArticleById,
    updateArticleById,
    deleteArticle,
} from '../controller/articleController.js';

const articleRouter = Router();
const upload = multer({ dest: 'uploads/' });

articleRouter.post('/article', upload.single('photoArticle'), createArticle);
articleRouter.get('/articles', getAllArticles);
articleRouter.get('/article/:id', getArticleById);
articleRouter.put('/article/:id', upload.single('photoArticle'), updateArticleById);
articleRouter.delete('/article/:id', deleteArticle);

export default articleRouter;
