/**
 * Mock Data Server for Pulse
 * 
 * This script generates simulated data for development and testing.
 * It overrides the socket connection to provide consistent, visually appealing data.
 * 
 * Usage:
 * 1. Run this script with Node.js
 * 2. Start the backend with mock data enabled
 * 3. Start the frontend
 */

import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import path from 'path';
import { vmTemplates, containerTemplates } from './templates';
import { customMockData } from './custom-data';
import { createLogger } from '../utils/logger';

const logger = createLogger('MockServer');

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Port for the mock server
const PORT = 7655;

// Generate a random number between min and max
const randomBetween = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1) + min);

// Generate a random floating point number between min and max with specified precision
const randomFloatBetween = (min: number, max: number, precision = 2): number => {
  const value = Math.random() * (max - min) + min;
  return parseFloat(value.toFixed(precision));
};

// Generate a random IP address
const randomIP = (): string => {
  return `192.168.${randomBetween(1, 254)}.${randomBetween(1, 254)}`;
};

// Generate a random MAC address
const randomMAC = (): string => {
  return Array(6).fill(0).map(() => {
    const part = randomBetween(0, 255).toString(16);
    return part.length === 1 ? `0${part}` : part;
  }).join(':');
};

// Store connected clients
const clients = new Map();

// Store node data - initialize with custom data
const nodes = new Map<string, MockNode>(customMockData.nodes.map(node => [node.id, node as MockNode]));

// Define a more comprehensive node type for the nodes map
interface MockNode {
  id: string;
  name: string;
  status: string;
  cpu: { usage: number; cores: number; };
  memory: { used: number; total: number; };
  guests: { id: string; name: string; type: string; status: string; cpu: number; memory: number; }[];
  vms?: any[];
  containers?: any[];
}

// Store guest data - initialize with custom data
const guests = new Map();
customMockData.nodes.forEach(node => {
  node.guests.forEach(guest => {
    guests.set(guest.id, { ...guest, nodeId: node.id });
  });
});

// Store metrics data
const metrics = new Map();

// Define types for our mock data
interface MockVM {
  id: string;
  name: string;
  type: string;
  status: string;
  os?: string;
  cpu: number | {
    cores?: number;
    usage: number;
  };
  memory: number | {
    total: number;
    used: number;
  };
  disk?: {
    total: number;
    used: number;
  };
  network?: {
    ip: string;
    mac: string;
    throughput: {
      in: number;
      out: number;
    };
  };
  uptime?: number;
  nodeId?: string;
  node?: string; // Add the node property to match our custom data
}

interface MockContainer extends MockVM {}

interface MockMetric {
  guestId: string;
  timestamp: number;
  metrics: {
    cpu: number;
    memory: {
      total: number;
      used: number;
      percentUsed: number;
    };
    disk: {
      total: number;
      used: number;
      percentUsed: number;
    };
    network: {
      inRate: number;
      outRate: number;
      history: Array<{
        in: number;
        out: number;
      }>;
    };
  };
  history: {
    cpu: number[];
    memory: number[];
    disk: number[];
  };
}

// REST API endpoints
app.get('/api/nodes', (req, res) => {
  res.json({ nodes: Array.from(nodes.values()) });
});

app.get('/api/resources', (req, res) => {
  res.json(customMockData);
});

app.get('/api/mock-data', (req, res) => {
  res.json(customMockData);
});

// Generate guest data
const generateGuests = (): MockVM[] => {
  // This function is no longer used - we're using custom data instead
  return [];
};

