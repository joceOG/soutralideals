const express = require('express');
const router = express.Router();
const Service = require('../models/serviceModel');
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

//Functions 

async function createService(nomservice, imageservice, idcategorie) {
    try {
        const newService = new Service({ nomservice, imageservice, idcategorie });
        await newService.save();
        return newService;
    } catch (err) {
        throw new Error('Error creating Service 2');       
    }
}

async function getService() {
    try {
        const services = await Service.find();
       // const imgBase64 = services.imageservice.data.toString("base64");
       // services.imageservice.data = imgBase64;
        return services;
    } catch (err) {
        throw new Error('Error fetching Service');
    }
}

async function getServiceByCategorie(categorie) {
    try {

        //var query = { nomcategorie: categorie };
        console.log("cat" + categorie);
        const servicesByCategorie = await Service.find({nomcategorie: categorie }) ;
       // const imgBase64 = services.imageservice.data.toString("base64");
       // services.imageservice.data = imgBase64;
        return servicesByCategorie ;
    } catch (err) {
        throw new Error('Error fetching Service');
    }
}


//var query = { address: "Park Lane 38" };
//dbo.collection("customers").find(query).toArray(function(err, result) 


// Create a new Service
router.post('/service', upload.single('imageservice'), async(req, res) => {
    try {
        const imageservice = req.file.buffer ;
        const nomservice = req.body.nomservice ;
        const idcategorie = req.body.idcategorie;
        console.log('Nom serv' , nomservice) ;
    // This assumes Multer is saving the file to the 'uploads/' directory
        const service = await createService(nomservice, imageservice, idcategorie);
        res.json(service);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all Service
router.get('/service', async(req, res) => {
    try {
        const service = await getService();
        res.json(service);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/service/:categorie', async(req, res) => {
    try {
        const categorie = req.params.categorie;
        const servicesByCategorie = await getServiceByCategorie(categorie);
        res.json(servicesByCategorie);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


module.exports = router;