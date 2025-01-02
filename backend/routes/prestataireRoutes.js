import { Router } from "express";
import {
    createPrestataire,
    getAllPrestataires,
    getPrestataireById,
    updatePrestataire,
    deletePrestataire,
} from "../controller/prestataireController.js";

const prestataireRouter = Router();

prestataireRouter.post("/prestataire", createPrestataire);
prestataireRouter.get("/prestataire", getAllPrestataires);
prestataireRouter.get("/prestataire/:id", getPrestataireById);
prestataireRouter.put("/prestataire/:id", updatePrestataire);
prestataireRouter.delete("/prestataire/:id", deletePrestataire);

export default prestataireRouter;
