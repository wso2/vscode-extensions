import express, { Express } from "express";
import cors from "cors";
import { Server } from "node:http";
import { runBalServer } from "./bal_ls";
import fsRouter, { BASE_DIR } from "./file_system/fsRoutes";
import balRouter from "./file_system/balRoutes";

const app: Express = express();
const PORT: number = 9091;
app.use(cors());
app.use(express.json());

app.use("/fs", fsRouter);
app.use("/bala", balRouter);

const httpServer: Server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log("base dir: ", BASE_DIR);
});

runBalServer(httpServer);
