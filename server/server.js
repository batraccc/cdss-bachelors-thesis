import pg from "pg";
import dotenv from "dotenv";
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";

dotenv.config();

const db = new pg.Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
})

db.connect();

const app = express();
const port = 3000;
app.use(bodyParser.json());
app.use(cors());


app.listen(port, (req, res) => {
    console.log(`Listening at port ${port}`);
})