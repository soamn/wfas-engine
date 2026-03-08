import express, { type Express } from "express";
import cors from "cors";
import router from "./routes/index.js";
import config from "./config/config.js";
const app: Express = express();

app.use(express.json());
app.use(
  cors({
    origin: config.BACKEND_URL,
  }),
);
app.use(express.json());
app.use("/api", router);
export default app;
