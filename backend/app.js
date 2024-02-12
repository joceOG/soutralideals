const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');

const groupeRoute = require("./controller/groupeController");
const categorieRoute = require("./controller/categorieController");
const serviceRoute = require("./controller/serviceController");

require("dotenv").config()
const Service = require('./models/service');
const app = express();

mongoose.set('strictQuery', false);

mongoose.connect(process.env.MONGO_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
    .then(() => console.log('Connexion à MongoDB réussie !'))
    .catch(() => console.log('Connexion à MongoDB échouée !'));


const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
app.use(cors());


app.use(express.urlencoded({ extended : true }));
app.use(express.json());


app.use("/api", groupeRoute);
app.use("/api", categorieRoute);
app.use("/api", serviceRoute);

app.post('/api/servicex', upload.single('image'), async(req, res) => {
    try {
        const { nom, prix } = req.body;
        const image = req.file.buffer // This assumes Multer is saving the file to the 'uploads/' directory

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
});

module.exports = app;