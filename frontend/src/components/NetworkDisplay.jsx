import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
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
  useTheme,
  Button,
  Stack,
  ClickAwayListener,
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
import ComputerIcon from '@mui/icons-material/Computer';
import InputBase from '@mui/material/InputBase';
import DnsIcon from '@mui/icons-material/Dns';
import RefreshIcon from '@mui/icons-material/Refresh';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import CircleIcon from '@mui/icons-material/Circle';
import AllInclusiveIcon from '@mui/icons-material/AllInclusive';
import ClearIcon from '@mui/icons-material/Clear';
import InputAdornment from '@mui/material/InputAdornment';
import Popover from '@mui/material/Popover';
import Badge from '@mui/material/Badge';
import TextField from '@mui/material/TextField';
import FilterListIcon from '@mui/icons-material/FilterList';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import DevicesOutlinedIcon from '@mui/icons-material/DevicesOutlined';
import ComputerOutlinedIcon from '@mui/icons-material/ComputerOutlined';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';
import DevicesIcon from '@mui/icons-material/Devices';

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
  if (bytes === undefined || bytes === null || isNaN(bytes) || bytes === 0) return '0 B';
  
  const k = 1024;
  const dm = 0; // No decimals
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  // Ensure bytes is a positive number
  bytes = Math.abs(bytes);
  
  // Calculate the appropriate size index
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  
  // Ensure i is within bounds of the sizes array
  if (i < 0 || i >= sizes.length) {
    console.error(`Invalid size index: ${i} for bytes: ${bytes}`);
    return `${bytes} B`; // Fallback to bytes with B unit
  }
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Helper function specifically for network rates
const formatNetworkRate = (bytesPerSecond) => {
  if (bytesPerSecond === undefined || bytesPerSecond === null || isNaN(bytesPerSecond) || bytesPerSecond === 0) return '0 B/s';
  
  try {
    // No minimum threshold - show actual values
    return formatBytes(bytesPerSecond) + '/s';
  } catch (error) {
    console.error('Error formatting network rate:', error, 'Value:', bytesPerSecond);
    return '0 B/s'; // Fallback to zero if there's an error
  }
};

// Helper function to format percentage
const formatPercentage = (value) => {
  if (value === undefined || value === null || isNaN(value)) return '0%';
  return `${Math.round(value)}%`;
};

// Helper function to format uptime duration
const formatUptime = (seconds) => {
  if (seconds === undefined || seconds === null || isNaN(seconds) || seconds === 0) return '-';
  
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
};

// Helper function to format network rates for filter display
const formatNetworkRateForFilter = (bytesPerSecond) => {
  if (bytesPerSecond === undefined || bytesPerSecond === null || isNaN(bytesPerSecond) || bytesPerSecond === 0) return '0 B/s';
  
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
const ProgressWithLabel = React.memo(({ value, color = "primary", disabled = false, tooltipText }) => {
  const normalizedValue = Math.min(Math.max(0, value), 100);
  
  const progressBar = (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      width: '100%',
      opacity: disabled ? 0.5 : 1,
    }}>
      <Box sx={{ minWidth: 35, mr: 1 }}>
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
      <Box sx={{ width: '100%' }}>
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
});

// Status indicator circle
const StatusIndicator = React.memo(({ status }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
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
        width: 8,
        height: 8,
        borderRadius: '50%',
        bgcolor: color,
        boxShadow: isDarkMode 
          ? `0 0 0 1px ${alpha(color, 0.5)}` 
          : '0 0 0 1px rgba(255, 255, 255, 0.8)',
        ...(status.toLowerCase() === 'running' && {
          animation: `${pulseAnimation} 2s infinite`
        })
      }}
    />
  );
});

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

