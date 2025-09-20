// Script: Nettoyage des champs texte corrompus (UTF-8) pour la collection vendeurs
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import vendeurModel from '../models/vendeurModel.js';

dotenv.config();

function fixString(str) {
  if (typeof str !== 'string') return str;
  return str
    .replaceAll('�', '')
    .replaceAll('Ã´', 'ô')
    .replaceAll('Ã©', 'é')
    .replaceAll('Ã¨', 'è')
    .replaceAll('Ã ', 'à')
    .replaceAll('Ã»', 'û')
    .replaceAll('Ã§', 'ç')
    .replaceAll('Ã¢', 'â')
    .replaceAll('Ã®', 'î')
    .replaceAll('Ã¯', 'ï')
    .replaceAll('Ã¼', 'ü')
    .replaceAll('Ã«', 'ë')
    .replaceAll('C�te', "Côte")
    .trim();
}

function fixArray(arr) {
  if (!Array.isArray(arr)) return arr;
  return arr.map((v) => (typeof v === 'string' ? fixString(v) : v));
}

function fixObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const o = { ...obj };
  Object.keys(o).forEach((k) => {
    const v = o[k];
    if (typeof v === 'string') o[k] = fixString(v);
    else if (Array.isArray(v)) o[k] = fixArray(v);
    else if (v && typeof v === 'object') o[k] = fixObject(v);
  });
  return o;
}

async function run(dryRun = true) {
  const uri = process.env.MONGO_URL || process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGO_URL/MONGODB_URI manquant');
    process.exit(1);
  }

  await mongoose.connect(uri, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true 
  });

  const vendeurs = await vendeurModel.find({});
  console.log(`🔎 Vendeurs trouvés: ${vendeurs.length}`);

  let updates = 0;
  for (const v of vendeurs) {
    const before = JSON.stringify(v.toObject());
    v.shopName = fixString(v.shopName);
    v.shopDescription = fixString(v.shopDescription);
    v.businessType = fixString(v.businessType);
    v.businessCategories = fixArray(v.businessCategories);
    v.businessEmail = fixString(v.businessEmail);
    v.businessPhone = fixString(v.businessPhone);
    v.notes = fixString(v.notes);
    v.returnPolicy = fixString(v.returnPolicy);
    v.shippingMethods = fixArray(v.shippingMethods);
    v.paymentMethods = fixArray(v.paymentMethods);
    v.tags = fixArray(v.tags);
    if (v.businessAddress) v.businessAddress = fixObject(v.businessAddress);
    if (v.socialMedia) v.socialMedia = fixObject(v.socialMedia);
    if (v.verificationDocuments) v.verificationDocuments = fixObject(v.verificationDocuments);

    const after = JSON.stringify(v.toObject());
    if (before !== after) {
      updates++;
      if (!dryRun) await v.save();
    }
  }

  console.log(dryRun
    ? `✅ Dry-run terminé. Documents à mettre à jour: ${updates}`
    : `✅ Nettoyage appliqué. Documents mis à jour: ${updates}`);

  await mongoose.disconnect();
}

// Exécution: node scripts/fixEncoding.js --apply pour appliquer, sinon dry-run
const apply = process.argv.includes('--apply');
run(!apply).catch((e) => {
  console.error('❌ Erreur script:', e);
  process.exit(1);
});


