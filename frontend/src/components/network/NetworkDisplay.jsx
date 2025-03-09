import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import useSocket from '../../hooks/useSocket';
import useFormattedMetrics from '../../hooks/useFormattedMetrics';
import useMockMetrics from '../../hooks/useMockMetrics';
import { useThemeContext } from '../../context/ThemeContext';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  CircularProgress,
  Table,
  TableContainer,
  Paper,
  IconButton,
  Badge,
  ClickAwayListener,
  useTheme,
  Snackbar,
  Alert,
  Popover,
  InputBase,
  Chip,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  MenuItem,
  Switch,
  Slider,
  TextField,
  Autocomplete
} from '@mui/material';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import SearchIcon from '@mui/icons-material/Search';
import ComputerIcon from '@mui/icons-material/Computer';
import DnsIcon from '@mui/icons-material/Dns';
import ViewListIcon from '@mui/icons-material/ViewList';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import TuneIcon from '@mui/icons-material/Tune';
import ClearIcon from '@mui/icons-material/Clear';

// Import constants
import {
  STORAGE_KEY_FILTERS,
  STORAGE_KEY_SORT,
  STORAGE_KEY_SHOW_STOPPED,
  STORAGE_KEY_SHOW_FILTERS,
  STORAGE_KEY_SEARCH_TERMS,
  STORAGE_KEY_COLUMN_VISIBILITY,
  STORAGE_KEY_GUEST_TYPE_FILTER,
  DEFAULT_COLUMN_CONFIG,
  STORAGE_KEY_COLUMN_ORDER,
  STORAGE_KEY_COLUMN_DRAG_ENABLED
} from '../../constants/networkConstants';

// Import components
import ConnectionErrorDisplay from './ConnectionErrorDisplay';
import NetworkFilters from './NetworkFilters';
import NetworkTableHeader from './NetworkTableHeader';
import NetworkTableBody from './NetworkTableBody';

