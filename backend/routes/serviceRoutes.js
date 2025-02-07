import { Router } from "express";
import multer from "multer";
import {
    createService,
    updateService,
    getAllServices,
    getServicesGroupedByCategorie,
    deleteService,
} from "../controller/serviceController.js";

const serviceRouter = Router();
const upload = multer({ dest: "uploads/" });

serviceRouter.post("/service", upload.single("imageservice"), createService);
serviceRouter.put("/service/:id", upload.single("imageservice"), updateService);
serviceRouter.get("/services", getAllServices);
serviceRouter.get("/service/categorie",  getServicesGroupedByCategorie);
serviceRouter.delete("/service/:id", deleteService);

export default serviceRouter;
