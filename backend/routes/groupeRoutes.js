import { Router } from "express";
import * as controller from "../controller/groupeController.js";

const groupeRouter = Router();

groupeRouter.post("/groupe", controller.createGroupe);
groupeRouter.get("/groupe", controller.getAllGroupes);
groupeRouter.get("/groupe/:id", controller.getGroupeById);
groupeRouter.put("/groupe/:id", controller.updateGroupe);
groupeRouter.delete("/groupe/:id", controller.deleteGroupe);


export default groupeRouter;
