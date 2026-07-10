import Avis from '../models/avisModel.js';
import vendeurModel from '../models/vendeurModel.js';
import articleModel from '../models/articleModel.js';
import freelanceModel from '../models/freelanceModel.js';
import prestataireModel from '../models/prestataireModel.js';

/** Recalcule la note moyenne d'une entité à partir des avis publiés. */
export async function syncEntityRating(objetType, objetId) {
  const stats = await Avis.getStatsByObjet(objetType, objetId);
  const avg = stats[0]?.moyenneNote ?? 0;
  const rounded = Math.round(avg * 10) / 10;

  switch (objetType) {
    case 'VENDEUR':
      await vendeurModel.findByIdAndUpdate(objetId, { rating: rounded });
      break;
    case 'ARTICLE':
      await articleModel.findByIdAndUpdate(objetId, { rating: rounded });
      break;
    case 'FREELANCE':
      await freelanceModel.findByIdAndUpdate(objetId, { rating: rounded });
      break;
    case 'PRESTATAIRE':
      await prestataireModel.findByIdAndUpdate(objetId, { rating: rounded });
      break;
    default:
      break;
  }
}
