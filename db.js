import mongoose from 'mongoose'
import dotenv from "dotenv";
dotenv.config();

const USER = process.env.MONGO_USER;
const PASS = process.env.MONGO_PASSWORD;
const HOST = process.env.MONGO_HOST;

export const mongoURI = `mongodb+srv://${USER}:${PASS}@${HOST}/?retryWrites=true&w=majority&appName=Cluster0`



mongoose.connect(mongoURI)
    .then(() => console.log('✅ Conectado a MongoDB'))
    .catch(err => console.error('❌ Error de conexión:', err))

export default mongoose;