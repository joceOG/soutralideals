import { Router } from "express";
import { imageUpload } from "../utils/uploadMiddleware.js";
import { authAdmin } from "../middleware/authMiddleware.js";
import * as controller from "../controller/categorieController.js";

const categorieRouter = Router();

categorieRouter.get("/categorie/groupe/:nomgroupe", controller.getCategoriesByGroupe);
categorieRouter.get("/categorie", controller.getAllCategories);
categorieRouter.get("/categorie/:id", controller.getCategoryById);

categorieRouter.post("/categorie", ...authAdmin, imageUpload.single('imagecategorie'), controller.createCategory);
categorieRouter.put("/categorie/:id", ...authAdmin, imageUpload.single('imagecategorie'), controller.updateCategoryById);
categorieRouter.delete("/categorie/:id", ...authAdmin, controller.deleteCategoryById);

export default categorieRouter;
