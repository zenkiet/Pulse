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
  os: string;
  cpu: {
    cores: number;
    usage: number;
  };
  memory: {
    total: number;
    used: number;
  };
  disk: {
    total: number;
    used: number;
  };
  network: {
    ip: string;
    mac: string;
    throughput: {
      in: number;
      out: number;
    };
  };
  uptime: number;
  nodeId: string;
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
      generatedMetrics.push({
        guestId: guest.id,
        timestamp: Date.now(),
        metrics: {
          cpu: guest.cpu.usage,
          memory: {
            total: guest.memory.total,
            used: guest.memory.used,
            percentUsed: guest.memory.used
          },
          disk: {
            total: guest.disk.total,
            used: guest.disk.used,
            percentUsed: guest.disk.used
          },
          network: {
            inRate: guest.network.throughput.in,
            outRate: guest.network.throughput.out,
            history: Array(10).fill(0).map(() => ({
              in: randomBetween(Math.max(0, guest.network.throughput.in * 0.8), guest.network.throughput.in * 1.2),
              out: randomBetween(Math.max(0, guest.network.throughput.out * 0.8), guest.network.throughput.out * 1.2)
            }))
          }
        },
        history: {
          cpu: Array(10).fill(0).map(() => 
            randomFloatBetween(Math.max(0, guest.cpu.usage - 20), Math.min(100, guest.cpu.usage + 20))
          ),
          memory: Array(10).fill(0).map(() => 
            randomFloatBetween(Math.max(0, guest.memory.used - 15), Math.min(100, guest.memory.used + 15))
          ),
          disk: Array(10).fill(0).map(() => 
            randomFloatBetween(Math.max(0, guest.disk.used - 5), Math.min(100, guest.disk.used + 5))
          )
        }
      });
    }
  });
  
  return generatedMetrics;
};