// Generate metrics for guests
const generateMetrics = (guestList: MockVM[]): MockMetric[] => {
  const generatedMetrics: MockMetric[] = [];
  
  guestList.forEach(guest => {
    if (guest.status === 'running') {
      // Handle different CPU structures
      const cpuUsage = typeof guest.cpu === 'number' ? guest.cpu : guest.cpu.usage;
      
      // Handle different memory structures
      const memoryTotal = typeof guest.memory === 'number' ? guest.memory : guest.memory.total;
      const memoryUsed = typeof guest.memory === 'number' ? Math.floor(guest.memory * 0.7) : guest.memory.used;
      
      // Default disk values if not present
      const diskTotal = guest.disk?.total || 1073741824; // 1GB default
      const diskUsed = guest.disk?.used || 536870912; // 512MB default
      const diskPercentUsed = (diskUsed / diskTotal) * 100;
      
      // Default network values if not present
      const networkIn = guest.network?.throughput?.in || 1024;
      const networkOut = guest.network?.throughput?.out || 512;
      
      generatedMetrics.push({
        guestId: guest.id,
        timestamp: Date.now(),
        metrics: {
          cpu: cpuUsage,
          memory: {
            total: memoryTotal,
            used: memoryUsed,
            percentUsed: (memoryUsed / memoryTotal) * 100
          },
          disk: {
            total: diskTotal,
            used: diskUsed,
            percentUsed: diskPercentUsed
          },
          network: {
            inRate: networkIn,
            outRate: networkOut,
            history: Array(10).fill(0).map(() => ({
              in: randomBetween(Math.max(0, networkIn * 0.8), networkIn * 1.2),
              out: randomBetween(Math.max(0, networkOut * 0.8), networkOut * 1.2)
            }))
          }
        },
        history: {
          cpu: Array(10).fill(0).map(() => 
            randomFloatBetween(Math.max(0, cpuUsage - 20), Math.min(100, cpuUsage + 20))
          ),
          memory: Array(10).fill(0).map(() => 
            randomFloatBetween(Math.max(0, memoryUsed - 15), Math.min(100, memoryUsed + 15))
          ),
          disk: Array(10).fill(0).map(() => 
            randomFloatBetween(Math.max(0, diskUsed - 5), Math.min(100, diskUsed + 5))
          )
        }
      });
    }
  });
  
  return generatedMetrics;
};

// Send initial data to the client
const sendInitialData = (socket: Socket) => {
  // Convert nodes map to array
  const nodeArray = Array.from(nodes.values());
  
  // Send node data
  socket.emit('nodes', { nodes: nodeArray });
  
  // Send guest data
  const guestArray = Array.from(guests.values());
  
  // Process guest data to ensure it has the right format
  const processedGuests = guestArray.map(guest => {
    // Handle different memory structures
    const memoryTotal = typeof guest.memory === 'number' ? guest.memory : guest.memory.total;
    
    return {
      ...guest,
      memory: typeof guest.memory === 'number' ? { total: guest.memory, used: Math.floor(guest.memory * 0.7) } : guest.memory
    };
  });
  
  socket.emit('guests', { guests: processedGuests });
  
  // Generate and send metrics
  const metricArray = generateMetrics(guestArray);
  socket.emit('metrics', { metrics: metricArray });
};

