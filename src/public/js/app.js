// Connect to WebSocket server with explicit URL and options
const socket = io(window.location.origin, {
  transports: ['websocket'], // Start with only websocket for faster initial connection
  reconnectionAttempts: 5,
  reconnectionDelay: 500, 
  timeout: 3000, // Further reduced timeout
  forceNew: true,
  autoConnect: true
});

console.log('Attempting to connect to WebSocket server at:', window.location.origin);

// Add connection status indicator to loading screen
function updateLoadingStatus(message, isError = false) {
  const loadingText = document.querySelector('.loading-text');
  if (loadingText) {
    loadingText.textContent = message;
    if (isError) {
      loadingText.style.color = '#ff5252';
    } else {
      loadingText.style.color = '';
    }
  }
  console.log(message);
}

// AGGRESSIVE APPROACH: Hide loading overlay after just 1 second 
// regardless of data status - show the UI with placeholders
setTimeout(() => {
  const loadingOverlay = document.getElementById('loading-overlay');
  if (loadingOverlay) {
    updateLoadingStatus('Initializing dashboard...');
    // Fade out quickly
    loadingOverlay.style.opacity = '0';
    setTimeout(() => {
      loadingOverlay.style.display = 'none';
    }, 300);
    
    // Initialize UI immediately with empty data
    if (!initialDataLoaded) {
      renderNodes();
      renderVMs();
      renderContainers();
      setupSorting();
      setupSectionReordering();
      restoreSectionOrder();
    }
  }
}, 1000);

// On initial connection
socket.on('connect', () => {
  updateConnectionStatus(true);
  updateLoadingStatus('Connected! Loading data...');
  
  // If it's the first connection, request data immediately
  if (!receivedNodeData) {
    console.log('Requesting initial data on connect');
    // If the server supports explicit data requests, we could add them here
  }
});

// Check connection after 1 second
setTimeout(() => {
  if (!socket.connected) {
    console.warn('Socket not connected after 1 second, attempting fallback...');
    // Try to reconnect with polling as a fallback
    socket.io.opts.transports = ['polling', 'websocket'];
    socket.connect();
  }
}, 1000);

// Enhanced connection error handling
socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
  // Update connection status in the status bar - not in overlay since it's likely gone
  updateConnectionStatus(false, 'Connection error: ' + error.message);
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
const vmsContainer = document.getElementById('vms-container');
const ctsContainer = document.getElementById('cts-container');
const connectionIndicator = document.getElementById('connection-indicator');
const connectionText = document.getElementById('connection-text');
const nodesTable = document.getElementById('nodes-table');
const guestsTable = document.getElementById('guests-table');
const vmsTable = document.getElementById('vms-table');
const ctsTable = document.getElementById('cts-table');
const showStoppedToggle = document.getElementById('show-stopped-toggle');
const showStoppedVMsToggle = document.getElementById('show-stopped-vms-toggle');
const showStoppedCTsToggle = document.getElementById('show-stopped-cts-toggle');

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
let showStopped = false; // For backwards compatibility
let showStoppedVMs = false; // Controls visibility of stopped VMs
let showStoppedCTs = false; // Controls visibility of stopped containers
let initialDataLoaded = false;
let receivedNodeData = false;
let receivedGuestData = false;
let receivedMetricsData = false;
let currentSortColumn = 'name';
let currentSortDirection = 'asc';
let vmSortColumn = 'name'; // Separate sort for VMs
let vmSortDirection = 'asc';
let ctSortColumn = 'name'; // Separate sort for containers
let ctSortDirection = 'asc';

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
  
  // Check after each message if we've now received all initial data
  if (receivedNodeData && receivedGuestData && receivedMetricsData && !initialDataLoaded) {
    initialDataLoaded = true;
    console.log('All initial data loaded');
  }
});

// Modified function - Remove the block on rendering and just track data loading status
function checkInitialDataLoaded() {
  if (receivedNodeData && receivedGuestData && receivedMetricsData && !initialDataLoaded) {
    initialDataLoaded = true;
    console.log('Initial data fully loaded');
  }
}

// Event handlers - now rendering directly as data comes in
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
  
  // Update UI immediately
  updateSummary();
  renderNodes(); // Always render nodes as soon as we get node data
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
  
  // Update UI immediately
  updateSummary();
  renderVMs(); // Always render VMs as soon as we get guest data
  renderContainers(); // Always render containers as soon as we get guest data
}

function handleMetricsUpdate(payload) {
  // Handle both single metric and array of metrics
  const metricData = Array.isArray(payload) ? payload : [payload];
  
  // Update metrics
  metricData.forEach(metric => {
    const id = metric.guestId || metric.nodeId;
    metrics[id] = metric;
  });
  
  // Update UI immediately
  updateSummary();
  updateMetrics(); // Always update metrics as soon as we get metrics data
}

// UI update functions
function updateConnectionStatus(connected, errorMsg = null) {
  if (!connectionIndicator || !connectionText) {
    // These elements might not exist yet if we're very early in loading
    return;
  }
  
  connectionIndicator.className = connected ? 'indicator connected' : 'indicator disconnected';
  connectionText.textContent = errorMsg || (connected ? 'Connected' : 'Disconnected');
}

