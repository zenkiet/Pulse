import React, { useEffect, useState, useCallback, useMemo } from 'react';
import useSocket from '../hooks/useSocket';
import { useThemeContext } from '../context/ThemeContext';
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
  alpha,
  useTheme
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
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import InputBase from '@mui/material/InputBase';
import DnsIcon from '@mui/icons-material/Dns';

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

// Add localStorage keys as constants
const STORAGE_KEY_FILTERS = 'network_display_filters';
const STORAGE_KEY_SORT = 'network_display_sort';
const STORAGE_KEY_SHOW_STOPPED = 'network_display_show_stopped';
const STORAGE_KEY_SHOW_FILTERS = 'network_display_show_filters';
const STORAGE_KEY_SEARCH_TERMS = 'network_display_search_terms';

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

// KeyboardShortcut component with better a11y
const KeyboardShortcut = ({ shortcut, sx = {} }) => (
  <Box
    component="span"
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      px: 0.7,
      py: 0.3,
      ml: 0.8,
      fontSize: '0.65rem',
      lineHeight: 1,
      fontWeight: 600,
      color: 'text.secondary',
      bgcolor: 'rgba(0, 0, 0, 0.06)',
      borderRadius: 0.8,
      border: '1px solid',
      borderColor: 'rgba(0, 0, 0, 0.1)',
      ...sx
    }}
    aria-hidden="true" // Hide from screen readers since it's visual decoration
  >
    {shortcut}
  </Box>
);

