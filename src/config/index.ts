import dotenv from 'dotenv';
import { AppConfig, NodeConfig } from '../types';

// Load environment variables
dotenv.config();

/**
 * Parse node configurations from environment variables
 */
function parseNodeConfigs(): NodeConfig[] {
  const nodes: NodeConfig[] = [];
  const nodePattern = /^PROXMOX_NODE_(\d+)_/;
  
  // Get all environment variables that match the node pattern
  const nodeEnvVars = Object.keys(process.env).filter(key => nodePattern.test(key));
  
  // Extract unique node numbers
  const nodeNumbers = new Set<string>();
  nodeEnvVars.forEach(key => {
    const match = key.match(nodePattern);
    if (match && match[1]) {
      nodeNumbers.add(match[1]);
    }
  });
  
  // Parse configuration for each node
  Array.from(nodeNumbers).forEach(nodeNumber => {
    const name = process.env[`PROXMOX_NODE_${nodeNumber}_NAME`];
    const host = process.env[`PROXMOX_NODE_${nodeNumber}_HOST`];
    const tokenId = process.env[`PROXMOX_NODE_${nodeNumber}_TOKEN_ID`];
    const tokenSecret = process.env[`PROXMOX_NODE_${nodeNumber}_TOKEN_SECRET`];
    
    if (name && host && tokenId && tokenSecret) {
      nodes.push({
        id: `node-${nodeNumber}`,
        name,
        host,
        tokenId,
        tokenSecret
      });
    } else {
      console.warn(`Incomplete configuration for node ${nodeNumber}, skipping.`);
    }
  });
  
  return nodes;
}

/**
 * Validate the configuration
 */
function validateConfig(config: AppConfig): void {
  // Check if at least one node is configured
  if (config.nodes.length === 0) {
    throw new Error('No valid ProxMox nodes configured. Please check your environment variables.');
  }
  
  // Validate port
  if (isNaN(config.port) || config.port <= 0 || config.port > 65535) {
    throw new Error(`Invalid port: ${config.port}. Port must be a number between 1 and 65535.`);
  }
  
  // Validate metrics history minutes
  if (isNaN(config.metricsHistoryMinutes) || config.metricsHistoryMinutes <= 0) {
    throw new Error(`Invalid metrics history minutes: ${config.metricsHistoryMinutes}. Must be a positive number.`);
  }
  
  // Validate polling intervals
  if (isNaN(config.nodePollingIntervalMs) || config.nodePollingIntervalMs < 1000) {
    console.warn(`Invalid node polling interval: ${config.nodePollingIntervalMs}. Using 15000ms as default.`);
    config.nodePollingIntervalMs = 15000;
  }
  
  if (isNaN(config.eventPollingIntervalMs) || config.eventPollingIntervalMs < 1000) {
    console.warn(`Invalid event polling interval: ${config.eventPollingIntervalMs}. Using 3000ms as default.`);
    config.eventPollingIntervalMs = 3000;
  }
  
  // Validate log level
  const validLogLevels = ['error', 'warn', 'info', 'debug', 'silly'];
  if (!validLogLevels.includes(config.logLevel)) {
    console.warn(`Invalid log level: ${config.logLevel}. Using 'info' as default.`);
    config.logLevel = 'info';
  }
}

// Parse and create the configuration object
const config: AppConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  enableDevTools: process.env.ENABLE_DEV_TOOLS === 'true',
  metricsHistoryMinutes: parseInt(process.env.METRICS_HISTORY_MINUTES || '60', 10),
  ignoreSSLErrors: process.env.IGNORE_SSL_ERRORS === 'true',
  // More responsive polling intervals
  nodePollingIntervalMs: parseInt(process.env.NODE_POLLING_INTERVAL_MS || '10000', 10),
  eventPollingIntervalMs: parseInt(process.env.EVENT_POLLING_INTERVAL_MS || '2000', 10),
  nodes: parseNodeConfigs()
};

// Validate the configuration
validateConfig(config);

export default config; 