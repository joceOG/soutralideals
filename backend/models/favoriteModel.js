import mongoose from 'mongoose';

const FavoriteSchema = new mongoose.Schema(
  {
    utilisateur: { type: mongoose.Schema.Types.ObjectId, ref: 'utilisateur', required: true },
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
    title: { type: String, required: true },
    image: { type: String },
  },
  { timestamps: true }
);

FavoriteSchema.index({ utilisateur: 1, service: 1, title: 1 }, { unique: true, sparse: true });

const Favorite = mongoose.model('Favorite', FavoriteSchema);
export default Favorite;