// Import utilities
import { getSortedAndFilteredData, getNodeFilteredGuests as nodeFilteredGuestsUtil, getNodeName as getNodeNameUtil, extractNumericId as extractNumericIdUtil } from '../../utils/networkUtils';

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
  
  // Use the formatted metrics hook
  const formattedMetrics = useFormattedMetrics(metricsData);
  
  // Use mock metrics for testing - but only if we're not using real mock data from the server
  const mockMetrics = useMockMetrics(guestData);
  
  // Combine real and mock metrics, preferring real metrics if available
  const combinedMetrics = useMemo(() => {
    // When using the mock data server, always use the real metrics
    const useMockData = localStorage.getItem('use_mock_data') === 'true' || 
                        localStorage.getItem('MOCK_DATA_ENABLED') === 'true';
    
    if (useMockData) {
      return formattedMetrics;
    }
    
    // Otherwise, fall back to the previous behavior
    const hasRealCpuMetrics = formattedMetrics?.cpu && Object.keys(formattedMetrics.cpu).length > 0;
    const hasRealMemoryMetrics = formattedMetrics?.memory && Object.keys(formattedMetrics.memory).length > 0;
    const hasRealDiskMetrics = formattedMetrics?.disk && Object.keys(formattedMetrics.disk).length > 0;
    const hasRealNetworkMetrics = formattedMetrics?.network && Object.keys(formattedMetrics.network).length > 0;
    
    // If we have real metrics, use them; otherwise, use mock metrics
    return {
      cpu: hasRealCpuMetrics ? formattedMetrics.cpu : mockMetrics.cpu,
      memory: hasRealMemoryMetrics ? formattedMetrics.memory : mockMetrics.memory,
      disk: hasRealDiskMetrics ? formattedMetrics.disk : mockMetrics.disk,
      network: hasRealNetworkMetrics ? formattedMetrics.network : mockMetrics.network
    };
  }, [formattedMetrics, mockMetrics]);
  
  const theme = useTheme();
  const { darkMode } = useThemeContext();
  
  // State for filter menu
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const openFilters = Boolean(filterAnchorEl);
  
  // State for search popover
  const [searchAnchorEl, setSearchAnchorEl] = useState(null);
  const openSearch = Boolean(searchAnchorEl);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearchTerms, setActiveSearchTerms] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SEARCH_TERMS);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Error loading active search terms:', e);
      return [];
    }
  });
  const searchInputRef = useRef(null);
  
  // State for type popover
  const [typeAnchorEl, setTypeAnchorEl] = useState(null);
  const openType = Boolean(typeAnchorEl);
  
  // State for visibility popover
  const [visibilityAnchorEl, setVisibilityAnchorEl] = useState(null);
  const openVisibility = Boolean(visibilityAnchorEl);
  
  // State for tracking which slider is being dragged
  const [sliderDragging, setSliderDragging] = useState(null);
  
  // Helper function to extract numeric ID from strings like "node-1-ct-105"
  const extractNumericId = useCallback((fullId) => {
    return extractNumericIdUtil(fullId);
  }, []);
  
  // Helper function to get the node name from the node ID
  const getNodeName = useCallback((nodeId) => {
    return getNodeNameUtil(nodeId, nodeData);
  }, [nodeData]);
  
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
  
  // Column visibility state
  const [columnVisibility, setColumnVisibility] = useState(() => {
    try {
      console.log('Initializing column visibility state');
      const saved = localStorage.getItem(STORAGE_KEY_COLUMN_VISIBILITY);
      if (saved) {
        console.log('Found saved column visibility:', saved);
        const parsed = JSON.parse(saved);
        // Ensure all columns from DEFAULT_COLUMN_CONFIG exist in the saved config
        const merged = { ...DEFAULT_COLUMN_CONFIG };
        Object.keys(parsed).forEach(key => {
          if (merged[key]) {
            merged[key].visible = parsed[key].visible;
          }
        });
        
        // Ensure at least one column is visible
        const hasVisibleColumn = Object.values(merged).some(col => col.visible);
        if (!hasVisibleColumn) {
          console.warn('No visible columns in saved config, resetting to defaults');
          return JSON.parse(JSON.stringify(DEFAULT_COLUMN_CONFIG));
        }
        
        console.log('Using merged column visibility:', merged);
        return merged;
      }
      console.log('No saved column visibility, using defaults');
      return JSON.parse(JSON.stringify(DEFAULT_COLUMN_CONFIG));
    } catch (e) {
      console.error('Error loading column visibility preferences:', e);
      return JSON.parse(JSON.stringify(DEFAULT_COLUMN_CONFIG));
    }
  });
  
  // Column order state
  const [columnOrder, setColumnOrder] = useState(() => {
    try {
      console.log('Initializing column order state');
      const defaultOrder = Object.keys(DEFAULT_COLUMN_CONFIG);
      
      const saved = localStorage.getItem(STORAGE_KEY_COLUMN_ORDER);
      if (saved) {
        console.log('Found saved column order:', saved);
        try {
          const parsed = JSON.parse(saved);
          
          // Validate the saved order - it should contain all columns from DEFAULT_COLUMN_CONFIG
          const isValid = 
            Array.isArray(parsed) && 
            parsed.length === defaultOrder.length && 
            defaultOrder.every(col => parsed.includes(col));
          
          if (isValid) {
            console.log('Using saved column order:', parsed);
            return parsed;
          } else {
            console.warn('Invalid saved column order, using default order');
          }
        } catch (parseError) {
          console.error('Error parsing saved column order:', parseError);
        }
      }
      
      console.log('Using default column order:', defaultOrder);
      return defaultOrder;
    } catch (e) {
      console.error('Error loading column order preferences:', e);
      const fallbackOrder = Object.keys(DEFAULT_COLUMN_CONFIG || {});
      console.log('Using fallback column order:', fallbackOrder);
      return fallbackOrder;
    }
  });
  
  // Column settings menu state
  const [columnMenuAnchorEl, setColumnMenuAnchorEl] = useState(null);
  const openColumnMenu = Boolean(columnMenuAnchorEl);
  
  // Snackbar state for notifications
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');
  
  // Handle snackbar close
  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };
  
  // Show a notification
  const showNotification = (message, severity = 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };
  
  // Toggle column visibility
  const toggleColumnVisibility = (columnId) => {
    try {
      setColumnVisibility(prev => {
        if (!prev || !prev[columnId]) {
          console.error('Invalid column configuration:', prev);
          return prev;
        }
        
        // Check if this is the last visible column and we're trying to hide it
        const isLastVisibleColumn = 
          Object.values(prev).filter(col => col.visible).length === 1 && 
          prev[columnId].visible;
        
        // If this is the last visible column and we're trying to hide it, don't allow it
        if (isLastVisibleColumn) {
          // Show a console warning
          console.warn('Cannot hide the last visible column');
          // Show a notification to the user
          setTimeout(() => {
            showNotification('At least one column must remain visible', 'warning');
          }, 0);
          // Return the previous state unchanged
          return prev;
        }
        
        const updated = {
          ...prev,
          [columnId]: {
            ...prev[columnId],
            visible: !prev[columnId].visible
          }
        };
        return updated;
      });
    } catch (error) {
      console.error('Error toggling column visibility:', error);
    }
  };
  
  // State for forcing re-renders
  const [forceUpdateCounter, setForceUpdateCounter] = useState(0);
  
  // Function to force a re-render
  const forceUpdate = () => {
    setForceUpdateCounter(prev => prev + 1);
  };
  
  // Reset column visibility to defaults
  const resetColumnVisibility = () => {
    console.log('Resetting column visibility to defaults');
    
    // Create a new configuration with all columns set to visible
    const allVisibleConfig = {};
    if (DEFAULT_COLUMN_CONFIG) {
      Object.keys(DEFAULT_COLUMN_CONFIG).forEach(key => {
        allVisibleConfig[key] = {
          ...DEFAULT_COLUMN_CONFIG[key],
          visible: true // Force all columns to be visible
        };
      });
    }
    
    console.log('New config with all columns visible:', allVisibleConfig);
    
    // Clear the localStorage entries to ensure a clean state
    try {
      localStorage.removeItem(STORAGE_KEY_COLUMN_VISIBILITY);
      localStorage.removeItem(STORAGE_KEY_COLUMN_ORDER);
      console.log('Cleared column preferences from localStorage');
    } catch (error) {
      console.error('Error clearing column preferences from localStorage:', error);
    }
    
    // Set the state with the new config where all columns are visible
    setColumnVisibility(allVisibleConfig);
    
    // Reset column order to default
    if (DEFAULT_COLUMN_CONFIG) {
      setColumnOrder(Object.keys(DEFAULT_COLUMN_CONFIG));
    }
    
    // Force a re-render of the table
    setTimeout(() => {
      forceUpdate();
      console.log('Forced table re-render');
    }, 50);
    
    // Show a notification to confirm the action
    showNotification('All columns are now visible', 'success');
    
    // Close the column menu if it's open
    if (openColumnMenu) {
      handleColumnMenuClose();
    }
  };
  
  // Handle column menu open
  const handleColumnMenuOpen = (event) => {
    setColumnMenuAnchorEl(event.currentTarget);
  };
  
  // Handle column menu close
  const handleColumnMenuClose = () => {
    setColumnMenuAnchorEl(null);
  };
  
  // Save column visibility preferences whenever they change
  useEffect(() => {
    try {
      console.log('Column visibility changed, saving to localStorage');
      
      // Check if columnVisibility is valid
      if (!columnVisibility || Object.keys(columnVisibility).length === 0) {
        console.error('Invalid column visibility state, resetting to defaults');
        setColumnVisibility(JSON.parse(JSON.stringify(DEFAULT_COLUMN_CONFIG)));
        return;
      }
      
      // Ensure at least one column is visible
      const hasVisibleColumn = Object.values(columnVisibility).some(col => col.visible);
      if (!hasVisibleColumn) {
        console.error('No visible columns in state, not saving to localStorage');
        return;
      }
      
      // Save to localStorage
      localStorage.setItem(STORAGE_KEY_COLUMN_VISIBILITY, JSON.stringify(columnVisibility));
      console.log('Saved column visibility to localStorage');
    } catch (error) {
      console.error('Error saving column visibility:', error);
    }
  }, [columnVisibility]);
  
  // Save column order preferences whenever they change
  useEffect(() => {
    try {
      console.log('Column order changed, saving to localStorage');
      
      // Check if columnOrder is valid
      if (!columnOrder || !Array.isArray(columnOrder) || columnOrder.length === 0) {
        console.error('Invalid column order state, resetting to defaults');
        setColumnOrder(Object.keys(DEFAULT_COLUMN_CONFIG));
        return;
      }
      
      // Save to localStorage
      localStorage.setItem(STORAGE_KEY_COLUMN_ORDER, JSON.stringify(columnOrder));
      console.log('Saved column order to localStorage');
    } catch (error) {
      console.error('Error saving column order:', error);
    }
  }, [columnOrder]);
  
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
  
  // Add a ref for the filter button
  const filterButtonRef = useRef(null);
  
  // Add a ref for the search button
  const searchButtonRef = useRef(null);
  
  // Filter popover handlers
  const handleFilterButtonClick = (event) => {
    setFilterAnchorEl(event.currentTarget);
  };
  
  const handleCloseFilterPopover = () => {
    setFilterAnchorEl(null);
  };
  
  // Search popover handlers
  const handleSearchButtonClick = (event) => {
    setSearchAnchorEl(event.currentTarget);
    // Focus the search input after a short delay to ensure the popover is open
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 100);
  };
  
  const handleCloseSearchPopover = () => {
    setSearchAnchorEl(null);
  };
  
  // System type popover handlers
  const handleTypeButtonClick = (event) => {
    setTypeAnchorEl(event.currentTarget);
  };
  
  const handleCloseTypePopover = () => {
    setTypeAnchorEl(null);
  };
  
  // Visibility popover handlers
  const handleVisibilityButtonClick = (event) => {
    setVisibilityAnchorEl(event.currentTarget);
  };
  
  const handleCloseVisibilityPopover = () => {
    setVisibilityAnchorEl(null);
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
      const saved = localStorage.getItem(STORAGE_KEY_GUEST_TYPE_FILTER);
      return saved ? JSON.parse(saved) : 'all'; // Default: 'all' (show both VMs and LXCs)
    } catch (e) {
      console.error('Error loading guest type filter preference:', e);
      return 'all'; // Default to showing all guest types
    }
  });
  
  // Filter guests based on selected node
  const getNodeFilteredGuests = useCallback((guests) => {
    return nodeFilteredGuestsUtil(guests, selectedNode);
  }, [selectedNode]);
  
  // Save guest type filter preference whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_GUEST_TYPE_FILTER, JSON.stringify(guestTypeFilter));
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
    setActiveSearchTerms([]);
    setSearchTerm('');
    setShowStopped(false);
    setGuestTypeFilter('all');
  }, []);
  
  // Set up keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Immediately return if search popover is open
      if (openSearch) {
        return;
      }
      
      // Don't trigger shortcuts if typing in an input field
      if (
        e.target.tagName === 'INPUT' || 
        e.target.tagName === 'TEXTAREA' || 
        e.target.isContentEditable
      ) {
        return;
      }
      
      // Escape key to close filters or clear search
      if (e.key === 'Escape') {
        // Close any open popovers
        if (openFilters) {
          setFilterAnchorEl(null);
        }
        if (openSearch) {
          setSearchAnchorEl(null);
        }
        if (openType) {
          setTypeAnchorEl(null);
        }
        if (openVisibility) {
          setVisibilityAnchorEl(null);
        }
        if (openColumnMenu) {
          setColumnMenuAnchorEl(null);
        }
        
        // Reset all filters
        resetFilters();
        
        // Set flag to prevent other shortcuts from triggering
        setEscRecentlyPressed(true);
        setTimeout(() => setEscRecentlyPressed(false), 300);
        
        // Show notification
        showNotification('All filters have been cleared', 'info');
        return;
      }
      
      // Ctrl+F or Cmd+F to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        handleSearchButtonClick({ currentTarget: searchButtonRef.current });
        return;
      }
      
      // / to focus search
      if (e.key === '/' && !escRecentlyPressed) {
        e.preventDefault();
        handleSearchButtonClick({ currentTarget: searchButtonRef.current });
        return;
      }
      
      // Capture typing for search (only if it's a single printable character)
      const isPrintableChar = 
        e.key.length === 1 && 
        !e.ctrlKey && 
        !e.metaKey && 
        !e.altKey && 
        !e.key.match(/^F\d+$/); // Exclude function keys like F1-F12
      
      if (isPrintableChar && !openSearch) {
        // Open search popover and set the search term to the pressed key
        handleSearchButtonClick({ currentTarget: searchButtonRef.current });
        // Set a small timeout to ensure the search input is ready
        setTimeout(() => {
          setSearchTerm(e.key);
        }, 50);
      }
    };
    
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [
    showFilters, 
    searchTerm, 
    activeSearchTerms, 
    escRecentlyPressed, 
    openFilters, 
    openSearch, 
    openType, 
    openVisibility, 
    openColumnMenu, 
    resetFilters,
    handleSearchButtonClick
  ]);
  
  // Get sorted and filtered data
  const sortedAndFilteredData = useMemo(() => {
    // First filter by node
    const nodeFilteredData = selectedNode === 'all' 
      ? guestData 
      : getNodeFilteredGuests(guestData);
    
    // Then apply all other filters and sorting
    return getSortedAndFilteredData(
      nodeFilteredData,
      sortConfig,
      filters,
      showStopped,
      activeSearchTerms,
      searchTerm,
      combinedMetrics,
      guestTypeFilter,
      nodeData
    );
  }, [
    guestData, 
    combinedMetrics, 
    sortConfig, 
    filters, 
    showStopped, 
    activeSearchTerms, 
    searchTerm, 
    selectedNode, 
    getNodeFilteredGuests,
    guestTypeFilter,
    nodeData
  ]);
  
  // Format percentage for display
  const formatPercentage = (value) => {
    return `${value}%`;
  };
  
  // Format network rate for filter display
  const formatNetworkRateForFilter = (value) => {
    if (value === 0) return '0 KB/s';
    if (value <= 10) return `${value * 10} KB/s`;
    if (value <= 50) return `${(value - 10) * 20 + 100} KB/s`;
    if (value <= 80) return `${(value - 50) * 50 + 900} KB/s`;
    return `${(value - 80) * 500 + 2400} KB/s`;
  };
  
  // Determine which columns have active filters
  const activeFilteredColumns = useMemo(() => {
    const result = {};
    
    // Resource filters
    if (filters.cpu > 0) result.cpu = true;
    if (filters.memory > 0) result.memory = true;
    if (filters.disk > 0) result.disk = true;
    if (filters.download > 0) result.netIn = true;
    if (filters.upload > 0) result.netOut = true;
    
    // Search terms - determine which column to highlight based on the search term
    if (activeSearchTerms.length > 0 || searchTerm) {
      const allTerms = [...activeSearchTerms];
      if (searchTerm) allTerms.push(searchTerm);
      
      // Check each term and determine which column(s) to highlight
      allTerms.forEach(term => {
        const termLower = term.trim().toLowerCase();
        
        // Check for exact type matches first
        if (termLower === 'ct' || termLower === 'container') {
          result.type = true;
          return; // Skip other checks for this term
        }
        
        if (termLower === 'vm' || termLower === 'virtual machine') {
          result.type = true;
          return; // Skip other checks for this term
        }
        
        // Check if term is a numeric ID
        if (/^\d+$/.test(termLower)) {
          result.id = true;
        } 
        // Check if term matches type-related keywords
        else if (['qemu', 'lxc'].includes(termLower)) {
          result.type = true;
        }
        // Check if term matches status-related keywords
        else if (['running', 'stopped', 'online', 'offline', 'active', 'inactive'].includes(termLower)) {
          result.status = true;
        }
        // Check if term might be a node name
        else if (nodeData && nodeData.some(node => 
          (node.name && node.name.toLowerCase().includes(termLower)) || 
          (node.id && node.id.toLowerCase().includes(termLower))
        )) {
          result.node = true;
        }
        // Default to name column for other terms
        else {
          result.name = true;
        }
      });
    }
    
    // Guest type filter affects the type column
    if (guestTypeFilter !== 'all') {
      result.type = true;
    }
    
    // Only highlight status column for show/hide stopped systems if it's not the default state
    // By default, showStopped is false, so we only highlight when it's true (showing stopped systems)
    if (showStopped) {
      result.status = true;
    }
    
    return result;
  }, [filters, activeSearchTerms, searchTerm, guestTypeFilter, showStopped, nodeData]);
  
  // Show loading state if not connected
  if (!isConnected && connectionStatus !== 'error' && connectionStatus !== 'disconnected') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  // Show error state if there's a connection error
  if (connectionStatus === 'error' || connectionStatus === 'disconnected') {
    return (
      <ConnectionErrorDisplay 
        connectionStatus={connectionStatus} 
        error={error} 
        onReconnect={reconnect}
      />
    );
  }
  
  // Function to add a search term
  const addSearchTerm = (term) => {
    if (!activeSearchTerms.includes(term)) {
      setActiveSearchTerms([...activeSearchTerms, term]);
    }
  };
  
  // Function to remove a search term
  const removeSearchTerm = (term) => {
    setActiveSearchTerms(activeSearchTerms.filter(t => t !== term));
  };
  
  // Update filter value
  const updateFilter = (filterName, newValue) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: newValue
    }));
  };
  
  // Handle slider drag start
  const handleSliderDragStart = (filterName) => {
    setSliderDragging(filterName);
  };
  
  // Handle slider drag end
  const handleSliderDragEnd = () => {
    setSliderDragging(null);
  };
  
  // Clear a specific filter
  const clearFilter = (filterName) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: 0
    }));
  };
  
  // Request sort by key
  const requestSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };
  
  return (
    <Box sx={{ width: '100%' }}>
      <Box>
        {/* Header with buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" component="h2" gutterBottom>
            Systems
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {/* Column visibility button */}
            <IconButton
              onClick={handleColumnMenuOpen}
              color={openColumnMenu ? 'primary' : 'default'}
              size="small"
              aria-controls={openColumnMenu ? 'column-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={openColumnMenu ? 'true' : undefined}
              sx={{ 
                border: '1px solid',
                borderColor: openColumnMenu ? 'primary.main' : 'divider',
                borderRadius: 1,
                p: 0.5
              }}
            >
              <Badge
                badgeContent={Object.keys(DEFAULT_COLUMN_CONFIG).length - Object.values(columnVisibility).filter(col => col.visible).length}
                color="primary"
                invisible={Object.values(columnVisibility).filter(col => col.visible).length === Object.keys(DEFAULT_COLUMN_CONFIG).length}
              >
                <ViewColumnIcon />
              </Badge>
            </IconButton>
            
            {/* Search button */}
            <IconButton
              ref={searchButtonRef}
              onClick={handleSearchButtonClick}
              color={openSearch ? 'primary' : 'default'}
              size="small"
              aria-controls={openSearch ? 'search-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={openSearch ? 'true' : undefined}
              sx={{ 
                border: '1px solid',
                borderColor: openSearch ? 'primary.main' : 'divider',
                borderRadius: 1,
                p: 0.5
              }}
            >
              <Badge
                badgeContent={activeSearchTerms.length}
                color="primary"
                invisible={activeSearchTerms.length === 0}
              >
                <SearchIcon />
              </Badge>
            </IconButton>
            
            {/* System type button */}
            <IconButton
              onClick={handleTypeButtonClick}
              color={openType ? 'primary' : 'default'}
              size="small"
              aria-controls={openType ? 'type-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={openType ? 'true' : undefined}
              sx={{ 
                border: '1px solid',
                borderColor: openType ? 'primary.main' : 'divider',
                borderRadius: 1,
                p: 0.5
              }}
            >
              <Badge
                badgeContent={guestTypeFilter !== 'all' ? 1 : 0}
                color="primary"
                invisible={guestTypeFilter === 'all'}
              >
                {guestTypeFilter === 'vm' ? <ComputerIcon /> : 
                 guestTypeFilter === 'ct' ? <DnsIcon /> : 
                 <ViewListIcon />}
              </Badge>
            </IconButton>
            
            {/* Visibility button */}
            <IconButton
              onClick={handleVisibilityButtonClick}
              color={openVisibility ? 'primary' : 'default'}
              size="small"
              aria-controls={openVisibility ? 'visibility-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={openVisibility ? 'true' : undefined}
              sx={{ 
                border: '1px solid',
                borderColor: openVisibility ? 'primary.main' : 'divider',
                borderRadius: 1,
                p: 0.5
              }}
            >
              {showStopped ? <VisibilityIcon /> : <VisibilityOffIcon />}
            </IconButton>
            
            {/* Resource thresholds button */}
            <IconButton
              onClick={handleFilterButtonClick}
              color={openFilters ? 'primary' : 'default'}
              ref={filterButtonRef}
              data-filter-button="true"
              size="small"
              aria-controls={openFilters ? 'filter-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={openFilters ? 'true' : undefined}
              sx={{ 
                border: '1px solid',
                borderColor: openFilters ? 'primary.main' : 'divider',
                borderRadius: 1,
                p: 0.5
              }}
            >
              <Badge
                badgeContent={
                  (filters.cpu > 0 ? 1 : 0) + 
                  (filters.memory > 0 ? 1 : 0) + 
                  (filters.disk > 0 ? 1 : 0) + 
                  (filters.download > 0 ? 1 : 0) + 
                  (filters.upload > 0 ? 1 : 0)
                }
                color="primary"
                invisible={
                  filters.cpu === 0 && 
                  filters.memory === 0 && 
                  filters.disk === 0 && 
                  filters.download === 0 && 
                  filters.upload === 0
                }
              >
                <TuneIcon />
              </Badge>
            </IconButton>
          </Box>
        </Box>
        
        {/* Search popover */}
        <Popover
          id="search-menu"
          anchorEl={searchAnchorEl}
          open={openSearch}
          onClose={handleCloseSearchPopover}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          PaperProps={{
            elevation: 3,
            sx: { 
              borderRadius: 2,
              overflow: 'hidden'
            }
          }}
        >
          <Paper sx={{ width: 350, p: 0, overflow: 'hidden' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" gutterBottom>
                Search Systems
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Search for specific systems by name, ID, or other properties.
              </Typography>
            </Box>
            
            <Box sx={{ p: 2 }}>
              <Box
                component="form"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (searchTerm.trim()) {
                    addSearchTerm(searchTerm.trim());
                    setSearchTerm('');
                  }
                }}
                sx={{ display: 'flex', alignItems: 'center' }}
              >
                <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search systems..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchTerm.trim()) {
                      e.preventDefault();
                      addSearchTerm(searchTerm.trim());
                      setSearchTerm('');
                    }
                  }}
                  inputRef={searchInputRef}
                  autoFocus
                  variant="standard"
                  InputProps={{
                    disableUnderline: true,
                    endAdornment: searchTerm ? (
                      <IconButton
                        size="small"
                        aria-label="clear search"
                        onClick={() => setSearchTerm('')}
                        sx={{ p: 0.5 }}
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    ) : null
                  }}
                  sx={{ flex: 1 }}
                />
              </Box>
            
              {activeSearchTerms.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    Active Search Terms
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {activeSearchTerms.map((term) => (
                      <Chip
                        key={term}
                        label={term}
                        size="small"
                        onDelete={() => removeSearchTerm(term)}
                      />
                    ))}
                  </Box>
                </Box>
              )}
              
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button 
                  size="small" 
                  onClick={() => {
                    setActiveSearchTerms([]);
                    setSearchTerm('');
                    handleCloseSearchPopover();
                  }}
                >
                  Clear All
                </Button>
              </Box>
            </Box>
          </Paper>
        </Popover>
        
        {/* System type popover */}
        <Popover
          id="type-menu"
          anchorEl={typeAnchorEl}
          open={openType}
          onClose={handleCloseTypePopover}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          PaperProps={{
            elevation: 3,
            sx: { 
              borderRadius: 2,
              overflow: 'hidden'
            }
          }}
        >
          <Paper sx={{ width: 300, p: 0, overflow: 'hidden' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" gutterBottom>
                System Type
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Filter systems by their type.
              </Typography>
            </Box>
            
            <Box sx={{ p: 2 }}>
              <ToggleButtonGroup
                value={guestTypeFilter}
                exclusive
                onChange={(event, newValue) => {
                  if (newValue !== null) {
                    setGuestTypeFilter(newValue);
                    handleCloseTypePopover();
                  }
                }}
                aria-label="system type filter"
                size="small"
                sx={{ 
                  width: '100%',
                  '& .MuiToggleButton-root': {
                    borderRadius: 1.5,
                    py: 1,
                    textTransform: 'none',
                    fontWeight: 500,
                    '&.Mui-selected': {
                      backgroundColor: 'primary.main',
                      color: 'primary.contrastText',
                      '&:hover': {
                        backgroundColor: 'primary.dark',
                      },
                      '& .MuiSvgIcon-root': {
                        color: 'primary.contrastText'
                      }
                    },
                    '&:hover': {
                      backgroundColor: 'action.hover'
                    }
                  },
                  '& .MuiToggleButtonGroup-grouped': {
                    mx: 0.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    '&:not(:first-of-type)': {
                      borderLeft: '1px solid',
                      borderLeftColor: 'divider',
                    },
                    '&:first-of-type': {
                      ml: 0
                    },
                    '&:last-of-type': {
                      mr: 0
                    }
                  }
                }}
              >
                <ToggleButton value="all" aria-label="all systems" sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ViewListIcon fontSize="small" sx={{ mr: 1 }} />
                    All Systems
                  </Box>
                </ToggleButton>
                <ToggleButton value="vm" aria-label="virtual machines only" sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ComputerIcon fontSize="small" sx={{ mr: 1 }} />
                    VMs Only
                  </Box>
                </ToggleButton>
                <ToggleButton value="ct" aria-label="containers only" sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <DnsIcon fontSize="small" sx={{ mr: 1 }} />
                    CTs Only
                  </Box>
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Paper>
        </Popover>
        
        {/* Visibility popover */}
        <Popover
          id="visibility-menu"
          anchorEl={visibilityAnchorEl}
          open={openVisibility}
          onClose={handleCloseVisibilityPopover}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          PaperProps={{
            elevation: 3,
            sx: { 
              borderRadius: 2,
              overflow: 'hidden'
            }
          }}
        >
          <Paper sx={{ width: 300, p: 0, overflow: 'hidden' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" gutterBottom>
                System Visibility
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Control which systems are visible.
              </Typography>
            </Box>
            
            <Box sx={{ p: 2 }}>
              <MenuItem dense onClick={() => {
                setShowStopped(!showStopped);
                handleCloseVisibilityPopover();
              }}
              sx={{
                borderRadius: 1.5,
                '&:hover': {
                  backgroundColor: 'action.hover'
                }
              }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  width: '100%',
                  justifyContent: 'space-between'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {showStopped ? (
                      <VisibilityIcon fontSize="small" color="primary" sx={{ mr: 1 }} />
                    ) : (
                      <VisibilityOffIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                    )}
                    <Typography variant="body2">
                      {showStopped ? 'Hide Stopped Systems' : 'Show Stopped Systems'}
                    </Typography>
                  </Box>
                  <Switch
                    checked={showStopped}
                    onChange={(e) => {
                      setShowStopped(e.target.checked);
                      handleCloseVisibilityPopover();
                    }}
                    size="small"
                  />
                </Box>
              </MenuItem>
            </Box>
          </Paper>
        </Popover>
        
        {/* Resource thresholds popover */}
        <Popover
          id="filter-menu"
          anchorEl={filterAnchorEl}
          open={openFilters}
          onClose={handleCloseFilterPopover}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          PaperProps={{
            elevation: 3,
            sx: { 
              borderRadius: 2,
              overflow: 'hidden'
            }
          }}
        >
          <Paper sx={{ width: 350, p: 0, overflow: 'hidden' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" gutterBottom>
                Resource Thresholds
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Filter systems by resource usage thresholds.
              </Typography>
            </Box>
            
            <Box sx={{ p: 2 }}>
              {/* CPU Filter */}
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    CPU Usage
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatPercentage(filters.cpu)}+
                  </Typography>
                </Box>
                <Slider
                  value={filters.cpu}
                  onChange={(e, newValue) => updateFilter('cpu', newValue)}
                  onMouseDown={() => handleSliderDragStart('cpu')}
                  onMouseUp={handleSliderDragEnd}
                  aria-labelledby="cpu-filter-slider"
                  valueLabelDisplay="auto"
                  valueLabelFormat={formatPercentage}
                  min={0}
                  max={100}
                  size="small"
                />
              </Box>
              
              {/* Memory Filter */}
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    Memory Usage
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatPercentage(filters.memory)}+
                  </Typography>
                </Box>
                <Slider
                  value={filters.memory}
                  onChange={(e, newValue) => updateFilter('memory', newValue)}
                  onMouseDown={() => handleSliderDragStart('memory')}
                  onMouseUp={handleSliderDragEnd}
                  aria-labelledby="memory-filter-slider"
                  valueLabelDisplay="auto"
                  valueLabelFormat={formatPercentage}
                  min={0}
                  max={100}
                  size="small"
                />
              </Box>
              
              {/* Disk Filter */}
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    Disk Usage
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatPercentage(filters.disk)}+
                  </Typography>
                </Box>
                <Slider
                  value={filters.disk}
                  onChange={(e, newValue) => updateFilter('disk', newValue)}
                  onMouseDown={() => handleSliderDragStart('disk')}
                  onMouseUp={handleSliderDragEnd}
                  aria-labelledby="disk-filter-slider"
                  valueLabelDisplay="auto"
                  valueLabelFormat={formatPercentage}
                  min={0}
                  max={100}
                  size="small"
                />
              </Box>
              
              {/* Network Download Filter */}
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    Download Rate
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatNetworkRateForFilter(filters.download)}+
                  </Typography>
                </Box>
                <Slider
                  value={filters.download}
                  onChange={(e, newValue) => updateFilter('download', newValue)}
                  onMouseDown={() => handleSliderDragStart('download')}
                  onMouseUp={handleSliderDragEnd}
                  aria-labelledby="download-filter-slider"
                  valueLabelDisplay="auto"
                  valueLabelFormat={formatNetworkRateForFilter}
                  min={0}
                  max={100}
                  size="small"
                />
              </Box>
              
              {/* Network Upload Filter */}
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    Upload Rate
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatNetworkRateForFilter(filters.upload)}+
                  </Typography>
                </Box>
                <Slider
                  value={filters.upload}
                  onChange={(e, newValue) => updateFilter('upload', newValue)}
                  onMouseDown={() => handleSliderDragStart('upload')}
                  onMouseUp={handleSliderDragEnd}
                  aria-labelledby="upload-filter-slider"
                  valueLabelDisplay="auto"
                  valueLabelFormat={formatNetworkRateForFilter}
                  min={0}
                  max={100}
                  size="small"
                />
              </Box>
            </Box>
            
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button 
                size="small" 
                variant="outlined" 
                onClick={() => {
                  resetFilters();
                  handleCloseFilterPopover();
                }}
                startIcon={<FilterAltOffIcon />}
              >
                Reset All Thresholds
              </Button>
            </Box>
          </Paper>
        </Popover>
      </Box>
      
      {/* Main data table */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <TableContainer component={Paper} sx={{ maxHeight: 'calc(100vh - 200px)', overflow: 'auto' }}>
            <Table stickyHeader size="small" sx={{
              '& .MuiTableCell-stickyHeader': {
                borderBottom: '2px solid',
                borderBottomColor: 'divider',
                zIndex: 3 // Ensure the header stays above other elements
              }
            }}>
              <NetworkTableHeader
                sortConfig={sortConfig}
                requestSort={requestSort}
                columnVisibility={columnVisibility}
                toggleColumnVisibility={toggleColumnVisibility}
                resetColumnVisibility={resetColumnVisibility}
                columnMenuAnchorEl={columnMenuAnchorEl}
                handleColumnMenuOpen={handleColumnMenuOpen}
                handleColumnMenuClose={handleColumnMenuClose}
                openColumnMenu={openColumnMenu}
                forceUpdateCounter={forceUpdateCounter}
                columnOrder={columnOrder || Object.keys(DEFAULT_COLUMN_CONFIG)}
                setColumnOrder={setColumnOrder}
                activeFilteredColumns={activeFilteredColumns}
              />
              <NetworkTableBody
                sortedAndFilteredData={sortedAndFilteredData}
                guestData={guestData}
                metricsData={combinedMetrics}
                columnVisibility={columnVisibility}
                getNodeName={getNodeName}
                extractNumericId={extractNumericId}
                resetFilters={resetFilters}
                showStopped={showStopped}
                setShowStopped={setShowStopped}
                guestTypeFilter={guestTypeFilter}
                resetColumnVisibility={resetColumnVisibility}
                forceUpdateCounter={forceUpdateCounter}
                columnOrder={columnOrder || Object.keys(DEFAULT_COLUMN_CONFIG)}
                activeFilteredColumns={activeFilteredColumns}
              />
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
      
      {/* Notification Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity={snackbarSeverity} 
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default NetworkDisplay; 