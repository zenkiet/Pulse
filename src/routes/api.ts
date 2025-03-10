import { Router } from 'express';
import type { Request, Response, RequestHandler } from 'express';
import { nodeManager } from '../services/node-manager';
import { metricsService } from '../services/metrics-service';
import { ApiResponse } from '../types';
import { createLogger } from '../utils/logger';

const router = Router();
const logger = createLogger('ApiRoutes');

/**
 * Helper function to create API responses
 */
function createResponse<T>(data?: T, error?: string): ApiResponse<T> {
  return {
    success: !error,
    data,
    error,
    timestamp: Date.now()
  };
}

/**
 * Error handler middleware
 */
function asyncHandler(fn: (req: Request, res: Response) => Promise<void>): RequestHandler {
  return async (req: Request, res: Response) => {
    try {
      await fn(req, res);
    } catch (error) {
      logger.error('API Error', { error, path: req.path });
      res.status(500).json(createResponse(undefined, error instanceof Error ? error.message : 'Unknown error'));
    }
  };
}

/**
 * GET /api/health - Health check endpoint
 */
router.get('/health', ((req: Request, res: Response) => {
  res.json(createResponse({ status: 'ok', timestamp: Date.now() }));
}) as RequestHandler);

/**
 * GET /api/nodes - Get all nodes
 */
router.get('/nodes', ((req: Request, res: Response) => {
  const nodes = nodeManager.getNodes();
  res.json(createResponse(nodes));
}) as RequestHandler);

/**
 * GET /api/nodes/:nodeId - Get a specific node
 */
router.get('/nodes/:nodeId', ((req: Request, res: Response) => {
  const { nodeId } = req.params;
  const node = nodeManager.getNode(nodeId);
  
  if (!node) {
    return res.status(404).json(createResponse(undefined, `Node not found: ${nodeId}`));
  }
  
  res.json(createResponse(node));
}) as RequestHandler);

/**
 * GET /api/nodes/:nodeId/vms - Get all VMs for a node
 */
router.get('/nodes/:nodeId/vms', (req: Request, res: Response) => {
  const { nodeId } = req.params;
  const vms = nodeManager.getVMs(nodeId);
  res.json(createResponse(vms));
});

/**
 * GET /api/nodes/:nodeId/containers - Get all containers for a node
 */
router.get('/nodes/:nodeId/containers', (req: Request, res: Response) => {
  const { nodeId } = req.params;
  const containers = nodeManager.getContainers(nodeId);
  res.json(createResponse(containers));
});

/**
 * GET /api/nodes/:nodeId/guests - Get all guests for a node
 */
router.get('/nodes/:nodeId/guests', (req: Request, res: Response) => {
  const { nodeId } = req.params;
  const guests = nodeManager.getGuests(nodeId);
  res.json(createResponse(guests));
});

/**
 * GET /api/containers - Get all containers across all nodes
 */
router.get('/containers', (req: Request, res: Response) => {
  const containers = nodeManager.getContainers();
  res.json(createResponse(containers));
});

/**
 * GET /api/guests - Get all guests
 */
router.get('/guests', (req: Request, res: Response) => {
  const guests = nodeManager.getGuests();
  res.json(createResponse(guests));
});

/**
 * GET /api/guests/:guestId - Get a specific guest
 */
router.get('/guests/:guestId', ((req: Request, res: Response) => {
  const { guestId } = req.params;
  const guest = nodeManager.getGuest(guestId);
  
  if (!guest) {
    return res.status(404).json(createResponse(undefined, `Guest not found: ${guestId}`));
  }
  
  res.json(createResponse(guest));
}) as RequestHandler);

/**
 * GET /api/metrics - Get current metrics for all nodes and guests
 */
router.get('/metrics', (req: Request, res: Response) => {
  const metrics = metricsService.getAllCurrentMetrics();
  res.json(createResponse(metrics));
});

/**
 * GET /api/metrics/nodes - Get current metrics for all nodes
 */
router.get('/metrics/nodes', (req: Request, res: Response) => {
  const metrics = metricsService.getNodeMetrics();
  res.json(createResponse(metrics));
});

/**
 * GET /api/metrics/guests - Get current metrics for all guests
 */
router.get('/metrics/guests', (req: Request, res: Response) => {
  const metrics = metricsService.getGuestMetrics();
  res.json(createResponse(metrics));
});

/**
 * GET /api/metrics/:id - Get current metrics for a specific node or guest
 */
router.get('/metrics/:id', ((req: Request, res: Response) => {
  const { id } = req.params;
  const metrics = metricsService.getCurrentMetrics(id);
  
  if (!metrics) {
    return res.status(404).json(createResponse(undefined, `Metrics not found for: ${id}`));
  }
  
  res.json(createResponse(metrics));
}) as RequestHandler);

/**
 * GET /api/metrics/:id/history - Get historical metrics for a specific node or guest
 */
router.get('/metrics/:id/history', (req: Request, res: Response) => {
  const { id } = req.params;
  const history = metricsService.getMetricsHistory(id);
  res.json(createResponse(history));
});

/**
 * GET /api/status - Get system status
 */
router.get('/status', (req: Request, res: Response) => {
  const nodes = nodeManager.getNodes();
  const guests = nodeManager.getGuests();
  
  const status = {
    nodes: {
      total: nodes.length,
      online: nodes.filter(node => node.status === 'online').length,
      offline: nodes.filter(node => node.status === 'offline').length
    },
    guests: {
      total: guests.length,
      running: guests.filter(guest => guest.status === 'running').length,
      stopped: guests.filter(guest => guest.status === 'stopped').length,
      paused: guests.filter(guest => guest.status === 'paused').length,
      vms: guests.filter(guest => guest.type === 'qemu').length,
      containers: guests.filter(guest => guest.type === 'lxc').length
    },
    mockDataEnabled: process.env.USE_MOCK_DATA === 'true' || process.env.MOCK_DATA_ENABLED === 'true',
    uptime: process.uptime()
  };
  
  res.json(createResponse(status));
});

export default router; 