const express = require('express');
const router = express.Router();
const Service = require('../models/serviceModel');
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

//Functions 

async function getService() {
    try {
        const services = await Service.find();
       // const imgBase64 = services.imageservice.data.toString("base64");
       // services.imageservice.data = imgBase64;
        return services;
    } catch (err) {
        console.log("Erreur" + err ) ;
        throw new Error('Error fetching Service' + err);
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
        const categorie = req.body.categorie;
        console.log('Nom serv' , nomservice) ;
    // This assumes Multer is saving the file to the 'uploads/' directory
        const newService = new Service({nomservice, imageservice, categorie});
        console.log("Service" + newService.toString()) ;
        await newService.save();
        res.status(201).json(newService);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all Service
router.get('/service', async(req, res) => {
    try {
        const service = await Service.find().populate({
            path: 'categorie',
            populate: {
                path: 'groupe'
            }
        }); // Populer la categorie puis le groupe si necessaire
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