// Function to update metrics for a socket
const updateMetrics = (socket: Socket) => {
  // Get client info
  const clientInfo = clients.get(socket.id);
  
  // If the client has registered for a specific node, update that node's data
  // Otherwise, update data for all nodes
  if (clientInfo?.nodeId) {
    // Update data for the specific node
    const nodeId = clientInfo.nodeId;
    
    // Get the node's guests
    const nodeGuests = guests.get(nodeId);
    if (!nodeGuests) {
      logger.warn(`No guests found for node ${nodeId}`);
      return;
    }
    
    // Get current metrics
    const currentMetrics = metrics.get(nodeId) || [];
    
    // Update metrics
    const updatedMetrics = currentMetrics.map((metric: MockMetric) => {
      const guest = nodeGuests.find((g: MockVM) => g.id === metric.guestId);
      if (!guest || guest.status !== 'running') {
        return metric;
      }
      
      // Update CPU usage (slight variation from previous value)
      const currentCpu = metric.metrics.cpu;
      const cpuDelta = randomFloatBetween(-5, 5);
      const newCpu = Math.max(1, Math.min(100, currentCpu + cpuDelta));
      
      // Update memory usage (slight variation from previous value)
      const currentMemoryPercent = metric.metrics.memory.percentUsed;
      const memoryDelta = randomFloatBetween(-2, 2);
      const newMemoryPercent = Math.max(5, Math.min(95, currentMemoryPercent + memoryDelta));
      
      // Check if memory is a number or an object
      const memoryTotal = typeof guest.memory === 'number' ? guest.memory : guest.memory.total;
      const newMemoryUsed = (memoryTotal * newMemoryPercent) / 100;
      
      // Update disk usage (slight variation from previous value)
      const diskTotal = guest.disk?.total || 1073741824; // 1GB default
      const diskUsed = guest.disk?.used || 536870912; // 512MB default
      const currentDiskPercent = diskUsed / diskTotal * 100;
      const diskDelta = randomFloatBetween(-1, 1);
      const newDiskPercent = Math.max(1, Math.min(99, currentDiskPercent + diskDelta));
      const newDiskUsed = (diskTotal * newDiskPercent) / 100;
      
      // Update network throughput
      const newInRate = randomFloatBetween(0.1, 50);
      const newOutRate = randomFloatBetween(0.1, 20);
      
      // Update history
      const newCpuHistory = [...metric.history.cpu.slice(1), newCpu];
      const newMemoryHistory = [...metric.history.memory.slice(1), newMemoryPercent];
      const newDiskHistory = [...(metric.history.disk || Array(10).fill(0)), newDiskPercent].slice(-10);
      
      return {
        ...metric,
        timestamp: Date.now(),
        metrics: {
          ...metric.metrics,
          cpu: newCpu,
          memory: {
            ...metric.metrics.memory,
            used: newMemoryUsed,
            percentUsed: newMemoryPercent
          },
          disk: {
            ...metric.metrics.disk,
            used: newDiskUsed,
            percentUsed: newDiskPercent
          },
          network: {
            ...metric.metrics.network,
            inRate: newInRate,
            outRate: newOutRate,
            history: [...metric.metrics.network.history.slice(1), { in: newInRate, out: newOutRate }]
          }
        },
        history: {
          ...metric.history,
          cpu: newCpuHistory,
          memory: newMemoryHistory,
          disk: newDiskHistory
        }
      };
    });
    
    // Store updated metrics
    metrics.set(nodeId, updatedMetrics);
    
    // Send updated data
    socket.emit('guests', nodeGuests);
    socket.emit('metrics', updatedMetrics);
  } else {
    // Client hasn't registered for a specific node, update all nodes
    // This is useful for the dashboard view
    
    // Get all guests
    const allGuests: MockVM[] = [];
    const allNodeIds: string[] = [];
    
    // Collect guests from all nodes
    customMockData.nodes.forEach(nodeData => {
      const nodeId = nodeData.id;
      allNodeIds.push(nodeId);
      
      const nodeGuests = guests.get(nodeId) || [];
      allGuests.push(...nodeGuests);
    });
    
    // Get all metrics
    const allMetrics: MockMetric[] = [];
    allNodeIds.forEach(nodeId => {
      const nodeMetrics = metrics.get(nodeId) || [];
      allMetrics.push(...nodeMetrics);
    });
    
    // Update metrics for running guests
    const updatedMetrics = allMetrics.map((metric: MockMetric) => {
      const guest = allGuests.find((g: MockVM) => g.id === metric.guestId);
      if (!guest || guest.status !== 'running') {
        return metric;
      }
      
      // Update CPU usage (slight variation from previous value)
      const currentCpu = metric.metrics.cpu;
      const cpuDelta = randomFloatBetween(-5, 5);
      const newCpu = Math.max(1, Math.min(100, currentCpu + cpuDelta));
      
      // Update memory usage (slight variation from previous value)
      const currentMemoryPercent = metric.metrics.memory.percentUsed;
      const memoryDelta = randomFloatBetween(-2, 2);
      const newMemoryPercent = Math.max(5, Math.min(95, currentMemoryPercent + memoryDelta));
      
      // Check if memory is a number or an object
      const memoryTotal = typeof guest.memory === 'number' ? guest.memory : guest.memory.total;
      const newMemoryUsed = (memoryTotal * newMemoryPercent) / 100;
      
      // Update disk usage (slight variation from previous value)
      const diskTotal = guest.disk?.total || 1073741824; // 1GB default
      const diskUsed = guest.disk?.used || 536870912; // 512MB default
      const currentDiskPercent = diskUsed / diskTotal * 100;
      const diskDelta = randomFloatBetween(-1, 1);
      const newDiskPercent = Math.max(1, Math.min(99, currentDiskPercent + diskDelta));
      const newDiskUsed = (diskTotal * newDiskPercent) / 100;
      
      // Update network throughput
      const newInRate = randomFloatBetween(0.1, 50);
      const newOutRate = randomFloatBetween(0.1, 20);
      
      // Update history
      const newCpuHistory = [...metric.history.cpu.slice(1), newCpu];
      const newMemoryHistory = [...metric.history.memory.slice(1), newMemoryPercent];
      const newDiskHistory = [...(metric.history.disk || Array(10).fill(0)), newDiskPercent].slice(-10);
      
      return {
        ...metric,
        timestamp: Date.now(),
        metrics: {
          ...metric.metrics,
          cpu: newCpu,
          memory: {
            ...metric.metrics.memory,
            used: newMemoryUsed,
            percentUsed: newMemoryPercent
          },
          disk: {
            ...metric.metrics.disk,
            used: newDiskUsed,
            percentUsed: newDiskPercent
          },
          network: {
            ...metric.metrics.network,
            inRate: newInRate,
            outRate: newOutRate,
            history: [...metric.metrics.network.history.slice(1), { in: newInRate, out: newOutRate }]
          }
        },
        history: {
          ...metric.history,
          cpu: newCpuHistory,
          memory: newMemoryHistory,
          disk: newDiskHistory
        }
      };
    });
    
    // Update metrics for each node
    allNodeIds.forEach(nodeId => {
      const nodeGuests = guests.get(nodeId) || [];
      const nodeGuestIds = nodeGuests.map((g: MockVM) => g.id);
      const nodeMetrics = updatedMetrics.filter(m => nodeGuestIds.includes(m.guestId));
      metrics.set(nodeId, nodeMetrics);
    });
    
    // Send updated data
    socket.emit('guests', allGuests);
    socket.emit('metrics', updatedMetrics);
  }
};

