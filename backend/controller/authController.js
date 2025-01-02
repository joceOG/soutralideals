import userModel from "../models/utilisateurModel.js"
// const { signUpError, signInError } = require("../utils/errors.utils");

// const jtw = require("jsonwebtoken");

// require("dotenv").config({ path: "../.env" });

const maxAge = 3 * 24 * 60 * 60 * 1000;

 
// on se cree ici un token pour l'authntification du user
const createToken = (id) => {
  return jtw.sign({ id }, process.env.TOKEN_SECRET, {
    expiresIn: maxAge,
  });
};

// le module de creation d'utilisateur

export  async function signUp(req, res){
  // const { nom,prenom, email, password,telephone,genre,note,photoProfil } = req.body;
    try {
      // Vérifier si l'utilisateur existe déjà par email ou nom
      const existingUser = await userModel.findOne({
          $or: [{ email: req.body.email }, { firstname: req.body.firstname }]
      });
      
      if (existingUser) {
          const error = existingUser.email === req.body.email ? 'Email already in use' : 'Name already in use';
          return res.status(400).send({ error });
      }

      // Créer et sauvegarder un nouvel utilisateur
      const user = new userModel(req.body);
      await user.save();
      res.status(201).send(user);
  } catch (e) {
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