function updateSummary() {
  // Node summary
  nodesTotalElement.textContent = nodes.length;
  nodesOnlineElement.textContent = nodes.filter(node => node.status === 'online').length;
  nodesOfflineElement.textContent = nodes.filter(node => node.status === 'offline').length;
  
  // Guest summary - keeping this for backwards compatibility with existing UI elements
  guestsTotalElement.textContent = guests.length;
  guestsRunningElement.textContent = guests.filter(guest => guest.status === 'running').length;
  guestsStoppedElement.textContent = guests.filter(guest => guest.status === 'stopped').length;
  
  // Calculate VM and container counts - if UI elements are added later
  const vms = guests.filter(guest => guest.type === 'qemu');
  const containers = guests.filter(guest => guest.type !== 'qemu');
  
  // If VM summary elements exist, update them
  const vmsTotalElement = document.getElementById('vms-total');
  const vmsRunningElement = document.getElementById('vms-running');
  const vmsStoppedElement = document.getElementById('vms-stopped');
  
  if (vmsTotalElement) vmsTotalElement.textContent = vms.length;
  if (vmsRunningElement) vmsRunningElement.textContent = vms.filter(vm => vm.status === 'running').length;
  if (vmsStoppedElement) vmsStoppedElement.textContent = vms.filter(vm => vm.status === 'stopped').length;
  
  // If container summary elements exist, update them
  const ctsTotalElement = document.getElementById('cts-total');
  const ctsRunningElement = document.getElementById('cts-running');
  const ctsStoppedElement = document.getElementById('cts-stopped');
  
  if (ctsTotalElement) ctsTotalElement.textContent = containers.length;
  if (ctsRunningElement) ctsRunningElement.textContent = containers.filter(ct => ct.status === 'running').length;
  if (ctsStoppedElement) ctsStoppedElement.textContent = containers.filter(ct => ct.status === 'stopped').length;
  
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
  // Get the table body
  const tbody = nodesTable.querySelector('tbody');
  tbody.innerHTML = '';
  
  // Show loading indicator if no data yet
  if (nodes.length === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 6;
    cell.className = 'loading';
    
    if (!receivedNodeData) {
      cell.innerHTML = 'Loading nodes data... <div class="spinner-small"></div>';
    } else {
      cell.textContent = 'No nodes available';
    }
    
    row.appendChild(cell);
    tbody.appendChild(row);
    return;
  }
  
  // Filter nodes if a specific node is selected
  const filteredNodes = selectedNodeId === 'all' ? nodes : nodes.filter(node => node.id === selectedNodeId);
  
  // Sort nodes based on current sort settings
  const sortedNodes = sortData(filteredNodes);
  
  if (sortedNodes.length === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 6;
    cell.className = 'loading';
    cell.textContent = 'No nodes available';
    row.appendChild(cell);
    tbody.appendChild(row);
    return;
  }
  
  // Render each node as a row
  sortedNodes.forEach(node => {
    const row = document.createElement('tr');
    row.id = `node-${node.id}`;
    row.dataset.id = node.id;
    
    // Name cell with status dot
    const nameCell = document.createElement('td');
    nameCell.className = 'name-cell';
    
    const nameWrapper = document.createElement('div');
    nameWrapper.className = 'name-wrapper';
    
    // Add status dot
    const statusDot = document.createElement('span');
    statusDot.className = `status-dot status-${node.status}`;
    statusDot.title = node.status.charAt(0).toUpperCase() + node.status.slice(1);
    nameWrapper.appendChild(statusDot);
    
    // Add node name
    const nameText = document.createElement('span');
    nameText.className = 'node-name';
    nameText.textContent = node.name;
    nameWrapper.appendChild(nameText);
    
    nameCell.appendChild(nameWrapper);
    row.appendChild(nameCell);
    
    // Get node metrics
    const nodeMetrics = metrics[node.id];
    
    // CPU cell
    const cpuCell = document.createElement('td');
    cpuCell.className = 'cpu-cell';
    if (nodeMetrics && node.status === 'online') {
      const cpuValue = nodeMetrics.metrics.cpu || 0;
      cpuCell.appendChild(createProgressBar(cpuValue, `${Math.round(cpuValue)}%`, 'cpu'));
    } else {
      const naSpan = document.createElement('span');
      naSpan.className = 'na-value';
      naSpan.textContent = '-';
      cpuCell.appendChild(naSpan);
    }
    row.appendChild(cpuCell);
    
    // Memory cell
    const memoryCell = document.createElement('td');
    memoryCell.className = 'memory-cell';
    if (nodeMetrics && node.status === 'online' && nodeMetrics.metrics.memory) {
        const memoryPercentage = nodeMetrics.metrics.memory.usedPercentage;
      memoryCell.appendChild(createProgressBar(memoryPercentage, `${Math.round(memoryPercentage)}%`, 'memory'));
    } else {
      const naSpan = document.createElement('span');
      naSpan.className = 'na-value';
      naSpan.textContent = '-';
      memoryCell.appendChild(naSpan);
    }
    row.appendChild(memoryCell);
    
    // Disk cell
    const diskCell = document.createElement('td');
    diskCell.className = 'disk-cell';
    if (nodeMetrics && node.status === 'online' && nodeMetrics.metrics.disk) {
        const diskPercentage = nodeMetrics.metrics.disk.usedPercentage;
      diskCell.appendChild(createProgressBar(diskPercentage, `${Math.round(diskPercentage)}%`, 'disk'));
    } else {
      const naSpan = document.createElement('span');
      naSpan.className = 'na-value';
      naSpan.textContent = '-';
      diskCell.appendChild(naSpan);
    }
    row.appendChild(diskCell);
    
    // Uptime cell
    const uptimeCell = document.createElement('td');
    uptimeCell.className = 'uptime-cell';
    if (nodeMetrics && node.status === 'online' && nodeMetrics.metrics.uptime) {
      uptimeCell.textContent = formatUptime(nodeMetrics.metrics.uptime);
    } else {
      const naSpan = document.createElement('span');
      naSpan.className = 'na-value';
      naSpan.textContent = '-';
      uptimeCell.appendChild(naSpan);
    }
    row.appendChild(uptimeCell);
    
    tbody.appendChild(row);
  });
}

