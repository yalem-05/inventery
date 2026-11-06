import app from './app';
import { ENV } from './config/env';
import { logger } from './utils/logger';

const PORT = parseInt(ENV.PORT, 10);

app.listen(PORT, () => {
  logger.info(`🚀 Inventory Backend Server running on port ${PORT}`);
  logger.info(`📡 API Base URL: http://localhost:${PORT}/api`);
  logger.info(`🩺 Health check: http://localhost:${PORT}/health`);
  logger.info(`🌍 Environment: ${ENV.NODE_ENV}`);
});

