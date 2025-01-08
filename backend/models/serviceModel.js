import mongoose from 'mongoose'

const ServiceSchema = new mongoose.Schema({
    nomservice: { type: String,
       required: true,
      trim:true },
    imageservice: { type: String,
      trim:true, 
      required: true },
    nomgroupe: { type: mongoose.Schema.Types.ObjectId, 
      ref: 'Groupe',
      trim:true,
       required: true },
    categorie: { type: mongoose.Schema.Types.ObjectId,
        ref: 'Categorie'
        , required: true },
    owner: { type: mongoose.Schema.Types.ObjectId,
        ref: 'Categorie'
       },

  });
  

const serviceModel = mongoose.model('Service', ServiceSchema);

export default serviceModel


