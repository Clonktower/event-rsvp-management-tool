import express, { Request, Response } from "express";
import router from "./routes";
import { errorHandler } from './utils/errorHandler';
import './db/seed'; // ensure the database is seeded before starting the server
import cors from 'cors';

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(router);

app.get("/ping", (req: Request, res: Response) => {
  res.send("pong");
});

// Error handling middleware should be registered after all routes
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
