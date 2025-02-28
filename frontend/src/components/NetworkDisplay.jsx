import React, { useEffect, useState, useCallback } from 'react';
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
  Switch,
  Slider,
  IconButton,
  Collapse,
  alpha
} from '@mui/material';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import MemoryIcon from '@mui/icons-material/Memory';
import StorageIcon from '@mui/icons-material/Storage';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SpeedIcon from '@mui/icons-material/Speed';
import SearchIcon from '@mui/icons-material/Search';
import CancelIcon from '@mui/icons-material/Cancel';
import CloseIcon from '@mui/icons-material/Close';
import InputBase from '@mui/material/InputBase';

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

// Helper function to format network rates for filter display
const formatNetworkRateForFilter = (bytesPerSecond) => {
  if (bytesPerSecond === 0) return '0 B/s';
  
  // Simplified format for filter display
  const kb = bytesPerSecond / 1024;
  if (kb < 1000) {
    return `${Math.round(kb)} KB/s`;
  } else {
    return `${Math.round(kb/1024)} MB/s`;
  }
};

// Convert slider value (0-100) to actual bytes per second
const sliderValueToNetworkRate = (value) => {
  // Max realistic rate for filter: ~10 MB/s = 10485760 B/s
  return value * 104858; // This gives us a range from 0 to ~10 MB/s
};