// Function to send initial data to a socket
const sendInitialData = (socket: Socket) => {
  // Get client info
  const clientInfo = clients.get(socket.id);
  
  // If the client has registered for a specific node, use that node's data
  // Otherwise, send data for all nodes
  if (clientInfo?.nodeId) {
    // Send data for the specific node
    const nodeId = clientInfo.nodeId;
    const node = nodes.get(nodeId);
    
    if (!node) {
      logger.warn(`Node ${nodeId} not found in custom data`);
      return;
    }
    
    // Convert the simple guest data to full MockVM objects
    const nodeGuests = node.guests.map(guest => {
      const isVM = guest.type === 'vm';
      
      // Use the guest name directly instead of trying to match with templates
      // This ensures each guest has its own unique identity
      return {
        id: guest.id,
        name: guest.name,
        type: isVM ? 'qemu' : 'lxc',
        status: guest.status,
        os: isVM 
          ? (guest.name.includes('ubuntu') ? 'ubuntu' : 
             guest.name.includes('debian') ? 'debian' : 
             guest.name.includes('centos') ? 'centos' : 
             guest.name.includes('windows') ? 'windows' : 
             guest.name.includes('fedora') ? 'fedora' : 'linux')
          : (guest.name.includes('alpine') ? 'alpine' : 
             guest.name.includes('debian') ? 'debian' : 'linux'),
        cpu: {
          cores: randomBetween(2, 8),
          usage: guest.status === 'running' ? guest.cpu * 100 : 0
        },
        memory: {
          total: guest.memory,
          used: guest.status === 'running' ? guest.memory * randomFloatBetween(0.1, 0.9) : 0
        },
        disk: {
          total: randomBetween(20, 500),
          used: randomFloatBetween(10, 90)
        },
        network: {
          ip: randomIP(),
          mac: randomMAC(),
          throughput: {
            in: guest.status === 'running' ? randomFloatBetween(0.1, 50) : 0,
            out: guest.status === 'running' ? randomFloatBetween(0.1, 20) : 0
          }
        },
        uptime: guest.status === 'running' ? randomBetween(3600, 2592000) : 0,
        // Add a nodeId property to each guest to track which node it belongs to
        nodeId: nodeId
      };
    });
    
    // Generate metrics for these guests
    const nodeMetrics = generateMetrics(nodeGuests);
    
    // Store data
    guests.set(nodeId, nodeGuests);
    metrics.set(nodeId, nodeMetrics);
    
    // Send data for this node
    socket.emit('guests', nodeGuests);
    socket.emit('metrics', nodeMetrics);
    
    logger.info(`Sent data for node ${nodeId} to client ${socket.id}`);
  } else {
    // Client hasn't registered for a specific node, send data for all nodes
    // This is useful for the dashboard view
    
    // Collect all guests from all nodes
    const allGuests: MockVM[] = [];
    const allNodeIds: string[] = [];
    
    // Process each node
    customMockData.nodes.forEach(nodeData => {
      const nodeId = nodeData.id;
      allNodeIds.push(nodeId);
      
      // Convert the simple guest data to full MockVM objects
      const nodeGuests = nodeData.guests.map(guest => {
        const isVM = guest.type === 'vm';
        
        // Use the guest name directly instead of trying to match with templates
        return {
          id: guest.id,
          name: guest.name,
          type: isVM ? 'qemu' : 'lxc',
          status: guest.status,
          os: isVM 
            ? (guest.name.includes('ubuntu') ? 'ubuntu' : 
               guest.name.includes('debian') ? 'debian' : 
               guest.name.includes('centos') ? 'centos' : 
               guest.name.includes('windows') ? 'windows' : 
               guest.name.includes('fedora') ? 'fedora' : 'linux')
            : (guest.name.includes('alpine') ? 'alpine' : 
               guest.name.includes('debian') ? 'debian' : 'linux'),
          cpu: {
            cores: randomBetween(2, 8),
            usage: guest.status === 'running' ? guest.cpu * 100 : 0
          },
          memory: {
            total: guest.memory,
            used: guest.status === 'running' ? guest.memory * randomFloatBetween(0.1, 0.9) : 0
          },
          disk: {
            total: randomBetween(20, 500),
            used: randomFloatBetween(10, 90)
          },
          network: {
            ip: randomIP(),
            mac: randomMAC(),
            throughput: {
              in: guest.status === 'running' ? randomFloatBetween(0.1, 50) : 0,
              out: guest.status === 'running' ? randomFloatBetween(0.1, 20) : 0
            }
          },
          uptime: guest.status === 'running' ? randomBetween(3600, 2592000) : 0,
          // Add a nodeId property to each guest to track which node it belongs to
          nodeId: nodeId
        };
      });
      
      // Store node guests
      guests.set(nodeId, nodeGuests);
      
      // Add to all guests
      allGuests.push(...nodeGuests);
    });
    
    // Generate metrics for all guests
    const allMetrics = generateMetrics(allGuests);
    
    // Store metrics for each node
    allNodeIds.forEach(nodeId => {
      const nodeGuests = guests.get(nodeId) || [];
      const nodeGuestIds = nodeGuests.map((g: MockVM) => g.id);
      const nodeMetrics = allMetrics.filter(m => nodeGuestIds.includes(m.guestId));
      metrics.set(nodeId, nodeMetrics);
    });
    
    // Send all guests and metrics
    socket.emit('guests', allGuests);
    socket.emit('metrics', allMetrics);
    
    logger.info(`Sent data for all nodes to client ${socket.id}`);
  }
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
      const newMemoryUsed = (guest.memory.total * newMemoryPercent) / 100;
      
      // Update network throughput
      const newInRate = randomFloatBetween(0.1, 50);
      const newOutRate = randomFloatBetween(0.1, 20);
      
      // Update history
      const newCpuHistory = [...metric.history.cpu.slice(1), newCpu];
      const newMemoryHistory = [...metric.history.memory.slice(1), newMemoryPercent];
      
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
          memory: newMemoryHistory
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
      const newMemoryUsed = (guest.memory.total * newMemoryPercent) / 100;
      
      // Update network throughput
      const newInRate = randomFloatBetween(0.1, 50);
      const newOutRate = randomFloatBetween(0.1, 20);
      
      // Update history
      const newCpuHistory = [...metric.history.cpu.slice(1), newCpu];
      const newMemoryHistory = [...metric.history.memory.slice(1), newMemoryPercent];
      
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
          memory: newMemoryHistory
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