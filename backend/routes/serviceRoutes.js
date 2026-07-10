import { Router } from "express";
import { imageUpload } from "../utils/uploadMiddleware.js";
import auth, { authAdmin } from "../middleware/authMiddleware.js";
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

serviceRouter.get("/service/search", searchServices);
serviceRouter.get("/service", getAllServices);
serviceRouter.get("/service/:categorie", getServicesByCategorie);

serviceRouter.post("/service", ...authAdmin, imageUpload.single("imageservice"), createService);
serviceRouter.post("/service/direct", ...authAdmin, createServiceDirect);
serviceRouter.put("/service/:id", ...authAdmin, imageUpload.single("imageservice"), updateService);
serviceRouter.delete("/service/:id", ...authAdmin, deleteService);

export default serviceRouter;
