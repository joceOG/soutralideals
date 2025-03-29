
import multer from "multer";
import cloudinary from "cloudinary";
import fs from "fs";
import userModel from "../models/utilisateurModel.js"
// const { signUpError, signInError } = require("../utils/errors.utils");

// const jtw = require("jsonwebtoken");

// require("dotenv").config({ path: "../.env" });


// Configure Cloudinary
cloudinary.v2.config({
    cloud_name: "dm0c8st6k",
    api_key: "541481188898557",
    api_secret: "6ViefK1wxoJP50p8j2pQ7IykIYY",
});

// Configure Multer

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/utilisateurs'); // Dossier où enregistrer les fichiers
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

const maxAge = 3 * 24 * 60 * 60 * 1000;

 
// on se cree ici un token pour l'authntification du user
const createToken = (id) => {
  return jtw.sign({ id }, process.env.TOKEN_SECRET, {
    expiresIn: maxAge,
  });
};

// le module de creation d'utilisateur

export const signUp = async (req, res) => {
   
    try {
      const { firstname,surname, email, password,telephone,genre,note } = req.body;
      // Vérifier si l'utilisateur existe déjà par email ou nom
      const existingUser = await userModel.findOne({
          $or: [{ email: email }, { firstname: firstname }]
      });
      
      if (existingUser) {
          const error = existingUser.email === email ? 'Email already in use' : 'Name already in use';
          return res.status(400).send({ error });
      } 

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      const result2 = await cloudinary.v2.uploader.upload(req.file.path);  
      fs.unlinkSync(req.file.path);
     const photoProfil = result2.secure_url;

     console.log( 'Req' + firstname + "  " + surname ) ;

     
      
      // Créer et sauvegarder un nouvel utilisateur
      const user = new userModel({
        firstname,
        surname,
        email,
        password, 
        telephone,
        genre,
        note,
        photoProfil
      });
      await user.save();
     
      res.status(201).send(user);
  } catch (e) {
    console.error(e);
      res.status(400).send(e);
  }

  // try {
  //   console.log(req.body);

  //   // on cree le user avec userModel.create
  //   const user = await userModel.create({ nom,prenom, email, password,telephone,genre,note,photoProfil });

  //   // on envoie la reponse json du user
  //   res.status(201).json({ user: user._id });
  // } catch (error) {

  //   const errors =  signUpError(error);
  //   // on capture l'erreur si existante et on l'affiche

  //   res.status(400).send({ errors });
  // }
};

// on cree ici la fonction d'authentification

export  async function  signIn (req, res)  {
    // on récupère ce qui passe dans le body et on l'assigne à email et password
    const { email, password } = req.body;

    try {
      const user = await userModel.findIdLogin(email,password);
      const token=await user.generateAuthToken()
      console.log('connecté')
      res.json({user,token}); // Renvoie les détails de l'utilisateur si la connexion réussit
  } catch (e) {
      res.status(400).json({ error: e.message }); // En cas d'erreur, renvoie une réponse avec l'erreur
  }
  
    // try {
    //   // on essaie de se connecter ici dans notre modèle avec nos variables email et password
    //   const user = await userModel.comparePassword(email, password);
    //   console.log(user);
    //   // on appelle notre fonction createToken pour générer un token pour l'utilisateur qui essaie de se connecter
    //   const token = createToken(user._id);
    //   res.cookie("jwt", token, { httpOnly: true, maxAge: maxAge }); // maxAge en millisecondes
    //   res.status(200).json({ user: user._id });
    // } catch (error) {
    //   let errors = signInError(error)
    //   res.status(400).json(errors);
    // }
  };

 
// on fait une deconnection du user
export  async function logout (req,res) {
  res.cookie('jwt','',{maxAge:1})
  res.redirect('/')

};
