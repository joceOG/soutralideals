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

/** Route JSON de test uniquement — inaccessible hors NODE_ENV=test */
function serviceDirectTestOnly(req, res, next) {
    if (process.env.NODE_ENV === 'test') return next();
    return res.status(404).json({ error: 'Route non disponible.' });
}

serviceRouter.get("/service/search", searchServices);
serviceRouter.get("/service", getAllServices);
serviceRouter.get("/service/:categorie", getServicesByCategorie);

serviceRouter.post("/service", ...authAdmin, imageUpload.single("imageservice"), createService);
serviceRouter.post("/service/direct", ...authAdmin, serviceDirectTestOnly, createServiceDirect);
serviceRouter.put("/service/:id", ...authAdmin, imageUpload.single("imageservice"), updateService);
serviceRouter.delete("/service/:id", ...authAdmin, deleteService);

export default serviceRouter;
