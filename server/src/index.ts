import express, { Request, Response } from "express";
import router from "./routes";
import { errorHandler } from './utils/errorHandler';
import seed from './db/seed'; // ensure the database is seeded before starting the server
import cors from 'cors';
import { rateLimit } from 'express-rate-limit'
import { requestInfoLogger } from './middlewares/logger';
import config from './config'

// Ensure the database is seeded before starting the server
seed()

const app = express();
const port = config.PORT;

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per request window
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  ipv6Subnet: 56,
})

app.use(limiter)
app.use(cors());
app.use(express.json());
app.use(requestInfoLogger);
app.use(router);

app.get("/ping", (req: Request, res: Response) => {
  res.send("pong");
});

// Error handling middleware should be registered after all routes
app.use(errorHandler);

const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down...");
  server.close(() => process.exit(0));
});
