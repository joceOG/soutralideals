import mongoose from "mongoose";


export default async function connect(){
    await mongoose.connect(process.env.MONGO_URL);
    // Afficher uniquement le host (sans credentials) pour les logs
    const safeUrl = process.env.MONGO_URL?.replace(/\/\/[^@]+@/, '//***:***@') ?? 'MongoDB';
    console.log(`✅ Database Connected to: ${safeUrl}`);
}