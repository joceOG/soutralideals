import mongoose from "mongoose";

export default async function connect(){
    await mongoose.connect('')
    console.log("Database Connected")
}