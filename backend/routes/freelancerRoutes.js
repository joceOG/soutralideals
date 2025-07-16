import { Router } from "express";
import * as controller from "../controller/freelancerController.js";

const freelancerRouter = Router();

freelancerRouter.post("/freelancer", controller.createFreelancer);
freelancerRouter.get("/freelancer", controller.getAllFreelancers);
freelancerRouter.get("/freelancer/:id", controller.getFreelancerById);
freelancerRouter.put("/freelancer/:id", controller.updateFreelancer);
freelancerRouter.delete("/freelancer/:id", controller.deleteFreelancer);

export default freelancerRouter;
