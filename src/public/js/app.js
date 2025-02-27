// Connect to WebSocket server with explicit URL and options
const socket = io(window.location.origin, {
  transports: ['websocket', 'polling'],
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 20000
});

console.log('Attempting to connect to WebSocket server at:', window.location.origin);

// Add debugging for connection events
socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});

socket.on('connect_timeout', () => {
  console.error('Connection timeout');
});

socket.on('reconnect', (attemptNumber) => {
  console.log('Reconnected after', attemptNumber, 'attempts');
});

socket.on('reconnect_attempt', (attemptNumber) => {
  console.log('Reconnection attempt:', attemptNumber);
});

socket.on('reconnect_error', (error) => {
  console.error('Reconnection error:', error);
});

socket.on('reconnect_failed', () => {
  console.error('Failed to reconnect');
});

// DOM elements
const nodeSelect = document.getElementById('node-select');
const nodesContainer = document.getElementById('nodes-container');
const guestsContainer = document.getElementById('guests-container');
const connectionIndicator = document.getElementById('connection-indicator');
const connectionText = document.getElementById('connection-text');

// Summary elements
const nodesTotalElement = document.getElementById('nodes-total');
const nodesOnlineElement = document.getElementById('nodes-online');
const nodesOfflineElement = document.getElementById('nodes-offline');
const guestsTotalElement = document.getElementById('guests-total');
const guestsRunningElement = document.getElementById('guests-running');
const guestsStoppedElement = document.getElementById('guests-stopped');
const cpuUsageElement = document.getElementById('cpu-usage');
const memoryUsageElement = document.getElementById('memory-usage');
const diskUsageElement = document.getElementById('disk-usage');

// State
let nodes = [];
let guests = [];
let metrics = {};
let selectedNodeId = 'all';
let initialDataLoaded = false;
let receivedNodeData = false;
let receivedGuestData = false;
let receivedMetricsData = false;

// WebSocket event handling
socket.on('connect', () => {
  updateConnectionStatus(true);
});

socket.on('disconnect', () => {
  updateConnectionStatus(false);
});

socket.on('message', (message) => {
  switch (message.type) {
    case 'CONNECTED':
      console.log('Connected to server:', message.payload);
      break;
    
    case 'NODE_STATUS_UPDATE':
      handleNodeStatusUpdate(message.payload);
      receivedNodeData = true;
      checkInitialDataLoaded();
      break;
    
    case 'GUEST_STATUS_UPDATE':
      handleGuestStatusUpdate(message.payload);
      receivedGuestData = true;
      checkInitialDataLoaded();
      break;
    
    case 'METRICS_UPDATE':
      handleMetricsUpdate(message.payload);
      receivedMetricsData = true;
      checkInitialDataLoaded();
      break;
    
    case 'EVENT':
      console.log('Event:', message.payload);
      break;
    
    case 'ERROR':
      console.error('Error:', message.payload);
      break;
  }
});

// Check if all initial data has been loaded
function checkInitialDataLoaded() {
  if (receivedNodeData && receivedGuestData && receivedMetricsData && !initialDataLoaded) {
    initialDataLoaded = true;
    console.log('Initial data loaded, rendering UI');
    
    // Hide loading overlay with a fade-out effect
    const loadingOverlay = document.getElementById('loading-overlay');
    loadingOverlay.style.opacity = '0';
    setTimeout(() => {
      loadingOverlay.style.display = 'none';
    }, 300);
    
    // Render the UI
    renderNodes();
    renderGuests();
  }
}

// Event handlers
function handleNodeStatusUpdate(payload) {
  // Handle both single node and array of nodes
  const nodeData = Array.isArray(payload) ? payload : [payload];
  
  // Update nodes array
  nodeData.forEach(node => {
    const index = nodes.findIndex(n => n.id === node.id);
    if (index >= 0) {
      nodes[index] = node;
    } else {
      nodes.push(node);
      // Add to node selector
      const option = document.createElement('option');
      option.value = node.id;
      option.textContent = node.name;
      nodeSelect.appendChild(option);
    }
  });
  
  // Update UI
  updateSummary();
  
  // Only render if initial data is loaded or this is a subsequent update
  if (initialDataLoaded) {
    renderNodes();
  }
}

function handleGuestStatusUpdate(payload) {
  // Handle both single guest and array of guests
  const guestData = Array.isArray(payload) ? payload : [payload];
  
  // Update guests array
  guestData.forEach(guest => {
    const index = guests.findIndex(g => g.id === guest.id);
    if (index >= 0) {
      guests[index] = guest;
    } else {
      guests.push(guest);
    }
  });
  
  // Update UI
  updateSummary();
  
  // Only render if initial data is loaded or this is a subsequent update
  if (initialDataLoaded) {
    renderGuests();
  }
}