function renderVMs() {
  // Get the table body
  const tbody = vmsTable.querySelector('tbody');
  tbody.innerHTML = '';
  
  // Filter VMs based on node selection and stopped status
  let filteredVMs = guests.filter(guest => guest.type === 'qemu'); // Filter to only VMs
  
  // Apply node filter if selected
  if (selectedNodeId !== 'all') {
    filteredVMs = filteredVMs.filter(vm => vm.node === selectedNodeId);
  }
  
  // Filter out stopped VMs if toggle is unchecked
  if (!showStoppedVMs) {
    filteredVMs = filteredVMs.filter(vm => vm.status !== 'stopped');
  }
  
  // Show loading indicator if no data yet
  if (filteredVMs.length === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 6;
    cell.className = 'loading';
    
    if (!receivedGuestData) {
      cell.innerHTML = 'Loading VM data... <div class="spinner-small"></div>';
    } else {
      cell.textContent = 'No virtual machines available';
    }
    
    row.appendChild(cell);
    tbody.appendChild(row);
    return;
  }
  
  // Sort VMs based on current VM sort settings
  const sortedVMs = sortData(filteredVMs, vmSortColumn, vmSortDirection);
  
  if (sortedVMs.length === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 6;
    cell.className = 'loading';
    cell.textContent = 'No virtual machines available';
    row.appendChild(cell);
    tbody.appendChild(row);
    return;
  }
  
  // Render each VM as a row
  sortedVMs.forEach(vm => {
    const row = document.createElement('tr');
    row.id = `vm-${vm.id}`;
    row.dataset.id = vm.id;
    
    // Name cell with status dot
    const nameCell = document.createElement('td');
    nameCell.className = 'name-cell';
    
    const nameWrapper = document.createElement('div');
    nameWrapper.className = 'name-wrapper';
    
    // Add status dot
    const statusDot = document.createElement('span');
    statusDot.className = `status-dot status-${vm.status}`;
    statusDot.title = vm.status.charAt(0).toUpperCase() + vm.status.slice(1);
    nameWrapper.appendChild(statusDot);
    
    // Add VM name
    const nameText = document.createElement('span');
    nameText.className = 'guest-name';
    nameText.textContent = vm.name;
    nameWrapper.appendChild(nameText);
    
    // Add node indicator
    const nodeInfo = document.createElement('span');
    nodeInfo.className = 'node-indicator';
    // Find the node name by ID
    const nodeObj = nodes.find(n => n.id === vm.node);
    nodeInfo.textContent = nodeObj ? `@${nodeObj.name}` : `@${vm.node}`;
    nodeInfo.title = `Node: ${nodeObj ? nodeObj.name : vm.node}`;
    nameWrapper.appendChild(nodeInfo);
    
    nameCell.appendChild(nameWrapper);
    row.appendChild(nameCell);
    
    // Get VM metrics
    const vmMetrics = metrics[vm.id];
    
    // CPU cell
    const cpuCell = document.createElement('td');
    cpuCell.className = 'cpu-cell';
    if (vmMetrics && vm.status === 'running') {
      const cpuValue = vmMetrics.metrics.cpu || 0;
      cpuCell.appendChild(createProgressBar(cpuValue, `${Math.round(cpuValue)}%`, 'cpu'));
    } else {
      const naSpan = document.createElement('span');
      naSpan.className = 'na-value';
      naSpan.textContent = '-';
      cpuCell.appendChild(naSpan);
    }
    row.appendChild(cpuCell);
    
    // Memory cell
    const memoryCell = document.createElement('td');
    memoryCell.className = 'memory-cell';
    if (vmMetrics && vm.status === 'running' && vmMetrics.metrics.memory) {
      const memoryPercentage = vmMetrics.metrics.memory.usedPercentage;
      memoryCell.appendChild(createProgressBar(memoryPercentage, `${Math.round(memoryPercentage)}%`, 'memory'));
    } else {
      const naSpan = document.createElement('span');
      naSpan.className = 'na-value';
      naSpan.textContent = '-';
      memoryCell.appendChild(naSpan);
    }
    row.appendChild(memoryCell);
    
    // Disk cell
    const diskCell = document.createElement('td');
    diskCell.className = 'disk-cell';
    if (vmMetrics && vm.status === 'running' && vmMetrics.metrics.disk) {
      const diskPercentage = vmMetrics.metrics.disk.usedPercentage;
      diskCell.appendChild(createProgressBar(diskPercentage, `${Math.round(diskPercentage)}%`, 'disk'));
    } else {
      const naSpan = document.createElement('span');
      naSpan.className = 'na-value';
      naSpan.textContent = '-';
      diskCell.appendChild(naSpan);
    }
    row.appendChild(diskCell);
    
    // Network cell
    const networkCell = document.createElement('td');
    networkCell.className = 'network-cell';
    if (vmMetrics && vm.status === 'running' && vmMetrics.metrics.network) {
      const networkDisplay = document.createElement('div');
      networkDisplay.className = 'network-display';
      
      const networkIn = document.createElement('div');
      networkIn.className = 'network-in';
      networkIn.innerHTML = `↓ ${formatBytes(vmMetrics.metrics.network.inRate || 0)}/s`;
      
      const networkOut = document.createElement('div');
      networkOut.className = 'network-out';
      networkOut.innerHTML = `↑ ${formatBytes(vmMetrics.metrics.network.outRate || 0)}/s`;
      
      networkDisplay.appendChild(networkIn);
      networkDisplay.appendChild(networkOut);
      networkCell.appendChild(networkDisplay);
    } else {
      const naSpan = document.createElement('span');
      naSpan.className = 'na-value';
      naSpan.textContent = '-';
      networkCell.appendChild(naSpan);
    }
    row.appendChild(networkCell);
    
    // Uptime cell
    const uptimeCell = document.createElement('td');
    uptimeCell.className = 'uptime-cell';
    if (vmMetrics && vm.status === 'running' && vmMetrics.metrics.uptime) {
      uptimeCell.textContent = formatUptime(vmMetrics.metrics.uptime);
    } else {
      const naSpan = document.createElement('span');
      naSpan.className = 'na-value';
      naSpan.textContent = '-';
      uptimeCell.appendChild(naSpan);
    }
    row.appendChild(uptimeCell);
    
    tbody.appendChild(row);
  });
}