// Convert network rate to slider value (0-100)
const networkRateToSliderValue = (bytesPerSecond) => {
  return Math.min(100, Math.round(bytesPerSecond / 104858));
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
          width: 10,
          height: 10,
          borderRadius: '50%',
          backgroundColor: statusInfo.color,
          display: 'inline-block',
          boxShadow: '0 0 3px rgba(0,0,0,0.3)',
          animation: statusInfo.animate ? `${pulseAnimation} 2s infinite` : 'none',
          position: 'relative',
          '&::after': statusInfo.animate ? {
            content: '""',
            position: 'absolute',
            top: -2,
            left: -2,
            width: 14,
            height: 14,
            borderRadius: '50%',
            backgroundColor: 'transparent',
            boxShadow: `0 0 5px 1px ${statusInfo.color}99`,
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
  
  // Add state to toggle filters visibility
  const [showFilters, setShowFilters] = useState(false);
  
  // Add search state
  const [searchTerm, setSearchTerm] = useState('');
  // Add search terms array to store active search filters
  const [activeSearchTerms, setActiveSearchTerms] = useState([]);
  
  // Reference to the search input element
  const searchInputRef = React.useRef(null);
  
  // Add filter state
  const [filters, setFilters] = useState({
    cpu: 0,
    memory: 0,
    disk: 0,
    download: 0,
    upload: 0
  });
  
  // Function to reset all filters - wrap in useCallback to prevent infinite renders
  const resetFilters = useCallback(() => {
    setFilters({
      cpu: 0,
      memory: 0,
      disk: 0,
      download: 0,
      upload: 0
    });
    setSearchTerm('');
    setActiveSearchTerms([]);
  }, []);
  
  // Add event listeners for keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Reset all filters when ESC is pressed
      if (e.key === 'Escape') {
        resetFilters();
        
        // If the search input is focused, blur it
        if (document.activeElement === searchInputRef.current) {
          searchInputRef.current.blur();
        }
        return;
      }
      
      // If filters are visible and user starts typing, focus the search input
      // Only if not already in an input field or contentEditable element
      if (showFilters && 
          e.key.length === 1 && 
          !/^(Control|Alt|Shift|Meta)$/.test(e.key) &&
          !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) &&
          !document.activeElement.isContentEditable) {
        
        // Focus the search input
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          
          // If it's a printable character, we'll set it as the search term
          // This doesn't interfere with normal typing because we only do this 
          // when the search input wasn't already focused
          if (!e.ctrlKey && !e.altKey && !e.metaKey) {
            setSearchTerm(e.key);
            e.preventDefault();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    // Clean up event listener
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showFilters, resetFilters]); // resetFilters is now properly memoized
  
  // Function to add a search term to active filters
  const addSearchTerm = (term) => {
    if (term.trim() && !activeSearchTerms.includes(term.trim())) {
      setActiveSearchTerms(prev => [...prev, term.trim()]);
    }
  };
  
  // Function to remove a search term from filters
  const removeSearchTerm = (termToRemove) => {
    setActiveSearchTerms(prev => prev.filter(term => term !== termToRemove));
  };
  
  // Function to update a specific filter
  const updateFilter = (filterName, newValue) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: newValue
    }));
  };
  
  // Function to clear a specific filter
  const clearFilter = (filterName) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: 0
    }));
  };
  
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
  
  // Sort and filter data before displaying
  const getSortedAndFilteredData = (data) => {
    const sortableData = [...data];
    
    // First filter the data
    const filteredData = sortableData.filter(guest => {
      // If not showing stopped and guest is not running, filter it out
      if (!showStopped && guest.status !== 'running') {
        return false;
      }
      
      // Check if name matches either active search terms OR current search term
      if (activeSearchTerms.length > 0 || searchTerm) {
        // Check if guest name matches any active search term
        const matchesActiveTerms = activeSearchTerms.some(term => 
          guest.name.toLowerCase().includes(term.toLowerCase())
        );
        
        // Check if guest name matches current search term being typed
        const matchesCurrentTerm = searchTerm ? 
          guest.name.toLowerCase().includes(searchTerm.toLowerCase()) : 
          false;
        
        // If it doesn't match either active terms or current term, filter it out
        if (!matchesActiveTerms && !matchesCurrentTerm) {
          return false;
        }
      }
      
      const metrics = getMetricsForGuest(guest.id);
      if (!metrics) return true; // Keep entries without metrics data
      
      // Get metrics values
      const cpuUsage = metrics?.metrics?.cpu || 0;
      
      const memoryData = metrics?.metrics?.memory || {};
      const memoryUsage = memoryData.percentUsed || 
        (memoryData.total && memoryData.used ? 
          (memoryData.used / memoryData.total) * 100 : 0);
      
      const diskData = metrics?.metrics?.disk || {};
      const diskUsage = diskData.percentUsed || 
        (diskData.total && diskData.used ? 
          (diskData.used / diskData.total) * 100 : 0);
          
      const downloadRate = metrics?.metrics?.network?.inRate || 0;
      const uploadRate = metrics?.metrics?.network?.outRate || 0;
      
      // Apply filters - only show items that have values higher than the filter values
      return (
        cpuUsage >= filters.cpu &&
        memoryUsage >= filters.memory &&
        diskUsage >= filters.disk &&
        downloadRate >= sliderValueToNetworkRate(filters.download) &&
        uploadRate >= sliderValueToNetworkRate(filters.upload)
      );
    });
    
    // Then sort the filtered data
    filteredData.sort((a, b) => {
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
    
    return filteredData;
  };
  
  // Network max values in bytes/second for reference
  const MAX_DOWNLOAD_RATE = 10485760; // ~10 MB/s
  const MAX_UPLOAD_RATE = 5242880;  // ~5 MB/s
  
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
    <Card sx={{ borderRadius: 2, overflow: 'hidden', boxShadow: 3 }}>
      <CardContent>
        <Box sx={{ 
          display: 'flex', 
          flexWrap: 'wrap',
          alignItems: 'center', 
          mb: 2,
          pb: 1.5,
          borderBottom: theme => `1px solid ${theme.palette.grey[200]}`
        }}>
          {/* Title and status section */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            mr: 2,
            minWidth: 200
          }}>
            <NetworkCheckIcon sx={{ mr: 1.5 }} color="primary" />
            <Box>
              <Typography variant="h6" component="div" sx={{ fontWeight: 500, lineHeight: 1.2 }}>
                System Metrics
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                <Box 
                  sx={{ 
                    width: 8, 
                    height: 8, 
                    borderRadius: '50%', 
                    bgcolor: isConnected ? 'success.main' : 'error.main',
                    boxShadow: theme => `0 0 0 2px ${theme.palette.background.paper}`,
                    mr: 0.8,
                    animation: isConnected ? `${pulseAnimation} 3s infinite` : 'none',
                  }} 
                />
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                  {isConnected ? 'Live Connection' : 'Disconnected'}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Debug badge if needed */}
          {isDebugMode && (
            <Chip 
              label="Debug Mode" 
              color="warning"
              size="small"
              sx={{ mr: 2 }}
            />
          )}

          <Box sx={{ flexGrow: 1 }} />
          
          {/* Controls section */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 1.5
          }}>
            {/* Filter controls */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Tooltip title={showFilters ? "Hide filters" : "Show filters"}>
                <Box 
                  onClick={() => setShowFilters(!showFilters)}
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    bgcolor: theme => (Object.values(filters).some(val => val > 0) || searchTerm)
                      ? alpha(theme.palette.primary.main, 0.08)
                      : alpha(theme.palette.primary.main, 0.04),
                    borderRadius: 1,
                    py: 0.5,
                    px: 1.5,
                    transition: 'all 0.2s ease-in-out',
                    cursor: 'pointer',
                    border: theme => (Object.values(filters).some(val => val > 0) || searchTerm) && !showFilters
                      ? `1px solid ${alpha(theme.palette.primary.main, 0.3)}`
                      : 'none',
                    '&:hover': {
                      bgcolor: theme => alpha(theme.palette.primary.main, 0.12),
                    }
                  }}
                >
                  <FilterAltIcon 
                    fontSize="small" 
                    color={(Object.values(filters).some(val => val > 0) || searchTerm) ? "primary" : (showFilters ? "primary" : "action")} 
                    sx={{ mr: 0.8 }}
                  />
                  
                  {(Object.values(filters).some(val => val > 0) || searchTerm) ? (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="body2" color="primary" sx={{ fontWeight: 500 }}>
                        {`${getSortedAndFilteredData(guestData).length}/${guestData.length}`}
                      </Typography>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Filters
                    </Typography>
                  )}
                </Box>
              </Tooltip>

              {/* Remove the dropdown and show filter chips directly */}
              {(Object.values(filters).some(val => val > 0) || activeSearchTerms.length > 0 || searchTerm) && (
                <Box sx={{ 
                  display: 'flex', 
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: 0.75,
                  ml: 1.5
                }}>
                  {/* Active search term chips */}
                  {activeSearchTerms.map(term => (
                    <Chip 
                      key={term}
                      label={`"${term}"`}
                      onDelete={() => removeSearchTerm(term)}
                      color="default"
                      size="small"
                      deleteIcon={<CancelIcon fontSize="small" />}
                      sx={{ height: 24 }}
                    />
                  ))}
                  
                  {/* Current search term chip (shown only if not empty and not yet in activeSearchTerms) */}
                  {searchTerm && !activeSearchTerms.includes(searchTerm) && (
                    <Chip 
                      label={`"${searchTerm}"`}
                      onDelete={() => setSearchTerm('')}
                      color="default"
                      size="small"
                      deleteIcon={<CancelIcon fontSize="small" />}
                      sx={{ height: 24 }}
                    />
                  )}
                  
                  {/* CPU filter chip */}
                  {filters.cpu > 0 && (
                    <Chip 
                      label={`CPU ≥ ${formatPercentage(filters.cpu)}`}
                      onDelete={() => clearFilter('cpu')}
                      color="primary"
                      size="small"
                      deleteIcon={<CancelIcon fontSize="small" />}
                      sx={{ height: 24, '& .MuiChip-label': { fontWeight: 500 } }}
                    />
                  )}
                  
                  {/* Memory filter chip */}
                  {filters.memory > 0 && (
                    <Chip 
                      label={`Mem ≥ ${formatPercentage(filters.memory)}`}
                      onDelete={() => clearFilter('memory')}
                      color="primary"
                      size="small"
                      deleteIcon={<CancelIcon fontSize="small" />}
                      sx={{ height: 24, '& .MuiChip-label': { fontWeight: 500 } }}
                    />
                  )}
                  
                  {/* Disk filter chip */}
                  {filters.disk > 0 && (
                    <Chip 
                      label={`Disk ≥ ${formatPercentage(filters.disk)}`}
                      onDelete={() => clearFilter('disk')}
                      color="primary"
                      size="small"
                      deleteIcon={<CancelIcon fontSize="small" />}
                      sx={{ height: 24, '& .MuiChip-label': { fontWeight: 500 } }}
                    />
                  )}
                  
                  {/* Download filter chip */}
                  {filters.download > 0 && (
                    <Chip 
                      label={`DL ≥ ${formatNetworkRateForFilter(sliderValueToNetworkRate(filters.download))}`}
                      onDelete={() => clearFilter('download')}
                      color="primary"
                      size="small"
                      deleteIcon={<CancelIcon fontSize="small" />}
                      sx={{ height: 24, '& .MuiChip-label': { fontWeight: 500 } }}
                    />
                  )}
                  
                  {/* Upload filter chip */}
                  {filters.upload > 0 && (
                    <Chip 
                      label={`UL ≥ ${formatNetworkRateForFilter(sliderValueToNetworkRate(filters.upload))}`}
                      onDelete={() => clearFilter('upload')}
                      color="secondary"
                      size="small"
                      deleteIcon={<CancelIcon fontSize="small" />}
                      sx={{ height: 24, '& .MuiChip-label': { fontWeight: 500 } }}
                    />
                  )}
                  
                  {/* Reset all filters button */}
                  <Chip 
                    label="Reset"
                    onClick={resetFilters}
                    variant="outlined"
                    size="small"
                    color="primary"
                    sx={{ height: 24 }}
                  />
                </Box>
              )}
            </Box>
            
            {/* Display controls */}
            <FormControlLabel
              control={
                <Switch 
                  checked={showStopped}
                  onChange={(e) => setShowStopped(e.target.checked)}
                  color="primary"
                  size="small"
                />
              }
              label={<Typography variant="body2">Show stopped</Typography>}
              sx={{ m: 0, '& .MuiFormControlLabel-label': { ml: 0.5 } }}
            />
          </Box>
        </Box>
        
        {isDebugMode && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Running in debug mode with simulated data. The server connection is unavailable.
          </Alert>
        )}
        
        <TableContainer component={Paper} sx={{ 
          boxShadow: 2, 
          borderRadius: 1,
          overflow: 'hidden' 
        }}>
          <Table sx={{ 
            '& tbody tr:nth-of-type(odd)': {
              backgroundColor: theme => theme.palette.grey[50],
            },
            '& tbody tr': {
              transition: 'background-color 0.15s ease-in-out',
              '&:hover': {
                backgroundColor: theme => theme.palette.action.hover
              }
            },
            '& th': {
              transition: 'background-color 0.2s ease'
            }
          }}>
            <TableHead>
              <TableRow sx={{ 
                backgroundColor: theme => theme.palette.grey[100],
                '& th': { 
                  py: 1.75,
                  borderBottom: theme => `2px solid ${theme.palette.grey[300]}`
                }
              }}>
                <TableCell width="18%" sx={{ fontWeight: 'bold' }}>
                  {showFilters ? (
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      bgcolor: 'background.paper',
                      border: theme => searchTerm 
                        ? `1px solid ${theme.palette.primary.main}` 
                        : `1px solid ${theme.palette.grey[300]}`,
                      borderRadius: 1,
                      pl: 1,
                      pr: 0.5,
                      py: 0.5,
                      transition: 'all 0.2s ease-in-out',
                    }}>
                      <SearchIcon 
                        fontSize="small" 
                        sx={{ color: searchTerm ? 'primary.main' : 'text.secondary', mr: 0.5 }} 
                      />
                      <InputBase
                        placeholder="Search guests..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && searchTerm.trim()) {
                            e.preventDefault();
                            // Add current search term to active filters
                            addSearchTerm(searchTerm.trim());
                            // Clear the input field
                            setSearchTerm('');
                            // Keep focus on the input field for the next term
                            e.target.focus();
                          } else if (e.key === 'Escape') {
                            // Simply call resetFilters instead of just clearing the search term
                            // Don't stop propagation - let the global handler also run
                            resetFilters();
                            e.target.blur();
                          }
                        }}
                        fullWidth
                        size="small"
                        autoFocus
                        inputRef={searchInputRef}
                        sx={{ 
                          fontSize: '0.875rem', 
                          '& input': { 
                            p: 0,
                            '&::placeholder': {
                              opacity: 0.7,
                              fontSize: '0.875rem'
                            }
                          } 
                        }}
                      />
                      {searchTerm && (
                        <IconButton 
                          size="small" 
                          onClick={() => setSearchTerm('')}
                          sx={{ p: 0.3, ml: 0.5 }}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  ) : (
                    <TableSortLabel
                      active={sortConfig.key === 'name'}
                      direction={sortConfig.key === 'name' ? sortConfig.direction : 'asc'}
                      onClick={() => requestSort('name')}
                    >
                      Guest Name
                    </TableSortLabel>
                  )}
                </TableCell>
                <TableCell width="19%" sx={{ fontWeight: 'bold' }}>
                  <Box>
                    <TableSortLabel
                      active={sortConfig.key === 'cpu'}
                      direction={sortConfig.key === 'cpu' ? sortConfig.direction : 'asc'}
                      onClick={() => requestSort('cpu')}
                    >
                      CPU
                    </TableSortLabel>
                    <Collapse in={showFilters} timeout="auto" mountOnEnter unmountOnExit>
                      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', mt: 1 }}>
                        <Box sx={{ width: '100%', mr: 1.5, position: 'relative' }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={filters.cpu} 
                            color="primary"
                            sx={{ 
                              height: 4,
                              borderRadius: 4,
                              backgroundColor: theme => alpha(theme.palette.primary.main, 0.1),
                              boxShadow: 'none',
                              '& .MuiLinearProgress-bar': {
                                borderRadius: 4,
                                boxShadow: 'none',
                                transition: 'none'
                              }
                            }} 
                          />
                          <Slider
                            value={filters.cpu}
                            onChange={(e, newValue) => updateFilter('cpu', newValue)}
                            aria-label="CPU filter"
                            size="small"
                            sx={{ 
                              position: 'absolute', 
                              top: -12, 
                              width: '100%', 
                              padding: '14px 0',
                              margin: 0,
                              '& .MuiSlider-rail': { opacity: 0 },
                              '& .MuiSlider-track': { opacity: 0 },
                              '& .MuiSlider-thumb': { 
                                width: 16, 
                                height: 16, 
                                bgcolor: '#fff',
                                border: '2px solid currentColor',
                                boxShadow: '0 1px 3px 0 rgba(0,0,0,0.2)',
                                transition: 'width 0.2s ease, height 0.2s ease, box-shadow 0.2s ease',
                                '&:hover, &.Mui-focusVisible': { 
                                  boxShadow: '0 0 0 6px rgba(25, 118, 210, 0.16)',
                                  borderWidth: '2px'
                                },
                                '&:before': {
                                  boxShadow: 'none'
                                },
                                '&:after': {
                                  width: 32,
                                  height: 32
                                }
                              }
                            }}
                          />
                        </Box>
                        <Box sx={{ minWidth: 35 }}>
                          <Typography variant="caption" fontWeight="medium" color="text.secondary">
                            {formatPercentage(filters.cpu)}
                          </Typography>
                        </Box>
                      </Box>
                    </Collapse>
                  </Box>
                </TableCell>
                <TableCell width="19%" sx={{ fontWeight: 'bold' }}>
                  <Box>
                    <TableSortLabel
                      active={sortConfig.key === 'memory'}
                      direction={sortConfig.key === 'memory' ? sortConfig.direction : 'asc'}
                      onClick={() => requestSort('memory')}
                    >
                      Memory
                    </TableSortLabel>
                    <Collapse in={showFilters} timeout="auto" mountOnEnter unmountOnExit>
                      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', mt: 1 }}>
                        <Box sx={{ width: '100%', mr: 1.5, position: 'relative' }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={filters.memory} 
                            color="primary"
                            sx={{ 
                              height: 4,
                              borderRadius: 4,
                              backgroundColor: theme => alpha(theme.palette.primary.main, 0.1),
                              boxShadow: 'none',
                              '& .MuiLinearProgress-bar': {
                                borderRadius: 4,
                                boxShadow: 'none',
                                transition: 'none'
                              }
                            }} 
                          />
                          <Slider
                            value={filters.memory}
                            onChange={(e, newValue) => updateFilter('memory', newValue)}
                            aria-label="Memory filter"
                            size="small"
                            sx={{ 
                              position: 'absolute', 
                              top: -12, 
                              width: '100%', 
                              padding: '14px 0',
                              margin: 0,
                              '& .MuiSlider-rail': { opacity: 0 },
                              '& .MuiSlider-track': { opacity: 0 },
                              '& .MuiSlider-thumb': { 
                                width: 16, 
                                height: 16, 
                                bgcolor: '#fff',
                                border: '2px solid currentColor',
                                boxShadow: '0 1px 3px 0 rgba(0,0,0,0.2)',
                                transition: 'width 0.2s ease, height 0.2s ease, box-shadow 0.2s ease',
                                '&:hover, &.Mui-focusVisible': { 
                                  boxShadow: '0 0 0 6px rgba(25, 118, 210, 0.16)',
                                  borderWidth: '2px'
                                },
                                '&:before': {
                                  boxShadow: 'none'
                                },
                                '&:after': {
                                  width: 32,
                                  height: 32
                                }
                              }
                            }}
                          />
                        </Box>
                        <Box sx={{ minWidth: 35 }}>
                          <Typography variant="caption" fontWeight="medium" color="text.secondary">
                            {formatPercentage(filters.memory)}
                          </Typography>
                        </Box>
                      </Box>
                    </Collapse>
                  </Box>
                </TableCell>
                <TableCell width="19%" sx={{ fontWeight: 'bold' }}>
                  <Box>
                    <TableSortLabel
                      active={sortConfig.key === 'disk'}
                      direction={sortConfig.key === 'disk' ? sortConfig.direction : 'asc'}
                      onClick={() => requestSort('disk')}
                    >
                      Disk
                    </TableSortLabel>
                    <Collapse in={showFilters} timeout="auto" mountOnEnter unmountOnExit>
                      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', mt: 1 }}>
                        <Box sx={{ width: '100%', mr: 1.5, position: 'relative' }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={filters.disk} 
                            color="primary"
                            sx={{ 
                              height: 4,
                              borderRadius: 4,
                              backgroundColor: theme => alpha(theme.palette.primary.main, 0.1),
                              boxShadow: 'none',
                              '& .MuiLinearProgress-bar': {
                                borderRadius: 4,
                                boxShadow: 'none',
                                transition: 'none'
                              }
                            }} 
                          />
                          <Slider
                            value={filters.disk}
                            onChange={(e, newValue) => updateFilter('disk', newValue)}
                            aria-label="Disk filter"
                            size="small"
                            sx={{ 
                              position: 'absolute', 
                              top: -12, 
                              width: '100%', 
                              padding: '14px 0',
                              margin: 0,
                              '& .MuiSlider-rail': { opacity: 0 },
                              '& .MuiSlider-track': { opacity: 0 },
                              '& .MuiSlider-thumb': { 
                                width: 16, 
                                height: 16, 
                                bgcolor: '#fff',
                                border: '2px solid currentColor',
                                boxShadow: '0 1px 3px 0 rgba(0,0,0,0.2)',
                                transition: 'width 0.2s ease, height 0.2s ease, box-shadow 0.2s ease',
                                '&:hover, &.Mui-focusVisible': { 
                                  boxShadow: '0 0 0 6px rgba(25, 118, 210, 0.16)',
                                  borderWidth: '2px'
                                },
                                '&:before': {
                                  boxShadow: 'none'
                                },
                                '&:after': {
                                  width: 32,
                                  height: 32
                                }
                              }
                            }}
                          />
                        </Box>
                        <Box sx={{ minWidth: 35 }}>
                          <Typography variant="caption" fontWeight="medium" color="text.secondary">
                            {formatPercentage(filters.disk)}
                          </Typography>
                        </Box>
                      </Box>
                    </Collapse>
                  </Box>
                </TableCell>
                <TableCell width="12.5%" sx={{ fontWeight: 'bold' }}>
                  <Box>
                    <TableSortLabel
                      active={sortConfig.key === 'download'}
                      direction={sortConfig.key === 'download' ? sortConfig.direction : 'asc'}
                      onClick={() => requestSort('download')}
                    >
                      Download
                    </TableSortLabel>
                    <Collapse in={showFilters} timeout="auto" mountOnEnter unmountOnExit>
                      <Box sx={{ mt: 1, position: 'relative' }}>
                        <LinearProgress 
                          variant="determinate" 
                          value={filters.download} 
                          color="primary"
                          sx={{ 
                            height: 4,
                            borderRadius: 4,
                            backgroundColor: theme => alpha(theme.palette.primary.main, 0.1),
                            boxShadow: 'none',
                            '& .MuiLinearProgress-bar': {
                              borderRadius: 4,
                              boxShadow: 'none',
                              transition: 'none'
                            }
                          }} 
                        />
                        <Slider
                          value={filters.download}
                          onChange={(e, newValue) => updateFilter('download', newValue)}
                          aria-label="Download filter"
                          size="small"
                          sx={{ 
                            position: 'absolute', 
                            top: -12, 
                            width: '100%', 
                            padding: '14px 0',
                            margin: 0,
                            '& .MuiSlider-rail': { opacity: 0 },
                            '& .MuiSlider-track': { opacity: 0 },
                            '& .MuiSlider-thumb': { 
                              width: 16, 
                              height: 16, 
                              bgcolor: '#fff',
                              border: '2px solid currentColor',
                              boxShadow: '0 1px 3px 0 rgba(0,0,0,0.2)',
                              transition: 'width 0.2s ease, height 0.2s ease, box-shadow 0.2s ease',
                              '&:hover, &.Mui-focusVisible': { 
                                boxShadow: '0 0 0 6px rgba(25, 118, 210, 0.16)',
                                borderWidth: '2px'
                              },
                              '&:before': {
                                boxShadow: 'none'
                              },
                              '&:after': {
                                width: 32,
                                height: 32
                              }
                            }
                          }}
                        />
                        <Typography variant="caption" color="primary" sx={{ display: 'block', mt: 0.5 }}>
                          ↓ {filters.download > 0 ? formatNetworkRateForFilter(sliderValueToNetworkRate(filters.download)) : 'Any'}
                        </Typography>
                      </Box>
                    </Collapse>
                  </Box>
                </TableCell>
                <TableCell width="12.5%" sx={{ fontWeight: 'bold' }}>
                  <Box>
                    <TableSortLabel
                      active={sortConfig.key === 'upload'}
                      direction={sortConfig.key === 'upload' ? sortConfig.direction : 'asc'}
                      onClick={() => requestSort('upload')}
                    >
                      Upload
                    </TableSortLabel>
                    <Collapse in={showFilters} timeout="auto" mountOnEnter unmountOnExit>
                      <Box sx={{ mt: 1, position: 'relative' }}>
                        <LinearProgress 
                          variant="determinate" 
                          value={filters.upload} 
                          color="secondary"
                          sx={{ 
                            height: 4,
                            borderRadius: 4,
                            backgroundColor: theme => alpha(theme.palette.secondary.main, 0.1),
                            boxShadow: 'none',
                            '& .MuiLinearProgress-bar': {
                              borderRadius: 4,
                              boxShadow: 'none',
                              transition: 'none'
                            }
                          }} 
                        />
                        <Slider
                          value={filters.upload}
                          onChange={(e, newValue) => updateFilter('upload', newValue)}
                          aria-label="Upload filter"
                          size="small"
                          sx={{ 
                            position: 'absolute', 
                            top: -12, 
                            width: '100%', 
                            padding: '14px 0',
                            margin: 0,
                            '& .MuiSlider-rail': { opacity: 0 },
                            '& .MuiSlider-track': { opacity: 0 },
                            '& .MuiSlider-thumb': { 
                              width: 16, 
                              height: 16, 
                              bgcolor: '#fff',
                              border: '2px solid currentColor',
                              boxShadow: '0 1px 3px 0 rgba(0,0,0,0.2)',
                              transition: 'width 0.2s ease, height 0.2s ease, box-shadow 0.2s ease',
                              '&:hover, &.Mui-focusVisible': { 
                                boxShadow: '0 0 0 6px rgba(156, 39, 176, 0.16)',
                                borderWidth: '2px'
                              },
                              '&:before': {
                                boxShadow: 'none'
                              },
                              '&:after': {
                                width: 32,
                                height: 32
                              }
                            }
                          }}
                        />
                        <Typography variant="caption" color="secondary" sx={{ display: 'block', mt: 0.5 }}>
                          ↑ {filters.upload > 0 ? formatNetworkRateForFilter(sliderValueToNetworkRate(filters.upload)) : 'Any'}
                        </Typography>
                      </Box>
                    </Collapse>
                  </Box>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {guestData.length > 0 ? (
                getSortedAndFilteredData(guestData)
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
                    <TableRow key={guest.id} sx={{ 
                      opacity: isRunning ? 1 : 0.8, 
                      '& > td': { py: 1.5 },
                      transition: 'all 0.2s ease-in-out',
                    }}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                          <StatusIndicator status={guest.status} />
                          <Typography 
                            noWrap 
                            sx={{ 
                              maxWidth: 150,
                              fontWeight: isRunning ? 500 : 400
                            }}
                          >
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
                          <Typography variant="body2" color="primary" noWrap fontWeight="medium">
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
                          <Typography variant="body2" color="secondary" noWrap fontWeight="medium">
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
                  <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2 }}>
                      <NetworkCheckIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2, opacity: 0.6 }} />
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        No Systems Available
                      </Typography>
                      <Typography variant="body2" color="text.disabled">
                        No guest data has been received from the server
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
              {guestData.length > 0 && getSortedAndFilteredData(guestData).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2 }}>
                      <FilterAltIcon sx={{ fontSize: 40, color: 'primary.light', mb: 2, opacity: 0.7 }} />
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        No Matching Systems
                      </Typography>
                      <Typography variant="body2" color="text.disabled" sx={{ mb: 2 }}>
                        No systems match the current filters
                      </Typography>
                      <Chip 
                        label="Reset Filters" 
                        color="primary" 
                        onClick={resetFilters}
                        sx={{ mt: 1 }}
                      />
                    </Box>
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