function handleMetricsUpdate(payload) {
  // Handle both single metric and array of metrics
  const metricData = Array.isArray(payload) ? payload : [payload];
  
  // Update metrics
  metricData.forEach(metric => {
    const id = metric.guestId || metric.nodeId;
    metrics[id] = metric;
  });
  
  // Update UI
  updateSummary();
  
  // Only update metrics if initial data is loaded or this is a subsequent update
  if (initialDataLoaded) {
    updateMetrics();
  }
}

// UI update functions
function updateConnectionStatus(connected) {
  connectionIndicator.className = connected ? 'indicator connected' : 'indicator disconnected';
  connectionText.textContent = connected ? 'Connected' : 'Disconnected';
}

function updateSummary() {
  // Node summary
  nodesTotalElement.textContent = nodes.length;
  nodesOnlineElement.textContent = nodes.filter(node => node.status === 'online').length;
  nodesOfflineElement.textContent = nodes.filter(node => node.status === 'offline').length;
  
  // Guest summary
  guestsTotalElement.textContent = guests.length;
  guestsRunningElement.textContent = guests.filter(guest => guest.status === 'running').length;
  guestsStoppedElement.textContent = guests.filter(guest => guest.status === 'stopped').length;
  
  // Resource summary
  let totalCpu = 0;
  let totalMemory = 0;
  let totalMemoryUsed = 0;
  let totalDisk = 0;
  let totalDiskUsed = 0;
  let nodeCount = 0;
  
  nodes.forEach(node => {
    const nodeMetrics = metrics[node.id];
    if (nodeMetrics && node.status === 'online') {
      nodeCount++;
      totalCpu += nodeMetrics.metrics.cpu || 0;
      
      if (nodeMetrics.metrics.memory) {
        totalMemory += nodeMetrics.metrics.memory.total;
        totalMemoryUsed += nodeMetrics.metrics.memory.used;
      }
      
      if (nodeMetrics.metrics.disk) {
        totalDisk += nodeMetrics.metrics.disk.total;
        totalDiskUsed += nodeMetrics.metrics.disk.used;
      }
    }
  });
  
  const avgCpu = nodeCount > 0 ? totalCpu / nodeCount : 0;
  const memoryPercentage = totalMemory > 0 ? (totalMemoryUsed / totalMemory) * 100 : 0;
  const diskPercentage = totalDisk > 0 ? (totalDiskUsed / totalDisk) * 100 : 0;
  
  cpuUsageElement.textContent = `${avgCpu.toFixed(1)}%`;
  memoryUsageElement.textContent = `${memoryPercentage.toFixed(1)}%`;
  diskUsageElement.textContent = `${diskPercentage.toFixed(1)}%`;
}

function renderNodes() {
  // Clear container
  nodesContainer.innerHTML = '';
  
  // Filter nodes if a specific node is selected
  const filteredNodes = selectedNodeId === 'all' ? nodes : nodes.filter(node => node.id === selectedNodeId);
  
  // Render each node
  filteredNodes.forEach(node => {
    const nodeCard = document.createElement('div');
    nodeCard.className = 'node-card';
    nodeCard.id = `node-${node.id}`;
    
    const nodeHeader = document.createElement('div');
    nodeHeader.className = 'node-header';
    
    const nodeName = document.createElement('div');
    nodeName.className = 'node-name';
    nodeName.textContent = node.name;
    
    const nodeStatus = document.createElement('div');
    nodeStatus.className = `node-status status-${node.status}`;
    nodeStatus.textContent = node.status.charAt(0).toUpperCase() + node.status.slice(1);
    
    nodeHeader.appendChild(nodeName);
    nodeHeader.appendChild(nodeStatus);
    
    const metricsGrid = document.createElement('div');
    metricsGrid.className = 'metrics-grid';
    
    // Add metrics if available
    const nodeMetrics = metrics[node.id];
    if (nodeMetrics && node.status === 'online') {
      // CPU metric
      metricsGrid.appendChild(createMetricCard('CPU', 
        `${(nodeMetrics.metrics.cpu || 0).toFixed(1)}%`, 
        nodeMetrics.metrics.cpu || 0, 
        'cpu'));
      
      // Memory metric
      if (nodeMetrics.metrics.memory) {
        const memoryPercentage = nodeMetrics.metrics.memory.usedPercentage;
        const memoryText = `${formatBytes(nodeMetrics.metrics.memory.used)} / ${formatBytes(nodeMetrics.metrics.memory.total)}`;
        metricsGrid.appendChild(createMetricCard('Memory', memoryText, memoryPercentage, 'memory'));
      }
      
      // Disk metric
      if (nodeMetrics.metrics.disk) {
        const diskPercentage = nodeMetrics.metrics.disk.usedPercentage;
        const diskText = `${formatBytes(nodeMetrics.metrics.disk.used)} / ${formatBytes(nodeMetrics.metrics.disk.total)}`;
        metricsGrid.appendChild(createMetricCard('Disk', diskText, diskPercentage, 'disk'));
      }
      
      // Uptime
      if (nodeMetrics.metrics.uptime) {
        metricsGrid.appendChild(createMetricCard('Uptime', formatUptime(nodeMetrics.metrics.uptime)));
      }
    } else {
      const noMetrics = document.createElement('div');
      noMetrics.className = 'no-metrics';
      noMetrics.textContent = 'No metrics available';
      metricsGrid.appendChild(noMetrics);
    }
    
    nodeCard.appendChild(nodeHeader);
    nodeCard.appendChild(metricsGrid);
    nodesContainer.appendChild(nodeCard);
  });
}

