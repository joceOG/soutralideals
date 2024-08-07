/*const express = require('express');
const router = express.Router();
const Groupe = require('../../models/groupeModel');

//Functions 

async function createGroupe(nomgroupe) {
    try {
        const newGroupe = new Groupe({ nomgroupe });
        await newGroupe.save();
        return newGroupe;
    } catch (err) {
        throw new Error('Error creating groupe');
    }
}

async function getGroupe() {
    try {
        const groupes = await Groupe.find();
        return groupes;
    } catch (err) {
        throw new Error('Error fetching Groupes');
    }
}

async function getGroupeCategories() {
    try {
        const groupe = await Groupe.find();
        console.log("Taille Groupe");
        console.log(groupe.length) ;
         const n =  groupe.length ; 
        const groupeCategories = new groupeCategories() ;
        categorieServices.nomgroupe = categories[0].nomgroupe 
        categorieServices.idgroupe = categories[0].idgroupe;
        console.log("Catégorie Par Service");           
        var nomservice = [] ;
        for (let i=0 ; i < n ; i++ ) 
        {    
             var nomservice = [] ;
             console.log(categories[i].nomcategorie) ;
             const data = await Service.find({"nomcategorie": categories[i].nomcategorie});

             for (let j=0 ; j < data.length ; j++ ) {
                     nomservice[j] = data[j].nomservice
             }
             categorieServices.categories.push(
                { nomcategorie : categories[i].nomcategorie , data : nomservice} 
                 ) ;         
        }     
        console.log(categorieServices);
  
        return categorieServices;
    } catch (err) {
        throw new Error('Error fetching Catégorie');
    }
}



// Create a new Groupe
router.post('/groupe', async(req, res) => {
    try {
        console.log(req.body)
        const { nomgroupe } = req.body;
        const groupe = await createGroupe(nomgroupe);
        res.json(groupe);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all Groupes
router.get('/groupe', async(req, res) => {
    try {
        const groupe = await getGroupe();
        res.json(groupe);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/groupeCategorie', async(req, res) => {
    try {
        const groupeCategorie = await getGroupeCategories();
       res.json(groupeCategorie);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

*/