const NetworkDisplay = ({ selectedNode = 'all' }) => {
  const { 
    isConnected, 
    guestData, 
    metricsData, 
    error,
    isDebugMode,
    nodeData
  } = useSocket();
  
  const theme = useTheme();
  
  // Use the theme context instead of local state
  const { darkMode, toggleDarkMode } = useThemeContext();
  
  // Add sorting state - load from localStorage or use default
  const [sortConfig, setSortConfig] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SORT);
      return saved ? JSON.parse(saved) : { key: 'name', direction: 'asc' };
    } catch (e) {
      console.error('Error loading sort preferences:', e);
      return { key: 'name', direction: 'asc' };
    }
  });
  
  // Add state to track whether to show stopped systems - load from localStorage or use default
  const [showStopped, setShowStopped] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SHOW_STOPPED);
      return saved ? JSON.parse(saved) === true : false;
    } catch (e) {
      console.error('Error loading show stopped preference:', e);
      return false;
    }
  });
  
  // Add state to toggle filters visibility - load from localStorage or use default
  const [showFilters, setShowFilters] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SHOW_FILTERS);
      return saved ? JSON.parse(saved) === true : false;
    } catch (e) {
      console.error('Error loading show filters preference:', e);
      return false;
    }
  });
  
  // Add search state
  const [searchTerm, setSearchTerm] = useState('');
  
  // Add search terms array to store active search filters - load from localStorage or use default
  const [activeSearchTerms, setActiveSearchTerms] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SEARCH_TERMS);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Error loading search terms:', e);
      return [];
    }
  });
  
  // Reference to the search input element
  const searchInputRef = React.useRef(null);
  
  // Add filter state - load from localStorage or use default
  const [filters, setFilters] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FILTERS);
      return saved ? JSON.parse(saved) : {
        cpu: 0,
        memory: 0,
        disk: 0,
        download: 0,
        upload: 0
      };
    } catch (e) {
      console.error('Error loading filter preferences:', e);
      return {
        cpu: 0,
        memory: 0,
        disk: 0,
        download: 0,
        upload: 0
      };
    }
  });
  
  // Filter guests based on selected node
  const getNodeFilteredGuests = useCallback((guests) => {
    if (selectedNode === 'all') {
      return guests;
    }
    
    // Filter guests based on the node property from the API
    return guests.filter(guest => {
      // Extract the node ID from the guest's node property
      // The node property from the API is in the format "node-1", "node-2", etc.
      // The selectedNode from the dropdown is in the format "node1", "node2", etc.
      // We need to convert between these formats
      const nodeIdFromApi = guest.node;
      
      // If the node property doesn't exist, include the guest in all nodes
      if (!nodeIdFromApi) return true;
      
      // Convert "node-1" to "node1" format
      const normalizedNodeId = nodeIdFromApi.replace('-', '');
      
      return normalizedNodeId === selectedNode;
    });
  }, [selectedNode]);
  
  const [activeSlider, setActiveSlider] = useState(null);
  
  // Save sort preferences whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SORT, JSON.stringify(sortConfig));
  }, [sortConfig]);

  // Save show stopped preference whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SHOW_STOPPED, JSON.stringify(showStopped));
  }, [showStopped]);

  // Save show filters preference whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SHOW_FILTERS, JSON.stringify(showFilters));
  }, [showFilters]);

  // Save active search terms whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SEARCH_TERMS, JSON.stringify(activeSearchTerms));
  }, [activeSearchTerms]);

  // Save filter preferences whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_FILTERS, JSON.stringify(filters));
  }, [filters]);
  
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
    // First filter by selected node
    const nodeFilteredData = getNodeFilteredGuests(data);
    
    const sortableData = [...nodeFilteredData];
    
    // Then filter the data
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
  
  // Memoize getSortedAndFilteredData to optimize performance
  const sortedAndFilteredData = useMemo(
    () => getSortedAndFilteredData(guestData),
    [guestData, sortConfig, filters, showStopped, searchTerm, activeSearchTerms, displayMetrics, selectedNode, getNodeFilteredGuests]
  );
  
  // Add keyboard shortcut handler for 'F' key to toggle filters
  useEffect(() => {
    const handleKeyDown = (e) => {
      // If 'F' is pressed and no input/textarea is focused, toggle filters
      if (e.key.toLowerCase() === 'f' && 
          !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) &&
          !document.activeElement.isContentEditable) {
        e.preventDefault();
        setShowFilters(prev => !prev);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
  
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
          bgcolor: darkMode ? 'background.paper' : undefined,
          boxShadow: darkMode ? '0 4px 6px rgba(0, 0, 0, 0.1)' : undefined
        }}
        elevation={1}
      >
        <CardContent sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
          {/* Header section with search and controls */}
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'flex-start', md: 'center' },
            mb: { xs: 1.5, sm: 2 },
            gap: { xs: 1.5, md: 0 }
          }}>
            {/* Dark Mode Toggle removed - now in App header */}
            
            {/* Search box - moved to the left */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center',
              bgcolor: darkMode ? 'background.default' : 'background.paper',
              borderRadius: 2,
              border: theme => `1px solid ${darkMode ? theme.palette.divider : theme.palette.grey[300]}`,
              px: 1.5,
              py: 0.5,
              width: { xs: '100%', md: 'auto' },
              minWidth: { md: 220 },
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                borderColor: theme => theme.palette.primary.main,
                boxShadow: darkMode ? '0 2px 6px rgba(0, 0, 0, 0.15)' : '0 1px 3px rgba(0,0,0,0.05)'
              },
              '&:focus-within': {
                borderColor: theme => theme.palette.primary.main,
                boxShadow: theme => `0 0 0 2px ${alpha(theme.palette.primary.main, 0.2)}`
              },
              mr: { md: 2 }  // Add margin to the right on medium+ screens
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
              
              <Box sx={{ 
                display: { xs: 'none', md: 'flex' }, 
                alignItems: 'center',
                ml: 0.5,
                mr: -0.5,
                opacity: 0.6,
                '&:hover': { opacity: 1 }
              }}>
                <KeyboardShortcut shortcut="ESC" sx={{ mr: 0.5 }} />
              </Box>
            </Box>
            
            {/* Node indicator */}
            {selectedNode !== 'all' && (
              <Chip
                icon={<DnsIcon fontSize="small" />}
                label={(() => {
                  // Find the actual node name from nodeData
                  if (nodeData && nodeData.length > 0) {
                    // Convert selectedNode format (e.g., "node1") to API format (e.g., "node-1")
                    const nodeIdForApi = selectedNode.replace(/^node(\d+)$/, "node-$1");
                    const node = nodeData.find(n => n.id === nodeIdForApi);
                    if (node) {
                      return `Node: ${node.name}`;
                    }
                  }
                  // Fallback to the node ID if we can't find the name
                  return `Node: ${selectedNode}`;
                })()}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ 
                  height: 28, 
                  mr: 2,
                  fontWeight: 500,
                  borderRadius: 1.5,
                  '& .MuiChip-icon': {
                    color: 'primary.main'
                  }
                }}
              />
            )}

            <Box sx={{ flexGrow: 1, minHeight: { xs: 8, md: 0 } }} />
            
            {/* Controls section */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: { xs: 1, sm: 1.5 },
              ml: { xs: 0, md: 'auto' },
              width: { xs: '100%', md: 'auto' },
              justifyContent: { xs: 'space-between', md: 'flex-start' },
              pr: { md: 5 }  // Add right padding to avoid overlap with dark mode toggle
            }}>
              {/* Filter controls - updated for better mobile experience */}
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center',
                flexGrow: { xs: 1, md: 0 },
                justifyContent: { xs: 'center', md: 'flex-start' }
              }}>
                <Tooltip title={
                  <>
                    {showFilters ? "Hide filters" : "Show filters"}
                    <Box sx={{ mt: 0.5, opacity: 0.7, fontSize: '0.7rem', display: 'flex', alignItems: 'center' }}>
                      Press <Box component="span" sx={{ mx: 0.5, px: 0.4, border: '1px solid', borderColor: 'rgba(255,255,255,0.3)', borderRadius: 0.5 }}>F</Box> to toggle
                    </Box>
                  </>
                }>
                  <Box 
                    onClick={() => setShowFilters(!showFilters)}
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      bgcolor: theme => (Object.values(filters).some(val => val > 0) || searchTerm)
                        ? alpha(theme.palette.primary.main, 0.08)
                        : alpha(theme.palette.primary.main, 0.04),
                      borderRadius: 2,
                      py: { xs: 0.5, sm: 0.7 },
                      px: { xs: 1, sm: 1.5 },
                      transition: 'all 0.2s ease-in-out',
                      cursor: 'pointer',
                      border: theme => (Object.values(filters).some(val => val > 0) || searchTerm) && !showFilters
                        ? `1px solid ${alpha(theme.palette.primary.main, 0.3)}`
                        : `1px solid transparent`,
                      '&:hover': {
                        bgcolor: theme => alpha(theme.palette.primary.main, 0.12),
                      },
                      '&:focus-visible': {
                        outline: '2px solid',
                        outlineColor: 'primary.main',
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-expanded={showFilters}
                    aria-controls="filter-panel"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setShowFilters(!showFilters);
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
                          {`${sortedAndFilteredData.length}/${guestData.length}`}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography 
                        variant="body2" 
                        color="text.secondary" 
                        sx={{ 
                          fontWeight: 500,
                          display: { xs: 'none', sm: 'block' }
                        }}
                      >
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
                label={
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontWeight: 500,
                      display: { xs: 'none', sm: 'block' }
                    }}
                  >
                    Show stopped
                  </Typography>
                }
                sx={{ 
                  m: 0, 
                  '& .MuiFormControlLabel-label': { ml: 0.5 },
                  bgcolor: theme => darkMode 
                    ? alpha(theme.palette.background.default, 0.6)
                    : alpha(theme.palette.grey[100], 0.7),
                  borderRadius: 2,
                  px: { xs: 0.5, sm: 1 },
                  py: 0.2,
                  border: '1px solid',
                  borderColor: darkMode ? 'divider' : 'grey.200',
                  minWidth: { xs: 42, sm: 'auto' }
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
          <Collapse in={showFilters} timeout="auto" sx={{
            '& .MuiCollapse-wrapperInner': {
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }
          }}>
                    <Box 
                      sx={{ 
                mb: 2, 
                p: 2, 
                backgroundColor: theme => darkMode 
                  ? alpha(theme.palette.primary.dark, 0.15)
                  : alpha(theme.palette.primary.light, 0.05),
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider'
              }}
              role="region"
              aria-label="Filter controls"
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
                    <Typography 
                      variant="body2" 
                      sx={{ fontWeight: 500 }}
                      id="cpu-filter-label"
                    >
                      CPU Usage
                    </Typography>
                  </Box>
                  <Tooltip title={`CPU usage ≥ ${formatPercentage(filters.cpu)}`} arrow placement="top">
                            <Slider
                              value={filters.cpu}
                      onChange={(_, newValue) => updateFilter('cpu', newValue)}
                              onMouseDown={() => handleSliderDragStart('cpu')}
                      onMouseUp={handleSliderDragEnd}
                      aria-labelledby="cpu-filter-label"
                      aria-valuetext={`${formatPercentage(filters.cpu)}`}
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
                            <Typography 
                              variant="body2" 
                      sx={{ fontWeight: 500 }}
                      id="memory-filter-label"
                    >
                      Memory Usage
                            </Typography>
                          </Box>
                  <Tooltip title={`Memory usage ≥ ${formatPercentage(filters.memory)}`} arrow placement="top">
                            <Slider
                              value={filters.memory}
                      onChange={(_, newValue) => updateFilter('memory', newValue)}
                              onMouseDown={() => handleSliderDragStart('memory')}
                      onMouseUp={handleSliderDragEnd}
                      aria-labelledby="memory-filter-label"
                      aria-valuetext={`${formatPercentage(filters.memory)}`}
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
                            <Typography 
                              variant="body2" 
                      sx={{ fontWeight: 500 }}
                      id="disk-filter-label"
                    >
                      Disk Usage
                            </Typography>
                          </Box>
                  <Tooltip title={`Disk usage ≥ ${formatPercentage(filters.disk)}`} arrow placement="top">
                    <Slider
                              value={filters.disk} 
                      onChange={(_, newValue) => updateFilter('disk', newValue)}
                      onMouseDown={() => handleSliderDragStart('disk')}
                      onMouseUp={handleSliderDragEnd}
                      aria-labelledby="disk-filter-label"
                      aria-valuetext={`${formatPercentage(filters.disk)}`}
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
                    <Typography 
                      variant="body2" 
                      sx={{ fontWeight: 500 }}
                      id="download-filter-label"
                    >
                      Download Rate
                    </Typography>
                  </Box>
                  <Tooltip title={`Download ≥ ${formatNetworkRateForFilter(sliderValueToNetworkRate(filters.download))}`} arrow placement="top">
                            <Slider
                      value={filters.download}
                      onChange={(_, newValue) => updateFilter('download', newValue)}
                      onMouseDown={() => handleSliderDragStart('download')}
                      onMouseUp={handleSliderDragEnd}
                      aria-labelledby="download-filter-label"
                      aria-valuetext={`${formatNetworkRateForFilter(sliderValueToNetworkRate(filters.download))}`}
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
                            <Typography 
                              variant="body2" 
                      sx={{ fontWeight: 500 }}
                      id="upload-filter-label"
                    >
                      Upload Rate
                            </Typography>
                          </Box>
                  <Tooltip title={`Upload ≥ ${formatNetworkRateForFilter(sliderValueToNetworkRate(filters.upload))}`} arrow placement="top">
                    <Slider
                      value={filters.upload}
                      onChange={(_, newValue) => updateFilter('upload', newValue)}
                      onMouseDown={() => handleSliderDragStart('upload')}
                      onMouseUp={handleSliderDragEnd}
                      aria-labelledby="upload-filter-label"
                      aria-valuetext={`${formatNetworkRateForFilter(sliderValueToNetworkRate(filters.upload))}`}
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
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                <Typography 
                  variant="caption" 
                  color={Object.values(filters).some(val => val > 0) || selectedNode !== 'all' ? 'primary.main' : 'text.secondary'} 
                  sx={{ fontWeight: 500 }}
                  aria-live="polite" // Announce when this changes
                >
                  {Object.values(filters).some(val => val > 0) || selectedNode !== 'all' ? 
                    `Showing ${sortedAndFilteredData.length} of ${getNodeFilteredGuests(guestData).length} systems${selectedNode !== 'all' ? ` on ${selectedNode === 'node1' ? 'Production' : selectedNode === 'node2' ? 'Development' : 'Testing'}` : ''}` : 
                    ''}
                </Typography>
                <Chip 
                  label="Reset All Filters" 
                  onClick={resetFilters}
                  variant={Object.values(filters).some(val => val > 0) ? "filled" : "outlined"}
                  size="small"
                  color="primary"
                  sx={{ 
                    height: 28,
                    transition: 'all 0.2s ease',
                    fontWeight: Object.values(filters).some(val => val > 0) ? 600 : 400,
                    '&:focus-visible': {
                      outline: '2px solid',
                      outlineColor: 'primary.main',
                      outlineOffset: 2,
                    }
                  }}
                  aria-pressed={Object.values(filters).some(val => val > 0)}
                />
              </Box>
            </Box>
          </Collapse>
          
          <TableContainer 
            component={Paper} 
                              sx={{ 
              boxShadow: 'none', 
                                  borderRadius: 2,
              overflow: 'auto',
              position: 'relative',
              border: '1px solid',
              borderColor: darkMode ? 'divider' : 'grey.200',
              bgcolor: darkMode ? 'background.paper' : undefined,
              maxWidth: '100%',
              '&::-webkit-scrollbar': {
                height: '8px',
                width: '8px',
              },
              '&::-webkit-scrollbar-track': {
                background: darkMode ? '#1e1e1e' : '#f1f1f1',
                borderRadius: '0 0 8px 8px',
              },
              '&::-webkit-scrollbar-thumb': {
                background: darkMode ? '#3a3a3a' : '#bbb',
                borderRadius: '4px',
              },
              '&::-webkit-scrollbar-thumb:hover': {
                background: darkMode ? '#555' : '#999',
              }
            }}
          >
            <Table 
              sx={{ 
                '& tbody tr': {
                  backgroundColor: theme => darkMode ? 'background.paper' : 'white',
                  transition: 'background-color 0.15s ease-in-out',
                  '&:hover': {
                    backgroundColor: theme => darkMode
                      ? alpha(theme.palette.primary.dark, 0.1)
                      : alpha(theme.palette.primary.light, 0.05)
                  },
                  '&:focus-within': {
                    outline: '2px solid',
                    outlineColor: 'primary.main',
                  }
                },
                '& th': {
                  transition: 'background-color 0.2s ease',
                  whiteSpace: 'nowrap',
                  fontSize: { xs: '0.75rem', sm: '0.875rem' }
                },
                '& td': {
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  padding: { xs: '8px 12px', sm: '12px 16px' },
                  borderColor: theme => darkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(224, 224, 224, 1)',
                },
                tableLayout: { xs: 'auto', md: 'fixed' }
              }}
              aria-label="System metrics table"
            >
              <TableHead>
                <TableRow sx={{ 
                  backgroundColor: theme => darkMode
                    ? alpha(theme.palette.background.default, 0.6)
                    : alpha(theme.palette.primary.light, 0.05),
                  '& th': { 
                    py: showFilters ? 1 : 1.5,
                    pb: showFilters ? 1 : 1.5,
                    borderBottom: theme => `2px solid ${
                      darkMode 
                        ? alpha(theme.palette.divider, 0.8)
                        : alpha(theme.palette.primary.main, 0.1)
                    }`,
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
                      },
                      '&:focus-visible': {
                        outline: '2px solid',
                        outlineColor: 'primary.main',
                        outlineOffset: -2,
                      }
                    }}
                    role="columnheader"
                    aria-sort={sortConfig.key === 'name' ? sortConfig.direction : undefined}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        requestSort('name');
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <PersonIcon fontSize="small" sx={{ mr: 0.5, opacity: 0.6, fontSize: '0.9rem' }} />
                      Guest Name
                      {sortConfig.key === 'name' && (
                        <Box sx={{ 
                          ml: 0.5,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          bgcolor: theme => alpha(theme.palette.primary.main, 0.1),
                          color: 'primary.main',
                          fontSize: '0.8rem',
                          fontWeight: 'bold'
                        }}
                        aria-hidden="true"
                        >
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
                      borderBottom: theme => filters.cpu > 0 ? 
                        `2px solid ${theme.palette.primary.main}` : undefined,
                      color: theme => filters.cpu > 0 ? 'primary.main' : 'inherit',
                      '&:hover': {
                        backgroundColor: theme => alpha(theme.palette.primary.main, 0.08)
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <SpeedIcon fontSize="small" sx={{ mr: 0.5, opacity: 0.6, fontSize: '0.9rem' }} />
                      CPU
                      {sortConfig.key === 'cpu' && (
                        <Box sx={{ 
                          ml: 0.5,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          bgcolor: theme => alpha(theme.palette.primary.main, 0.1),
                          color: 'primary.main',
                          fontSize: '0.8rem',
                          fontWeight: 'bold'
                        }}
                        aria-hidden="true"
                        >
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
                      borderBottom: theme => filters.memory > 0 ? 
                        `2px solid ${theme.palette.primary.main}` : undefined,
                      color: theme => filters.memory > 0 ? 'primary.main' : 'inherit',
                      '&:hover': {
                        backgroundColor: theme => alpha(theme.palette.primary.main, 0.08)
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <MemoryIcon fontSize="small" sx={{ mr: 0.5, opacity: 0.6, fontSize: '0.9rem' }} />
                      Memory
                      {sortConfig.key === 'memory' && (
                        <Box sx={{ 
                          ml: 0.5,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          bgcolor: theme => alpha(theme.palette.primary.main, 0.1),
                          color: 'primary.main',
                          fontSize: '0.8rem',
                          fontWeight: 'bold'
                        }}
                        aria-hidden="true"
                        >
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
                      borderBottom: theme => filters.disk > 0 ? 
                        `2px solid ${theme.palette.primary.main}` : undefined,
                      color: theme => filters.disk > 0 ? 'primary.main' : 'inherit',
                      '&:hover': {
                        backgroundColor: theme => alpha(theme.palette.primary.main, 0.08)
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <StorageIcon fontSize="small" sx={{ mr: 0.5, opacity: 0.6, fontSize: '0.9rem' }} />
                      Disk
                      {sortConfig.key === 'disk' && (
                        <Box sx={{ 
                          ml: 0.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          bgcolor: theme => alpha(theme.palette.primary.main, 0.1),
                          color: 'primary.main',
                          fontSize: '0.8rem',
                          fontWeight: 'bold'
                        }}
                        aria-hidden="true"
                        >
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
                      borderBottom: theme => filters.download > 0 ? 
                        `2px solid ${theme.palette.primary.main}` : undefined,
                      color: theme => filters.download > 0 ? 'primary.main' : 'inherit',
                      '&:hover': {
                        backgroundColor: theme => alpha(theme.palette.primary.main, 0.08)
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <ArrowDownwardIcon fontSize="small" sx={{ mr: 0.5, opacity: 0.6, fontSize: '0.9rem' }} />
                      Download
                      {sortConfig.key === 'download' && (
                        <Box sx={{ 
                          ml: 0.5,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                                    width: 18,
                          height: 18,
                          borderRadius: '50%',
                          bgcolor: theme => alpha(theme.palette.primary.main, 0.1),
                          color: 'primary.main',
                          fontSize: '0.8rem',
                          fontWeight: 'bold'
                        }}
                        aria-hidden="true"
                        >
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
                      borderBottom: theme => filters.upload > 0 ? 
                        `2px solid ${theme.palette.secondary.main}` : undefined,
                      color: theme => filters.upload > 0 ? 'secondary.main' : 'inherit',
                      '&:hover': {
                        backgroundColor: theme => alpha(theme.palette.primary.main, 0.08)
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <ArrowUpwardIcon fontSize="small" sx={{ mr: 0.5, opacity: 0.6, fontSize: '0.9rem' }} />
                      Upload
                      {sortConfig.key === 'upload' && (
                        <Box sx={{ 
                          ml: 0.5,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          bgcolor: theme => alpha(theme.palette.secondary.main, 0.1),
                          color: 'secondary.main',
                          fontSize: '0.8rem',
                          fontWeight: 'bold'
                        }}
                        aria-hidden="true"
                        >
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                          </Box>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {guestData.length > 0 ? (
                  sortedAndFilteredData
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
                        // Highlight rows that match active filters with subtle indicators
                        ...(filters.cpu > 0 && cpuUsage > filters.cpu && {
                          '& td:nth-of-type(2)': { 
                            borderLeft: '2px solid',
                            borderLeftColor: theme => alpha(theme.palette.primary.main, 0.4),
                            pl: 1.5 // Add some padding to account for the border
                          }
                        }),
                        ...(filters.memory > 0 && memoryUsage > filters.memory && {
                          '& td:nth-of-type(3)': { 
                            borderLeft: '2px solid',
                            borderLeftColor: theme => alpha(theme.palette.primary.main, 0.4),
                            pl: 1.5
                          }
                        }),
                        ...(filters.disk > 0 && diskUsage > filters.disk && {
                          '& td:nth-of-type(4)': { 
                            borderLeft: '2px solid',
                            borderLeftColor: theme => alpha(theme.palette.primary.main, 0.4),
                            pl: 1.5
                          }
                        }),
                        ...(filters.download > 0 && networkMetrics?.inRate >= sliderValueToNetworkRate(filters.download) && {
                          '& td:nth-of-type(5)': { 
                            borderLeft: '2px solid',
                            borderLeftColor: theme => alpha(theme.palette.primary.main, 0.4),
                            pl: 1.5
                          }
                        }),
                        ...(filters.upload > 0 && networkMetrics?.outRate >= sliderValueToNetworkRate(filters.upload) && {
                          '& td:nth-of-type(6)': { 
                            borderLeft: '2px solid',
                            borderLeftColor: theme => alpha(theme.palette.secondary.main, 0.4),
                            pl: 1.5
                          }
                        })
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
                {guestData.length > 0 && sortedAndFilteredData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2 }}>
                        <FilterAltIcon sx={{ fontSize: 40, color: 'primary.light', mb: 2, opacity: 0.7 }} />
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                          No Matching Systems
                        </Typography>
                        <Typography variant="body2" color="text.disabled" sx={{ mb: 2 }}>
                          Try adjusting your filters or search terms
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Chip 
                          label="Reset Filters" 
                          color="primary" 
                          onClick={resetFilters}
                          sx={{ mt: 1 }}
                        />
                          <Chip 
                            label="Show Stopped Systems" 
                            color="default" 
                            variant="outlined"
                            onClick={() => setShowStopped(true)}
                            sx={{ mt: 1, display: !showStopped ? 'flex' : 'none' }}
                          />
                        </Box>
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