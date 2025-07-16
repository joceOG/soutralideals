// Router pour les commandes.
// Nous réutilisons le router déjà défini dans controller/commandeController.js
// pour éviter de dupliquer la logique existante.

import { Router } from "express";
import * as controller from "../controller/commandeController.js";

const commandeRouter = Router();

commandeRouter.post("/commande", controller.createCommande);
commandeRouter.get("/commande", controller.getAllCommandes);
commandeRouter.get("/commande/:id", controller.getCommandeById);
commandeRouter.put("/commande/:id", controller.updateCommande);
commandeRouter.delete("/commande/:id", controller.deleteCommande);

export default commandeRouter;