// Socket.io connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  clients.set(socket.id, { socket });
  
  // Send initial data
  sendInitialData(socket);
  
  // Set up periodic updates (every 2 seconds)
  const updateInterval = setInterval(() => {
    updateMetrics(socket);
  }, 2000);
  
  // Handle disconnection
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
    clients.delete(socket.id);
    clearInterval(updateInterval);
  });
  
  // Handle registration
  socket.on('register', (data) => {
    logger.info(`Client registered: ${socket.id} for node ${data.nodeName}`);
    clients.set(socket.id, { ...clients.get(socket.id), nodeId: data.nodeId, nodeName: data.nodeName });
    
    // Resend data for this specific node
    sendInitialData(socket);
  });
  
  // Handle VM updates
  socket.on('updateVMs', (data) => {
    logger.info(`Received VM update from ${socket.id} for node ${data.nodeId}`);
    const node = nodes.get(data.nodeId);
    if (node) {
      nodes.set(data.nodeId, { ...node, vms: data.vms });
    }
  });
  
  // Handle container updates
  socket.on('updateContainers', (data) => {
    logger.info(`Received container update from ${socket.id} for node ${data.nodeId}`);
    const node = nodes.get(data.nodeId);
    if (node) {
      nodes.set(data.nodeId, { ...node, containers: data.containers });
    }
  });
});

// Start the server
server.listen(PORT, () => {
  logger.info(`Mock data server running on port ${PORT}`);
});

// Export for testing
export default server; 