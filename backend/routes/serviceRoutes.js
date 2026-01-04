import { Router } from "express";
import multer from "multer";
import {
    createService,
    createServiceDirect,
    updateService,
    getAllServices,
    getServicesByCategorie,
    deleteService,
    searchServices
} from "../controller/serviceController.js";

const serviceRouter = Router();
const upload = multer({ dest: "uploads/" });

serviceRouter.get("/service/search", searchServices); // 👈 Nouvelle route de recherche (Placée AVANT /:categorie pour éviter les conflits)
serviceRouter.post("/service", upload.single("imageservice"), createService);
serviceRouter.post("/service/direct", createServiceDirect); // Endpoint direct sans multer
serviceRouter.put("/service/:id", upload.single("imageservice"), updateService);
serviceRouter.get("/service", getAllServices);
serviceRouter.get("/service/:categorie", getServicesByCategorie);
serviceRouter.delete("/service/:id", deleteService);

export default serviceRouter;