function renderContainers() {
  // Get the table body
  const tbody = ctsTable.querySelector('tbody');
  tbody.innerHTML = '';
  
  // Filter Containers based on node selection and stopped status
  let filteredCTs = guests.filter(guest => guest.type !== 'qemu'); // Filter to only containers
  
  // Apply node filter if selected
  if (selectedNodeId !== 'all') {
    filteredCTs = filteredCTs.filter(ct => ct.node === selectedNodeId);
  }
  
  // Filter out stopped containers if toggle is unchecked
  if (!showStoppedCTs) {
    filteredCTs = filteredCTs.filter(ct => ct.status !== 'stopped');
  }
  
  // Show loading indicator if no data yet
  if (filteredCTs.length === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 6;
    cell.className = 'loading';
    
    if (!receivedGuestData) {
      cell.innerHTML = 'Loading container data... <div class="spinner-small"></div>';
    } else {
      cell.textContent = 'No containers available';
    }
    
    row.appendChild(cell);
    tbody.appendChild(row);
    return;
  }
  
  // Sort containers based on current CT sort settings
  const sortedCTs = sortData(filteredCTs, ctSortColumn, ctSortDirection);
  
  if (sortedCTs.length === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 6;
    cell.className = 'loading';
    cell.textContent = 'No containers available';
    row.appendChild(cell);
    tbody.appendChild(row);
    return;
  }
  
  // Render each container as a row
  sortedCTs.forEach(ct => {
    const row = document.createElement('tr');
    row.id = `ct-${ct.id}`;
    row.dataset.id = ct.id;
    
    // Name cell with status dot
    const nameCell = document.createElement('td');
    nameCell.className = 'name-cell';
    
    const nameWrapper = document.createElement('div');
    nameWrapper.className = 'name-wrapper';
    
    // Add status dot
    const statusDot = document.createElement('span');
    statusDot.className = `status-dot status-${ct.status}`;
    statusDot.title = ct.status.charAt(0).toUpperCase() + ct.status.slice(1);
    nameWrapper.appendChild(statusDot);
    
    // Add container name
    const nameText = document.createElement('span');
    nameText.className = 'guest-name';
    nameText.textContent = ct.name;
    nameWrapper.appendChild(nameText);
    
    // Add node indicator
    const nodeInfo = document.createElement('span');
    nodeInfo.className = 'node-indicator';
    // Find the node name by ID
    const nodeObj = nodes.find(n => n.id === ct.node);
    nodeInfo.textContent = nodeObj ? `@${nodeObj.name}` : `@${ct.node}`;
    nodeInfo.title = `Node: ${nodeObj ? nodeObj.name : ct.node}`;
    nameWrapper.appendChild(nodeInfo);
    
    nameCell.appendChild(nameWrapper);
    row.appendChild(nameCell);
    
    // Get container metrics
    const ctMetrics = metrics[ct.id];
    
    // CPU cell
    const cpuCell = document.createElement('td');
    cpuCell.className = 'cpu-cell';
    if (ctMetrics && ct.status === 'running') {
      const cpuValue = ctMetrics.metrics.cpu || 0;
      cpuCell.appendChild(createProgressBar(cpuValue, `${Math.round(cpuValue)}%`, 'cpu'));
    } else {
      const naSpan = document.createElement('span');
      naSpan.className = 'na-value';
      naSpan.textContent = '-';
      cpuCell.appendChild(naSpan);
    }
    row.appendChild(cpuCell);
    
    // Memory cell
    const memoryCell = document.createElement('td');
    memoryCell.className = 'memory-cell';
    if (ctMetrics && ct.status === 'running' && ctMetrics.metrics.memory) {
      const memoryPercentage = ctMetrics.metrics.memory.usedPercentage;
      memoryCell.appendChild(createProgressBar(memoryPercentage, `${Math.round(memoryPercentage)}%`, 'memory'));
    } else {
      const naSpan = document.createElement('span');
      naSpan.className = 'na-value';
      naSpan.textContent = '-';
      memoryCell.appendChild(naSpan);
    }
    row.appendChild(memoryCell);
    
    // Disk cell
    const diskCell = document.createElement('td');
    diskCell.className = 'disk-cell';
    if (ctMetrics && ct.status === 'running' && ctMetrics.metrics.disk) {
      const diskPercentage = ctMetrics.metrics.disk.usedPercentage;
      diskCell.appendChild(createProgressBar(diskPercentage, `${Math.round(diskPercentage)}%`, 'disk'));
    } else {
      const naSpan = document.createElement('span');
      naSpan.className = 'na-value';
      naSpan.textContent = '-';
      diskCell.appendChild(naSpan);
    }
    row.appendChild(diskCell);
    
    // Network cell
    const networkCell = document.createElement('td');
    networkCell.className = 'network-cell';
    if (ctMetrics && ct.status === 'running' && ctMetrics.metrics.network) {
      const networkDisplay = document.createElement('div');
      networkDisplay.className = 'network-display';
      
      const networkIn = document.createElement('div');
      networkIn.className = 'network-in';
      networkIn.innerHTML = `↓ ${formatBytes(ctMetrics.metrics.network.inRate || 0)}/s`;
      
      const networkOut = document.createElement('div');
      networkOut.className = 'network-out';
      networkOut.innerHTML = `↑ ${formatBytes(ctMetrics.metrics.network.outRate || 0)}/s`;
      
      networkDisplay.appendChild(networkIn);
      networkDisplay.appendChild(networkOut);
      networkCell.appendChild(networkDisplay);
    } else {
      const naSpan = document.createElement('span');
      naSpan.className = 'na-value';
      naSpan.textContent = '-';
      networkCell.appendChild(naSpan);
    }
    row.appendChild(networkCell);
    
    // Uptime cell
    const uptimeCell = document.createElement('td');
    uptimeCell.className = 'uptime-cell';
    if (ctMetrics && ct.status === 'running' && ctMetrics.metrics.uptime) {
      uptimeCell.textContent = formatUptime(ctMetrics.metrics.uptime);
    } else {
      const naSpan = document.createElement('span');
      naSpan.className = 'na-value';
      naSpan.textContent = '-';
      uptimeCell.appendChild(naSpan);
    }
    row.appendChild(uptimeCell);
    
    tbody.appendChild(row);
  });
}

