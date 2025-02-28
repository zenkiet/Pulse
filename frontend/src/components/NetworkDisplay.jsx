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
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import SpeedIcon from '@mui/icons-material/Speed';
import SearchIcon from '@mui/icons-material/Search';
import CancelIcon from '@mui/icons-material/Cancel';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import InputBase from '@mui/material/InputBase';

// Define pulse animation
const pulseAnimation = keyframes`
  0% {
    box-shadow: 0 0 0 0 rgba(58, 123, 213, 0.4);
  }
  70% {
    box-shadow: 0 0 0 6px rgba(58, 123, 213, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(58, 123, 213, 0);
  }
`;

// Add fade-in animation
const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
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
  const normalizedValue = Math.min(Math.max(0, value), 100);
  
  const progressBar = (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      width: '100%',
      opacity: disabled ? 0.5 : 1,
    }}>
      <Box sx={{ width: '100%', mr: 1 }}>
        <LinearProgress 
          variant="determinate" 
          value={normalizedValue} 
          color={color}
          sx={{
            height: 4,
            borderRadius: 4,
            backgroundColor: theme => alpha(theme.palette.grey[300], 0.5),
            '& .MuiLinearProgress-bar': {
              borderRadius: 4,
              transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            }
          }}
        />
      </Box>
      <Box sx={{ minWidth: 35 }}>
        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{ 
            fontWeight: 500,
            fontSize: '0.75rem',
            whiteSpace: 'nowrap',
          }}
        >
          {formatPercentage(normalizedValue)}
        </Typography>
      </Box>
    </Box>
  );
  
  if (tooltipText) {
    return (
      <Tooltip title={tooltipText} arrow placement="top">
        {progressBar}
      </Tooltip>
    );
  }
  
  return progressBar;
};

