const app = require('./app');
const env = require('./config/env');
const logger = require('./utils/logger');

const server = app.listen(env.PORT, () => {
  logger.info(`=======================================================`);
  logger.info(`  Scan2Go — Smart Supermarket Self-Checkout & Management `);
  logger.info(`  Server running on http://localhost:${env.PORT}`);
  logger.info(`  Environment: ${env.NODE_ENV}`);
  logger.info(`=======================================================`);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
});

module.exports = server;
