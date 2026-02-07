import { Router } from "express";
import { globalSearch, getSuggestions } from "../controller/searchController.js";

const searchRouter = Router();

searchRouter.get("/search/global", globalSearch);
searchRouter.get("/search/suggestions", getSuggestions);

export default searchRouter;
