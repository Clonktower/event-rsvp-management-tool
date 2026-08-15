import app from './app';
import seed from './db/seed';
import config from './config';

seed();

const server = app.listen(config.PORT, () => {
  console.log(`Server is running on port ${config.PORT}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  server.close(() => process.exit(0));
});
