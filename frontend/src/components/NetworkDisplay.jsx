import React, { useEffect, useState } from 'react';
import useSocket from '../hooks/useSocket';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  LinearProgress,
  Tooltip,
  TableSortLabel,
  keyframes,
  FormControlLabel,
  Switch
} from '@mui/material';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';

// Define pulse animation
const pulseAnimation = keyframes`
  0% {
    box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.4);
  }
  70% {
    box-shadow: 0 0 0 6px rgba(76, 175, 80, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(76, 175, 80, 0);
  }
`;

// Helper function to format bytes
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const dm = 0; // No decimals
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Helper function specifically for network rates
const formatNetworkRate = (bytesPerSecond) => {
  if (bytesPerSecond === 0) return '0 B/s';
  
  // No minimum threshold - show actual values
  return formatBytes(bytesPerSecond) + '/s';
};

// Helper function to format percentage
const formatPercentage = (value) => {
  if (value === undefined || value === null || isNaN(value)) return '0%';
  return `${Math.round(value)}%`;
};

// Progress bar with label and tooltip
const ProgressWithLabel = ({ value, color = "primary", disabled = false, tooltipText }) => {
  return (
    <Tooltip title={tooltipText || `${formatPercentage(value)} usage`} arrow placement="top">
      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', py: 1 }}>
        <Box sx={{ width: '100%', mr: 1.5 }}>
          <LinearProgress 
            variant="determinate" 
            value={Math.min(value, 100)} 
            color={color}
            sx={{ 
              opacity: disabled ? 0.5 : 1,
              height: 12,
              borderRadius: 2,
              backgroundColor: theme => theme.palette.grey[200],
              boxShadow: '0 1px 2px rgba(0,0,0,0.05) inset',
              '& .MuiLinearProgress-bar': {
                borderRadius: 2,
                boxShadow: '0 1px 0 rgba(255,255,255,0.3) inset'
              }
            }} 
          />
        </Box>
        <Box sx={{ minWidth: 45 }}>
          <Typography 
            variant="body2"
            fontWeight="medium"
            color={disabled ? "text.disabled" : "text.secondary"}
          >
            {formatPercentage(value)}
          </Typography>
        </Box>
      </Box>
    </Tooltip>
  );
};

// Status indicator circle
const StatusIndicator = ({ status }) => {
  // Map status to color and display text
  const statusMap = {
    'running': { color: '#4caf50', text: 'Running', animate: true },      // Green
    'stopped': { color: '#ff9800', text: 'Stopped', animate: false },     // Amber/Orange
    'paused': { color: '#2196f3', text: 'Paused', animate: false },       // Blue
    'error': { color: '#f44336', text: 'Error', animate: true },          // Red
    'starting': { color: '#9c27b0', text: 'Starting', animate: true },    // Purple
    'stopping': { color: '#795548', text: 'Stopping', animate: true }     // Brown
  };
  
  // Default values for unknown status
  const statusInfo = statusMap[status] || { color: '#9e9e9e', text: status, animate: false }; // Gray for unknown
  
  return (
    <Tooltip title={statusInfo.text} arrow placement="top">
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: statusInfo.color,
          display: 'inline-block',
          boxShadow: '0 0 2px rgba(0,0,0,0.2)',
          animation: statusInfo.animate ? `${pulseAnimation} 2s infinite` : 'none',
          position: 'relative',
          '&::after': statusInfo.animate ? {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            backgroundColor: 'transparent',
            boxShadow: `0 0 4px 1px ${statusInfo.color}99`,
            opacity: 0.7
          } : {}
        }}
      />
    </Tooltip>
  );
};

