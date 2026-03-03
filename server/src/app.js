import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import interpretRoutes from "./routes/interpretRoutes.js";

const app = express();

app.use(bodyParser.json());
app.use(cors());

app.use("/api", interpretRoutes);

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

export default app;