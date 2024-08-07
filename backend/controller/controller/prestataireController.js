/*const express = require('express');
const router = express.Router();
const Prestataire = require('../models/prestataireModel');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

//Functions 

async function createPrestataire(idutilisateur, nomprenom , telephone, idservice, nomservice, prixmoyen, localisation, note, cni1, cni2, selfie, verifier) {
    try { 
        console.log('create')
        const newPrestataire = new Prestataire({ idutilisateur, nomprenom, telephone, idservice, nomservice, prixmoyen, localisation, note, cni1, cni2, selfie, verifier });
      console.log ( newPrestataire );
        await newPrestataire.save();
        return newPrestataire;
    } catch (err) {
        console.log(err);
    }
}

async function getPrestataire() {
    try {
        const prestataires = await Prestataire.find();
        return prestataires;
    } catch (err) {
        throw new Error('Error fetching Users');
    }
}

async function getPrestataireByService(service) {
    try {

        //var query = { nomcategorie: categorie };
        console.log("service" + service);
        const prestatairesByService = await Prestataire.find({nomservice: service }) ;
       // const imgBase64 = services.imageservice.data.toString("base64");
       // services.imageservice.data = imgBase64;
        return prestatairesByService ;
    } catch (err) {
        throw new Error('Error fetching Prestataire');
    }
}

const uploadFields = [
    { name: 'cni1', maxCount: 1 },
    { name: 'cni2', maxCount: 1 },
    { name: 'selfie', maxCount: 1 },
];


// Create a new Groupe
router.post('/prestataire', upload.fields(uploadFields) , async(req, res) => {
    try {

        const idutilisateur = req.body.idutilisateur ;
        const nomprenom = req.body.nomprenom ;
        const telephone = req.body.telephone ;
        const idservice = req.body.idservice ;
        const nomservice = req.body.nomservice ;
        const prixmoyen = req.body.prixmoyen ;
        const localisation = req.body.localisation ;
        const note = req.body.note ;
        const cni1 = req.files['cni1'] ? req.files['cni1'][0].buffer : null;
        const cni2 = req.files['cni2'] ? req.files['cni2'][0].buffer : null;
        const selfie = req.files['selfie'] ? req.files['selfie'][0].buffer : null;
        const verifier = req.body.verifier ;

        const prestataire = await createPrestataire(idutilisateur, nomprenom, telephone, idservice, nomservice, prixmoyen, localisation, note, cni1, cni2, selfie, verifier);
        //console.log(req.body)
        res.json(prestataire);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all Groupes
router.get('/prestataire', async(req, res) => {
    try {
        const prestataire = await getPrestataire();
        res.json(prestataire);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/prestataire/:service', async(req, res) => {
    try {
        const service = req.params.service;
        const prestataireByService = await getPrestataireByService(service);
        res.json(prestataireByService);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

*/