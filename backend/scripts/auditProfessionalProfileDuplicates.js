#!/usr/bin/env node
/**
 * DASH-8E.3A — Audit read-only des doublons de profils professionnels par utilisateur.
 * Usage : NODE_ENV=test node backend/scripts/auditProfessionalProfileDuplicates.js
 */
import mongoose from 'mongoose';
import { auditProfessionalProfileDuplicates } from '../services/professionalProfileIntegrityService.js';

async function main() {
  const uri = process.env.MONGO_URL || process.env.MONGODB_URI;
  if (!uri) {
    console.error(JSON.stringify({ error: 'MONGO_URL/MONGODB_URI requis' }));
    process.exit(1);
  }
  const lower = String(uri).toLowerCase();
  if (lower.includes('mongodb.net') || lower.includes('mongodb+srv://')) {
    console.error(JSON.stringify({ error: 'Connexion Atlas refusée pour cet audit CLI.' }));
    process.exit(1);
  }
  await mongoose.connect(uri);
  try {
    const summary = await auditProfessionalProfileDuplicates();
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  main().catch((err) => {
    console.error(JSON.stringify({ error: err.message }));
    process.exit(1);
  });
}

export { auditProfessionalProfileDuplicates as runAudit };
