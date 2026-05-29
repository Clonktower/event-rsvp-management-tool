import express, { Request, Response } from 'express';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import router from './routes';
import { errorHandler } from './utils/errorHandler';
import { requestInfoLogger } from './middlewares/logger';

const app = express();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  ipv6Subnet: 56,
});

// The limiter caps requests per IP. Under test all requests share one IP within
// a worker, so the suite would eventually hit the cap and get spurious 429s —
// skip it there. Production/dev behavior is unchanged.
if (process.env.NODE_ENV !== 'test') {
  app.use(limiter);
}
app.use(cors());
app.use(express.json());
// The per-request logger is pure noise under test (one line per request, ×100s).
if (process.env.NODE_ENV !== 'test') {
  app.use(requestInfoLogger);
}
app.use(router);

app.get('/ping', (_req: Request, res: Response) => {
  res.send('pong');
});

app.use(errorHandler);

export default app;
