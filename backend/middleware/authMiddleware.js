const jwt = require("jsonwebtoken");
const utilisateurModel = require("../models/utilisateurModel");
require("dotenv").config({ path: "../.env" });

//////////////////////////////////||
// on verifie si l'utlisateur a //||
/// un token                      ||
//////////////////////////////////||




// on utlisera cette fonction pour limiter
// les utlisateurs qui sont des visiteurs
// aux utiisateur qui sont abonnée.
//Un visiteur n'aura pas acces et certaine page du site

module.exports.checkUser = (req, res, next) => {
  const token = req.cookies.jwt;
 
  console.log(token);
  if (token) {
    //////////////////////////////////||
    // on verifie si son token est    ||
    // compatible a notre token_secret||
    ///                               ||
    //////////////////////////////////||

    jwt.verify(token, process.env.TOKEN_SECRET, async (err, decodedToken) => {
      if (err) {
        console.log(err);
        res.user = null;
        // res.cookie("jwt", "", { maxAge: 1 });
        next();
      } else {
        //////////////////////////////////||
        // apres verif on recupere l'id du||
        /// user pour trouver le user     ||
        //////////////////////////////////||

        let user = await userModel.findById(decodedToken.id);
        res.user = user;

        console.log(user);
        next();
      }
    });
  } else {
    res.user = null;
    console.log("pas de token");

    res.status(400).send("pas de reponse");
    next();
  }
};

module.exports.requireAuth = (req, res, next) => {
  const token = req.cookies.jwt;
  console.log(token);

  if (token) {
    try {
      jwt.verify(token, process.env.TOKEN_SECRET, async (err, decodedToken) => {
        if (err) {
          console.log(err);
        } else {
          console.log(decodedToken.id);
          res.status(200).json(decodedToken.id);
          next();
        }
      });
    } catch (error) {
      res.status(200).json(error);
    }
  } else {
    console.log("Pas de token aussi ici !");
    next();
  }
};
