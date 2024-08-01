const mongoose = require("mongoose");

const ArticleSchema = mongoose.Schema({
  nom: {
    type: String,
    required: true,
    trim: true,
    maxLength: 100,
  },
  prix: {
    type: Number,
    required: true,
    maxLength: 100,
    default: 0.0,
  },
  description: {
    type: String,
    required: true,
  },
  notes: {
    type: Number,
    default: 0,
  },
  images: [
    {
      
      url: {
        type: String,
        required: true,
      },
    },
  ],
  idCategorie: {
    type: String,
    required: true,
  },

  nomCategorie: {
    type: String,
    required: true,
  },

  stock: {
    type: Number,
    required: true,
    default: 0,
  },

  commentaires: [
    {
      userId: {
        type: String,

        required: true,
      },
      nom: {
        type: String,
        required: true,
      },
      note: {
        type: Number,
        required: true,
      },
      commentaire: {
        type: String,
        required: true,
      },
    },
  ],

  dateCreation: {
    type: Date,
    default: Date.now,
  },
});

const aricleModel = mongoose.model("article", ArticleSchema);

module.exports = aricleModel;
