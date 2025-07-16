import { Router } from "express";
import * as controller from "../controller/vendeurController.js";

const vendeurRouter = Router();

vendeurRouter.post("/vendeur", controller.createVendeur);
vendeurRouter.get("/vendeur", controller.getAllVendeurs);
vendeurRouter.get("/vendeur/:id", controller.getVendeurById);
vendeurRouter.put("/vendeur/:id", controller.updateVendeur);
vendeurRouter.delete("/vendeur/:id", controller.deleteVendeur);

export default vendeurRouter;
