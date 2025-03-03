import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { createLogger } from '../utils/logger';
import { nodeManager } from '../services/node-manager';
import { metricsService } from '../services/metrics-service';
import { WebSocketMessageType, WebSocketMessage, MetricsData, ProxmoxEvent, ProxmoxNodeStatus, ProxmoxGuest } from '../types';

export class WebSocketServer {
  private io: Server;
  private logger = createLogger('WebSocketServer');
  private connectedClients: number = 0;

  constructor(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 15000,         // Reduced from 20000
      pingInterval: 2000,         // Reduced from 5000 to match more frequent node polling interval
      connectTimeout: 8000,       // Reduced from 10000
      allowUpgrades: true,
      perMessageDeflate: {
        threshold: 512            // Reduced from 1024 to compress smaller messages
      },
      maxHttpBufferSize: 1e8, // 100 MB
      // Add connection retry logic
      connectionStateRecovery: {
        // the backup duration of the sessions and the packets
        maxDisconnectionDuration: 2 * 60 * 1000,
        // whether to skip middlewares upon successful recovery
        skipMiddlewares: true,
      }
    });
    
    this.setupSocketHandlers();
    this.subscribeToEvents();
    
    this.logger.info('WebSocket server initialized with multiple socket connections');
  }

  /**
   * Set up socket connection handlers
   */
  private setupSocketHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      this.connectedClients++;
      this.logger.info(`Client connected: ${socket.id}. Total clients: ${this.connectedClients}`);
      
      // Send initial data
      this.sendInitialData(socket);
      
      // Handle disconnection
      socket.on('disconnect', () => {
        this.connectedClients--;
        this.logger.info(`Client disconnected: ${socket.id}. Total clients: ${this.connectedClients}`);
      });
      
      // Handle subscription to specific node
      socket.on('subscribe:node', (nodeId: string) => {
        this.logger.debug(`Client ${socket.id} subscribed to node: ${nodeId}`);
        socket.join(`node:${nodeId}`);
      });
      
      // Handle subscription to specific guest
      socket.on('subscribe:guest', (guestId: string) => {
        this.logger.debug(`Client ${socket.id} subscribed to guest: ${guestId}`);
        socket.join(`guest:${guestId}`);
      });
      
      // Handle unsubscription from specific node
      socket.on('unsubscribe:node', (nodeId: string) => {
        this.logger.debug(`Client ${socket.id} unsubscribed from node: ${nodeId}`);
        socket.leave(`node:${nodeId}`);
      });
      
      // Handle unsubscription from specific guest
      socket.on('unsubscribe:guest', (guestId: string) => {
        this.logger.debug(`Client ${socket.id} unsubscribed from guest: ${guestId}`);
        socket.leave(`guest:${guestId}`);
      });
      
      // Handle request for historical data
      socket.on('get:history', (id: string, callback: (data: MetricsData[]) => void) => {
        this.logger.debug(`Client ${socket.id} requested history for: ${id}`);
        const history = metricsService.getMetricsHistory(id);
        callback(history);
      });
    });
  }

  /**
   * Subscribe to events from services
   */
  private subscribeToEvents(): void {
    // Subscribe to metrics updates
    metricsService.on('metricsUpdated', (metrics: MetricsData) => {
      this.sendMessage(WebSocketMessageType.METRICS_UPDATE, metrics);
      
      // Send to specific rooms
      if (metrics.guestId) {
        this.io.to(`guest:${metrics.guestId}`).emit('message', this.createMessage(WebSocketMessageType.METRICS_UPDATE, metrics));
      } else {
        this.io.to(`node:${metrics.nodeId}`).emit('message', this.createMessage(WebSocketMessageType.METRICS_UPDATE, metrics));
      }
    });
    
    // Subscribe to node status changes
    nodeManager.on('nodeStatusChanged', (nodeStatus: ProxmoxNodeStatus) => {
      this.sendMessage(WebSocketMessageType.NODE_STATUS_UPDATE, nodeStatus);
      this.io.to(`node:${nodeStatus.id}`).emit('message', this.createMessage(WebSocketMessageType.NODE_STATUS_UPDATE, nodeStatus));
    });
    
    // Subscribe to guest status changes
    nodeManager.on('guestStatusChanged', (guest: ProxmoxGuest) => {
      this.sendMessage(WebSocketMessageType.GUEST_STATUS_UPDATE, guest);
      this.io.to(`guest:${guest.id}`).emit('message', this.createMessage(WebSocketMessageType.GUEST_STATUS_UPDATE, guest));
    });
    
    // Subscribe to events
    nodeManager.on('event', (event: ProxmoxEvent) => {
      this.sendMessage(WebSocketMessageType.EVENT, event);
      this.io.to(`node:${event.node}`).emit('message', this.createMessage(WebSocketMessageType.EVENT, event));
    });
  }

  /**
   * Send initial data to a newly connected client
   */
  private sendInitialData(socket: Socket): void {
    // Send connected message
    socket.emit('message', this.createMessage(WebSocketMessageType.CONNECTED, {
      timestamp: Date.now(),
      message: 'Connected to ProxMox Monitor WebSocket server'
    }));
    
    // Send all nodes
    const nodes = nodeManager.getNodes();
    socket.emit('message', this.createMessage(WebSocketMessageType.NODE_STATUS_UPDATE, nodes));
    
    // Send all guests
    const guests = nodeManager.getGuests();
    socket.emit('message', this.createMessage(WebSocketMessageType.GUEST_STATUS_UPDATE, guests));
    
    // Send current metrics
    const metrics = metricsService.getAllCurrentMetrics();
    socket.emit('message', this.createMessage(WebSocketMessageType.METRICS_UPDATE, metrics));
  }

  /**
   * Send a message to all connected clients
   */
  private sendMessage<T>(type: WebSocketMessageType, payload: T): void {
    const message = this.createMessage(type, payload);
    this.io.emit('message', message);
  }

  /**
   * Create a WebSocket message
   */
  private createMessage<T>(type: WebSocketMessageType, payload: T): WebSocketMessage<T> {
    return {
      type,
      payload,
      timestamp: Date.now()
    };
  }

  /**
   * Get the number of connected clients
   */
  getConnectedClientsCount(): number {
    return this.connectedClients;
  }
}

// Export factory function
export function createWebSocketServer(httpServer: HttpServer): WebSocketServer {
  return new WebSocketServer(httpServer);
} 