import { config } from 'dotenv';
import mongoose from 'mongoose';
import connect from '../database/connex.js';
import Groupe from '../models/groupeModel.js';
import Categorie from '../models/categorieModel.js';

config();

const TARGET_GROUP_NAME = 'Freelance';
const DEFAULT_CATEGORY_IMAGE =
  'https://res.cloudinary.com/demo/image/upload/w_600,h_400,c_fill,g_auto/sample.jpg';

const TARGET_CATEGORIES = [
  'Tech, Cloud et IA',
  'BTP et Ingenierie',
  'Juridique et Administratif',
  'Finance et Audit',
  'Marketing et Ventes',
  'Design et Creativite',
  'Redaction et Langues',
  'Audio, Video et Animation',
  'Conseil et Formation',
  'Logistique et Services',
];

const normalize = (value) =>
  (value ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, 'et')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

async function main() {
  await connect();

  let group = await Groupe.findOne({ nomgroupe: TARGET_GROUP_NAME });
  if (!group) {
    group = await Groupe.create({ nomgroupe: TARGET_GROUP_NAME });
    console.log(`🆕 Groupe créé: ${TARGET_GROUP_NAME}`);
  }

  const existingCategories = await Categorie.find({ groupe: group._id }).select('_id nomcategorie').lean();
  const existingMap = new Map(existingCategories.map((c) => [normalize(c.nomcategorie), c]));

  let created = 0;
  let alreadyPresent = 0;

  for (const categoryName of TARGET_CATEGORIES) {
    const key = normalize(categoryName);
    if (existingMap.has(key)) {
      alreadyPresent += 1;
      continue;
    }

    await Categorie.create({
      nomcategorie: categoryName,
      imagecategorie: DEFAULT_CATEGORY_IMAGE,
      groupe: new mongoose.Types.ObjectId(group._id),
    });
    created += 1;
  }

  console.log('\n✅ Synchronisation catégories Freelance terminée');
  console.log(`- Groupe: ${TARGET_GROUP_NAME}`);
  console.log(`- Cibles: ${TARGET_CATEGORIES.length}`);
  console.log(`- Déjà présentes: ${alreadyPresent}`);
  console.log(`- Créées: ${created}`);

  await mongoose.connection.close();
}

main().catch(async (error) => {
  console.error('❌ Échec sync catégories Freelance:', error.message);
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  process.exit(1);
});
