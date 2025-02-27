import { Router } from 'express';
import type { Request, Response } from 'express';
import { nodeManager } from '../services/node-manager';
import { metricsService } from '../services/metrics-service';
import { createLogger } from '../utils/logger';
import config from '../config';

const router = Router();
const logger = createLogger('DevRoutes');

// Only enable these routes in development mode
if (config.enableDevTools) {
  /**
   * GET /dev/api-reference - API reference documentation
   */
  router.get('/api-reference', (req: Request, res: Response) => {
    const endpoints = [
      { method: 'GET', path: '/api/health', description: 'Health check endpoint' },
      { method: 'GET', path: '/api/nodes', description: 'Get all nodes' },
      { method: 'GET', path: '/api/nodes/:nodeId', description: 'Get a specific node' },
      { method: 'GET', path: '/api/nodes/:nodeId/vms', description: 'Get all VMs for a node' },
      { method: 'GET', path: '/api/nodes/:nodeId/containers', description: 'Get all containers for a node' },
      { method: 'GET', path: '/api/nodes/:nodeId/guests', description: 'Get all guests for a node' },
      { method: 'GET', path: '/api/guests', description: 'Get all guests' },
      { method: 'GET', path: '/api/guests/:guestId', description: 'Get a specific guest' },
      { method: 'GET', path: '/api/metrics', description: 'Get current metrics for all nodes and guests' },
      { method: 'GET', path: '/api/metrics/nodes', description: 'Get current metrics for all nodes' },
      { method: 'GET', path: '/api/metrics/guests', description: 'Get current metrics for all guests' },
      { method: 'GET', path: '/api/metrics/:id', description: 'Get current metrics for a specific node or guest' },
      { method: 'GET', path: '/api/metrics/:id/history', description: 'Get historical metrics for a specific node or guest' },
      { method: 'GET', path: '/api/status', description: 'Get system status' },
      { method: 'GET', path: '/dev/api-reference', description: 'API reference documentation' },
      { method: 'GET', path: '/dev/config', description: 'Current configuration' },
      { method: 'GET', path: '/dev/state', description: 'Current application state' },
      { method: 'GET', path: '/dev/logs', description: 'Recent logs' },
      { method: 'POST', path: '/dev/refresh/:nodeId', description: 'Manually refresh data for a node' }
    ];
    
    res.json({
      success: true,
      data: {
        endpoints,
        apiBase: `${req.protocol}://${req.get('host')}`
      }
    });
  });

  /**
   * GET /dev/config - Current configuration
   */
  router.get('/config', (req: Request, res: Response) => {
    // Create a sanitized config without secrets
    const sanitizedConfig = {
      ...config,
      nodes: config.nodes.map(node => ({
        id: node.id,
        name: node.name,
        host: node.host,
        tokenId: node.tokenId,
        tokenSecret: '********' // Hide the token secret
      }))
    };
    
    res.json({
      success: true,
      data: sanitizedConfig
    });
  });

  /**
   * GET /dev/state - Current application state
   */
  router.get('/state', (req: Request, res: Response) => {
    const nodes = nodeManager.getNodes();
    const guests = nodeManager.getGuests();
    
    res.json({
      success: true,
      data: {
        nodes: {
          count: nodes.length,
          items: nodes.map(node => ({
            id: node.id,
            name: node.name,
            status: node.status
          }))
        },
        guests: {
          count: guests.length,
          vms: guests.filter(guest => guest.type === 'qemu').length,
          containers: guests.filter(guest => guest.type === 'lxc').length,
          running: guests.filter(guest => guest.status === 'running').length,
          stopped: guests.filter(guest => guest.status === 'stopped').length,
          paused: guests.filter(guest => guest.status === 'paused').length
        },
        metrics: {
          currentCount: metricsService.getAllCurrentMetrics().length,
          nodeMetricsCount: metricsService.getNodeMetrics().length,
          guestMetricsCount: metricsService.getGuestMetrics().length
        },
        memory: {
          heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
        },
        uptime: process.uptime()
      }
    });
  });

  /**
   * POST /dev/refresh/:nodeId - Manually refresh data for a node
   */
  router.post('/refresh/:nodeId', async (req: Request, res: Response) => {
    const { nodeId } = req.params;
    
    try {
      await nodeManager.refreshNodeData(nodeId);
      res.json({
        success: true,
        data: {
          message: `Refreshed data for node: ${nodeId}`
        }
      });
    } catch (error) {
      logger.error(`Error refreshing node data: ${nodeId}`, { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
} else {
  // If dev tools are disabled, return 404 for all routes
  router.use('*', (req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: 'Development tools are disabled'
    });
  });
}

export default router; 