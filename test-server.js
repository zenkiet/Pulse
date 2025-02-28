const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = 3001;

// Create some sample nodes data
const nodes = [
  {
    id: 'node-1',
    name: 'Primary Server',
    status: 'online',
    ip: '192.168.1.100',
    uptime: 86400 * 5 // 5 days in seconds
  },
  {
    id: 'node-2',
    name: 'Secondary Server',
    status: 'online',
    ip: '192.168.1.101',
    uptime: 86400 * 3 // 3 days in seconds
  }
];

// Create some sample guests data
const guests = [
  {
    id: 'guest-101',
    name: 'Web Server',
    status: 'running',
    type: 'lxc',
    node: 'node-1'
  },
  {
    id: 'guest-102',
    name: 'Database',
    status: 'running',
    type: 'lxc',
    node: 'node-1'
  },
  {
    id: 'guest-103',
    name: 'File Storage',
    status: 'stopped',
    type: 'qemu',
    node: 'node-2'
  }
];

// Serve a simple message
app.get('/', (req, res) => {
  res.send('Socket.IO Test Server');
});

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Create consistent metrics for each guest to ensure stable data
  // This is more reliable than generating random values each time
  const initialMetrics = {
    'guest-101': {  // Web Server
      inRate: 850000,  // ~850 KB/s
      outRate: 420000  // ~420 KB/s
    },
    'guest-102': {  // Database
      inRate: 650000,  // ~650 KB/s
      outRate: 320000  // ~320 KB/s
    }
  };
  
  // Send connection confirmation
  socket.emit('message', {
    type: 'CONNECTED',
    payload: {
      timestamp: Date.now(),
      message: 'Connected to Test Socket.IO Server'
    }
  });
  
  // Send initial node data
  socket.emit('message', {
    type: 'NODE_STATUS_UPDATE',
    payload: nodes
  });
  console.log('Sent initial node data to', socket.id);
  
  // Send initial guest data
  socket.emit('message', {
    type: 'GUEST_STATUS_UPDATE',
    payload: guests
  });
  console.log('Sent initial guest data to', socket.id);
  
  // Send initial metrics data for running guests
  guests.forEach(guest => {
    if (guest.status === 'running') {
      // Use the consistent initial metrics for this guest
      const baseMetrics = initialMetrics[guest.id] || { 
        inRate: 500000, // Default if not specified
        outRate: 250000
      };
      
      // Add some randomness (±10%)
      const randomFactor = 0.9 + Math.random() * 0.2;
      
      socket.emit('message', {
        type: 'METRICS_UPDATE',
        payload: {
          guestId: guest.id,
          nodeId: guest.node,
          timestamp: Date.now(),
          metrics: {
            network: {
              inRate: baseMetrics.inRate * randomFactor,
              outRate: baseMetrics.outRate * randomFactor
            },
            uptime: Math.floor(Math.random() * 86400)
          }
        }
      });
      
      console.log(`Sent initial metrics for ${guest.id} (${guest.name})`);
    }
  });
  console.log('Sent initial metrics data for running guests to', socket.id);
  
  // Send test metrics data every 3 seconds
  const interval = setInterval(() => {
    // Create metrics for each guest
    guests.forEach(guest => {
      // Only send metrics for running guests
      if (guest.status === 'running') {
        // Use the consistent initial metrics with some random variation
        const baseMetrics = initialMetrics[guest.id] || { 
          inRate: 500000,
          outRate: 250000
        };
        
        // Add larger random variation (±30%)
        const randomFactor = 0.7 + Math.random() * 0.6;
        
        const metrics = {
          type: 'METRICS_UPDATE',
          payload: {
            guestId: guest.id,
            nodeId: guest.node,
            timestamp: Date.now(),
            metrics: {
              network: {
                inRate: baseMetrics.inRate * randomFactor,
                outRate: baseMetrics.outRate * randomFactor
              },
              uptime: Math.floor(Math.random() * 86400)
            }
          }
        };
        
        socket.emit('message', metrics);
        console.log(`Sent updated metrics for ${guest.id} (${guest.name})`);
      }
    });
    
    console.log('Sent metrics data to', socket.id);
  }, 3000);
  
  // Clean up on disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    clearInterval(interval);
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Test server running on http://localhost:${PORT}`);
}); 