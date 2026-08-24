import mongoose from "mongoose";
import utilisateurModel from '../models/utilisateurModel.js';
import {
  findLegacyEmailIndex,
  EMAIL_UNIQUE_INDEX_NAME,
} from '../utils/emailIdentity.js';

export default async function connect(){
    await mongoose.connect(process.env.MONGO_URL, {
      serverSelectionTimeoutMS: 15000,
    });
    // Afficher uniquement le host (sans credentials) pour les logs
    const safeUrl = process.env.MONGO_URL?.replace(/\/\/[^@]+@/, '//***:***@') ?? 'MongoDB';
    console.log(`✅ Database Connected to: ${safeUrl}`);

    // STAB-12F / STAB-12D — sync indexes utilisateurs (téléphone + email)
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

      const legacyEmail = findLegacyEmailIndex(indexes);
      if (legacyEmail) {
        console.log(
          `[STAB-12F] Index email legacy détecté: ${legacyEmail.name} — drop contrôlé avant sync`,
        );
        await col.dropIndex(legacyEmail.name);
        console.log(`🧹 Index email legacy dropped: ${legacyEmail.name}`);
      }

      const targetEmail = indexes.find((i) => i.name === EMAIL_UNIQUE_INDEX_NAME);
      if (!targetEmail && !legacyEmail) {
        console.log(
          `[STAB-12F] Index cible absent: ${EMAIL_UNIQUE_INDEX_NAME} — création via syncIndexes`,
        );
      }

      await utilisateurModel.syncIndexes();
      console.log('✅ Indexes utilisateurs synchronisés');
    } catch (err) {
      console.warn('⚠️ Sync indexes utilisateurs:', err?.message || err);
    }
}