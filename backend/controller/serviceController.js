const express = require('express');
const router = express.Router();
const Service = require('../models/serviceModel');
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

//Functions 

async function createService(nomservice, imageservice , idcategorie) {
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

module.exports = router;