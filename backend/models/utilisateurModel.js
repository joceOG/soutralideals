import bcrypt from "bcrypt"
import mongoose from "mongoose"
import validator from "validator"
import jwt from "jsonwebtoken"

const UtilisateurSchema = mongoose.Schema({
    nom: { 
        type: String, 
        required:true,
        trim:true
     
    },
    prenom: {
         type: String,
         required:true,
         trim:true
          },
    datedenaissance: {
         type: String,
         trim:true
          },
    email: 
        {  
            type:String,
            trim:true,
            lowercase:true,
            validate(value){
           if(!validator.isEmail(value)){
                 throw new Error('Email is invalid')
                       }}
        },
    password: 
    { type: String,
        required:true,
        trim:true,
        minlength:6,
        validate(value){
            if(value.toLowerCase()==='password'){
                throw new Error("Your paswword can\'t be 'password'")
            }
        }
            },
            telephone: { type: String , 
                 required:true,
             },
            genre: { type: String },
            note: { type: String },
            photoProfil: { type: String },
            tokens:[{
                    token:{
                        type:String,
                        required:true
                    }
            }]
                },
                {
                    timestamps:true
                });

// Hash password before saving user
UtilisateurSchema.pre("save", async function(next) {

    const user = this
    if(user.isModified('password') ){
        user.password= await bcrypt.hash(user.password,10)
    }

    next();

    // if (!this.isModified('password')) return next(); // Only hash if password is modified or new

    // const salt = await bcrypt.genSalt();
    // this.password = await bcrypt.hash(this.password, salt);
    // next();
});

   // Virtual
   UtilisateurSchema.virtual('articles', {
    ref: 'Article',             // Référence à la collection 'Task'
    localField: '_id',       
    foreignField: 'utilisateur'    
});


 // Virtual
   UtilisateurSchema.virtual('prestataire', {
    ref: 'Prestataire',             // Référence à la collection 'Task'
    localField: '_id',       
    foreignField: 'utilisateur'    
});

 // Virtual
   UtilisateurSchema.virtual('freelance', {
    ref: 'Freelance',             // Référence à la collection 'Task'
    localField: '_id',       
    foreignField: 'utilisateur'    
});

 // Virtual
   UtilisateurSchema.virtual('vendeur', {
    ref: 'Vendeur',             // Référence à la collection 'Task'
    localField: '_id',       
    foreignField: 'utilisateur'    
});

// Methode s'applique a tous les objet

UtilisateurSchema.methods.generateAuthToken= async function (){
    const user=this
    const token=jwt.sign({_id:user._id.toString()},'thisisoutrali')
    user.tokens=user.tokens.concat({token})

    await user.save()

    return token
}

// Méthode statique pour rechercher un utilisateur par ses identifiants
UtilisateurSchema.statics.findIdLogin = async (email, password) => {
    const user = await userModel.findOne({ email });

    if (!user) {
        throw new Error('Email ou password Introuvable');
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
        throw new Error('Unable to login');
    }

    return user;
};


// Attacher la fonction comparePassword au modèle utilisateurModel
// UtilisateurSchema.statics.comparePassword = async function(email, password) {
//     const utilisateur = await this.findOne({ email }).select('+password');
//     if (utilisateur) {
//         const auth = await bcrypt.compare(password, utilisateur.password);
//         if (auth) {
//             return utilisateur;
//         }
//         throw new Error("incorrect password");
//     }
//     throw new Error("incorrect email");
// };

const utilisateurModel = mongoose.model("Utilisateur", UtilisateurSchema);

export default utilisateurModel;