function updateMetrics() {
  // Flag to track if we need to re-render tables due to sort-relevant changes
  let shouldResortNodes = false;
  let shouldResortVMs = false;
  let shouldResortCTs = false;
  
  // Check if current sort columns are affected by metrics updates
  const metricsSortColumns = ['cpu', 'memory', 'disk', 'network', 'uptime'];
  const isNodeMetricSortColumn = metricsSortColumns.includes(currentSortColumn);
  const isVMMetricSortColumn = metricsSortColumns.includes(vmSortColumn);
  const isCTMetricSortColumn = metricsSortColumns.includes(ctSortColumn);
  
  // Update node metrics
  nodes.forEach(node => {
    const nodeRow = document.getElementById(`node-${node.id}`);
    if (nodeRow) {
      const nodeMetrics = metrics[node.id];
      if (nodeMetrics && node.status === 'online') {
        // Flag for re-sorting if this is a metric sort column
        if (isNodeMetricSortColumn) {
          shouldResortNodes = true;
        }
        
        // Update CPU
        const cpuCell = nodeRow.cells[1]; // CPU is the 2nd column (index 1)
        const cpuValue = nodeMetrics.metrics.cpu || 0;
        updateCellWithProgressBar(cpuCell, cpuValue, `${Math.round(cpuValue)}%`, 'cpu');
        
        // Update Memory
        if (nodeMetrics.metrics.memory) {
          const memoryCell = nodeRow.cells[2]; // Memory is the 3rd column (index 2)
          const memoryPercentage = nodeMetrics.metrics.memory.usedPercentage;
          updateCellWithProgressBar(memoryCell, memoryPercentage, `${Math.round(memoryPercentage)}%`, 'memory');
        }
        
        // Update Disk
        if (nodeMetrics.metrics.disk) {
          const diskCell = nodeRow.cells[3]; // Disk is the 4th column (index 3)
          const diskPercentage = nodeMetrics.metrics.disk.usedPercentage;
          updateCellWithProgressBar(diskCell, diskPercentage, `${Math.round(diskPercentage)}%`, 'disk');
        }
        
        // Update Uptime
        if (nodeMetrics.metrics.uptime) {
          const uptimeCell = nodeRow.cells[4]; // Uptime is the 5th column (index 4)
          uptimeCell.textContent = formatUptime(nodeMetrics.metrics.uptime);
        }
      }
    }
  });
  
  // Update guest metrics
  guests.forEach(guest => {
    const guestRow = document.getElementById(`guest-${guest.id}`);
    const vmRow = document.getElementById(`vm-${guest.id}`);
    const ctRow = document.getElementById(`ct-${guest.id}`);
    
    // Reference the appropriate row based on guest type
    let row;
    if (guest.type === 'qemu') {
      row = vmRow;
      // Flag for re-sorting VMs if this is a metric sort column
      if (isVMMetricSortColumn) {
        shouldResortVMs = true;
      }
    } else {
      row = ctRow;
      // Flag for re-sorting CTs if this is a metric sort column
      if (isCTMetricSortColumn) {
        shouldResortCTs = true;
      }
    }
    
    if (row) {
      const guestMetrics = metrics[guest.id];
      if (guestMetrics && guest.status === 'running') {
        // Update CPU
        const cpuCell = row.cells[1]; // CPU is the 2nd column (index 1)
        if (cpuCell) {
          const cpuValue = guestMetrics.metrics.cpu || 0;
          updateCellWithProgressBar(cpuCell, cpuValue, `${Math.round(cpuValue)}%`, 'cpu');
        }
        
        // Update Memory
        if (guestMetrics.metrics.memory) {
          const memoryCell = row.cells[2]; // Memory is the 3rd column (index 2)
          if (memoryCell) {
          const memoryPercentage = guestMetrics.metrics.memory.usedPercentage;
            updateCellWithProgressBar(memoryCell, memoryPercentage, `${Math.round(memoryPercentage)}%`, 'memory');
          }
        }
        
        // Update Disk
        if (guestMetrics.metrics.disk) {
          const diskCell = row.cells[3]; // Disk is the 4th column (index 3)
          if (diskCell) {
          const diskPercentage = guestMetrics.metrics.disk.usedPercentage;
            updateCellWithProgressBar(diskCell, diskPercentage, `${Math.round(diskPercentage)}%`, 'disk');
          }
        }
        
        // Update Network
        if (guestMetrics.metrics.network) {
          const networkCell = row.cells[4]; // Network is the 5th column (index 4)
          if (networkCell) {
            const networkIn = networkCell.querySelector('.network-in');
            const networkOut = networkCell.querySelector('.network-out');
            
            if (networkIn && networkOut) {
              networkIn.innerHTML = `↓ ${formatBytes(guestMetrics.metrics.network.inRate || 0)}/s`;
              networkOut.innerHTML = `↑ ${formatBytes(guestMetrics.metrics.network.outRate || 0)}/s`;
            } else {
              // If the network display doesn't exist, create it
              networkCell.innerHTML = '';
              const networkDisplay = document.createElement('div');
              networkDisplay.className = 'network-display';
              
              const newNetworkIn = document.createElement('div');
              newNetworkIn.className = 'network-in';
              newNetworkIn.innerHTML = `↓ ${formatBytes(guestMetrics.metrics.network.inRate || 0)}/s`;
              
              const newNetworkOut = document.createElement('div');
              newNetworkOut.className = 'network-out';
              newNetworkOut.innerHTML = `↑ ${formatBytes(guestMetrics.metrics.network.outRate || 0)}/s`;
              
              networkDisplay.appendChild(newNetworkIn);
              networkDisplay.appendChild(newNetworkOut);
              networkCell.appendChild(networkDisplay);
            }
          }
        }
        
        // Update Uptime
        if (guestMetrics.metrics.uptime) {
          const uptimeCell = row.cells[5]; // Uptime is the 6th column (index 5)
          if (uptimeCell) {
            uptimeCell.textContent = formatUptime(guestMetrics.metrics.uptime);
          }
        }
      }
    }
  });
  
  // Re-render tables if necessary to apply sorting
  if (shouldResortNodes) {
    renderNodes();
  }
  
  if (shouldResortVMs) {
    renderVMs();
  }
  
  if (shouldResortCTs) {
    renderContainers();
  }
}

// Helper functions
function createProgressBar(percentage, text, type) {
  const container = document.createElement('div');
  container.className = 'progress-container';
  
    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    
    const progressBarFill = document.createElement('div');
    progressBarFill.className = `progress-bar-fill ${type}`;
    progressBarFill.style.width = `${Math.min(percentage, 100)}%`;
  
  const progressValue = document.createElement('div');
  progressValue.className = 'progress-value';
  progressValue.textContent = text;
    
    progressBar.appendChild(progressBarFill);
  
  // Add value first, then progress bar (switching the order)
  container.appendChild(progressValue);
  container.appendChild(progressBar);
  
  return container;
}

