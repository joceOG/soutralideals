import mongoose from "mongoose";


export default async function connect(){
    await mongoose.connect(process.env.MONGO_URL)
    console.log("Database Connected")
    console.log(process.env.MONGO_URL)
}