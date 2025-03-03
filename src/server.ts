import express from 'express';
import http from 'http';
import path from 'path';
import cors from 'cors';
import { createWebSocketServer } from './websocket';
import apiRoutes from './routes/api';
import devRoutes from './routes/dev';
import config from './config';
import { createLogger } from './utils/logger';
import { nodeManager } from './services/node-manager';
import { metricsService } from './services/metrics-service';
import { runStartupChecks } from './scripts/startup-check';

const logger = createLogger('Server');

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes - define these before the catch-all route
app.use('/api', apiRoutes);

// Development routes
if (config.enableDevTools) {
  app.use('/dev', devRoutes);
  logger.info('Development tools enabled');
}

// Static files - only in production mode
if (config.nodeEnv === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'frontend', 'dist')));
  
  // Serve index.html for all other routes in production
  app.get('*', (req, res) => {
    const frontendDistPath = path.join(__dirname, '..', 'frontend', 'dist', 'index.html');
    
    if (require('fs').existsSync(frontendDistPath)) {
      res.sendFile(frontendDistPath);
    } else {
      res.status(404).send('Frontend not found. Make sure to build the frontend with "cd frontend && npm run build"');
    }
  });
}

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wsServer = createWebSocketServer(server);

// Start server
const startServer = async () => {
  // Run startup checks
  logger.info('Running startup checks...');
  const checksSuccessful = await runStartupChecks();
  
  if (!checksSuccessful && config.nodeEnv === 'production') {
    logger.error('Startup checks failed. Exiting in production mode.');
    process.exit(1);
  } else if (!checksSuccessful) {
    logger.warn('Startup checks failed. Continuing in development mode, but some features may not work correctly.');
    logger.info('Run "npm run test:connection" for more detailed diagnostics.');
  }
  
  server.listen(config.port, '0.0.0.0', () => {
    logger.info(`Server started on port ${config.port} in ${config.nodeEnv} mode`);
    logger.info(`Access the application at http://[your-server-ip]:${config.port}`);
    
    if (config.enableDevTools) {
      logger.info(`Development tools available at http://[your-server-ip]:${config.port}/dev`);
    }
  });
};

// Start the server
startServer().catch(error => {
  logger.error('Failed to start server', { error });
  process.exit(1);
});

// Handle shutdown
const shutdown = async () => {
  logger.info('Shutting down server...');
  
  // Close HTTP server
  server.close(() => {
    logger.info('HTTP server closed');
  });
  
  // Shutdown node manager
  await nodeManager.shutdown();
  
  // Exit process
  process.exit(0);
};

// Handle process termination
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error });
  shutdown();
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason });
});

export default server; 