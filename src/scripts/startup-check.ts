#!/usr/bin/env node

import config from '../config';
import { validateAndLogHelp } from '../utils/config-validator';
import { ProxmoxClient } from '../api/proxmox-client';
import { createLogger } from '../utils/logger';

const logger = createLogger('StartupCheck');

/**
 * Run startup checks for configuration and connections
 */
async function runStartupChecks() {
  logger.info('Running startup checks...');
  
  // Validate configuration
  logger.info('Validating configuration...');
  const isConfigValid = await validateAndLogHelp(config);
  
  if (!isConfigValid) {
    logger.error('❌ Configuration validation failed.');
    return false;
  }
  
  logger.info('✅ Configuration validation passed.');
  
  // Test connections to all nodes
  logger.info('Testing connections to all ProxMox nodes...');
  const connectionResults = await Promise.all(
    config.nodes.map(async (node) => {
      const client = new ProxmoxClient(node, config.ignoreSSLErrors);
      const connected = await client.testConnection();
      return { node, connected };
    })
  );
  
  // Log connection results
  const failedConnections = connectionResults.filter(result => !result.connected);
  if (failedConnections.length > 0) {
    logger.warn(`❌ Failed to connect to ${failedConnections.length} of ${config.nodes.length} nodes:`);
    failedConnections.forEach(result => {
      logger.warn(`  - ${result.node.name} (${result.node.host})`);
    });
    
    if (failedConnections.length === config.nodes.length) {
      logger.error('❌ All connections failed.');
      return false;
    } else {
      logger.warn(`⚠️ ${failedConnections.length} of ${config.nodes.length} connections failed.`);
      return true;
    }
  } else {
    logger.info(`✅ Successfully connected to all ${config.nodes.length} ProxMox nodes.`);
    return true;
  }
}

// Export for use in other modules
export { runStartupChecks };

// Run directly if this script is executed directly
if (require.main === module) {
  runStartupChecks().then(success => {
    if (success) {
      logger.info('✅ All startup checks passed.');
      process.exit(0);
    } else {
      logger.error('❌ Some startup checks failed. See logs above for details.');
      process.exit(1);
    }
  }).catch(error => {
    logger.error('Unexpected error during startup checks', { error });
    process.exit(1);
  });
} 