function updateCellWithProgressBar(cell, percentage, text, type) {
  const progressContainer = cell.querySelector('.progress-container');
  
  if (progressContainer) {
    // Update existing progress bar
    const progressBarFill = progressContainer.querySelector('.progress-bar-fill');
    const progressValue = progressContainer.querySelector('.progress-value');
    
        if (progressBarFill) {
          progressBarFill.style.width = `${Math.min(percentage, 100)}%`;
      }
      
    if (progressValue) {
      progressValue.textContent = text;
    }
  } else {
    // Create new progress bar
    cell.innerHTML = '';
    cell.appendChild(createProgressBar(percentage, text, type));
  }
}

function formatBytes(bytes, decimals = 0) {
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

// Sorting functionality
function setupSorting() {
  // Add click event listeners to table headers
  const nodeHeaders = nodesTable.querySelectorAll('thead th');
  const vmHeaders = vmsTable.querySelectorAll('thead th');
  const ctHeaders = ctsTable.querySelectorAll('thead th');
  
  nodeHeaders.forEach(header => {
    if (header.dataset.sort) {
      header.addEventListener('click', () => {
        handleSort(header.dataset.sort, 'node');
        updateSortIndicators(nodeHeaders, header, currentSortDirection);
        renderNodes();
      });
    }
  });
  
  vmHeaders.forEach(header => {
    if (header.dataset.sort) {
      header.addEventListener('click', () => {
        handleSort(header.dataset.sort, 'vm');
        updateSortIndicators(vmHeaders, header, vmSortDirection);
        renderVMs();
      });
    }
  });
  
  ctHeaders.forEach(header => {
    if (header.dataset.sort) {
      header.addEventListener('click', () => {
        handleSort(header.dataset.sort, 'ct');
        updateSortIndicators(ctHeaders, header, ctSortDirection);
        renderContainers();
      });
    }
  });
  
  // Set initial sort indicators
  updateSortIndicators(nodeHeaders, Array.from(nodeHeaders).find(h => h.dataset.sort === currentSortColumn), currentSortDirection);
  updateSortIndicators(vmHeaders, Array.from(vmHeaders).find(h => h.dataset.sort === vmSortColumn), vmSortDirection);
  updateSortIndicators(ctHeaders, Array.from(ctHeaders).find(h => h.dataset.sort === ctSortColumn), ctSortDirection);
}

function handleSort(column, tableType) {
  switch (tableType) {
    case 'node':
      if (currentSortColumn === column) {
        // Toggle direction if same column
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        // Set new column and default to ascending
        currentSortColumn = column;
        currentSortDirection = 'asc';
      }
      break;
    case 'vm':
      if (vmSortColumn === column) {
        // Toggle direction if same column
        vmSortDirection = vmSortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        // Set new column and default to ascending
        vmSortColumn = column;
        vmSortDirection = 'asc';
      }
      break;
    case 'ct':
      if (ctSortColumn === column) {
        // Toggle direction if same column
        ctSortDirection = ctSortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        // Set new column and default to ascending
        ctSortColumn = column;
        ctSortDirection = 'asc';
      }
      break;
  }
}

function updateSortIndicators(headers, activeHeader, sortDirection) {
  headers.forEach(header => {
    header.classList.remove('sorted-asc', 'sorted-desc');
  });
  
  if (activeHeader) {
    // Use the passed direction if provided, otherwise determine based on the header's table
    let direction;
    if (sortDirection) {
      direction = sortDirection;
    } else {
      // Determine which table these headers belong to
      const tableId = headers[0]?.closest('table')?.id;
      
      if (tableId === 'nodes-table') {
        direction = currentSortDirection;
      } else if (tableId === 'vms-table') {
        direction = vmSortDirection;
      } else if (tableId === 'cts-table') {
        direction = ctSortDirection;
      } else {
        // Fallback
        direction = 'asc';
      }
    }
    
    activeHeader.classList.add(direction === 'asc' ? 'sorted-asc' : 'sorted-desc');
  }
}

function sortData(data, sortColumn = currentSortColumn, sortDirection = currentSortDirection) {
  return [...data].sort((a, b) => {
    let valueA, valueB;
    let aHasValue = true;
    let bHasValue = true;
    
    // Extract values based on sort column
    switch (sortColumn) {
      case 'name':
        valueA = a.name.toLowerCase();
        valueB = b.name.toLowerCase();
        break;
      case 'status':
        valueA = a.status;
        valueB = b.status;
        break;
      case 'type':
        valueA = a.type || '';
        valueB = b.type || '';
        break;
      case 'cpu':
        // Check if values exist
        aHasValue = a.status === 'running' || a.status === 'online';
        bHasValue = b.status === 'running' || b.status === 'online';
        
        if (aHasValue) {
          valueA = metrics[a.id]?.metrics?.cpu || 0;
        }
        
        if (bHasValue) {
          valueB = metrics[b.id]?.metrics?.cpu || 0;
        }
        break;
      case 'memory':
        // Check if values exist
        aHasValue = (a.status === 'running' || a.status === 'online') && metrics[a.id]?.metrics?.memory;
        bHasValue = (b.status === 'running' || b.status === 'online') && metrics[b.id]?.metrics?.memory;
        
        if (aHasValue) {
          valueA = metrics[a.id]?.metrics?.memory?.usedPercentage || 0;
        }
        
        if (bHasValue) {
          valueB = metrics[b.id]?.metrics?.memory?.usedPercentage || 0;
        }
        break;
      case 'disk':
        // Check if values exist
        aHasValue = (a.status === 'running' || a.status === 'online') && metrics[a.id]?.metrics?.disk;
        bHasValue = (b.status === 'running' || b.status === 'online') && metrics[b.id]?.metrics?.disk;
        
        if (aHasValue) {
          valueA = metrics[a.id]?.metrics?.disk?.usedPercentage || 0;
        }
        
        if (bHasValue) {
          valueB = metrics[b.id]?.metrics?.disk?.usedPercentage || 0;
        }
        break;
      case 'network':
        // Check if values exist
        aHasValue = (a.status === 'running' || a.status === 'online') && metrics[a.id]?.metrics?.network;
        bHasValue = (b.status === 'running' || b.status === 'online') && metrics[b.id]?.metrics?.network;
        
        if (aHasValue) {
          // Sum of network in and out rates for sorting
          valueA = (metrics[a.id]?.metrics?.network?.inRate || 0) + (metrics[a.id]?.metrics?.network?.outRate || 0);
        }
        
        if (bHasValue) {
          // Sum of network in and out rates for sorting
          valueB = (metrics[b.id]?.metrics?.network?.inRate || 0) + (metrics[b.id]?.metrics?.network?.outRate || 0);
        }
        break;
      case 'uptime':
        // Check if values exist
        aHasValue = (a.status === 'running' || a.status === 'online') && metrics[a.id]?.metrics?.uptime;
        bHasValue = (b.status === 'running' || b.status === 'online') && metrics[b.id]?.metrics?.uptime;
        
        if (aHasValue) {
          valueA = metrics[a.id]?.metrics?.uptime || 0;
        }
        
        if (bHasValue) {
          valueB = metrics[b.id]?.metrics?.uptime || 0;
        }
        break;
      default:
        valueA = a.name.toLowerCase();
        valueB = b.name.toLowerCase();
    }
    
    // Handle cases where one or both items don't have values
    if (!aHasValue && !bHasValue) {
      // If neither has a value, sort by name
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    }
    
    // Always put items without values at the bottom
    if (!aHasValue) return 1;
    if (!bHasValue) return -1;
    
    // Normal comparison for items with values
    if (valueA < valueB) {
      return sortDirection === 'asc' ? -1 : 1;
    }
    if (valueA > valueB) {
      return sortDirection === 'asc' ? 1 : -1;
    }
    
    // If values are equal, sort by name as secondary sort
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });
}

// Event listeners
nodeSelect.addEventListener('change', (event) => {
  selectedNodeId = event.target.value;
  renderNodes();
  renderVMs();
  renderContainers();
});

// Add event listener for the show stopped toggle (for backward compatibility)
if (showStoppedToggle) {
  showStoppedToggle.addEventListener('change', (event) => {
    showStopped = event.target.checked;
    showStoppedVMs = event.target.checked;
    showStoppedCTs = event.target.checked;
    renderVMs();
    renderContainers();
  });
}

// Add event listener for the VM toggle
if (showStoppedVMsToggle) {
  showStoppedVMsToggle.addEventListener('change', (event) => {
    showStoppedVMs = event.target.checked;
    renderVMs();
  });
}

// Add event listener for the Container toggle
if (showStoppedCTsToggle) {
  showStoppedCTsToggle.addEventListener('change', (event) => {
    showStoppedCTs = event.target.checked;
    renderContainers();
  });
}

// Initialize UI
updateConnectionStatus(false);
updateSummary();
renderNodes();
renderVMs();
renderContainers();
setupSorting();

// Setup section reordering functionality
function setupSectionReordering() {
  const containerSection = document.getElementById('containers-section');
  const vmSection = document.getElementById('vms-section');
  const contentSection = document.querySelector('.dashboard');
  
  // Ensure we have all required elements
  if (!containerSection || !vmSection || !contentSection) {
    console.error('Section reordering: Missing required container elements');
    return;
  }
  
  const moveContainersUp = document.getElementById('move-containers-up');
  const moveContainersDown = document.getElementById('move-containers-down');
  const moveVMsUp = document.getElementById('move-vms-up');
  const moveVMsDown = document.getElementById('move-vms-down');
  
  if (!moveContainersUp || !moveContainersDown || !moveVMsUp || !moveVMsDown) {
    console.error('Section reordering: Missing button elements');
    return;
  }
  
  console.log('Section reordering setup complete. Container section:', containerSection.id, 'VM section:', vmSection.id);
  
  // Initially update the move buttons
  updateMoveButtons();
  
  // Event listeners for move buttons with better error handling
  moveContainersUp.addEventListener('click', () => {
    console.log('Move containers up clicked');
    try {
      const sections = Array.from(contentSection.querySelectorAll('.content-section'));
      const containerIndex = sections.indexOf(containerSection);
      const vmIndex = sections.indexOf(vmSection);
      
      // Only do something if containers are below the node section (index > 1)
      if (containerIndex > 1) {
        // Move up by inserting before the previous section
        const previousSection = sections[containerIndex - 1];
        contentSection.insertBefore(containerSection, previousSection);
        console.log('Containers moved up');
      } else {
        console.log('Containers cannot move up further');
      }
      
      updateMoveButtons();
    } catch (e) {
      console.error('Error moving containers up:', e);
    }
  });
  
  moveContainersDown.addEventListener('click', () => {
    console.log('Move containers down clicked');
    try {
      // Move containers below VMs - always works if VMs are above containers
      const sections = Array.from(contentSection.querySelectorAll('.content-section'));
      const containerIndex = sections.indexOf(containerSection);
      const vmIndex = sections.indexOf(vmSection);
      
      if (containerIndex < vmIndex) {
        contentSection.insertBefore(vmSection, containerSection);
        console.log('Containers moved below VMs');
      } else if (containerIndex < sections.length - 1) {
        // Maybe there are other sections below containers
        const nextSection = sections[containerIndex + 1];
        contentSection.insertBefore(nextSection, containerSection);
        console.log('Containers moved down');
      } else {
        console.log('Containers are already at the bottom');
      }
      
      updateMoveButtons();
    } catch (e) {
      console.error('Error moving containers down:', e);
    }
  });
  
  moveVMsUp.addEventListener('click', () => {
    console.log('Move VMs up clicked');
    try {
      const sections = Array.from(contentSection.querySelectorAll('.content-section'));
      const containerIndex = sections.indexOf(containerSection);
      const vmIndex = sections.indexOf(vmSection);
      
      if (vmIndex > 1) {
        // Directly handle when VMs are below containers
        if (vmIndex > containerIndex) {
          contentSection.insertBefore(vmSection, containerSection);
          console.log('VMs moved above containers');
        } else {
          // Or if there's something else to move above
          const previousSection = sections[vmIndex - 1];
          contentSection.insertBefore(vmSection, previousSection);
          console.log('VMs moved up');
        }
      } else {
        console.log('VMs cannot move up further');
      }
      
      updateMoveButtons();
    } catch (e) {
      console.error('Error moving VMs up:', e);
    }
  });
  
  moveVMsDown.addEventListener('click', () => {
    console.log('Move VMs down clicked');
    try {
      const sections = Array.from(contentSection.querySelectorAll('.content-section'));
      const containerIndex = sections.indexOf(containerSection);
      const vmIndex = sections.indexOf(vmSection);
      
      if (vmIndex < sections.length - 1) {
        // If there's a section below VMs, move that above VMs
        const nextSection = sections[vmIndex + 1];
        contentSection.insertBefore(nextSection, vmSection);
        console.log('VMs moved down');
      } else {
        console.log('VMs are already at the bottom');
      }
      
      updateMoveButtons();
    } catch (e) {
      console.error('Error moving VMs down:', e);
    }
  });
  
  // Function to update button states based on current order
  function updateMoveButtons() {
    try {
      // Get current positions in the DOM
      const sections = Array.from(contentSection.querySelectorAll('.content-section'));
      const containerIndex = sections.indexOf(containerSection);
      const vmIndex = sections.indexOf(vmSection);
      
      console.log('Current positions - Container:', containerIndex, 'VM:', vmIndex);
      
      // Update container buttons - allow movement if not at edges
      moveContainersUp.disabled = containerIndex <= 1; // Disable if first section (after nodes)
      moveContainersDown.disabled = containerIndex >= sections.length - 1;
      
      // Update VM buttons - allow movement if not at edges
      moveVMsUp.disabled = vmIndex <= 1; // Disable if first section (after nodes)
      moveVMsDown.disabled = vmIndex >= sections.length - 1;
      
      console.log('Button states updated - ContainerUp:', moveContainersUp.disabled, 
                 'ContainerDown:', moveContainersDown.disabled,
                 'VMUp:', moveVMsUp.disabled, 
                 'VMDown:', moveVMsDown.disabled);
      
      // Save current order to localStorage
      localStorage.setItem('sectionOrder', JSON.stringify({
        containers: containerIndex,
        vms: vmIndex
      }));
    } catch (e) {
      console.error('Error updating move buttons:', e);
    }
  }
}

// Function to restore section ordering from localStorage
function restoreSectionOrder() {
  try {
    const savedOrder = localStorage.getItem('sectionOrder');
    if (!savedOrder) return;
    
    const order = JSON.parse(savedOrder);
    const containerSection = document.getElementById('containers-section');
    const vmSection = document.getElementById('vms-section');
    const contentSection = document.querySelector('.dashboard');
    
    // Ensure we have all required elements
    if (!containerSection || !vmSection || !contentSection) {
      console.error('Section restore: Missing required elements');
      return;
    }
    
    console.log('Restoring section order from localStorage:', order);
    
    // Get the current sections to determine positions
    const sections = Array.from(contentSection.querySelectorAll('.content-section'));
    
    // If VMs should be above containers
    if (order.vms < order.containers) {
      // Using insertBefore is more reliable than manipulating order
      contentSection.insertBefore(vmSection, containerSection);
      console.log('Restored order: VMs above containers');
    } else {
      // In this case, containers should be above VMs, which is often the default
      contentSection.insertBefore(containerSection, vmSection);
      console.log('Restored order: Containers above VMs');
    }
    
    // Update button states - this must happen after reordering
    setTimeout(() => {
      const moveContainersUp = document.getElementById('move-containers-up');
      const moveContainersDown = document.getElementById('move-containers-down');
      const moveVMsUp = document.getElementById('move-vms-up');
      const moveVMsDown = document.getElementById('move-vms-down');
      
      if (!moveContainersUp || !moveContainersDown || !moveVMsUp || !moveVMsDown) {
        console.error('Section restore: Missing button elements');
        return;
      }
      
      // Get current positions after reordering
      const updatedSections = Array.from(contentSection.querySelectorAll('.content-section'));
      const containerIndex = updatedSections.indexOf(containerSection);
      const vmIndex = updatedSections.indexOf(vmSection);
      
      // Update container buttons
      moveContainersUp.disabled = containerIndex <= 1; // Disable if first section (after nodes)
      moveContainersDown.disabled = containerIndex >= updatedSections.length - 1;
      
      // Update VM buttons
      moveVMsUp.disabled = vmIndex <= 1; // Disable if first section (after nodes)
      moveVMsDown.disabled = vmIndex >= updatedSections.length - 1;
      
      console.log('Button states restored - ContainerUp:', moveContainersUp.disabled, 
                 'ContainerDown:', moveContainersDown.disabled,
                 'VMUp:', moveVMsUp.disabled, 
                 'VMDown:', moveVMsDown.disabled);
    }, 0);
  } catch (e) {
    console.error('Error restoring section order:', e);
  }
}

// Initialize UI setup on document load
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM fully loaded, initializing UI...');
  
  // Log if the socket is connected
  console.log('Socket connection status on DOM load:', socket.connected ? 'Connected' : 'Disconnected');
  
  // Try to restore section ordering from localStorage
  setTimeout(() => {
    try {
      // Check loading overlay status
      const loadingOverlay = document.getElementById('loading-overlay');
      if (loadingOverlay && loadingOverlay.style.display !== 'none') {
        console.log('Loading overlay still visible after DOM load and timeout');
      }
      
      // Check data status
      console.log('Data load status:', {
        receivedNodeData,
        receivedGuestData,
        receivedMetricsData,
        initialDataLoaded
      });
      
      // Set up section reordering if elements exist
      if (document.getElementById('containers-section') && document.getElementById('vms-section')) {
        console.log('Setting up section reordering...');
        setupSectionReordering();
        restoreSectionOrder();
      } else {
        console.error('Section elements not found yet');
      }
    } catch (e) {
      console.error('Error in DOMContentLoaded timeout handler:', e);
    }
  }, 1000); // Slight delay to ensure all elements are loaded and ready
}); 