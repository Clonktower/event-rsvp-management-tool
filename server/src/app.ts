import express, { Request, Response } from 'express';
import cors from 'cors';
import router from './routes';
import { errorHandler } from './utils/errorHandler';
import { requestInfoLogger } from './middlewares/logger';

const app = express();

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