// Add a new ConnectionErrorDisplay component
const ConnectionErrorDisplay = ({ connectionStatus, error, onReconnect }) => {
  const { isDarkMode } = useThemeContext();
  const theme = useTheme();
  let title, message, icon, severity;
  
  switch (connectionStatus) {
    case 'error':
      title = 'Connection Error';
      message = error || 'Unable to connect to the server. The server may be offline or unreachable.';
      icon = <CancelIcon sx={{ mr: 1 }} />;
      severity = 'error';
      break;
    case 'disconnected':
      title = 'Server Disconnected';
      message = 'The connection to the server has been lost. This may happen if the server was stopped or restarted.';
      icon = <CancelIcon sx={{ mr: 1 }} />;
      severity = 'warning';
      break;
    default:
      title = 'Connection Issue';
      message = 'There is an issue with the connection to the server.';
      icon = <CancelIcon sx={{ mr: 1 }} />;
      severity = 'error';
  }
  
  // Use theme directly to ensure proper dark mode detection
  const mode = theme.palette.mode;
  const isDark = mode === 'dark';
  
  // Define colors based on theme mode and severity
  const bgColor = isDark 
    ? (severity === 'error' ? 'rgba(244, 67, 54, 0.15)' : 'rgba(255, 193, 7, 0.15)') 
    : (severity === 'error' ? '#FFF4F4' : '#FFF8E1');
  
  const borderColor = isDark
    ? (severity === 'error' ? 'rgba(244, 67, 54, 0.3)' : 'rgba(255, 193, 7, 0.3)')
    : (severity === 'error' ? '#ffcdd2' : '#ffe082');
  
  const textColor = isDark ? theme.palette.text.primary : 'rgba(0, 0, 0, 0.87)';
  const secondaryTextColor = isDark ? theme.palette.text.secondary : 'rgba(0, 0, 0, 0.6)';
  
  return (
    <Card 
      sx={{ 
        mb: 2, 
        bgcolor: bgColor,
        borderRadius: 2,
        overflow: 'hidden',
        border: `1px solid ${borderColor}`,
        animation: `${fadeIn} 0.3s ease-out`,
        // Force dark mode styles
        ...(isDark && {
          backgroundColor: severity === 'error' ? 'rgba(244, 67, 54, 0.15)' : 'rgba(255, 193, 7, 0.15)',
          borderColor: severity === 'error' ? 'rgba(244, 67, 54, 0.3)' : 'rgba(255, 193, 7, 0.3)',
          color: theme.palette.text.primary
        })
      }}
    >
      <CardContent sx={{ ...(isDark && { color: theme.palette.text.primary }) }}>
        <Typography 
          color={severity} 
          variant="h6" 
          sx={{ display: 'flex', alignItems: 'center', mb: 1 }}
        >
          {icon}
          {title}
        </Typography>
        <Typography sx={{ mb: 2, color: textColor }}>{message}</Typography>
        <Typography variant="body2" sx={{ mb: 2, color: secondaryTextColor }}>
          Please check that:
          <ul>
            <li>The server application is running</li>
            <li>Your network connection is working</li>
            <li>Any firewalls or security software are not blocking the connection</li>
          </ul>
        </Typography>
        {onReconnect && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <IconButton 
              onClick={onReconnect} 
              color="primary" 
              sx={{ 
                border: '1px solid', 
                borderColor: 'primary.main',
                borderRadius: 1,
                px: 2,
                py: 0.5,
                fontSize: '0.875rem',
                '& .MuiSvgIcon-root': { mr: 1 },
                ...(isDark && {
                  color: theme.palette.primary.main,
                  borderColor: theme.palette.primary.main
                })
              }}
            >
              <RefreshIcon fontSize="small" />
              Try Reconnecting
            </IconButton>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

const NetworkDisplay = ({ selectedNode = 'all' }) => {
  const { 
    isConnected, 
    guestData, 
    metricsData, 
    error,
    connectionStatus,
    reconnect,
    nodeData
  } = useSocket();
  
  const theme = useTheme();
  const { darkMode } = useThemeContext();
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = React.useRef(null);
  
  // Filter popover state - for displaying the filter panel
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const openFiltersPopover = Boolean(filterAnchorEl);
  
  // Helper function to extract numeric ID from strings like "node-1-ct-105"
  const extractNumericId = (fullId) => {
    if (!fullId) return '';
    
    // Try to extract the last numeric part from the ID
    const match = fullId.match(/(\d+)$/);
    if (match && match[1]) {
      return match[1];
    }
    
    // Fallback to the original ID if no numeric part is found
    return fullId;
  };
  
  // Sort state
  const [sortConfig, setSortConfig] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SORT);
      return saved ? JSON.parse(saved) : { key: 'id', direction: 'asc' };
    } catch (e) {
      console.error('Error loading sort preferences:', e);
      return { key: 'id', direction: 'asc' };
    }
  });
  
  // Filter states
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
  
  // Search terms array for active search filters
  const [activeSearchTerms, setActiveSearchTerms] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SEARCH_TERMS);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Error loading active search terms:', e);
      return [];
    }
  });
  
  // UI state
  const [showStopped, setShowStopped] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SHOW_STOPPED);
      return saved ? JSON.parse(saved) === true : false; // Default: false (show only running systems)
    } catch (e) {
      console.error('Error loading show stopped preference:', e);
      return false; // Default to showing only running systems
    }
  });
  
  const [showFilters, setShowFilters] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SHOW_FILTERS);
      return saved ? JSON.parse(saved) === true : false;
    } catch (e) {
      console.error('Error loading show filters preference:', e);
      return false;
    }
  });
  
  const [escRecentlyPressed, setEscRecentlyPressed] = useState(false);
  const [sliderDragging, setSliderDragging] = useState(null);
  
  // Add a ref for the filter button
  const filterButtonRef = useRef(null);
  
  // Filter popover handlers
  const handleFilterButtonClick = (event) => {
    // Instead of opening a popover, toggle the filter section
    setShowFilters(!showFilters);
  };
  
  const handleCloseFilterPopover = () => {
    // This function is no longer needed for closing a popover
    // but we'll keep it for compatibility with existing code
    setFilterAnchorEl(null);
  };
  
  // Handler for clicking outside the filter box
  const handleClickAway = (event) => {
    // Don't close if clicking on the filter button, if dragging a slider,
    // or if clicking on a select menu or dropdown
    if (
      !showFilters || 
      sliderDragging || 
      filterButtonRef.current?.contains(event.target) || 
      event.target.closest('[data-filter-button="true"]') ||
      // Check for MUI Select elements and their menus
      event.target.closest('.MuiSelect-root') ||
      event.target.closest('.MuiMenu-root') ||
      event.target.closest('.MuiPopover-root') ||
      // Prevent closing when interacting with sliders
      event.target.closest('.MuiSlider-root')
    ) {
      return;
    }
    
    // Add a small delay to prevent race conditions with other click handlers
    setTimeout(() => {
      setShowFilters(false);
    }, 50);
  };
  
  // Count active filters
  const activeFilterCount = useMemo(() => {
    return activeSearchTerms.length + 
      (searchTerm && !activeSearchTerms.includes(searchTerm) ? 1 : 0) + 
      Object.values(filters).filter(val => val > 0).length;
  }, [activeSearchTerms, searchTerm, filters]);
  
  // Add guest type filter state - load from localStorage or use default
  const [guestTypeFilter, setGuestTypeFilter] = useState(() => {
    try {
      const saved = localStorage.getItem('guestTypeFilter');
      return saved ? JSON.parse(saved) : 'all'; // Default: 'all' (show both VMs and LXCs)
    } catch (e) {
      console.error('Error loading guest type filter preference:', e);
      return 'all'; // Default to showing all guest types
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
  
  // Save guest type filter preference whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('guestTypeFilter', JSON.stringify(guestTypeFilter));
    } catch (e) {
      console.error('Error saving guest type filter preference:', e);
    }
  }, [guestTypeFilter]);
  
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
  
  // Function to handle the Escape key for filter popover
  const handleKeyDown = useCallback((e) => {
    // Close filter popover on Escape
    if (e.key === 'Escape' && openFiltersPopover) {
      handleCloseFilterPopover();
      e.preventDefault(); // Prevent other escape handlers
      return;
    }
    
    // Reset all filters with Alt+R
    if (e.key === 'r' && e.altKey) {
      resetFilters();
      if (openFiltersPopover) {
        handleCloseFilterPopover();
      }
      e.preventDefault();
      return;
    }
    
    // Existing keyboard functionality...
    if (e.key === 'Escape') {
      // If filter popover is open, close it
      if (openFiltersPopover) {
        handleCloseFilterPopover();
        return;
      }
      
      // Always collapse the filter dropdown
      if (showFilters) {
        setShowFilters(false);
      }
      
      // If there are active filters, clear them
      if (activeFilterCount > 0) {
        resetFilters();
        return;
      }
      
      // Focus search box on Escape if not in input already
      if (document.activeElement !== searchInputRef.current) {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else {
        // Clear search if already focused
        setSearchTerm('');
        searchInputRef.current?.blur();
      }
    }
  }, [openFiltersPopover, handleCloseFilterPopover, searchInputRef, setSearchTerm, activeFilterCount, resetFilters, showFilters, setShowFilters]);

  // Add key event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
  
  // Add key event listener for auto-focusing search on typing
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Skip if we're in an input, textarea, or contentEditable element
      if (
        document.activeElement.tagName === 'INPUT' ||
        document.activeElement.tagName === 'TEXTAREA' ||
        document.activeElement.isContentEditable
      ) {
        return;
      }
      
      // Skip for modifier keys, navigation keys, and function keys
      if (
        e.ctrlKey || e.altKey || e.metaKey || // Modifier keys
        e.key === 'Tab' || e.key === 'Escape' || // Navigation keys
        e.key.startsWith('Arrow') || e.key.startsWith('Page') || 
        e.key === 'Home' || e.key === 'End' ||
        (e.key.startsWith('F') && e.key.length > 1) // Function keys (F1-F12)
      ) {
        return;
      }
      
      // Focus search input for alphanumeric keys and space
      if (
        (e.key.length === 1 && /[a-zA-Z0-9\s]/.test(e.key)) ||
        e.key === ' '
      ) {
        // Prevent default to avoid typing the key before focus
        e.preventDefault();
        
        // Focus the search input
        searchInputRef.current?.focus();
        
        // If it's not a space, set the search term to the pressed key
        if (e.key !== ' ') {
          setSearchTerm(e.key);
        }
      }
    };
    
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [searchInputRef, setSearchTerm]);
  
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
    setSliderDragging(filterName);
  };

  // Function to handle slider drag end
  const handleSliderDragEnd = () => {
    setSliderDragging(null);
    
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
    const direction = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ key, direction });
  };
  
  // Use real metrics instead of demo metrics
  const displayMetrics = metricsData;
  
  // Helper function to get metrics for a guest
  const getMetricsForGuest = (guestId) => {
    // Try to find the metric with matching guestId
    const metric = displayMetrics.find(metric => metric.guestId === guestId);
    return metric || null;
  };
  
  // Update the getSortedAndFilteredData function to fix the variable redeclaration
  const getSortedAndFilteredData = (data) => {
    if (!data || data.length === 0) return [];
    
    // Filter by node if a specific node is selected
    let filteredData = selectedNode !== 'all' 
      ? getNodeFilteredGuests(data, selectedNode)
      : [...data];
    
    // Filter by status if showStopped is false
    if (!showStopped) {
      filteredData = filteredData.filter(guest => guest.status === 'running');
    }
    
    // Filter by guest type if a specific type is selected
    if (guestTypeFilter !== 'all') {
      filteredData = filteredData.filter(guest => 
        guestTypeFilter === 'vm' ? guest.type === 'qemu' : guest.type === 'lxc'
      );
    }
    
    // Then filter the data based on search terms and filters
    filteredData = filteredData.filter(guest => {
      const guestName = guest.name.toLowerCase();
      const guestId = guest.id.toLowerCase();
      
      // If there's a current search term being typed, filter by name or ID
      if (searchTerm) {
        if (!guestName.includes(searchTerm.toLowerCase()) && !guestId.includes(searchTerm.toLowerCase())) {
          return false;
        }
      }
      // Otherwise, if there are active search terms, check if any match name or ID (OR logic)
      else if (activeSearchTerms.length > 0) {
        const matchesActiveTerms = activeSearchTerms.some(term => 
          guestName.includes(term.toLowerCase()) || guestId.includes(term.toLowerCase())
        );
        
        if (!matchesActiveTerms) {
          return false;
        }
      }
      
      // Apply resource filters
      if (filters.cpu > 0) {
        const cpuUsage = getMetricsForGuest(guest.id)?.metrics?.cpu || 0;
        if (cpuUsage < filters.cpu) return false;
      }
      
      if (filters.memory > 0) {
        const memoryData = getMetricsForGuest(guest.id)?.metrics?.memory || {};
        const memoryUsage = memoryData.percentUsed || 
          (memoryData.total && memoryData.used ? 
            (memoryData.used / memoryData.total) * 100 : 0);
        
        if (memoryUsage < filters.memory) return false;
      }
      
      if (filters.disk > 0) {
        const diskData = getMetricsForGuest(guest.id)?.metrics?.disk || {};
        const diskUsage = diskData.percentUsed || 
          (diskData.total && diskData.used ? 
            (diskData.used / diskData.total) * 100 : 0);
        
        if (diskUsage < filters.disk) return false;
      }
      
      if (filters.download > 0) {
        const networkData = getMetricsForGuest(guest.id)?.metrics?.network || {};
        const downloadRate = networkData.rx_rate || 0;
        
        if (downloadRate < sliderValueToNetworkRate(filters.download)) return false;
      }
      
      if (filters.upload > 0) {
        const networkData = getMetricsForGuest(guest.id)?.metrics?.network || {};
        const uploadRate = networkData.tx_rate || 0;
        
        if (uploadRate < sliderValueToNetworkRate(filters.upload)) return false;
      }
      
      return true;
    });
    
    // Sort the filtered data
    return [...filteredData].sort((a, b) => {
      // Get the values to compare based on the sort key
      let aValue, bValue;
      
      switch (sortConfig.key) {
        case 'id':
          // Extract numeric ID for sorting
          aValue = extractNumericId(a.id);
          bValue = extractNumericId(b.id);
          
          // If both are numeric, compare as numbers
          if (!isNaN(aValue) && !isNaN(bValue)) {
            aValue = Number(aValue);
            bValue = Number(bValue);
          } else {
            // Otherwise compare as strings
            aValue = String(a.id).toLowerCase();
            bValue = String(b.id).toLowerCase();
          }
          break;
          
        case 'type':
          // Sort by type (qemu first, then lxc)
          aValue = a.type === 'qemu' ? 0 : 1;
          bValue = b.type === 'qemu' ? 0 : 1;
          break;
          
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
          
        case 'status':
          // Sort by status with running first, then by uptime
          if (a.status === b.status) {
            // If both have the same status, sort by uptime (for running VMs)
            if (a.status === 'running') {
              aValue = getMetricsForGuest(a.id)?.metrics?.uptime || 0;
              bValue = getMetricsForGuest(b.id)?.metrics?.uptime || 0;
            } else {
              // For non-running VMs, sort by name
              aValue = a.name.toLowerCase();
              bValue = b.name.toLowerCase();
            }
          } else {
            // Running VMs come first
            return a.status === 'running' ? -1 : 1;
          }
          break;
          
        case 'cpu':
          aValue = getMetricsForGuest(a.id)?.metrics?.cpu || 0;
          bValue = getMetricsForGuest(b.id)?.metrics?.cpu || 0;
          break;
          
        case 'memory':
          const aMemData = getMetricsForGuest(a.id)?.metrics?.memory || {};
          const bMemData = getMetricsForGuest(b.id)?.metrics?.memory || {};
          
          aValue = aMemData.percentUsed || 
            (aMemData.total && aMemData.used ? 
              (aMemData.used / aMemData.total) * 100 : 0);
          bValue = bMemData.percentUsed || 
            (bMemData.total && bMemData.used ? 
              (bMemData.used / bMemData.total) * 100 : 0);
          break;
          
        case 'disk':
          const aDiskData = getMetricsForGuest(a.id)?.metrics?.disk || {};
          const bDiskData = getMetricsForGuest(b.id)?.metrics?.disk || {};
          
          aValue = aDiskData.percentUsed || 
            (aDiskData.total && aDiskData.used ? 
              (aDiskData.used / aDiskData.total) * 100 : 0);
          bValue = bDiskData.percentUsed || 
            (bDiskData.total && bDiskData.used ? 
              (bDiskData.used / bDiskData.total) * 100 : 0);
          break;
          
        case 'download':
          const aNetworkData = getMetricsForGuest(a.id)?.metrics?.network || {};
          const bNetworkData = getMetricsForGuest(b.id)?.metrics?.network || {};
          
          aValue = aNetworkData.rx_rate || 0;
          bValue = bNetworkData.rx_rate || 0;
          break;
          
        case 'upload':
          const aNetData = getMetricsForGuest(a.id)?.metrics?.network || {};
          const bNetData = getMetricsForGuest(b.id)?.metrics?.network || {};
          
          aValue = aNetData.tx_rate || 0;
          bValue = bNetData.tx_rate || 0;
          break;
          
        default:
          return 0;
      }
      
      // Determine the sort direction
      const direction = sortConfig.direction === 'asc' ? 1 : -1;
      
      // Compare the values
      if (aValue < bValue) {
        return -1 * direction;
      }
      if (aValue > bValue) {
        return 1 * direction;
      }
      return 0;
    });
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
  
  // Get the sorted and filtered data
  const sortedAndFilteredData = useMemo(() => {
    return getSortedAndFilteredData(getNodeFilteredGuests(guestData));
  }, [getSortedAndFilteredData, getNodeFilteredGuests, guestData, sortConfig, filters, showStopped, searchTerm, activeSearchTerms, selectedNode, guestTypeFilter]);
  
  // Count VMs and containers separately - always showing what would be displayed if that type was selected
  const guestTypeCounts = useMemo(() => {
    if (!guestData || guestData.length === 0) {
      return {
        vms: 0,
        containers: 0,
        totalVms: 0,
        totalContainers: 0
      };
    }
    
    // Get all guests for the selected node
    const nodeFilteredGuests = getNodeFilteredGuests(guestData);
    
    // Count total VMs and containers (regardless of filters)
    const totalCounts = nodeFilteredGuests.reduce((counts, guest) => {
      if (guest.type === 'qemu') {
        counts.totalVms += 1;
      } else if (guest.type === 'lxc') {
        counts.totalContainers += 1;
      }
      return counts;
    }, { totalVms: 0, totalContainers: 0 });
    
    // Calculate what would be shown for each type if it was selected
    // This ensures the numbers don't change when clicking the filters
    const baseFiltered = nodeFilteredGuests.filter(guest => {
      // Apply all filters except the guest type filter
      if (!showStopped && guest.status !== 'running') return false;
      
      // Apply search filters
      const guestName = guest.name.toLowerCase();
      const guestId = guest.id.toLowerCase();
      
      if (searchTerm) {
        if (!guestName.includes(searchTerm.toLowerCase()) && !guestId.includes(searchTerm.toLowerCase())) {
          return false;
        }
      } else if (activeSearchTerms.length > 0) {
        const matchesActiveTerms = activeSearchTerms.some(term => 
          guestName.includes(term.toLowerCase()) || guestId.includes(term.toLowerCase())
        );
        
        if (!matchesActiveTerms) {
          return false;
        }
      }
      
      // Apply resource filters
      if (filters.cpu > 0) {
        const cpuUsage = getMetricsForGuest(guest.id)?.metrics?.cpu || 0;
        if (cpuUsage < filters.cpu) return false;
      }
      
      if (filters.memory > 0) {
        const memoryData = getMetricsForGuest(guest.id)?.metrics?.memory || {};
        const memoryUsage = memoryData.percentUsed || 
          (memoryData.total && memoryData.used ? 
            (memoryData.used / memoryData.total) * 100 : 0);
        
        if (memoryUsage < filters.memory) return false;
      }
      
      if (filters.disk > 0) {
        const diskData = getMetricsForGuest(guest.id)?.metrics?.disk || {};
        const diskUsage = diskData.percentUsed || 
          (diskData.total && diskData.used ? 
            (diskData.used / diskData.total) * 100 : 0);
        
        if (diskUsage < filters.disk) return false;
      }
      
      if (filters.download > 0) {
        const networkData = getMetricsForGuest(guest.id)?.metrics?.network || {};
        const downloadRate = networkData.rx_rate || 0;
        
        if (downloadRate < sliderValueToNetworkRate(filters.download)) return false;
      }
      
      if (filters.upload > 0) {
        const networkData = getMetricsForGuest(guest.id)?.metrics?.network || {};
        const uploadRate = networkData.tx_rate || 0;
        
        if (uploadRate < sliderValueToNetworkRate(filters.upload)) return false;
      }
      
      return true;
    });
    
    // Count what would be shown for each type
    const vmCount = baseFiltered.filter(guest => guest.type === 'qemu').length;
    const containerCount = baseFiltered.filter(guest => guest.type === 'lxc').length;
    
    return {
      vms: vmCount,
      containers: containerCount,
      totalVms: totalCounts.totalVms,
      totalContainers: totalCounts.totalContainers
    };
  }, [guestData, getNodeFilteredGuests, showStopped, searchTerm, activeSearchTerms, filters, getMetricsForGuest, sliderValueToNetworkRate]);
  
  // Function to generate and download PDF
  const generatePDF = useCallback(() => {
    try {
      console.log('PDF export started');
      
      if (!sortedAndFilteredData || sortedAndFilteredData.length === 0) {
        console.error('No data available to export');
        return;
      }
      
      console.log('Data to export:', sortedAndFilteredData);
      
      // Create a new PDF document with explicit page size
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      console.log('PDF document created');
      
      // Add title with current date
      const title = `Container Status Report - ${new Date().toLocaleString()}`;
      doc.setFontSize(14);
      doc.text(title, 14, 15);
      console.log('Title added');
      
      // Add node information
      const nodeInfo = selectedNode === 'all' ? 'All Nodes' : `Node: ${selectedNode}`;
      doc.setFontSize(10);
      doc.text(nodeInfo, 14, 25);
      console.log('Node info added');
      
      // Define the table columns and rows
      const tableColumn = [
        'Type',
        'ID',
        'Name', 
        'Status', 
        'CPU Usage', 
        'Memory Usage', 
        'Disk Usage', 
        'Download', 
        'Upload',
        'Uptime'
      ];
      
      // Generate the rows from the filtered data - with safer data handling
      const tableRows = [];
      
      for (const guest of sortedAndFilteredData) {
        try {
          console.log('Processing guest:', guest.name);
          const metrics = getMetricsForGuest(guest.id);
          console.log('Guest metrics:', metrics);
          const networkMetrics = metrics?.metrics?.network;
          
          // Get resource metrics with safer defaults
          const cpuUsage = (metrics?.metrics?.cpu !== undefined) ? metrics.metrics.cpu : 0;
          
          const memoryData = metrics?.metrics?.memory || {};
          const memoryUsage = memoryData.percentUsed || 
            (memoryData.total && memoryData.used ? 
              (memoryData.used / memoryData.total) * 100 : 0);
          
          const diskData = metrics?.metrics?.disk || {};
          const diskUsage = diskData.percentUsed || 
            (diskData.total && diskData.used ? 
              (diskData.used / diskData.total) * 100 : 0);
          
          // Format for the PDF table with safer string handling
          tableRows.push([
            String(guest.type || 'Unknown'),
            String(guest.id || 'Unknown'),
            String(guest.name || 'Unknown'),
            String(guest.status || 'Unknown'),
            String(formatPercentage(cpuUsage)),
            String(formatPercentage(memoryUsage)),
            String(formatPercentage(diskUsage)),
            guest.status === 'running' && networkMetrics ? 
              String(formatNetworkRate(networkMetrics.inRate || 0)) : '-',
            guest.status === 'running' && networkMetrics ? 
              String(formatNetworkRate(networkMetrics.outRate || 0)) : '-',
            guest.status === 'running' && metrics?.metrics?.uptime ? 
              String(formatUptime(metrics.metrics.uptime)) : '-'
          ]);
        } catch (rowError) {
          console.error('Error processing row for guest:', guest?.name, rowError);
          // Add a fallback row with error information
          tableRows.push([
            String(guest?.name || 'Unknown'),
            String(guest?.status || 'Unknown'),
            'Error',
            'Error',
            'Error',
            'Error',
            'Error',
            'Error',
            'Error',
            'Error'
          ]);
        }
      }
      
      console.log('Table rows prepared:', tableRows);
      
      // Generate the PDF table with error handling
      try {
        // Use autoTable directly with the doc object
        autoTable(doc, {
          head: [tableColumn],
          body: tableRows,
          startY: 30,
          theme: 'grid',
          styles: {
            fontSize: 8,
            cellPadding: 2,
          },
          headStyles: {
            fillColor: [41, 128, 185],
            textColor: 255,
            fontSize: 9,
            fontStyle: 'bold',
          },
          alternateRowStyles: {
            fillColor: [240, 240, 240]
          },
          margin: { top: 30 }
        });
        
        console.log('Table generated');
      } catch (tableError) {
        console.error('Error generating table:', tableError);
        // Try a simpler table as fallback
        doc.text('Error generating detailed table. Showing simplified data:', 14, 30);
        
        // Use autoTable directly with the doc object for the fallback table
        autoTable(doc, {
          head: [['Name', 'Status']],
          body: sortedAndFilteredData.map(guest => [
            String(guest.name || 'Unknown'),
            String(guest.status || 'Unknown')
          ]),
          startY: 40,
          theme: 'plain'
        });
      }
      
      try {
        // Add a footer with timestamp and page numbers
        const pageCount = doc.internal.getNumberOfPages();
        for(let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.text(
            `Generated on ${new Date().toLocaleString()} - Page ${i} of ${pageCount}`, 
            doc.internal.pageSize.getWidth() / 2, 
            doc.internal.pageSize.getHeight() - 10, 
            { align: 'center' }
          );
        }
        
        console.log('Footer added, saving PDF...');
      } catch (footerError) {
        console.error('Error adding footer:', footerError);
        // Continue without footer if there's an error
      }
      
      // Save the PDF with a simpler filename to avoid any issues
      try {
        const filename = `container-status-${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(filename);
        console.log('PDF saved successfully as:', filename);
      } catch (saveError) {
        console.error('Error saving PDF:', saveError);
        // Try an alternative approach to trigger download
        try {
          const pdfBlob = doc.output('blob');
          const url = URL.createObjectURL(pdfBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'container-status.pdf';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          console.log('PDF saved using alternative method');
        } catch (altSaveError) {
          console.error('Alternative save method failed:', altSaveError);
          alert('Could not save PDF file. Please try again later.');
        }
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      // Show more detailed error information
      if (error.stack) {
        console.error('Error stack:', error.stack);
      }
      if (error.message) {
        alert(`Failed to generate PDF: ${error.message}`);
      } else {
        alert('Failed to generate PDF. Please check the console for details.');
      }
    }
  }, [selectedNode, sortedAndFilteredData, getMetricsForGuest]);
  
  // Replace the existing error and connection checks with our new component
  if (connectionStatus === 'error' || connectionStatus === 'disconnected') {
    return <ConnectionErrorDisplay connectionStatus={connectionStatus} error={error} onReconnect={reconnect} />;
  }
  
  if (!isConnected || connectionStatus === 'connecting') {
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
            
            {/* Search and Filter section - grouped together */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center',
              position: 'relative',
              width: { xs: '100%', md: 'auto' },
              mr: { xs: 0, md: 2 },
              mb: { xs: 1, md: 0 },
              gap: 1
            }}>
              {/* Search box */}
              <Box sx={{
                position: 'relative',
                width: { xs: '100%', md: '240px' },
              }}>
                <InputBase
                  placeholder="Search systems..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  inputRef={searchInputRef}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchTerm.trim()) {
                      addSearchTerm(searchTerm.trim());
                      setSearchTerm('');
                    }
                  }}
                  startAdornment={
                    <InputAdornment position="start">
                      <SearchIcon sx={{ fontSize: '1.1rem', color: 'text.secondary' }} />
                    </InputAdornment>
                  }
                  endAdornment={
                    searchTerm && (
                      <InputAdornment position="end">
                        <IconButton 
                          size="small" 
                          onClick={() => setSearchTerm('')}
                          sx={{ p: 0.5 }}
                        >
                          <ClearIcon sx={{ fontSize: '0.9rem' }} />
                        </IconButton>
                      </InputAdornment>
                    )
                  }
                  sx={{
                    width: '100%',
                    fontSize: '0.875rem',
                    px: 1.5,
                    py: 0.75,
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: theme => alpha(theme.palette.background.paper, darkMode ? 0.4 : 0.7),
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    '&:hover': {
                      borderColor: 'primary.main',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                    },
                    '&.Mui-focused': {
                      borderColor: 'primary.main',
                      boxShadow: theme => `0 0 0 2px ${alpha(theme.palette.primary.main, 0.2)}`,
                    },
                    '& .MuiInputBase-input': {
                      p: 0,
                      '&::placeholder': {
                        color: 'text.secondary',
                        opacity: 0.7,
                      }
                    }
                  }}
                  inputProps={{
                    'aria-label': 'search systems',
                  }}
                />
              </Box>
              
              {/* Guest count bubble indicator - REMOVED FROM HERE */}
              
              {/* Filter button */}
              <Button
                ref={filterButtonRef}
                size="small"
                variant={showFilters || activeFilterCount > 0 ? "contained" : "outlined"}
                color="primary"
                onClick={handleFilterButtonClick}
                data-filter-button="true"
                startIcon={<FilterAltIcon fontSize="small" sx={{ 
                  color: (showFilters || activeFilterCount > 0) ? 'inherit' : 'text.secondary',
                  opacity: (showFilters || activeFilterCount > 0) ? 1 : 0.7
                }} />}
                title="Toggle Filters Panel"
                sx={{ 
                  height: 32, 
                  textTransform: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  borderRadius: '8px',
                  transition: 'all 0.2s ease',
                  boxShadow: (showFilters || activeFilterCount > 0) ? 1 : 0,
                  px: 1.5,
                  background: (showFilters || activeFilterCount > 0) ? 
                    (theme => `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`) : 
                    (theme => alpha(theme.palette.background.paper, darkMode ? 0.4 : 0.7)),
                  border: '1px solid',
                  borderColor: 'divider',
                  color: (showFilters || activeFilterCount > 0) ? 'inherit' : 'text.secondary',
                  '& .MuiButton-startIcon': {
                    opacity: (showFilters || activeFilterCount > 0) ? 1 : 0.7
                  },
                  '&:hover': {
                    background: (showFilters || activeFilterCount > 0) ? 
                      (theme => `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`) : 
                      (theme => alpha(theme.palette.primary.light, 0.1)),
                    borderColor: 'primary.main',
                    color: (showFilters || activeFilterCount > 0) ? 'inherit' : 'text.primary',
                    '& .MuiButton-startIcon': {
                      opacity: 1
                    },
                    boxShadow: 2,
                    transform: 'translateY(-1px)'
                  },
                  '&:active': {
                    transform: 'translateY(0px)',
                    boxShadow: 1
                  },
                  '&:focus-visible': {
                    outline: '2px solid',
                    outlineColor: 'primary.main',
                    outlineOffset: 2,
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  Filters
                  {activeFilterCount > 0 && (
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        ml: 1,
                        bgcolor: (showFilters || activeFilterCount > 0) ? 'rgba(255, 255, 255, 0.25)' : 'error.main',
                        color: (showFilters || activeFilterCount > 0) ? 'white' : 'error.contrastText',
                        borderRadius: '12px',
                        width: 20,
                        height: 20,
                        fontSize: '0.7rem',
                        fontWeight: 'bold',
                        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.2)'
                      }}
                    >
                      {activeFilterCount}
                    </Box>
                  )}
                </Box>
              </Button>
            </Box>
            
            {/* Guest Type Filter - Removed from here and moved to filter panel */}
            
            {/* Node indicator */}
            {/* Removing the Node indicator as it's redundant with the node selection dropdown at the top right */}
            
            {/* Filter indicator */}
            <Box sx={{ flexGrow: 1, minHeight: { xs: 8, md: 0 } }} />
            
            {/* Controls section - Filter button removed from here */}
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
              {/* Remove the guest count indicator section */}
            </Box>
          </Box>
          
          {/* Filter Panel that shows when filters are active - now includes active filter chips */}
          <ClickAwayListener 
            mouseEvent="onMouseDown" 
            touchEvent="onTouchStart"
            onClickAway={handleClickAway}
            disableReactTree={true}
          >
            <Collapse in={showFilters} timeout="auto" sx={{
              '& .MuiCollapse-wrapperInner': {
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }
            }}>
              <Box 
                sx={{ 
                  mb: 2, 
                  p: 2.5, 
                  backgroundColor: theme => darkMode 
                    ? alpha(theme.palette.primary.dark, 0.15)
                    : alpha(theme.palette.primary.light, 0.05),
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  boxShadow: theme => darkMode 
                    ? `0 4px 20px 0 ${alpha(theme.palette.common.black, 0.1)}`
                    : `0 4px 20px 0 ${alpha(theme.palette.common.black, 0.05)}`,
                  transition: 'all 0.3s ease',
                  overflow: 'hidden'
                }}
                role="region"
                aria-label="Filter controls"
              >
                {/* Add active filters section at the top */}
                {activeFilterCount > 0 && (
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    mb: 2,
                    pb: 1.5,
                    borderBottom: '1px solid',
                    borderColor: 'divider'
                  }}>
                    <Typography variant="subtitle2">
                      Active Filters ({activeFilterCount})
                    </Typography>
                  </Box>
                )}
                
                <Typography 
                  variant="subtitle2" 
                  sx={{ 
                    mb: 2.5, 
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    color: 'text.primary'
                  }}
                >
                  <FilterAltIcon sx={{ fontSize: '1rem', mr: 1, opacity: 0.7 }} />
                  Adjust minimum thresholds:
                </Typography>
                
                {/* CPU Filter */}
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr', lg: '1fr 1fr 1fr 1fr 1fr' },
                  gap: 3,
                  mb: 3
                }}>
                  <Box sx={{ 
                    backgroundColor: theme => alpha(theme.palette.background.paper, darkMode ? 0.4 : 0.7),
                    borderRadius: 1.5,
                    p: 1.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      boxShadow: theme => `0 2px 8px 0 ${alpha(theme.palette.primary.main, 0.1)}`,
                      borderColor: theme => alpha(theme.palette.primary.main, 0.3)
                    }
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <SpeedIcon fontSize="small" sx={{ mr: 0.5, opacity: 0.6, fontSize: '0.9rem', color: 'primary.main' }} />
                      <Typography 
                        variant="body2" 
                        sx={{ fontWeight: 600 }}
                        id="cpu-filter-label"
                      >
                        CPU Usage
                      </Typography>
                    </Box>
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
                        color: theme => filters.cpu > 0 ? theme.palette.primary.main : alpha(theme.palette.primary.main, 0.4),
                        height: 4,
                        '& .MuiSlider-thumb': { 
                          height: 14,
                          width: 14,
                          opacity: 1,
                          backgroundColor: theme.palette.primary.main,
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
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">0%</Typography>
                      <Typography variant="caption" color="text.secondary">100%</Typography>
                            </Box>
                  </Box>
                  
                  {/* Memory Filter */}
                  <Box sx={{ 
                    backgroundColor: theme => alpha(theme.palette.background.paper, darkMode ? 0.4 : 0.7),
                    borderRadius: 1.5,
                    p: 1.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      boxShadow: theme => `0 2px 8px 0 ${alpha(theme.palette.primary.main, 0.1)}`,
                      borderColor: theme => alpha(theme.palette.primary.main, 0.3)
                    }
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <MemoryIcon fontSize="small" sx={{ mr: 0.5, opacity: 0.6, fontSize: '0.9rem', color: 'primary.main' }} />
                      <Typography 
                        variant="body2" 
                        sx={{ fontWeight: 600 }}
                        id="memory-filter-label"
                      >
                        Memory Usage
                      </Typography>
                    </Box>
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
                        color: theme => filters.memory > 0 ? theme.palette.primary.main : alpha(theme.palette.primary.main, 0.4),
                        height: 4,
                        '& .MuiSlider-thumb': { 
                          height: 14,
                          width: 14,
                          opacity: 1,
                          backgroundColor: theme.palette.primary.main,
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
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">0%</Typography>
                      <Typography variant="caption" color="text.secondary">100%</Typography>
                            </Box>
                  </Box>
                  
                  {/* Disk Filter */}
                  <Box sx={{ 
                    backgroundColor: theme => alpha(theme.palette.background.paper, darkMode ? 0.4 : 0.7),
                    borderRadius: 1.5,
                    p: 1.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      boxShadow: theme => `0 2px 8px 0 ${alpha(theme.palette.primary.main, 0.1)}`,
                      borderColor: theme => alpha(theme.palette.primary.main, 0.3)
                    }
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <StorageIcon fontSize="small" sx={{ mr: 0.5, opacity: 0.6, fontSize: '0.9rem', color: 'primary.main' }} />
                      <Typography 
                        variant="body2" 
                        sx={{ fontWeight: 600 }}
                        id="disk-filter-label"
                      >
                        Disk Usage
                      </Typography>
                    </Box>
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
                        color: theme => filters.disk > 0 ? theme.palette.primary.main : alpha(theme.palette.primary.main, 0.4),
                        height: 4,
                        '& .MuiSlider-thumb': {
                          height: 14,
                          width: 14,
                          opacity: 1,
                          backgroundColor: theme.palette.primary.main,
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
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">0%</Typography>
                      <Typography variant="caption" color="text.secondary">100%</Typography>
                    </Box>
                  </Box>
                  
                  {/* Download Filter */}
                  <Box sx={{ 
                    backgroundColor: theme => alpha(theme.palette.background.paper, darkMode ? 0.4 : 0.7),
                    borderRadius: 1.5,
                    p: 1.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      boxShadow: theme => `0 2px 8px 0 ${alpha(theme.palette.primary.main, 0.1)}`,
                      borderColor: theme => alpha(theme.palette.primary.main, 0.3)
                    }
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <ArrowDownwardIcon fontSize="small" sx={{ mr: 0.5, opacity: 0.6, fontSize: '0.9rem', color: 'secondary.main' }} />
                      <Typography 
                        variant="body2" 
                        sx={{ fontWeight: 600 }}
                        id="download-filter-label"
                      >
                        Download Rate
                      </Typography>
                    </Box>
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
                        color: theme => filters.download > 0 ? theme.palette.secondary.main : alpha(theme.palette.secondary.main, 0.4),
                        height: 4,
                        '& .MuiSlider-thumb': {
                          height: 14,
                          width: 14,
                          opacity: 1,
                          backgroundColor: theme.palette.secondary.main,
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
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">0 B/s</Typography>
                      <Typography variant="caption" color="text.secondary">10 MB/s</Typography>
                            </Box>
                  </Box>
                  
                  {/* Upload Filter */}
                  <Box sx={{ 
                    backgroundColor: theme => alpha(theme.palette.background.paper, darkMode ? 0.4 : 0.7),
                    borderRadius: 1.5,
                    p: 1.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      boxShadow: theme => `0 2px 8px 0 ${alpha(theme.palette.secondary.main, 0.1)}`,
                      borderColor: theme => alpha(theme.palette.secondary.main, 0.3)
                    }
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <ArrowUpwardIcon fontSize="small" sx={{ mr: 0.5, opacity: 0.6, fontSize: '0.9rem', color: 'secondary.main' }} />
                      <Typography 
                        variant="body2" 
                        sx={{ fontWeight: 600 }}
                        id="upload-filter-label"
                      >
                        Upload Rate
                      </Typography>
                    </Box>
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
                        color: theme => filters.upload > 0 ? theme.palette.secondary.main : alpha(theme.palette.secondary.main, 0.4),
                        height: 4,
                        '& .MuiSlider-thumb': {
                          height: 14,
                          width: 14,
                          opacity: 1,
                          backgroundColor: theme.palette.secondary.main,
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
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">0 B/s</Typography>
                      <Typography variant="caption" color="text.secondary">10 MB/s</Typography>
                          </Box>
                    </Box>
                  </Box>
              
                {/* Add search term chips if any exist - moved below slider cards */}
                {(activeSearchTerms.length > 0 || (searchTerm && !activeSearchTerms.includes(searchTerm))) && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                      Search Terms
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                      {activeSearchTerms.map((term) => (
                        <Chip
                          key={term}
                          size="small"
                          icon={<SearchIcon fontSize="small" />}
                          label={`"${term}"`}
                          color="primary"
                          onDelete={() => removeSearchTerm(term)}
                        />
                      ))}
                      {searchTerm && !activeSearchTerms.includes(searchTerm) && (
                        <Chip
                          size="small"
                          icon={<SearchIcon fontSize="small" />}
                          label={`"${searchTerm}"`}
                          color="secondary"
                          onDelete={() => setSearchTerm('')}
                        />
                      )}
                    </Box>
                  </Box>
                )}
                
                {/* Resource filter chips if any exist - moved below slider cards */}
                {Object.entries(filters).some(([key, value]) => value > 0) && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                      Resource Filters
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                      {Object.entries(filters).map(([key, value]) => {
                        if (value <= 0) return null;
                        
                        let label = '';
                        let icon = null;
                        
                        switch(key) {
                          case 'cpu':
                            label = `CPU > ${value}%`;
                            icon = <SpeedIcon fontSize="small" />;
                            break;
                          case 'memory':
                            label = `Memory > ${value}%`;
                            icon = <MemoryIcon fontSize="small" />;
                            break;
                          case 'disk':
                            label = `Disk > ${value}%`;
                            icon = <StorageIcon fontSize="small" />;
                            break;
                          case 'download':
                            label = `Download > ${formatNetworkRateForFilter(sliderValueToNetworkRate(value))}`;
                            icon = <DownloadIcon fontSize="small" />;
                            break;
                          case 'upload':
                            label = `Upload > ${formatNetworkRateForFilter(sliderValueToNetworkRate(value))}`;
                            icon = <UploadIcon fontSize="small" />;
                            break;
                          default:
                            return null;
                        }
                        
                        return (
                          <Chip
                            key={key}
                            size="small"
                            icon={icon}
                            label={label}
                            color="primary"
                            variant="outlined"
                            onDelete={() => clearFilter(key)}
                          />
                        );
                      })}
                    </Box>
                  </Box>
                )}
                
                {/* Completely restructure the filter info section */}
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  width: '100%',
                  mt: 2,
                  mb: 1,
                  pt: 2,
                  borderTop: '1px solid',
                  borderTopColor: 'divider'
                }}>
                  {/* Guest Type and Status Filters */}
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    flexWrap: { xs: 'wrap', sm: 'nowrap' }, 
                    gap: { xs: 2, sm: 3 },
                    mb: 2,
                    pb: 2,
                    borderBottom: '1px solid',
                    borderBottomColor: 'divider'
                  }}>
                    {/* Guest Type Filter */}
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <DevicesIcon sx={{ fontSize: '0.875rem', mr: 0.5, opacity: 0.7, color: 'primary.main' }} />
                      <Typography variant="caption" sx={{ mr: 1, fontWeight: 600 }}>Type:</Typography>
                      <Box sx={{ 
                        display: 'flex', 
                        borderRadius: 1, 
                        border: '1px solid', 
                        borderColor: 'divider', 
                        overflow: 'hidden'
                      }}>
                        <Button
                          size="small"
                          onClick={() => setGuestTypeFilter('all')}
                          sx={{
                            py: 0.5,
                            px: 1.5,
                            minWidth: 0,
                            color: guestTypeFilter === 'all' ? 'primary.main' : 'text.secondary',
                            bgcolor: guestTypeFilter === 'all' ? alpha('#1976d2', 0.08) : 'transparent',
                            borderRight: '1px solid',
                            borderColor: 'divider',
                            '&:hover': {
                              bgcolor: guestTypeFilter === 'all' ? alpha('#1976d2', 0.12) : alpha('#000', 0.04)
                            }
                          }}
                        >
                          All
                        </Button>
                        <Button
                          size="small"
                          onClick={() => setGuestTypeFilter('vm')}
                          sx={{
                            py: 0.5,
                            px: 1.5,
                            minWidth: 0,
                            color: guestTypeFilter === 'vm' ? 'info.main' : 'text.secondary',
                            bgcolor: guestTypeFilter === 'vm' ? alpha('#0288d1', 0.08) : 'transparent',
                            borderRight: '1px solid',
                            borderColor: 'divider',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            '&:hover': {
                              bgcolor: guestTypeFilter === 'vm' ? alpha('#0288d1', 0.12) : alpha('#000', 0.04)
                            }
                          }}
                        >
                          <ComputerOutlinedIcon sx={{ fontSize: '0.9rem' }} />
                          VMs
                          {guestTypeCounts.vms > 0 && (
                            <Typography
                              variant="caption"
                              sx={{
                                ml: 0.5,
                                fontSize: '0.7rem',
                                opacity: 0.7
                              }}
                            >
                              ({guestTypeCounts.vms})
                            </Typography>
                          )}
                        </Button>
                        <Button
                          size="small"
                          onClick={() => setGuestTypeFilter('lxc')}
                          sx={{
                            py: 0.5,
                            px: 1.5,
                            minWidth: 0,
                            color: guestTypeFilter === 'lxc' ? 'success.main' : 'text.secondary',
                            bgcolor: guestTypeFilter === 'lxc' ? alpha('#2e7d32', 0.08) : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            '&:hover': {
                              bgcolor: guestTypeFilter === 'lxc' ? alpha('#2e7d32', 0.12) : alpha('#000', 0.04)
                            }
                          }}
                        >
                          <StorageOutlinedIcon sx={{ fontSize: '0.9rem' }} />
                          LXC
                          {guestTypeCounts.containers > 0 && (
                            <Typography
                              variant="caption"
                              sx={{
                                ml: 0.5,
                                fontSize: '0.7rem',
                                opacity: 0.7
                              }}
                            >
                              ({guestTypeCounts.containers})
                            </Typography>
                          )}
                        </Button>
                      </Box>
                    </Box>

                    {/* Status Filter */}
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <PlayCircleOutlineIcon sx={{ fontSize: '0.875rem', mr: 0.5, opacity: 0.7, color: 'primary.main' }} />
                      <Typography variant="caption" sx={{ mr: 1, fontWeight: 600 }}>Status:</Typography>
                      <Box sx={{ 
                        display: 'flex', 
                        borderRadius: 1, 
                        border: '1px solid', 
                        borderColor: 'divider', 
                        overflow: 'hidden'
                      }}>
                        <Button
                          size="small"
                          onClick={() => setShowStopped(false)}
                          sx={{
                            py: 0.5,
                            px: 1.5,
                            minWidth: 0,
                            color: !showStopped ? 'success.main' : 'text.secondary',
                            bgcolor: !showStopped ? alpha('#2e7d32', 0.08) : 'transparent',
                            borderRight: '1px solid',
                            borderColor: 'divider',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            '&:hover': {
                              bgcolor: !showStopped ? alpha('#2e7d32', 0.12) : alpha('#000', 0.04)
                            }
                          }}
                        >
                          <PlayArrowIcon sx={{ fontSize: '0.9rem' }} />
                          Running
                        </Button>
                        <Button
                          size="small"
                          onClick={() => setShowStopped(true)}
                          sx={{
                            py: 0.5,
                            px: 1.5,
                            minWidth: 0,
                            color: showStopped ? 'primary.main' : 'text.secondary',
                            bgcolor: showStopped ? alpha('#1976d2', 0.08) : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            '&:hover': {
                              bgcolor: showStopped ? alpha('#1976d2', 0.12) : alpha('#000', 0.04)
                            }
                          }}
                        >
                          <AllInclusiveIcon sx={{ fontSize: '0.9rem' }} />
                          All
                        </Button>
                      </Box>
                    </Box>
                    
                    {/* Export Options */}
                    {guestData.length > 0 && sortedAndFilteredData.length > 0 && (
                      <Box sx={{ display: 'flex', alignItems: 'center', ml: 'auto' }}>
                        <Typography variant="caption" sx={{ mr: 1, fontWeight: 600 }}>Export:</Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="Export as PDF">
                            <IconButton
                              size="small"
                              onClick={generatePDF}
                              sx={{
                                padding: 0.5,
                                '&:hover': {
                                  backgroundColor: alpha(theme.palette.primary.main, 0.1)
                                }
                              }}
                            >
                              <PictureAsPdfIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          
                          <Tooltip title="Export as CSV">
                            <IconButton
                              size="small"
                              onClick={() => {
                                try {
                                  console.log('CSV export started');
                                  
                                  // Create CSV content
                                  const headers = ['Type', 'ID', 'Name', 'Status', 'CPU Usage', 'Memory Usage', 'Disk Usage', 'Download', 'Upload', 'Uptime'];
                                  const csvRows = [headers];
                                  
                                  // Helper function to escape CSV values properly
                                  const escapeCSV = (value) => {
                                    if (value === null || value === undefined) return '';
                                    const str = String(value);
                                    // If the value contains commas, quotes, or newlines, wrap it in quotes
                                    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                                      // Double up any quotes
                                      return `"${str.replace(/"/g, '""')}"`;
                                    }
                                    return str;
                                  };
                                  
                                  // Add data rows
                                  sortedAndFilteredData.forEach(guest => {
                                    try {
                                      const metrics = getMetricsForGuest(guest.id);
                                      const networkMetrics = metrics?.metrics?.network;
                                      
                                      // Get resource metrics
                                      const cpuUsage = metrics?.metrics?.cpu || 0;
                                      
                                      const memoryData = metrics?.metrics?.memory || {};
                                      const memoryUsage = memoryData.percentUsed || 
                                        (memoryData.total && memoryData.used ? 
                                          (memoryData.used / memoryData.total) * 100 : 0);
                                      
                                      const diskData = metrics?.metrics?.disk || {};
                                      const diskUsage = diskData.percentUsed || 
                                        (diskData.total && diskData.used ? 
                                          (diskData.used / diskData.total) * 100 : 0);
                                      
                                      csvRows.push([
                                        escapeCSV(guest.type || 'Unknown'),
                                        escapeCSV(guest.id || 'Unknown'),
                                        escapeCSV(guest.name || 'Unknown'),
                                        escapeCSV(guest.status || 'Unknown'),
                                        escapeCSV(formatPercentage(cpuUsage)),
                                        escapeCSV(formatPercentage(memoryUsage)),
                                        escapeCSV(formatPercentage(diskUsage)),
                                        escapeCSV(guest.status === 'running' && networkMetrics ? 
                                          formatNetworkRate(networkMetrics.inRate || 0) : '-'),
                                        escapeCSV(guest.status === 'running' && networkMetrics ? 
                                          formatNetworkRate(networkMetrics.outRate || 0) : '-'),
                                        escapeCSV(guest.status === 'running' && metrics?.metrics?.uptime ? 
                                          formatUptime(metrics.metrics.uptime) : '-')
                                      ]);
                                    } catch (rowError) {
                                      console.error('Error processing CSV row for guest:', guest?.name, rowError);
                                      // Add a fallback row with error information
                                      csvRows.push([
                                        escapeCSV(guest?.name || 'Unknown'),
                                        escapeCSV(guest?.status || 'Unknown'),
                                        'Error', 'Error', 'Error', 'Error', 'Error', 'Error', 'Error', 'Error', 'Error'
                                      ]);
                                    }
                                  });
                                  
                                  // Convert to CSV string
                                  const csvContent = csvRows.map(row => row.join(',')).join('\n');
                                  console.log('CSV content generated');
                                  
                                  // Create and download the file
                                  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                                  const url = URL.createObjectURL(blob);
                                  const link = document.createElement('a');
                                  link.setAttribute('href', url);
                                  link.setAttribute('download', `container-status-${new Date().toISOString().split('T')[0]}.csv`);
                                  link.style.visibility = 'hidden';
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                  URL.revokeObjectURL(url);
                                  console.log('CSV downloaded successfully');
                                } catch (error) {
                                  console.error('Error exporting CSV:', error);
                                  if (error.message) {
                                    alert(`Failed to export CSV: ${error.message}`);
                                  } else {
                                    alert('Failed to export CSV. Please check the console for details.');
                                  }
                                }
                              }}
                              sx={{
                                padding: 0.5,
                                '&:hover': {
                                  backgroundColor: alpha(theme.palette.primary.main, 0.1)
                                }
                              }}
                            >
                              <FileDownloadIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                    )}
                  </Box>
                  
                  {/* Filter summary text in its own dedicated row */}
                  {(Object.values(filters).some(val => val > 0) || selectedNode !== 'all') && (
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      width: '100%',
                      mb: 2
                    }}>
                      <Typography 
                        variant="caption" 
                        color="primary.main"
                        sx={{ 
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        aria-live="polite"
                      >
                        <InfoOutlinedIcon sx={{ fontSize: '0.875rem', mr: 0.5, opacity: 0.7 }} />
                        {`Showing ${sortedAndFilteredData.length} of ${getNodeFilteredGuests(guestData).length} systems${selectedNode !== 'all' ? ` on ${selectedNode === 'node1' ? 'Production' : selectedNode === 'node2' ? 'Development' : 'Testing'}` : ''}`}
                      </Typography>
                    </Box>
                  )}
                  
                  {/* Reset button in its own row */}
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'flex-end', 
                    width: '100%'
                  }}>
                    <Button 
                      variant={Object.values(filters).some(val => val > 0) ? "contained" : "outlined"}
                      size="small"
                      color="primary"
                      onClick={resetFilters}
                      startIcon={<RestartAltIcon />}
                      title="Reset All Filters (Alt+R)" // Add tooltip with keyboard shortcut
                      sx={{ 
                        height: 32,
                        transition: 'all 0.2s ease',
                        fontWeight: Object.values(filters).some(val => val > 0) ? 600 : 400,
                        textTransform: 'none',
                        borderRadius: '8px',
                        px: 1.5,
                        background: Object.values(filters).some(val => val > 0) ? 
                          (theme => `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`) : 
                          'transparent',
                        border: Object.values(filters).some(val => val > 0) ? 'none' : '1px solid',
                        borderColor: 'primary.light',
                        boxShadow: Object.values(filters).some(val => val > 0) ? 1 : 0,
                        '&:hover': {
                          background: Object.values(filters).some(val => val > 0) ? 
                            (theme => `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`) : 
                            (theme => alpha(theme.palette.primary.light, 0.1)),
                        }
                      }}
                    >
                      Reset Filters
                    </Button>
                  </Box>
                </Box>
              </Box>
            </Collapse>
          </ClickAwayListener>
          
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
                  {/* Type Column */}
                  <TableCell 
                    width="4%" 
                    onClick={() => requestSort('type')}
                    sx={{ 
                      fontWeight: 'bold', 
                      minHeight: '48px',
                      position: 'relative',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      padding: 0,
                      '&:hover': {
                        backgroundColor: theme => alpha(theme.palette.primary.main, 0.08)
                      },
                      '&:focus-visible': {
                        outline: '2px solid',
                        outlineColor: 'primary.main',
                        outlineOffset: -2,
                      }
                    }}
                    aria-sort={sortConfig.key === 'type' ? sortConfig.direction : undefined}
                  >
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      width: '100%',
                      height: '100%',
                      position: 'relative'
                    }}>
                      <TableSortLabel
                        active={sortConfig.key === 'type'}
                        direction={sortConfig.key === 'type' ? sortConfig.direction : 'asc'}
                        sx={{
                          width: '100%',
                          justifyContent: 'center',
                          '& .MuiTableSortLabel-icon': {
                            opacity: sortConfig.key === 'type' ? 1 : 0.3,
                            position: 'absolute',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            marginLeft: '0 !important'
                          },
                          '&.Mui-active': {
                            color: 'inherit',
                          },
                          '&:hover': {
                            color: 'primary.main',
                          }
                        }}
                        IconComponent={props => (
                          <ArrowDropDownIcon
                            {...props}
                            sx={{
                              fontSize: '1.2rem',
                              transform: sortConfig.key === 'type' && sortConfig.direction === 'desc' ? 'rotate(180deg)' : 'none',
                              transition: 'transform 0.2s'
                            }}
                          />
                        )}
                      />
                    </Box>
                  </TableCell>

                  <TableCell 
                    width="7%" 
                    onClick={() => requestSort('id')}
                    sx={{ 
                      fontWeight: 'bold', 
                      minHeight: '48px',
                      position: 'relative',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      pr: 3, // Add right padding for sort icon
                      '&:hover': {
                        backgroundColor: theme => alpha(theme.palette.primary.main, 0.08)
                      },
                      '&:focus-visible': {
                        outline: '2px solid',
                        outlineColor: 'primary.main',
                        outlineOffset: -2,
                      }
                    }}
                    aria-sort={sortConfig.key === 'id' ? sortConfig.direction : undefined}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      ID
                      <TableSortLabel
                        active={sortConfig.key === 'id'}
                        direction={sortConfig.key === 'id' ? sortConfig.direction : 'asc'}
                        sx={{
                          '& .MuiTableSortLabel-icon': {
                            opacity: sortConfig.key === 'id' ? 1 : 0.3,
                            marginLeft: '4px !important',
                          },
                          '&.Mui-active': {
                            color: 'inherit',
                          },
                          '&:hover': {
                            color: 'primary.main',
                          }
                        }}
                        IconComponent={props => (
                          <ArrowDropDownIcon
                            {...props}
                            sx={{
                              fontSize: '1.2rem',
                              transform: sortConfig.key === 'id' && sortConfig.direction === 'desc' ? 'rotate(180deg)' : 'none',
                              transition: 'transform 0.2s'
                            }}
                          />
                        )}
                      />
                    </Box>
                  </TableCell>

                  {/* Name Column */}
                  <TableCell 
                    width="15%" 
                    onClick={() => requestSort('name')}
                    sx={{ 
                      fontWeight: 'bold', 
                      minHeight: '48px',
                      position: 'relative',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      pr: 3, // Add right padding for sort icon
                      '&:hover': {
                        backgroundColor: theme => alpha(theme.palette.primary.main, 0.08)
                      },
                      '&:focus-visible': {
                        outline: '2px solid',
                        outlineColor: 'primary.main',
                        outlineOffset: -2,
                      }
                    }}
                    aria-sort={sortConfig.key === 'name' ? sortConfig.direction : undefined}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      Name
                      <TableSortLabel
                        active={sortConfig.key === 'name'}
                        direction={sortConfig.key === 'name' ? sortConfig.direction : 'asc'}
                        sx={{
                          '& .MuiTableSortLabel-icon': {
                            opacity: sortConfig.key === 'name' ? 1 : 0.3,
                            marginLeft: '4px !important',
                          },
                          '&.Mui-active': {
                            color: 'inherit',
                          },
                          '&:hover': {
                            color: 'primary.main',
                          }
                        }}
                        IconComponent={props => (
                          <ArrowDropDownIcon
                            {...props}
                            sx={{
                              fontSize: '1.2rem',
                              transform: sortConfig.key === 'name' && sortConfig.direction === 'desc' ? 'rotate(180deg)' : 'none',
                              transition: 'transform 0.2s'
                            }}
                          />
                        )}
                      />
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
                      backgroundColor: theme => filters.cpu > 0 ? 
                        alpha(theme.palette.primary.main, 0.08) : 'transparent',
                      transition: 'all 0.2s ease',
                      '&::after': {},
                      '&:hover': {
                        backgroundColor: theme => filters.cpu > 0 
                          ? alpha(theme.palette.primary.main, 0.12)
                          : alpha(theme.palette.primary.main, 0.08)
                      },
                      '&:focus-visible': {
                        outline: '2px solid',
                        outlineColor: 'primary.main',
                        outlineOffset: -2,
                      }
                    }}
                    aria-sort={sortConfig.key === 'cpu' ? sortConfig.direction : undefined}
                  >
                    <Tooltip 
                      title={filters.cpu > 0 ? `Filtering: CPU > ${filters.cpu}%` : ""}
                      arrow
                      placement="top"
                      disableHoverListener={!filters.cpu}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <SpeedIcon fontSize="small" sx={{ mr: 0.5, opacity: 0.6, fontSize: '0.9rem' }} />
                        CPU
                        <TableSortLabel
                          active={sortConfig.key === 'cpu'}
                          direction={sortConfig.key === 'cpu' ? sortConfig.direction : 'asc'}
                          sx={{
                            '& .MuiTableSortLabel-icon': {
                              opacity: sortConfig.key === 'cpu' ? 1 : 0.3,
                              marginLeft: '4px !important',
                            },
                            '&.Mui-active': {
                              color: 'inherit',
                            },
                            '&:hover': {
                              color: 'primary.main',
                            }
                          }}
                          IconComponent={props => (
                            <ArrowDropDownIcon
                              {...props}
                              sx={{
                                fontSize: '1.2rem',
                                transform: sortConfig.key === 'cpu' && sortConfig.direction === 'desc' ? 'rotate(180deg)' : 'none',
                                transition: 'transform 0.2s'
                              }}
                            />
                          )}
                        />
                      </Box>
                    </Tooltip>
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
                      backgroundColor: theme => filters.memory > 0 ? 
                        alpha(theme.palette.primary.main, 0.08) : 'transparent',
                      transition: 'all 0.2s ease',
                      '&::after': {},
                      '&:hover': {
                        backgroundColor: theme => filters.memory > 0 
                          ? alpha(theme.palette.primary.main, 0.12)
                          : alpha(theme.palette.primary.main, 0.08)
                      },
                      '&:focus-visible': {
                        outline: '2px solid',
                        outlineColor: 'primary.main',
                        outlineOffset: -2,
                      }
                    }}
                    aria-sort={sortConfig.key === 'memory' ? sortConfig.direction : undefined}
                  >
                    <Tooltip 
                      title={filters.memory > 0 ? `Filtering: Memory > ${filters.memory}%` : ""}
                      arrow
                      placement="top"
                      disableHoverListener={!filters.memory}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <MemoryIcon fontSize="small" sx={{ mr: 0.5, opacity: 0.6, fontSize: '0.9rem' }} />
                        Memory
                        <TableSortLabel
                          active={sortConfig.key === 'memory'}
                          direction={sortConfig.key === 'memory' ? sortConfig.direction : 'asc'}
                          sx={{
                            '& .MuiTableSortLabel-icon': {
                              opacity: sortConfig.key === 'memory' ? 1 : 0.3,
                              marginLeft: '4px !important',
                            },
                            '&.Mui-active': {
                              color: 'inherit',
                            },
                            '&:hover': {
                              color: 'primary.main',
                            }
                          }}
                          IconComponent={props => (
                            <ArrowDropDownIcon
                              {...props}
                              sx={{
                                fontSize: '1.2rem',
                                transform: sortConfig.key === 'memory' && sortConfig.direction === 'desc' ? 'rotate(180deg)' : 'none',
                                transition: 'transform 0.2s'
                              }}
                            />
                          )}
                        />
                      </Box>
                    </Tooltip>
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
                      backgroundColor: theme => filters.disk > 0 ? 
                        alpha(theme.palette.primary.main, 0.08) : 'transparent',
                      transition: 'all 0.2s ease',
                      '&::after': {},
                      '&:hover': {
                        backgroundColor: theme => filters.disk > 0 
                          ? alpha(theme.palette.primary.main, 0.12)
                          : alpha(theme.palette.primary.main, 0.08)
                      },
                      '&:focus-visible': {
                        outline: '2px solid',
                        outlineColor: 'primary.main',
                        outlineOffset: -2,
                      }
                    }}
                    aria-sort={sortConfig.key === 'disk' ? sortConfig.direction : undefined}
                  >
                    <Tooltip 
                      title={filters.disk > 0 ? `Filtering: Disk > ${filters.disk}%` : ""}
                      arrow
                      placement="top"
                      disableHoverListener={!filters.disk}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <StorageIcon fontSize="small" sx={{ mr: 0.5, opacity: 0.6, fontSize: '0.9rem' }} />
                        Disk
                        <TableSortLabel
                          active={sortConfig.key === 'disk'}
                          direction={sortConfig.key === 'disk' ? sortConfig.direction : 'asc'}
                          sx={{
                            '& .MuiTableSortLabel-icon': {
                              opacity: sortConfig.key === 'disk' ? 1 : 0.3,
                              marginLeft: '4px !important',
                            },
                            '&.Mui-active': {
                              color: 'inherit',
                            },
                            '&:hover': {
                              color: 'primary.main',
                            }
                          }}
                          IconComponent={props => (
                            <ArrowDropDownIcon
                              {...props}
                              sx={{
                                fontSize: '1.2rem',
                                transform: sortConfig.key === 'disk' && sortConfig.direction === 'desc' ? 'rotate(180deg)' : 'none',
                                transition: 'transform 0.2s'
                              }}
                            />
                          )}
                        />
                      </Box>
                    </Tooltip>
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
                      backgroundColor: theme => filters.download > 0 ? 
                        alpha(theme.palette.primary.main, 0.08) : 'transparent',
                      transition: 'all 0.2s ease',
                      '&::after': {},
                      '&:hover': {
                        backgroundColor: theme => filters.download > 0 
                          ? alpha(theme.palette.primary.main, 0.12)
                          : alpha(theme.palette.primary.main, 0.08)
                      },
                      '&:focus-visible': {
                        outline: '2px solid',
                        outlineColor: 'primary.main',
                        outlineOffset: -2,
                      }
                    }}
                    aria-sort={sortConfig.key === 'download' ? sortConfig.direction : undefined}
                  >
                    <Tooltip 
                      title={filters.download > 0 ? `Filtering: Download > ${formatNetworkRateForFilter(sliderValueToNetworkRate(filters.download))}` : ""}
                      arrow
                      placement="top"
                      disableHoverListener={!filters.download}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <DownloadIcon fontSize="small" sx={{ mr: 0.5, opacity: 0.6, fontSize: '0.9rem' }} />
                        Download
                        <TableSortLabel
                          active={sortConfig.key === 'download'}
                          direction={sortConfig.key === 'download' ? sortConfig.direction : 'asc'}
                          sx={{
                            '& .MuiTableSortLabel-icon': {
                              opacity: sortConfig.key === 'download' ? 1 : 0.3,
                              marginLeft: '4px !important',
                            },
                            '&.Mui-active': {
                              color: 'inherit',
                            },
                            '&:hover': {
                              color: 'primary.main',
                            }
                          }}
                          IconComponent={props => (
                            <ArrowDropDownIcon
                              {...props}
                              sx={{
                                fontSize: '1.2rem',
                                transform: sortConfig.key === 'download' && sortConfig.direction === 'desc' ? 'rotate(180deg)' : 'none',
                                transition: 'transform 0.2s'
                              }}
                            />
                          )}
                        />
                      </Box>
                    </Tooltip>
                  </TableCell>
                  
                  {/* Upload Column */}
                  <TableCell 
                    width="12%" 
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
                      backgroundColor: theme => filters.upload > 0 ? 
                        alpha(theme.palette.secondary.main, 0.08) : 'transparent',
                      transition: 'all 0.2s ease',
                      '&::after': {},
                      '&:hover': {
                        backgroundColor: theme => filters.upload > 0 
                          ? alpha(theme.palette.secondary.main, 0.12)
                          : alpha(theme.palette.primary.main, 0.08)
                      },
                      '&:focus-visible': {
                        outline: '2px solid',
                        outlineColor: 'primary.main',
                        outlineOffset: -2,
                      }
                    }}
                    aria-sort={sortConfig.key === 'upload' ? sortConfig.direction : undefined}
                  >
                    <Tooltip 
                      title={filters.upload > 0 ? `Filtering: Upload > ${formatNetworkRateForFilter(sliderValueToNetworkRate(filters.upload))}` : ""}
                      arrow
                      placement="top"
                      disableHoverListener={!filters.upload}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <UploadIcon fontSize="small" sx={{ mr: 0.5, opacity: 0.6, fontSize: '0.9rem' }} />
                        Upload
                        <TableSortLabel
                          active={sortConfig.key === 'upload'}
                          direction={sortConfig.key === 'upload' ? sortConfig.direction : 'asc'}
                          sx={{
                            '& .MuiTableSortLabel-icon': {
                              opacity: sortConfig.key === 'upload' ? 1 : 0.3,
                              marginLeft: '4px !important',
                            },
                            '&.Mui-active': {
                              color: 'inherit',
                            },
                            '&:hover': {
                              color: 'primary.main',
                            }
                          }}
                          IconComponent={props => (
                            <ArrowDropDownIcon
                              {...props}
                              sx={{
                                fontSize: '1.2rem',
                                transform: sortConfig.key === 'upload' && sortConfig.direction === 'desc' ? 'rotate(180deg)' : 'none',
                                transition: 'transform 0.2s'
                              }}
                            />
                          )}
                        />
                      </Box>
                    </Tooltip>
                  </TableCell>

                  {/* Uptime Column */}
                  <TableCell 
                    width="12%" 
                    onClick={() => requestSort('uptime')}
                    sx={{ 
                      fontWeight: 'bold', 
                      minHeight: '48px', 
                      position: 'relative',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        backgroundColor: theme => alpha(theme.palette.primary.main, 0.08)
                      },
                      '&:focus-visible': {
                        outline: '2px solid',
                        outlineColor: 'primary.main',
                        outlineOffset: -2,
                      }
                    }}
                    aria-sort={sortConfig.key === 'uptime' ? sortConfig.direction : undefined}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <AllInclusiveIcon fontSize="small" sx={{ mr: 0.5, opacity: 0.6, fontSize: '0.9rem' }} />
                      Uptime
                      <TableSortLabel
                        active={sortConfig.key === 'uptime'}
                        direction={sortConfig.key === 'uptime' ? sortConfig.direction : 'asc'}
                        sx={{
                          '& .MuiTableSortLabel-icon': {
                            opacity: sortConfig.key === 'uptime' ? 1 : 0.3,
                            marginLeft: '4px !important',
                          },
                          '&.Mui-active': {
                            color: 'inherit',
                          },
                          '&:hover': {
                            color: 'primary.main',
                          }
                        }}
                        IconComponent={props => (
                          <ArrowDropDownIcon
                            {...props}
                            sx={{
                              fontSize: '1.2rem',
                              transform: sortConfig.key === 'uptime' && sortConfig.direction === 'desc' ? 'rotate(180deg)' : 'none',
                              transition: 'transform 0.2s'
                            }}
                          />
                        )}
                      />
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
                        ...(filters.cpu > 0 && cpuUsage > filters.cpu && (
                          guestTypeFilter === 'all' ? {
                            '& td:nth-of-type(4)': { 
                              backgroundColor: theme => alpha(theme.palette.primary.main, 0.06),
                              transition: 'background-color 0.2s ease',
                              '&:hover': {
                                backgroundColor: theme => alpha(theme.palette.primary.main, 0.1)
                              }
                            }
                          } : {
                            '& td:nth-of-type(3)': { 
                              backgroundColor: theme => alpha(theme.palette.primary.main, 0.06),
                              transition: 'background-color 0.2s ease',
                              '&:hover': {
                                backgroundColor: theme => alpha(theme.palette.primary.main, 0.1)
                              }
                            }
                          }
                        )),
                        ...(filters.memory > 0 && memoryUsage > filters.memory && (
                          guestTypeFilter === 'all' ? {
                            '& td:nth-of-type(5)': { 
                              backgroundColor: theme => alpha(theme.palette.primary.main, 0.06),
                              transition: 'background-color 0.2s ease',
                              '&:hover': {
                                backgroundColor: theme => alpha(theme.palette.primary.main, 0.1)
                              }
                            }
                          } : {
                            '& td:nth-of-type(4)': { 
                              backgroundColor: theme => alpha(theme.palette.primary.main, 0.06),
                              transition: 'background-color 0.2s ease',
                              '&:hover': {
                                backgroundColor: theme => alpha(theme.palette.primary.main, 0.1)
                              }
                            }
                          }
                        )),
                        ...(filters.disk > 0 && diskUsage > filters.disk && (
                          guestTypeFilter === 'all' ? {
                            '& td:nth-of-type(6)': { 
                              backgroundColor: theme => alpha(theme.palette.primary.main, 0.06),
                              transition: 'background-color 0.2s ease',
                              '&:hover': {
                                backgroundColor: theme => alpha(theme.palette.primary.main, 0.1)
                              }
                            }
                          } : {
                            '& td:nth-of-type(5)': { 
                              backgroundColor: theme => alpha(theme.palette.primary.main, 0.06),
                              transition: 'background-color 0.2s ease',
                              '&:hover': {
                                backgroundColor: theme => alpha(theme.palette.primary.main, 0.1)
                              }
                            }
                          }
                        )),
                        ...(filters.download > 0 && networkMetrics?.inRate >= sliderValueToNetworkRate(filters.download) && (
                          guestTypeFilter === 'all' ? {
                            '& td:nth-of-type(7)': { 
                              backgroundColor: theme => alpha(theme.palette.primary.main, 0.06),
                              transition: 'background-color 0.2s ease',
                              '&:hover': {
                                backgroundColor: theme => alpha(theme.palette.primary.main, 0.1)
                              }
                            }
                          } : {
                            '& td:nth-of-type(6)': { 
                              backgroundColor: theme => alpha(theme.palette.primary.main, 0.06),
                              transition: 'background-color 0.2s ease',
                              '&:hover': {
                                backgroundColor: theme => alpha(theme.palette.primary.main, 0.1)
                              }
                            }
                          }
                        )),
                        ...(filters.upload > 0 && networkMetrics?.outRate >= sliderValueToNetworkRate(filters.upload) && (
                          guestTypeFilter === 'all' ? {
                            '& td:nth-of-type(8)': { 
                              backgroundColor: theme => alpha(theme.palette.secondary.main, 0.06),
                              transition: 'background-color 0.2s ease',
                              '&:hover': {
                                backgroundColor: theme => alpha(theme.palette.secondary.main, 0.1)
                              }
                            }
                          } : {
                            '& td:nth-of-type(7)': { 
                              backgroundColor: theme => alpha(theme.palette.secondary.main, 0.06),
                              transition: 'background-color 0.2s ease',
                              '&:hover': {
                                backgroundColor: theme => alpha(theme.palette.secondary.main, 0.1)
                              }
                            }
                          }
                        ))
                      }}>
                        <TableCell sx={{ padding: 0 }}>
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            width: '100%',
                            height: '100%',
                            py: 1
                          }}>
                            {guest.type === 'qemu' ? (
                              <Tooltip title="Virtual Machine">
                                <Box
                                  sx={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'info.main',
                                    fontSize: '0.7rem',
                                    opacity: 0.8,
                                    minWidth: '20px'
                                  }}
                                >
                                  <ComputerIcon sx={{ fontSize: '0.8rem' }} />
                                </Box>
                              </Tooltip>
                            ) : (
                              <Tooltip title="LXC Container">
                                <Box
                                  sx={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'success.main',
                                    fontSize: '0.7rem',
                                    opacity: 0.8,
                                    minWidth: '20px'
                                  }}
                                >
                                  <StorageOutlinedIcon sx={{ fontSize: '0.8rem' }} />
                                </Box>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                        
                        <TableCell>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontWeight: 500,
                              fontFamily: 'monospace',
                              color: theme => darkMode ? 'text.secondary' : 'text.primary'
                            }}
                            title={guest.id} // Show full ID on hover
                          >
                            {extractNumericId(guest.id)}
                          </Typography>
                        </TableCell>
                        
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
                              ↓ {formatNetworkRate(networkMetrics.inRate ?? 0)}
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
                              ↑ {formatNetworkRate(networkMetrics.outRate ?? 0)}
                            </Typography>
                          ) : (
                            <Typography variant="body2" color="text.disabled" noWrap>
                              ↑ -
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontFamily: 'monospace',
                              color: theme => darkMode ? 'text.secondary' : 'text.primary',
                              opacity: isRunning ? 1 : 0.7
                            }}
                          >
                            {isRunning ? formatUptime(metrics?.metrics?.uptime || 0) : '-'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={guestTypeFilter === 'all' ? 8 : 8} align="center" sx={{ py: 8 }}>
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
                    <TableCell 
                      colSpan={9} 
                      align="center" 
                      sx={{ 
                        py: 6,
                        width: '100%',
                        '& > div': {
                          width: '100%'
                        }
                      }}
                    >
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        py: 2,
                        width: '100%'
                      }}>
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
