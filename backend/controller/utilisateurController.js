// const express = require('express');
// const router = express.Router();
const userModel = require('../models/utilisateurModel');

const ObjectID = require("mongoose").Types.ObjectId;
//Functions 



module.exports.getAllUser = async (req, res) => {
    const users = await userModel.find().select("-password");
  
    res.status(200).json(users);
  };


  module.exports.userInfo = (req, res) => {
    console.log(req.params);
  
    if (!ObjectID.isValid(req.params.id)) {
      return res.status(200).send("Id incorrecte :" + req.params.id);
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
// router.post('/utilisateur', async(req, res) => {
//     try {
//         console.log(req.body)
//         const { nom, prenom, email, motdepasse, telephone , genre, note , photoprofil } = req.body;
//         const utilisateur = await createUtilisateur(nom, prenom, email, motdepasse, telephone, genre , note, photoprofil) ;
//         res.json(utilisateur);
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// });

// Get all Groupes
// router.get('/utilisateur', async(req, res) => {
//     try {
//         const utilisateur = await getUtilisateur();
//         res.json(utilisateur);
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// });

// module.exports = router; 