// Status indicator circle
const StatusIndicator = ({ status }) => {
  let color = 'grey';
  
  switch (status.toLowerCase()) {
    case 'running':
      color = '#4caf50'; // success green
      break;
    case 'stopped':
      color = '#f44336'; // error red
      break;
    case 'paused':
      color = '#ff9800'; // warning orange
      break;
    default:
      color = '#9e9e9e'; // grey
  }
  
  return (
    <Box
      sx={{
        width: 10,
        height: 10,
        borderRadius: '50%',
        bgcolor: color,
        boxShadow: '0 0 0 2px rgba(255, 255, 255, 0.8)',
        ...(status.toLowerCase() === 'running' && {
          animation: `${pulseAnimation} 2s infinite`
        })
      }}
    />
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
  const [activeSlider, setActiveSlider] = useState(null);
  
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
  
  // Function to clear all filters and reset sorting to default
  const clearAllFiltersAndSorting = useCallback(() => {
    resetFilters();
    
    // Reset sorting to default
    setSortConfig({
      key: 'name',
      direction: 'asc'
    });
  }, [resetFilters]);
  
  // Add event listeners for keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Handle ESC key behavior
      if (e.key === 'Escape') {
        // Reset everything to defaults with a single ESC press
        const isSearchInputFocused = document.activeElement === searchInputRef.current;
        
        // If search is focused, blur it
        if (isSearchInputFocused) {
          searchInputRef.current.blur();
        }
        
        // Close filters if open
        if (showFilters) {
          setShowFilters(false);
        }
        
        // Clear all filters and reset sorting
        clearAllFiltersAndSorting();
        
        // Prevent default action
        e.preventDefault();
        return;
      }
      
      // If user starts typing, focus the search input without opening filters
      // Only if not already in an input field or contentEditable element
      if (e.key.length === 1 && 
          !/^(Control|Alt|Shift|Meta)$/.test(e.key) &&
          !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) &&
          !document.activeElement.isContentEditable) {
        
        // Focus the search input without opening filters
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
  }, [showFilters, resetFilters, clearAllFiltersAndSorting]); // Removed escRecentlyPressed dependency
  
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
  
  // Function to handle slider drag start
  const handleSliderDragStart = (filterName) => {
    setActiveSlider(filterName);
  };

  // Function to handle slider drag end
  const handleSliderDragEnd = () => {
    setActiveSlider(null);
    
    // Remove focus from the active element to allow keyboard shortcuts to work
    if (document.activeElement) {
      document.activeElement.blur();
    }
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
  
  // Create refs for columns to measure their widths for accurate slider positioning
  const cpuColumnRef = React.useRef(null);
  const memoryColumnRef = React.useRef(null);
  const diskColumnRef = React.useRef(null);
  const downloadColumnRef = React.useRef(null);
  const uploadColumnRef = React.useRef(null);
  
  if (error) {
    return (
      <Card 
        sx={{ 
          mb: 2, 
          bgcolor: '#FFF4F4',
          borderRadius: 2,
          overflow: 'hidden',
          border: '1px solid #ffcdd2',
          animation: `${fadeIn} 0.3s ease-out`,
        }}
      >
        <CardContent>
          <Typography color="error" variant="h6" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <CancelIcon sx={{ mr: 1 }} />
            Connection Error
          </Typography>
          <Typography>{error}</Typography>
        </CardContent>
      </Card>
    );
  }
  
  if (!isConnected) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: 300,
          flexDirection: 'column',
          animation: `${fadeIn} 0.3s ease-out`,
        }}
      >
        <CircularProgress size={48} thickness={4} />
        <Typography variant="body1" sx={{ mt: 3, fontWeight: 500 }}>
          Connecting to server...
        </Typography>
      </Box>
    );
  }
  
  return (
    <Box sx={{ animation: `${fadeIn} 0.3s ease-out` }}>
      <Card 
        sx={{ 
          mb: 3, 
          borderRadius: 2,
          overflow: 'visible',
        }}
        elevation={1}
      >
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          {/* Header section with search and controls */}
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'flex-start', md: 'center' },
            mb: 2,
            gap: { xs: 2, md: 0 }
          }}>
            {/* Search box */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center',
              bgcolor: 'background.paper',
              borderRadius: 2,
              border: theme => `1px solid ${theme.palette.grey[300]}`,
              px: 1.5,
              py: 0.5,
              width: { xs: '100%', md: 'auto' },
              minWidth: { md: 220 },
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                borderColor: theme => theme.palette.primary.main,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              },
              '&:focus-within': {
                borderColor: theme => theme.palette.primary.main,
                boxShadow: theme => `0 0 0 2px ${alpha(theme.palette.primary.main, 0.2)}`
              }
            }}>
              <SearchIcon fontSize="small" sx={{ color: 'text.secondary', mr: 1 }} />
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
                    // Let the global handler handle this completely
                    // The global handler will detect that search is focused
                    // and both blur and collapse the filter window
                    e.preventDefault();
                  }
                }}
                fullWidth
                size="small"
                inputRef={searchInputRef}
                sx={{ 
                  fontSize: '0.875rem', 
                  '& input': { 
                    p: 0.5,
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

            <Box sx={{ flexGrow: 1 }} />
            
            {/* Controls section */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 1.5,
              ml: { xs: 0, md: 'auto' },
              width: { xs: '100%', md: 'auto' },
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
                      borderRadius: 2,
                      py: 0.7,
                      px: 1.5,
                      transition: 'all 0.2s ease-in-out',
                      cursor: 'pointer',
                      border: theme => (Object.values(filters).some(val => val > 0) || searchTerm) && !showFilters
                        ? `1px solid ${alpha(theme.palette.primary.main, 0.3)}`
                        : `1px solid transparent`,
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
                        <Typography variant="body2" color="primary" sx={{ fontWeight: 600 }}>
                          {`${getSortedAndFilteredData(guestData).length}/${guestData.length}`}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
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
                    ml: 1.5,
                    maxWidth: { xs: '100%', md: '400px' },
                    mt: { xs: 1, md: 0 }
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
                label={<Typography variant="body2" sx={{ fontWeight: 500 }}>Show stopped</Typography>}
                sx={{ 
                  m: 0, 
                  '& .MuiFormControlLabel-label': { ml: 0.5 },
                  bgcolor: theme => alpha(theme.palette.grey[100], 0.7),
                  borderRadius: 2,
                  px: 1,
                  py: 0.2,
                  border: '1px solid',
                  borderColor: 'grey.200',
                }}
              />
            </Box>
          </Box>
          
          {isDebugMode && (
            <Alert 
              severity="warning" 
              sx={{ 
                mb: 2,
                borderRadius: 1.5,
                '& .MuiAlert-icon': {
                  alignItems: 'center'
                }
              }}
            >
              Running in debug mode with simulated data. The server connection is unavailable.
            </Alert>
          )}
          
          {/* Filter Panel that shows when filters are active */}
          <Collapse in={showFilters} timeout="auto">
            <Box 
              sx={{ 
                mb: 2, 
                p: 2, 
                backgroundColor: theme => alpha(theme.palette.primary.light, 0.05),
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider'
              }}
            >
              <Typography variant="subtitle2" sx={{ mb: 2 }}>Adjust minimum thresholds:</Typography>
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr', lg: '1fr 1fr 1fr 1fr 1fr' },
                gap: 3
              }}>
                {/* CPU Filter */}
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <SpeedIcon fontSize="small" sx={{ mr: 0.5, opacity: 0.6, fontSize: '0.9rem' }} />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>CPU Usage</Typography>
                  </Box>
                  <Tooltip title={`CPU usage ≥ ${formatPercentage(filters.cpu)}`} arrow placement="top">
                    <Slider
                      value={filters.cpu}
                      onChange={(_, newValue) => updateFilter('cpu', newValue)}
                      onMouseDown={() => handleSliderDragStart('cpu')}
                      onMouseUp={handleSliderDragEnd}
                      aria-labelledby="cpu-filter-slider"
                      valueLabelDisplay="auto"
                      valueLabelFormat={value => `${formatPercentage(value)}`}
                      sx={{
                        color: theme => alpha(theme.palette.primary.main, filters.cpu > 0 ? 0.8 : 0.4),
                        height: 4,
                        '& .MuiSlider-thumb': {
                          height: 14,
                          width: 14,
                          '&:hover, &.Mui-focusVisible': {
                            boxShadow: `0px 0px 0px 8px ${alpha('#3a7bd5', 0.16)}`
                          }
                        },
                        '& .MuiSlider-valueLabel': {
                          fontWeight: 'bold',
                          lineHeight: 1.2
                        }
                      }}
                    />
                  </Tooltip>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">0%</Typography>
                    <Typography variant="caption" color="text.secondary">100%</Typography>
                  </Box>
                </Box>
                
                {/* Memory Filter */}
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <MemoryIcon fontSize="small" sx={{ mr: 0.5, opacity: 0.6, fontSize: '0.9rem' }} />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>Memory Usage</Typography>
                  </Box>
                  <Tooltip title={`Memory usage ≥ ${formatPercentage(filters.memory)}`} arrow placement="top">
                    <Slider
                      value={filters.memory}
                      onChange={(_, newValue) => updateFilter('memory', newValue)}
                      onMouseDown={() => handleSliderDragStart('memory')}
                      onMouseUp={handleSliderDragEnd}
                      aria-labelledby="memory-filter-slider"
                      valueLabelDisplay="auto"
                      valueLabelFormat={value => `${formatPercentage(value)}`}
                      sx={{
                        color: theme => alpha(theme.palette.primary.main, filters.memory > 0 ? 0.8 : 0.4),
                        height: 4,
                        '& .MuiSlider-thumb': {
                          height: 14,
                          width: 14,
                          '&:hover, &.Mui-focusVisible': {
                            boxShadow: `0px 0px 0px 8px ${alpha('#3a7bd5', 0.16)}`
                          }
                        },
                        '& .MuiSlider-valueLabel': {
                          fontWeight: 'bold',
                          lineHeight: 1.2
                        }
                      }}
                    />
                  </Tooltip>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">0%</Typography>
                    <Typography variant="caption" color="text.secondary">100%</Typography>
                  </Box>
                </Box>
                
                {/* Disk Filter */}
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <StorageIcon fontSize="small" sx={{ mr: 0.5, opacity: 0.6, fontSize: '0.9rem' }} />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>Disk Usage</Typography>
                  </Box>
                  <Tooltip title={`Disk usage ≥ ${formatPercentage(filters.disk)}`} arrow placement="top">
                    <Slider
                      value={filters.disk}
                      onChange={(_, newValue) => updateFilter('disk', newValue)}
                      onMouseDown={() => handleSliderDragStart('disk')}
                      onMouseUp={handleSliderDragEnd}
                      aria-labelledby="disk-filter-slider"
                      valueLabelDisplay="auto"
                      valueLabelFormat={value => `${formatPercentage(value)}`}
                      sx={{
                        color: theme => alpha(theme.palette.primary.main, filters.disk > 0 ? 0.8 : 0.4),
                        height: 4,
                        '& .MuiSlider-thumb': {
                          height: 14,
                          width: 14,
                          '&:hover, &.Mui-focusVisible': {
                            boxShadow: `0px 0px 0px 8px ${alpha('#3a7bd5', 0.16)}`
                          }
                        },
                        '& .MuiSlider-valueLabel': {
                          fontWeight: 'bold',
                          lineHeight: 1.2
                        }
                      }}
                    />
                  </Tooltip>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">0%</Typography>
                    <Typography variant="caption" color="text.secondary">100%</Typography>
                  </Box>
                </Box>
                
                {/* Download Filter */}
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <ArrowDownwardIcon fontSize="small" sx={{ mr: 0.5, opacity: 0.6, fontSize: '0.9rem' }} />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>Download Rate</Typography>
                  </Box>
                  <Tooltip title={`Download ≥ ${formatNetworkRateForFilter(sliderValueToNetworkRate(filters.download))}`} arrow placement="top">
                    <Slider
                      value={filters.download}
                      onChange={(_, newValue) => updateFilter('download', newValue)}
                      onMouseDown={() => handleSliderDragStart('download')}
                      onMouseUp={handleSliderDragEnd}
                      aria-labelledby="download-filter-slider"
                      valueLabelDisplay="auto"
                      valueLabelFormat={value => formatNetworkRateForFilter(sliderValueToNetworkRate(value))}
                      sx={{
                        color: theme => alpha(theme.palette.primary.main, filters.download > 0 ? 0.8 : 0.4),
                        height: 4,
                        '& .MuiSlider-thumb': {
                          height: 14,
                          width: 14,
                          '&:hover, &.Mui-focusVisible': {
                            boxShadow: `0px 0px 0px 8px ${alpha('#3a7bd5', 0.16)}`
                          }
                        },
                        '& .MuiSlider-valueLabel': {
                          fontWeight: 'bold',
                          lineHeight: 1.2
                        }
                      }}
                    />
                  </Tooltip>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">0 B/s</Typography>
                    <Typography variant="caption" color="text.secondary">10 MB/s</Typography>
                  </Box>
                </Box>
                
                {/* Upload Filter */}
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <ArrowUpwardIcon fontSize="small" sx={{ mr: 0.5, opacity: 0.6, fontSize: '0.9rem' }} />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>Upload Rate</Typography>
                  </Box>
                  <Tooltip title={`Upload ≥ ${formatNetworkRateForFilter(sliderValueToNetworkRate(filters.upload))}`} arrow placement="top">
                    <Slider
                      value={filters.upload}
                      onChange={(_, newValue) => updateFilter('upload', newValue)}
                      onMouseDown={() => handleSliderDragStart('upload')}
                      onMouseUp={handleSliderDragEnd}
                      aria-labelledby="upload-filter-slider"
                      valueLabelDisplay="auto"
                      valueLabelFormat={value => formatNetworkRateForFilter(sliderValueToNetworkRate(value))}
                      sx={{
                        color: theme => alpha(theme.palette.secondary.main, filters.upload > 0 ? 0.8 : 0.4),
                        height: 4,
                        '& .MuiSlider-thumb': {
                          height: 14,
                          width: 14,
                          '&:hover, &.Mui-focusVisible': {
                            boxShadow: `0px 0px 0px 8px ${alpha('#9c27b0', 0.16)}`
                          }
                        },
                        '& .MuiSlider-valueLabel': {
                          fontWeight: 'bold',
                          lineHeight: 1.2
                        }
                      }}
                    />
                  </Tooltip>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">0 B/s</Typography>
                    <Typography variant="caption" color="text.secondary">10 MB/s</Typography>
                  </Box>
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Chip 
                  label="Reset All Filters" 
                  onClick={resetFilters}
                  variant="outlined"
                  size="small"
                  color="primary"
                  sx={{ height: 28 }}
                />
              </Box>
            </Box>
          </Collapse>
          
          <TableContainer 
            component={Paper} 
            sx={{ 
              boxShadow: 'none', 
              borderRadius: 2,
              overflow: 'hidden',
              position: 'relative',
              border: '1px solid',
              borderColor: 'grey.200',
            }}
          >
            <Table sx={{ 
              '& tbody tr:nth-of-type(odd)': {
                backgroundColor: theme => alpha(theme.palette.grey[50], 0.5),
              },
              '& tbody tr': {
                transition: 'background-color 0.15s ease-in-out',
                '&:hover': {
                  backgroundColor: theme => alpha(theme.palette.primary.light, 0.05)
                }
              },
              '& th': {
                transition: 'background-color 0.2s ease'
              }
            }}>
              <TableHead>
                <TableRow sx={{ 
                  backgroundColor: theme => alpha(theme.palette.primary.light, 0.05),
                  '& th': { 
                    py: showFilters ? 1 : 1.5,
                    pb: showFilters ? 1 : 1.5,
                    borderBottom: theme => `2px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                    verticalAlign: 'middle',
                    minHeight: showFilters ? '48px' : '40px',
                    transition: 'padding 0.25s cubic-bezier(0.4, 0, 0.2, 1), min-height 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                  }
                }}>
                  <TableCell 
                    width="18%" 
                    onClick={() => requestSort('name')}
                    sx={{ 
                      fontWeight: 'bold', 
                      minHeight: '48px', 
                      position: 'relative',
                      cursor: 'pointer', 
                      '&:hover': {
                        backgroundColor: theme => alpha(theme.palette.primary.main, 0.08)
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <PersonIcon fontSize="small" sx={{ mr: 0.5, opacity: 0.6, fontSize: '0.9rem' }} />
                      Guest Name
                      {sortConfig.key === 'name' && (
                        <Box sx={{ ml: 0.5 }}>
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </Box>
                      )}
                    </Box>
                  </TableCell>
                  
                  {/* CPU Column */}
                  <TableCell 
                    width="19%" 
                    ref={cpuColumnRef} 
                    onClick={() => requestSort('cpu')}
                    sx={{ 
                      fontWeight: 'bold', 
                      minHeight: '48px', 
                      position: 'relative',
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: theme => alpha(theme.palette.primary.main, 0.08)
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <SpeedIcon fontSize="small" sx={{ mr: 0.5, opacity: 0.6, fontSize: '0.9rem' }} />
                      CPU
                      {sortConfig.key === 'cpu' && (
                        <Box sx={{ ml: 0.5 }}>
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </Box>
                      )}
                    </Box>
                  </TableCell>
                  
                  {/* Memory Column */}
                  <TableCell 
                    width="19%" 
                    ref={memoryColumnRef}
                    onClick={() => requestSort('memory')}
                    sx={{ 
                      fontWeight: 'bold', 
                      minHeight: '48px', 
                      position: 'relative',
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: theme => alpha(theme.palette.primary.main, 0.08)
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <MemoryIcon fontSize="small" sx={{ mr: 0.5, opacity: 0.6, fontSize: '0.9rem' }} />
                      Memory
                      {sortConfig.key === 'memory' && (
                        <Box sx={{ ml: 0.5 }}>
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </Box>
                      )}
                    </Box>
                  </TableCell>
                  
                  {/* Disk Column */}
                  <TableCell 
                    width="19%" 
                    ref={diskColumnRef}
                    onClick={() => requestSort('disk')}
                    sx={{ 
                      fontWeight: 'bold', 
                      minHeight: '48px', 
                      position: 'relative',
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: theme => alpha(theme.palette.primary.main, 0.08)
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <StorageIcon fontSize="small" sx={{ mr: 0.5, opacity: 0.6, fontSize: '0.9rem' }} />
                      Disk
                      {sortConfig.key === 'disk' && (
                        <Box sx={{ ml: 0.5 }}>
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </Box>
                      )}
                    </Box>
                  </TableCell>
                  
                  {/* Download Column */}
                  <TableCell 
                    width="12%" 
                    ref={downloadColumnRef}
                    onClick={() => requestSort('download')}
                    sx={{ 
                      fontWeight: 'bold', 
                      minHeight: '48px', 
                      position: 'relative',
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: theme => alpha(theme.palette.primary.main, 0.08)
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <ArrowDownwardIcon fontSize="small" sx={{ mr: 0.5, opacity: 0.6, fontSize: '0.9rem' }} />
                      Download
                      {sortConfig.key === 'download' && (
                        <Box sx={{ ml: 0.5 }}>
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </Box>
                      )}
                    </Box>
                  </TableCell>
                  
                  {/* Upload Column */}
                  <TableCell 
                    width="13%" 
                    ref={uploadColumnRef}
                    onClick={() => requestSort('upload')}
                    sx={{ 
                      fontWeight: 'bold', 
                      minHeight: '48px', 
                      position: 'relative',
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: theme => alpha(theme.palette.primary.main, 0.08)
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <ArrowUpwardIcon fontSize="small" sx={{ mr: 0.5, opacity: 0.6, fontSize: '0.9rem' }} />
                      Upload
                      {sortConfig.key === 'upload' && (
                        <Box sx={{ ml: 0.5 }}>
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </Box>
                      )}
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
    </Box>
  );
};

export default NetworkDisplay; 