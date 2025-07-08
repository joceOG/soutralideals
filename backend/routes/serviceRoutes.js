import { Router } from "express";
import multer from "multer";
import {
    createService,
    updateService,
    getAllServices,
<<<<<<< HEAD
    getServicesGroupedByCategorie,
=======
    getServicesByCategorie,
>>>>>>> 0b7e280 (Connexion effective entre front et back)
    deleteService,
} from "../controller/serviceController.js";

const serviceRouter = Router();
const upload = multer({ dest: "uploads/" });

serviceRouter.post("/service", upload.single("imageservice"), createService);
serviceRouter.put("/service/:id", upload.single("imageservice"), updateService);
<<<<<<< HEAD
serviceRouter.get("/services", getAllServices);
serviceRouter.get("/service/categorie",  getServicesGroupedByCategorie);
=======
serviceRouter.get("/service", getAllServices);
serviceRouter.get("/service/:categorie", getServicesByCategorie);
>>>>>>> 0b7e280 (Connexion effective entre front et back)
serviceRouter.delete("/service/:id", deleteService);

export default serviceRouter;
