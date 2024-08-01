const mongoose = require('mongoose');

const UtilisateurSchema = mongoose.Schema({

    nom: { type: String },
    prenom: { type: String  },
    email: { type: String },
    password: { type: String },
    telephone: { type: String },
    genre: { type: String },
    note: { type: String },
    photoProfil: { type: Buffer },
});



//////////////////////////////////||
// on crypte le mot de passe      ||
// avant d'enregistrer le user ///||
///                               ||
//////////////////////////////////||
UtilisateurSchema.pre("save", async function(next) {
    const salt = await bcrypt.genSalt();
    this.password = await bcrypt.hash(this.password, salt);
    next();
  });
  
  const userModel = mongoose.model("utilisateur", UtilisateurSchema);
  
  // Attacher la fonction comparePassword au modèle userModel
  userModel.comparePassword = async function(email, password) {
  
      // on recherche dans notre base de donnee s'il existe ce email
    const user = await this.findOne({ email }).select('+password');
    if (user) {
      // s'il existe on compare sont password avec celui qui essais de se connecter
      const auth = await bcrypt.compare(password, user.password);
      if (auth) {
        return user;
      }
      throw new Error("incorrect password");
    }
    throw new Error("incorrect email");
  };

module.exports = userModel
