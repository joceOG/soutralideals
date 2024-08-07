/* const express = require('express');
const router = express.Router();
const Categorie = require('../../models/categorieModel');
const CategorieServices = require('../../models/categorieServiceModel');
const Service = require('../../models/serviceModel');

//Functions 

async function createCategorie(nomcategorie, idgroupe) {
    try {
        const newCategorie = new Categorie({ nomcategorie, idgroupe });
        await newCategorie.save();
        return newCategorie;
    } catch (err) {
        throw new Error('Error creating Catégorie');
    }
}

async function getCategorie() {
    try {
        const categories = await Categorie.find();
        return categories;
    } catch (err) {
        throw new Error('Error fetching Catégorie');
    }
}

async function getCategorieServices() {
    try {
        const categories = await Categorie.find();
        console.log("Taille Catégorie");
        console.log(categories.length) ;
         const n =  categories.length ; 
        const categorieServices = new CategorieServices() ;
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
router.post('/categorie', async(req, res) => {
    try {
        console.log(req.body)
        const { nomcategorie, idgroupe } = req.body;
        const categorie = await createCategorie(nomcategorie, idgroupe);
        res.json(categorie);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all Groupes
router.get('/categorie', async(req, res) => {
    try {
        const categorie = await getCategorie();
        res.json(categorie);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

//Get Categorie With Service
router.get('/categorieServices', async(req, res) => {
    try {
        const categorieServices = await getCategorieServices();
       res.json(categorieServices);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

*/