function renderGuests() {
  // Clear container
  guestsContainer.innerHTML = '';
  
  // Filter guests if a specific node is selected
  const filteredGuests = selectedNodeId === 'all' ? guests : guests.filter(guest => guest.node === selectedNodeId);
  
  // Sort guests by status (running first) and then by name
  filteredGuests.sort((a, b) => {
    if (a.status === 'running' && b.status !== 'running') return -1;
    if (a.status !== 'running' && b.status === 'running') return 1;
    return a.name.localeCompare(b.name);
  });
  
  // Render each guest
  filteredGuests.forEach(guest => {
    const guestCard = document.createElement('div');
    guestCard.className = 'guest-card';
    guestCard.id = `guest-${guest.id}`;
    
    const guestHeader = document.createElement('div');
    guestHeader.className = 'guest-header';
    
    const guestName = document.createElement('div');
    guestName.className = 'guest-name';
    guestName.textContent = `${guest.name} (${guest.type === 'qemu' ? 'VM' : 'Container'})`;
    
    const guestStatus = document.createElement('div');
    guestStatus.className = `guest-status status-${guest.status}`;
    guestStatus.textContent = guest.status.charAt(0).toUpperCase() + guest.status.slice(1);
    
    guestHeader.appendChild(guestName);
    guestHeader.appendChild(guestStatus);
    
    const metricsGrid = document.createElement('div');
    metricsGrid.className = 'metrics-grid';
    
    // Add metrics if available
    const guestMetrics = metrics[guest.id];
    if (guestMetrics && guest.status === 'running') {
      // CPU metric
      metricsGrid.appendChild(createMetricCard('CPU', 
        `${(guestMetrics.metrics.cpu || 0).toFixed(1)}%`, 
        guestMetrics.metrics.cpu || 0, 
        'cpu'));
      
      // Memory metric
      if (guestMetrics.metrics.memory) {
        const memoryPercentage = guestMetrics.metrics.memory.usedPercentage;
        const memoryText = `${formatBytes(guestMetrics.metrics.memory.used)} / ${formatBytes(guestMetrics.metrics.memory.total)}`;
        metricsGrid.appendChild(createMetricCard('Memory', memoryText, memoryPercentage, 'memory'));
      }
      
      // Disk metric
      if (guestMetrics.metrics.disk) {
        const diskPercentage = guestMetrics.metrics.disk.usedPercentage;
        const diskText = `${formatBytes(guestMetrics.metrics.disk.used)} / ${formatBytes(guestMetrics.metrics.disk.total)}`;
        metricsGrid.appendChild(createMetricCard('Disk', diskText, diskPercentage, 'disk'));
      }
      
      // Network metric
      if (guestMetrics.metrics.network) {
        const networkText = `↓ ${formatBytes(guestMetrics.metrics.network.inRate || 0)}/s ↑ ${formatBytes(guestMetrics.metrics.network.outRate || 0)}/s`;
        metricsGrid.appendChild(createMetricCard('Network', networkText));
      }
      
      // Uptime
      if (guestMetrics.metrics.uptime) {
        metricsGrid.appendChild(createMetricCard('Uptime', formatUptime(guestMetrics.metrics.uptime)));
      }
    } else if (guest.status !== 'running') {
      const noMetrics = document.createElement('div');
      noMetrics.className = 'no-metrics';
      noMetrics.textContent = 'Guest is not running';
      metricsGrid.appendChild(noMetrics);
    } else {
      const noMetrics = document.createElement('div');
      noMetrics.className = 'no-metrics';
      noMetrics.textContent = initialDataLoaded ? 'No metrics available' : 'Loading metrics...';
      metricsGrid.appendChild(noMetrics);
    }
    
    guestCard.appendChild(guestHeader);
    guestCard.appendChild(metricsGrid);
    guestsContainer.appendChild(guestCard);
  });
}

