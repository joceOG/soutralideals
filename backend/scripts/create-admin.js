/**
 * Crée ou promeut un compte Admin pour le dashboard.
 *
 * Usage :
 *   node scripts/create-admin.js
 *   ADMIN_EMAIL=admin@soutralideals.ci ADMIN_PASSWORD=MonMotDePasse123 node scripts/create-admin.js
 *   PROMOTE_EMAIL=loicqra20@gmail.com node scripts/create-admin.js
 */
import { config } from "dotenv";
import mongoose from "mongoose";
import connect from "../database/connex.js";
import Utilisateur from "../models/utilisateurModel.js";

config();

const email =
  process.env.PROMOTE_EMAIL ||
  process.env.ADMIN_EMAIL ||
  "admin@soutralideals.ci";
const password = process.env.ADMIN_PASSWORD || "Admin@2025";
const telephone = process.env.ADMIN_PHONE || "+2250700000001";
const nom = process.env.ADMIN_NOM || "Admin";
const prenom = process.env.ADMIN_PRENOM || "Soutrali";

async function main() {
  await connect();

  let user = await Utilisateur.findOne({
    $or: [{ email: email.toLowerCase() }, { telephone }],
  });

  if (user) {
    user.role = "Admin";
    if (process.env.ADMIN_PASSWORD) {
      user.password = password;
    }
    await user.save();
    console.log("✅ Compte existant promu Admin :");
    console.log(`   Email     : ${user.email || "(non renseigné)"}`);
    console.log(`   Téléphone : ${user.telephone || "(non renseigné)"}`);
    console.log(
      process.env.ADMIN_PASSWORD
        ? `   Mot de passe mis à jour.`
        : `   Mot de passe : (inchangé — celui de votre inscription)`,
    );
  } else {
    user = new Utilisateur({
      nom,
      prenom,
      email: email.toLowerCase(),
      password,
      telephone,
      telephoneVerified: true,
      role: "Admin",
    });
    await user.save();
    console.log("✅ Compte Admin créé :");
    console.log(`   Email     : ${email}`);
    console.log(`   Téléphone : ${telephone}`);
    console.log(`   Mot de passe : ${password}`);
  }

  console.log("\n→ Connectez-vous sur le dashboard avec email OU téléphone + mot de passe.");
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("❌ Erreur:", err.message);
  process.exit(1);
});
