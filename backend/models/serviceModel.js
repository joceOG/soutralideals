import mongoose from 'mongoose'
import { sanitizeMediaUrl } from '../utils/sanitizeMediaUrl.js';

const ServiceSchema = new mongoose.Schema({
  nomservice: { type: String, required: true },
  imageservice: { type: String, required: false },
  // Prix optionnel au niveau catalogue.
  // Le prix final obligatoire sera porté par l'offre publiée (FreelanceService).
  prixmoyen: { type: String, required: false, default: null },
  categorie: { type: mongoose.Schema.Types.ObjectId, ref: 'Categorie', required: true },
  /** Mots-clés legacy (dashboard). Ne pas confondre avec aliases / needs. */
  tags: [String],
  /** Anciens libellés et synonymes de recherche — pas des besoins. */
  aliases: { type: [String], default: [] },
  /** Associations de besoin (robinet, fuite…) — pas copiées sur les prestataires. */
  needs: { type: [String], default: [] },
  /** 1..6 = raccourci éditorial Métiers. Absent = non mis en avant. */
  shortcutRank: { type: Number, min: 1, max: 99, default: undefined },
  /** Clé stable des créations migration (idempotence). */
  catalogKey: { type: String, default: undefined },
});

ServiceSchema.index({ nomservice: 'text', tags: 'text', aliases: 'text', needs: 'text' });
ServiceSchema.index(
  { shortcutRank: 1 },
  { unique: true, sparse: true, name: 'uniq_service_shortcut_rank' },
);
ServiceSchema.index(
  { catalogKey: 1 },
  { unique: true, sparse: true, name: 'uniq_service_catalog_key' },
);

// Virtual
ServiceSchema.virtual('prestataire', {
  ref: 'Prestataire',             // Référence à la collection 'Task'
  localField: '_id',
  foreignField: 'service'
});

// Virtual
ServiceSchema.virtual('freelance', {
  ref: 'Freelance',             // Référence à la collection 'Task'
  localField: '_id',
  foreignField: 'service'
});

ServiceSchema.set('toJSON', {
  transform(_doc, ret) {
    const clean = sanitizeMediaUrl(ret.imageservice);
    if (!clean) delete ret.imageservice;
    else ret.imageservice = clean;
    return ret;
  },
});


const serviceModel = mongoose.model('Service', ServiceSchema);

export default serviceModel

