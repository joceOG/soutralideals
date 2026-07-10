import { Router } from "express";
import { authAdmin } from "../middleware/authMiddleware.js";
import * as controller from "../controller/groupeController.js";

const groupeRouter = Router();

groupeRouter.get("/groupe", controller.getAllGroupes);
groupeRouter.get("/groupe/:id", controller.getGroupeById);

groupeRouter.post("/groupe", ...authAdmin, controller.createGroupe);
groupeRouter.put("/groupe/:id", ...authAdmin, controller.updateGroupe);
groupeRouter.delete("/groupe/:id", ...authAdmin, controller.deleteGroupe);

export default groupeRouter;
