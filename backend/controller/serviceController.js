const express = require('express');
const router = express.Router();
const Service = require('../models/serviceModel');
const multer = require('multer');
const cloudinary = require("cloudinary").v2;
const fs = require('fs');
const mongoose = require('mongoose');

// Configure Cloudinary
cloudinary.config({
    cloud_name: "dm0c8st6k",
    api_key: "541481188898557",
    api_secret: "6ViefK1wxoJP50p8j2pQ7IykIYY",
});

// Configure Multer
const upload = multer({ dest: 'uploads/' });

router.post('/service', upload.single('imageservice'), async (req, res) => {
    try {
      const nomservice = req.body.nomservice;
      const categorie = req.body.categorie;
      const nomgroupe = req.body.nomgroupe; // This should be used in creating a new service
  
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }
  
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "services"
      });
  
      const imageservice = result.secure_url;
  
      const newService = new Service({
        nomservice,
        imageservice,
        categorie,
        nomgroupe // Ensure this matches your schema
      });
  
      await newService.save();
  
      fs.unlinkSync(req.file.path);
  
      res.status(201).json(newService);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });
  
// Update service route
router.put('/service/:id', upload.single('imageservice'), async (req, res) => {
    try {
      const { id } = req.params;
      const { nomservice, categorie, nomgroupe } = req.body;
      const updates = { nomservice, categorie, nomgroupe };
  
      // Check if a new image is uploaded
      if (req.file) {
        // Upload new image to Cloudinary
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'services' // Optional: store images in a specific folder on Cloudinary
        });
  
        // Update the image URL in the updates object
        updates.imageservice = result.secure_url;
  
        // Remove the local file after uploading
        fs.unlinkSync(req.file.path);
      }
  
      // Find and update the service
      const updatedService = await Service.findByIdAndUpdate(id, updates, { new: true });
  
      if (!updatedService) {
        return res.status(404).json({ error: 'Service not found' });
      }
  
      res.status(200).json(updatedService);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });






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
router.delete('/service/:id', async (req, res) => {
    const { id } = req.params;

    try {
        // Find and delete the service by ID
        const service = await Service.findByIdAndDelete(id);

        if (!service) {
            return res.status(404).json({ message: 'Service not found' });
        }

        res.status(200).json({ message: 'Service deleted successfully' });
    } catch (error) {
        console.error('Error deleting service:', error);
        res.status(500).json({ message: 'Server error' });
    }
});


module.exports = router;