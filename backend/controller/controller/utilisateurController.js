const express = require('express');
const router = express.Router();
const Utilisateur = require('../models/utilisateurModel');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const ObjectID = require("mongoose").Types.ObjectId;
//Functions 

async function createUtilisateur(nom, prenom, email, motdepasse, telephone, genre, note ,photoprofil) {
    try {
        const newUtilisateur = new Utilisateur({ nom, prenom, email, motdepasse, telephone, genre, note, photoprofil });
        await newUtilisateur.save();
        return newUtilisateur;
    } catch (err) {
        throw new Error('Error creating User');
    }
}

async function getUtilisateur() {
    try {
        const utilisateurs = await Utilisateur.find();
        return utilisateurs;
    } catch (err) {
        throw new Error('Error fetching Users');
    }
  
    userModel.findById(req.params.id).then((user) => {
      res.json(user);
    });
  };





// async function createUtilisateur(nom, prenom, email, photoprofil, motdepasse, numerotelephone, genre, note) {
//     try {
//         const newUtilisateur = new ({ nom, prenom, email, motdepasse, numerotelephone, genre, note, photoprofil });
//         await newUtilisateur.save();
//         return newUtilisateur;
//     } catch (err) {
//         throw new Error('Error creating User');
//     }
// }

// async function getUtilisateur() {
//     try {
//         const utilisateurs = await Utilisateur.find();
//         return utilisateurs;
//     } catch (err) {
//         throw new Error('Error fetching Users');
//     }
// }


// Create a new Groupe
router.post('/utilisateur', upload.single('photoprofil'), async(req, res) => {
    try {
        
        const photoprofil = req.file.buffer ;
        const nom = req.body.nom ;
        const prenom = req.body.prenom ;
        const email = req.body.email ;
        const motdepasse = req.body.motdepasse ;
        const telephone = req.body.telephone ;
        const genre = req.body.genre ;
        const note = req.body.note ;

        const utilisateur = await createUtilisateur(nom, prenom, email, motdepasse, telephone, genre, note, photoprofil) ;
        console.log(req.body);
        res.json(utilisateur);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }

});

// Get all Groupes
router.get('/utilisateur', async(req, res) => {
    try {
        
        const utilisateur = await getUtilisateur();
        
        res.json(utilisateur);

    } catch (err) {

        res.status(500).json({ error: err.message });

    }
});

// module.exports = router; 