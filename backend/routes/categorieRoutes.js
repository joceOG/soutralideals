import { Router } from "express";
import multer from "multer";
import * as controller from "../controller/categorieController.js";

const categorieRouter = Router();

// Configure Multer
const upload = multer({ dest: 'uploads/' });

// Routes pour les catégories
categorieRouter.post("/categorie", upload.single('imagecategorie'), controller.createCategory);
categorieRouter.get("/categorie", controller.getAllCategories);
categorieRouter.get("/categorie/:id", controller.getCategoryById);
categorieRouter.put("/categorie/:id", upload.single('imagecategorie'), controller.updateCategoryById);
categorieRouter.delete("/categorie/:id", controller.deleteCategoryById);

export default categorieRouter;
