import mongoose from 'mongoose'

const PrestataireSchema = mongoose.Schema({
    idutilisateur: { type: String },
    nomprenom : { type : String } ,
    telephone : { type : String },
    idservice: { type: String },
    nomservice: { type: String },
    prixmoyen: { type: String },
    localisation: { type: String },
    note: { type: String },
    cni1 : { type: Buffer },
    cni2 : { type: Buffer },
    selfie: { type: Buffer },
    verifier : { type: String },
});

// Conversion des images en base64
PrestataireSchema.methods.getImagesBase64 = function () {
    return {
      cni1: this.cni1 ?  this.cni1.toString('base64') : null,
      cni2: this.cni2 ?  this.cni2.toString('base64') : null,
      selfie: this.selfie ? this.selfie.toString('base64') : null,
    };
  };
  

const prestataireModel = mongoose.model('Prestataire', PrestataireSchema); 

export default prestataireModel;