const router = require("express").Router();

const prestataireController = require('../controller/prestataireController')



// les routers pour l'authentifiaction
router.post("/prestataire", prestataireController.createPrestataire );
router.get("/prestataire", prestataireController.getPrestataire);


module.exports = router; 