const NetworkDisplay = () => {
  const { 
    isConnected, 
    guestData, 
    metricsData, 
    error,
    isDebugMode
  } = useSocket();
  
  // Add sorting state
  const [sortConfig, setSortConfig] = useState({
    key: 'name',
    direction: 'asc'
  });
  
  // Add state to track whether to show stopped systems
  const [showStopped, setShowStopped] = useState(false);
  
  // Sorting function
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  // Add debug logging for metrics data
  useEffect(() => {
    console.log("Current metrics data:", metricsData);
    console.log("Current guest data:", guestData);
    
    // Check if metrics exist for each guest
    if (guestData.length > 0 && metricsData.length > 0) {
      guestData.forEach(guest => {
        const hasMetrics = metricsData.some(metric => metric.guestId === guest.id);
        console.log(`Guest ${guest.name} (${guest.id}) has metrics: ${hasMetrics}`);
      });
    }
  }, [metricsData, guestData]);
  
  // Local state for demo metrics that auto-update in debug mode
  const [demoMetrics, setDemoMetrics] = useState([]);
  
  // Update demo metrics every 3 seconds in debug mode
  useEffect(() => {
    if (!isDebugMode) return;
    
    const updateInterval = setInterval(() => {
      const updatedMetrics = metricsData.map(metric => {
        // Create base metrics if they don't exist
        const currentMetrics = metric.metrics || {};
        
        return {
          ...metric,
          timestamp: Date.now(),
          metrics: {
            ...currentMetrics,
            network: {
              inRate: (currentMetrics.network?.inRate || 1024) * (0.8 + Math.random() * 0.4),
              outRate: (currentMetrics.network?.outRate || 512) * (0.8 + Math.random() * 0.4)
            },
            cpu: Math.random() * 100,
            memory: {
              used: Math.random() * 8000000000, // ~8GB
              total: 16000000000,  // 16GB
              percentUsed: Math.random() * 100
            },
            disk: {
              used: Math.random() * 100000000000, // ~100GB
              total: 500000000000,  // 500GB
              percentUsed: Math.random() * 100
            }
          }
        };
      });
      
      setDemoMetrics(updatedMetrics);
    }, 3000);
    
    return () => clearInterval(updateInterval);
  }, [isDebugMode, metricsData]);
  
  // Use either real metrics or demo metrics depending on mode
  const displayMetrics = isDebugMode ? demoMetrics.length > 0 ? demoMetrics : metricsData : metricsData;
  
  // Helper function to get metrics for a guest
  const getMetricsForGuest = (guestId) => {
    console.log(`Looking for metrics for guest ${guestId}...`);
    console.log('Available metrics:', displayMetrics);
    
    // Try to find the metric with matching guestId
    const metric = displayMetrics.find(metric => metric.guestId === guestId);
    
    // If we found a metric, log it, otherwise log that none was found
    if (metric) {
      console.log(`Found metrics for ${guestId}:`, metric);
      return metric;
    } else {
      console.log(`No metrics found for ${guestId}`);
      
      // For debugging, log all guest IDs in the metrics data
      if (displayMetrics.length > 0) {
        console.log('Available guest IDs in metrics:', displayMetrics.map(m => m.guestId).join(', '));
      }
      
      return null;
    }
  };
  
  // Sort data before displaying
  const getSortedData = (data) => {
    const sortableData = [...data];
    
    sortableData.sort((a, b) => {
      // For each sort key, define how to get the value to sort by
      switch (sortConfig.key) {
        case 'name':
          return sortConfig.direction === 'asc' 
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name);
        
        case 'status':
          return sortConfig.direction === 'asc' 
            ? a.status.localeCompare(b.status)
            : b.status.localeCompare(a.status);
        
        case 'cpu':
          const cpuA = getMetricsForGuest(a.id)?.metrics?.cpu || 0;
          const cpuB = getMetricsForGuest(b.id)?.metrics?.cpu || 0;
          return sortConfig.direction === 'asc' ? cpuA - cpuB : cpuB - cpuA;
        
        case 'memory':
          const memoryDataA = getMetricsForGuest(a.id)?.metrics?.memory || {};
          const memoryDataB = getMetricsForGuest(b.id)?.metrics?.memory || {};
          
          const memoryUsageA = memoryDataA.percentUsed || 
            (memoryDataA.total && memoryDataA.used ? 
              (memoryDataA.used / memoryDataA.total) * 100 : 0);
              
          const memoryUsageB = memoryDataB.percentUsed || 
            (memoryDataB.total && memoryDataB.used ? 
              (memoryDataB.used / memoryDataB.total) * 100 : 0);
          
          return sortConfig.direction === 'asc' ? memoryUsageA - memoryUsageB : memoryUsageB - memoryUsageA;
        
        case 'disk':
          const diskDataA = getMetricsForGuest(a.id)?.metrics?.disk || {};
          const diskDataB = getMetricsForGuest(b.id)?.metrics?.disk || {};
          
          const diskUsageA = diskDataA.percentUsed || 
            (diskDataA.total && diskDataA.used ? 
              (diskDataA.used / diskDataA.total) * 100 : 0);
              
          const diskUsageB = diskDataB.percentUsed || 
            (diskDataB.total && diskDataB.used ? 
              (diskDataB.used / diskDataB.total) * 100 : 0);
          
          return sortConfig.direction === 'asc' ? diskUsageA - diskUsageB : diskUsageB - diskUsageA;
        
        case 'download':
          const downloadA = getMetricsForGuest(a.id)?.metrics?.network?.inRate || 0;
          const downloadB = getMetricsForGuest(b.id)?.metrics?.network?.inRate || 0;
          return sortConfig.direction === 'asc' ? downloadA - downloadB : downloadB - downloadA;
        
        case 'upload':
          const uploadA = getMetricsForGuest(a.id)?.metrics?.network?.outRate || 0;
          const uploadB = getMetricsForGuest(b.id)?.metrics?.network?.outRate || 0;
          return sortConfig.direction === 'asc' ? uploadA - uploadB : uploadB - uploadA;
        
        case 'updated':
          const updatedA = getMetricsForGuest(a.id)?.timestamp || 0;
          const updatedB = getMetricsForGuest(b.id)?.timestamp || 0;
          return sortConfig.direction === 'asc' ? updatedA - updatedB : updatedB - updatedA;
        
        default:
          return 0;
      }
    });
    
    return sortableData;
  };
  
  if (error) {
    return (
      <Card sx={{ mb: 2, bgcolor: '#FFF4F4' }}>
        <CardContent>
          <Typography color="error" variant="h6">
            Connection Error
          </Typography>
          <Typography>{error}</Typography>
        </CardContent>
      </Card>
    );
  }
  
  if (!isConnected) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Connecting to server...
        </Typography>
      </Box>
    );
  }
  
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <NetworkCheckIcon sx={{ mr: 1 }} color="primary" />
          <Typography variant="h5" component="div">
            System Metrics
          </Typography>
          <Chip 
            label={isConnected ? 'Live' : 'Disconnected'} 
            color={isConnected ? 'success' : 'error'}
            size="small"
            sx={{ ml: 2 }}
          />
          {isDebugMode && (
            <Chip 
              label="Debug Mode" 
              color="warning"
              size="small"
              sx={{ ml: 1 }}
            />
          )}
          <Box sx={{ flexGrow: 1 }} />
          <FormControlLabel
            control={
              <Switch 
                checked={showStopped}
                onChange={(e) => setShowStopped(e.target.checked)}
                color="primary"
                size="small"
              />
            }
            label={<Typography variant="body2">Show stopped systems</Typography>}
          />
        </Box>
        
        {isDebugMode && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Running in debug mode with simulated data. The server connection is unavailable.
          </Alert>
        )}
        
        <TableContainer component={Paper} sx={{ boxShadow: 2 }}>
          <Table sx={{ 
            '& tbody tr:nth-of-type(odd)': {
              backgroundColor: theme => theme.palette.grey[50],
            } 
          }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: theme => theme.palette.grey[100] }}>
                <TableCell width="18%" sx={{ fontWeight: 'bold' }}>
                  <TableSortLabel
                    active={sortConfig.key === 'name'}
                    direction={sortConfig.key === 'name' ? sortConfig.direction : 'asc'}
                    onClick={() => requestSort('name')}
                  >
                    Guest Name
                  </TableSortLabel>
                </TableCell>
                <TableCell width="19%" sx={{ fontWeight: 'bold' }}>
                  <TableSortLabel
                    active={sortConfig.key === 'cpu'}
                    direction={sortConfig.key === 'cpu' ? sortConfig.direction : 'asc'}
                    onClick={() => requestSort('cpu')}
                  >
                    CPU
                  </TableSortLabel>
                </TableCell>
                <TableCell width="19%" sx={{ fontWeight: 'bold' }}>
                  <TableSortLabel
                    active={sortConfig.key === 'memory'}
                    direction={sortConfig.key === 'memory' ? sortConfig.direction : 'asc'}
                    onClick={() => requestSort('memory')}
                  >
                    Memory
                  </TableSortLabel>
                </TableCell>
                <TableCell width="19%" sx={{ fontWeight: 'bold' }}>
                  <TableSortLabel
                    active={sortConfig.key === 'disk'}
                    direction={sortConfig.key === 'disk' ? sortConfig.direction : 'asc'}
                    onClick={() => requestSort('disk')}
                  >
                    Disk
                  </TableSortLabel>
                </TableCell>
                <TableCell width="12.5%" sx={{ fontWeight: 'bold' }}>
                  <TableSortLabel
                    active={sortConfig.key === 'download'}
                    direction={sortConfig.key === 'download' ? sortConfig.direction : 'asc'}
                    onClick={() => requestSort('download')}
                  >
                    Download
                  </TableSortLabel>
                </TableCell>
                <TableCell width="12.5%" sx={{ fontWeight: 'bold' }}>
                  <TableSortLabel
                    active={sortConfig.key === 'upload'}
                    direction={sortConfig.key === 'upload' ? sortConfig.direction : 'asc'}
                    onClick={() => requestSort('upload')}
                  >
                    Upload
                  </TableSortLabel>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {guestData.length > 0 ? (
                getSortedData(guestData)
                  .filter(guest => showStopped || guest.status === 'running')
                  .map((guest) => {
                  const metrics = getMetricsForGuest(guest.id);
                  const networkMetrics = metrics?.metrics?.network;
                  
                  // Get resource metrics (CPU, memory, disk) with fallbacks
                  const cpuUsage = metrics?.metrics?.cpu || 0;
                  
                  // Handle either direct percentage or calculated from used/total
                  const memoryData = metrics?.metrics?.memory || {};
                  const memoryUsage = memoryData.percentUsed || 
                    (memoryData.total && memoryData.used ? 
                      (memoryData.used / memoryData.total) * 100 : 0);
                  
                  // Same for disk
                  const diskData = metrics?.metrics?.disk || {};
                  const diskUsage = diskData.percentUsed || 
                    (diskData.total && diskData.used ? 
                      (diskData.used / diskData.total) * 100 : 0);
                  
                  // Check if system is running
                  const isRunning = guest.status === 'running';
                  
                  return (
                    <TableRow key={guest.id} sx={{ opacity: isRunning ? 1 : 0.8, '& > td': { py: 1.5 } }}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <StatusIndicator status={guest.status} />
                          <Typography noWrap sx={{ maxWidth: 150 }}>
                            {guest.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <ProgressWithLabel 
                          value={cpuUsage} 
                          color={cpuUsage > 80 ? "error" : cpuUsage > 60 ? "warning" : "primary"}
                          disabled={!isRunning}
                          tooltipText={isRunning ? `CPU: ${formatPercentage(cpuUsage)} utilized` : "System is not running"}
                        />
                      </TableCell>
                      <TableCell>
                        <ProgressWithLabel 
                          value={memoryUsage} 
                          color={memoryUsage > 80 ? "error" : memoryUsage > 60 ? "warning" : "primary"}
                          disabled={!isRunning}
                          tooltipText={isRunning ? 
                            memoryData.total ? 
                              `Memory: ${formatBytes(memoryData.used || 0)} / ${formatBytes(memoryData.total)} (${formatPercentage(memoryUsage)})` : 
                              `Memory: ${formatPercentage(memoryUsage)} utilized` : 
                            "System is not running"}
                        />
                      </TableCell>
                      <TableCell>
                        <ProgressWithLabel 
                          value={diskUsage} 
                          color={diskUsage > 80 ? "error" : diskUsage > 60 ? "warning" : "primary"}
                          disabled={!isRunning}
                          tooltipText={isRunning ? 
                            diskData.total ? 
                              `Disk: ${formatBytes(diskData.used || 0)} / ${formatBytes(diskData.total)} (${formatPercentage(diskUsage)})` : 
                              `Disk: ${formatPercentage(diskUsage)} utilized` : 
                            "System is not running"}
                        />
                      </TableCell>
                      <TableCell>
                        {isRunning && networkMetrics ? (
                          <Typography variant="body2" color="primary" noWrap>
                            ↓ {formatNetworkRate(networkMetrics.inRate || 0)}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.disabled" noWrap>
                            ↓ -
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {isRunning && networkMetrics ? (
                          <Typography variant="body2" color="secondary" noWrap>
                            ↑ {formatNetworkRate(networkMetrics.outRate || 0)}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.disabled" noWrap>
                            ↑ -
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No guest data available
                  </TableCell>
                </TableRow>
              )}
              {guestData.length > 0 && guestData.filter(guest => showStopped || guest.status === 'running').length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No running systems found. Toggle "Show stopped systems" to see all systems.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};

export default NetworkDisplay; 