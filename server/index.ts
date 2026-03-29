import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { config } from './config';
import { AppError } from './types';
import router from './routes/index';

const app = express();

app.use(express.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../../client')));

// Exposes the API key so the browser can authenticate against /v1/ endpoints.
// The key is not truly secret client-side — it limits unintentional abuse only.
app.get('/config', (_req, res) => {
  res.json({ apiKey: config.apiSecretKey });
});

app.use(router);

// Global error handler
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: { code: err.code, message: err.message } });
    return;
  }
  console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
});

app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
});
