import mongoose from "mongoose";
import utilisateurModel from '../models/utilisateurModel.js';


export default async function connect(){
    await mongoose.connect(process.env.MONGO_URL, {
      serverSelectionTimeoutMS: 15000,
    });
    // Afficher uniquement le host (sans credentials) pour les logs
    const safeUrl = process.env.MONGO_URL?.replace(/\/\/[^@]+@/, '//***:***@') ?? 'MongoDB';
    console.log(`✅ Database Connected to: ${safeUrl}`);

    // Nettoyage index téléphone legacy (unique non-sparse) qui bloque les comptes Google
    try {
      const col = mongoose.connection.collection('utilisateurs');
      await col.updateMany(
        { $or: [{ telephone: null }, { telephone: '' }] },
        { $unset: { telephone: '' } },
      );
      const indexes = await col.indexes();
      const legacyTel = indexes.find(
        (idx) => idx.name === 'telephone_1' ||
          idx.name === 'telephone_partial_unique' ||
          (idx.key?.telephone === 1 &&
            idx.unique &&
            (!idx.partialFilterExpression ||
              !idx.partialFilterExpression.telephoneVerified)),
      );
      if (legacyTel) {
        await col.dropIndex(legacyTel.name);
        console.log(`🧹 Index téléphone legacy dropped: ${legacyTel.name}`);
      }
      await utilisateurModel.syncIndexes();
      console.log('✅ Indexes utilisateurs synchronisés');
    } catch (err) {
      console.warn('⚠️ Sync indexes utilisateurs:', err?.message || err);
    }
}