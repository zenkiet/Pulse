/**
 * Mock Data Generator for Pulse
 * 
 * This script generates simulated data for development and testing.
 * It overrides the socket connection to provide consistent, visually appealing data.
 * 
 * Usage:
 * 1. Run this script with Node.js
 * 2. Open the app in your browser
 * 3. Use the app with simulated data
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

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
const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

// Generate a random floating point number between min and max with specified precision
const randomFloatBetween = (min, max, precision = 2) => {
  const value = Math.random() * (max - min) + min;
  return parseFloat(value.toFixed(precision));
};

// Generate a random IP address
const randomIP = () => {
  return `192.168.${randomBetween(1, 254)}.${randomBetween(1, 254)}`;
};

// Generate a random MAC address
const randomMAC = () => {
  return Array(6).fill(0).map(() => {
    const part = randomBetween(0, 255).toString(16);
    return part.length === 1 ? `0${part}` : part;
  }).join(':');
};

// Generate node data
const generateNodes = () => {
  return [
    {
      id: "node-1",
      name: "proxmox-01",
      status: "online",
      ip: "192.168.1.100",
      uptime: 1209600, // 14 days
      cpu: {
        cores: 32,
        usage: 45.5
      },
      memory: {
        total: 137438953472, // 128 GB
        used: 35.2
      },
      disk: {
        total: 4398046511104, // 4 TB
        used: 42.8
      },
      network: {
        interfaces: ["eth0", "eth1"],
        throughput: {
          in: 52428800, // 50 MB/s
          out: 20971520 // 20 MB/s
        }
      }
    }
  ];
};

// Generate guest data with explicit VM and container types
const generateGuests = () => {
  // VM names and OS combinations
  const vmTemplates = [
    { name: "ubuntu-web", os: "ubuntu" },
    { name: "debian-db", os: "debian" },
    { name: "centos-app", os: "centos" },
    { name: "windows-ad", os: "windows" },
    { name: "fedora-dev", os: "fedora" },
    { name: "arch-build", os: "arch" },
    { name: "windows-rdp", os: "windows" },
    { name: "ubuntu-mail", os: "ubuntu" },
    { name: "debian-proxy", os: "debian" },
    { name: "centos-monitor", os: "centos" }
  ];
  
  // Container names and OS combinations
  const containerTemplates = [
    { name: "nginx-proxy", os: "alpine" },
    { name: "postgres-db", os: "debian" },
    { name: "redis-cache", os: "alpine" },
    { name: "nodejs-api", os: "debian" },
    { name: "python-worker", os: "alpine" },
    { name: "php-app", os: "debian" },
    { name: "mariadb-db", os: "debian" },
    { name: "mongodb-db", os: "debian" },
    { name: "haproxy-lb", os: "alpine" },
    { name: "elasticsearch", os: "debian" }
  ];
  
  const guests = [];
  
  // Generate VMs (10 VMs)
  vmTemplates.forEach((template, index) => {
    const vmId = 100 + index;
    const cpuCores = randomBetween(2, 8);
    const memoryGB = cpuCores * 2; // 2GB per core as a rule of thumb
    const diskGB = randomBetween(50, 200);
    
    guests.push({
      id: `vm-${vmId}`,
      name: `${template.name}-${vmId}`,
      node: "node-1",
      type: "qemu",
      status: Math.random() > 0.2 ? "running" : "stopped", // 80% running, 20% stopped
      os: template.os,
      ip: Math.random() > 0.2 ? randomIP() : null, // 80% have IPs
      mac: randomMAC(),
      uptime: Math.random() > 0.2 ? randomBetween(3600, 2592000) : 0, // 1 hour to 30 days
      cpu: {
        cores: cpuCores,
        usage: Math.random() > 0.2 ? randomFloatBetween(5, 85) : 0
      },
      memory: {
        total: memoryGB * 1073741824, // Convert GB to bytes
        used: Math.random() > 0.2 ? randomFloatBetween(10, 90) : 0
      },
      disk: {
        total: diskGB * 1073741824, // Convert GB to bytes
        used: Math.random() > 0.2 ? randomFloatBetween(10, 80) : 0
      },
      network: {
        interfaces: ["eth0"],
        throughput: {
          in: Math.random() > 0.2 ? randomBetween(1048576, 20971520) : 0, // 1-20 MB/s
          out: Math.random() > 0.2 ? randomBetween(524288, 10485760) : 0 // 0.5-10 MB/s
        }
      }
    });
  });
  
  // Generate Containers (10 containers)
  containerTemplates.forEach((template, index) => {
    const containerId = 200 + index;
    const cpuCores = randomBetween(1, 4);
    const memoryGB = cpuCores; // 1GB per core for containers
    const diskGB = randomBetween(10, 50);
    
    guests.push({
      id: `ct-${containerId}`,
      name: `${template.name}-${containerId}`,
      node: "node-1",
      type: "lxc",
      status: Math.random() > 0.2 ? "running" : "stopped", // 80% running, 20% stopped
      os: template.os,
      ip: Math.random() > 0.2 ? randomIP() : null, // 80% have IPs
      mac: randomMAC(),
      uptime: Math.random() > 0.2 ? randomBetween(3600, 2592000) : 0, // 1 hour to 30 days
      cpu: {
        cores: cpuCores,
        usage: Math.random() > 0.2 ? randomFloatBetween(5, 85) : 0
      },
      memory: {
        total: memoryGB * 1073741824, // Convert GB to bytes
        used: Math.random() > 0.2 ? randomFloatBetween(10, 90) : 0
      },
      disk: {
        total: diskGB * 1073741824, // Convert GB to bytes
        used: Math.random() > 0.2 ? randomFloatBetween(10, 80) : 0
      },
      network: {
        interfaces: ["eth0"],
        throughput: {
          in: Math.random() > 0.2 ? randomBetween(524288, 10485760) : 0, // 0.5-10 MB/s
          out: Math.random() > 0.2 ? randomBetween(262144, 5242880) : 0 // 0.25-5 MB/s
        }
      }
    });
  });
  
  return guests;
};

// Generate metrics data with the exact same structure as the guests
const generateMetrics = (guests) => {
  // Create a metrics array with the same structure that your app expects
  const metrics = [];
  
  // For each guest, create a metrics entry
  guests.forEach(guest => {
    if (guest.status === 'running') {
      // For running guests, use their current values
      metrics.push({
        guestId: guest.id,
        timestamp: Date.now(),
        metrics: {  // Add this wrapper object to match the expected structure
          cpu: guest.cpu.usage,
          memory: {
            total: guest.memory.total,
            used: guest.memory.used,
            percentUsed: guest.memory.used  // This is already a percentage in our mock data
          },
          disk: {
            total: guest.disk.total,
            used: guest.disk.used,
            percentUsed: guest.disk.used  // This is already a percentage in our mock data
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
  
  return metrics;
};

// Function to send initial data to a socket
const sendInitialData = (socket) => {
  // Generate simulated data with hardcoded values
  const nodes = generateNodes();
  const guests = generateGuests();
  
  // Log what we're sending
  console.log(`Sending data for ${nodes.length} nodes and ${guests.length} guests`);
  
  // Send initial data
  socket.emit('message', { type: 'CONNECTED', payload: { server: 'Pulse Mock Data Generator' } });
  console.log('Sent CONNECTED message');
  
  socket.emit('message', { type: 'NODE_STATUS_UPDATE', payload: nodes });
  console.log('Sent NODE_STATUS_UPDATE message');
  
  socket.emit('message', { type: 'GUEST_STATUS_UPDATE', payload: guests });
  console.log('Sent GUEST_STATUS_UPDATE message');
  
  // Generate and send initial metrics
  const metrics = generateMetrics(guests);
  console.log(`Sending metrics for ${metrics.length} guests`);
  
  socket.emit('message', { type: 'METRICS_UPDATE', payload: metrics });
  console.log('Sent initial METRICS_UPDATE message');
  
  return { nodes, guests, metrics };
};

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('Client connected with ID:', socket.id);
  
  // Send initial data
  const { nodes, guests } = sendInitialData(socket);
  
  // Handle request for initial data
  socket.on('requestInitialData', () => {
    console.log('Received request for initial data from client:', socket.id);
    sendInitialData(socket);
  });
  
  // Send updated metrics every 2 seconds
  const metricsInterval = setInterval(() => {
    const updatedMetrics = generateMetrics(guests);
    socket.emit('message', { type: 'METRICS_UPDATE', payload: updatedMetrics });
    console.log(`Sent updated metrics at ${new Date().toLocaleTimeString()}`);
  }, 2000);
  
  // Clean up on disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    clearInterval(metricsInterval);
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════════════════════════╗
  ║                                                            ║
  ║  Pulse Mock Data Generator                                 ║
  ║                                                            ║
  ║  Server running on port ${PORT}                               ║
  ║                                                            ║
  ║  To use:                                                   ║
  ║  1. Make sure your frontend is connected to this server    ║
  ║  2. Use the app with simulated data                        ║
  ║                                                            ║
  ╚════════════════════════════════════════════════════════════╝
  `);
}); 