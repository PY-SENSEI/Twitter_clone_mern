import express from "express"
import dotenv from "dotenv"
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.route.js"
import connectMongoDB from "./db/connectMongoDB.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

console.log(process.env.MONGO_URI)

//Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());


app.use("/api/auth", authRoutes);

app.listen(PORT, () => {
    console.log(`Server running on port: ${PORT}`);
    connectMongoDB();
})