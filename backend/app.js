const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
require("dotenv").config();

 
const { checkUser } = require("./middleware/authMiddleware");

 
const groupeRoute = require("./controller/groupeController");
const serviceRoute = require("./controller/serviceController");
const categorieRoute = require("./controller/categorieController");
const utilisateurRoute = require("./controller/utilisateurController");
const prestataireRoute = require("./controller/prestataireController");
const articleRoute = require("./controller/articleController");

const app = express();

mongoose.set('strictQuery', false);

mongoose.connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => console.log('Connexion à MongoDB réussie !'))
    .catch((e) => console.log('Connexion à MongoDB échouée !' + e));

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Enregistrer les routes
app.use('/api', groupeRoute);
app.use('/api', categorieRoute);
app.use('/api', articleRoute);
app.use('/api', serviceRoute);
app.use('/api', utilisateurRoute);
app.use('/api', prestataireRoute);

// Middleware pour enregistrer les requêtes et les réponses
app.use((req, res, next) => {
    console.log('Requête reçue !');
    next();
});

app.use((req, res, next) => {
    res.status(201);
    next();
});

app.use((req, res, next) => {
    console.log('Réponse envoyée avec succès !');
    next();
});

// Middleware pour gérer les erreurs
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Quelque chose a mal tourné!');
});

module.exports = app;

/*
app.post('/api/servicex', upload.single('image'), async(req, res) => {
    try {
        const { nom, prix } = req.body;
        const image = req.file.buffer; // This assumes Multer is saving the file to the memory storage

        const service = new Service({ nom, prix, image });
        await service.save();

        res.status(201).json({ message: 'Data stored successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// API endpoint to retrieve data
app.get('/api/servicex', async(req, res) => {
    try {
        const data = await Service.find();
        res.status(200).json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
*/