function updateMetrics() {
  // Update node metrics
  nodes.forEach(node => {
    const nodeCard = document.getElementById(`node-${node.id}`);
    if (nodeCard) {
      const nodeMetrics = metrics[node.id];
      if (nodeMetrics && node.status === 'online') {
        updateMetricCard(nodeCard, 'CPU', 
          `${(nodeMetrics.metrics.cpu || 0).toFixed(1)}%`, 
          nodeMetrics.metrics.cpu || 0);
        
        if (nodeMetrics.metrics.memory) {
          const memoryPercentage = nodeMetrics.metrics.memory.usedPercentage;
          const memoryText = `${formatBytes(nodeMetrics.metrics.memory.used)} / ${formatBytes(nodeMetrics.metrics.memory.total)}`;
          updateMetricCard(nodeCard, 'Memory', memoryText, memoryPercentage);
        }
        
        if (nodeMetrics.metrics.disk) {
          const diskPercentage = nodeMetrics.metrics.disk.usedPercentage;
          const diskText = `${formatBytes(nodeMetrics.metrics.disk.used)} / ${formatBytes(nodeMetrics.metrics.disk.total)}`;
          updateMetricCard(nodeCard, 'Disk', diskText, diskPercentage);
        }
        
        if (nodeMetrics.metrics.uptime) {
          updateMetricCard(nodeCard, 'Uptime', formatUptime(nodeMetrics.metrics.uptime));
        }
      }
    }
  });
  
  // Update guest metrics
  guests.forEach(guest => {
    const guestCard = document.getElementById(`guest-${guest.id}`);
    if (guestCard) {
      const guestMetrics = metrics[guest.id];
      if (guestMetrics && guest.status === 'running') {
        updateMetricCard(guestCard, 'CPU', 
          `${(guestMetrics.metrics.cpu || 0).toFixed(1)}%`, 
          guestMetrics.metrics.cpu || 0);
        
        if (guestMetrics.metrics.memory) {
          const memoryPercentage = guestMetrics.metrics.memory.usedPercentage;
          const memoryText = `${formatBytes(guestMetrics.metrics.memory.used)} / ${formatBytes(guestMetrics.metrics.memory.total)}`;
          updateMetricCard(guestCard, 'Memory', memoryText, memoryPercentage);
        }
        
        if (guestMetrics.metrics.disk) {
          const diskPercentage = guestMetrics.metrics.disk.usedPercentage;
          const diskText = `${formatBytes(guestMetrics.metrics.disk.used)} / ${formatBytes(guestMetrics.metrics.disk.total)}`;
          updateMetricCard(guestCard, 'Disk', diskText, diskPercentage);
        }
        
        if (guestMetrics.metrics.network) {
          const networkText = `↓ ${formatBytes(guestMetrics.metrics.network.inRate || 0)}/s ↑ ${formatBytes(guestMetrics.metrics.network.outRate || 0)}/s`;
          updateMetricCard(guestCard, 'Network', networkText);
        }
        
        if (guestMetrics.metrics.uptime) {
          updateMetricCard(guestCard, 'Uptime', formatUptime(guestMetrics.metrics.uptime));
        }
      }
    }
  });
}

// Helper functions
function createMetricCard(label, value, percentage, type) {
  const metricCard = document.createElement('div');
  metricCard.className = 'metric-card';
  metricCard.dataset.label = label;
  
  const metricLabel = document.createElement('div');
  metricLabel.className = 'metric-label';
  metricLabel.textContent = label;
  
  const metricValue = document.createElement('div');
  metricValue.className = 'metric-value';
  metricValue.textContent = value;
  
  metricCard.appendChild(metricLabel);
  metricCard.appendChild(metricValue);
  
  // Add progress bar if percentage is provided
  if (percentage !== undefined && type) {
    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    
    const progressBarFill = document.createElement('div');
    progressBarFill.className = `progress-bar-fill ${type}`;
    progressBarFill.style.width = `${Math.min(percentage, 100)}%`;
    
    progressBar.appendChild(progressBarFill);
    metricCard.appendChild(progressBar);
  }
  
  return metricCard;
}

function updateMetricCard(parentElement, label, value, percentage) {
  const metricCards = parentElement.querySelectorAll('.metric-card');
  for (const card of metricCards) {
    if (card.dataset.label === label) {
      const metricValue = card.querySelector('.metric-value');
      if (metricValue) {
        metricValue.textContent = value;
      }
      
      if (percentage !== undefined) {
        const progressBarFill = card.querySelector('.progress-bar-fill');
        if (progressBarFill) {
          progressBarFill.style.width = `${Math.min(percentage, 100)}%`;
        }
      }
      
      break;
    }
  }
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

// Event listeners
nodeSelect.addEventListener('change', (event) => {
  selectedNodeId = event.target.value;
  renderNodes();
  renderGuests();
}); 