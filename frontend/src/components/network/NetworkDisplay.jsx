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
  Alert
} from '@mui/material';
import FilterAltIcon from '@mui/icons-material/FilterAlt';

// Import constants
import {
  STORAGE_KEY_FILTERS,
  STORAGE_KEY_SORT,
  STORAGE_KEY_SHOW_STOPPED,
  STORAGE_KEY_SHOW_FILTERS,
  STORAGE_KEY_SEARCH_TERMS,
  STORAGE_KEY_COLUMN_VISIBILITY,
  DEFAULT_COLUMN_CONFIG
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
  
  // Use mock metrics for testing
  const mockMetrics = useMockMetrics(guestData);
  
  // Combine real and mock metrics, preferring real metrics if available
  const combinedMetrics = useMemo(() => {
    // Check if real metrics has any data
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
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = React.useRef(null);
  
  // Filter popover state - for displaying the filter panel
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const openFiltersPopover = Boolean(filterAnchorEl);
  
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
    Object.keys(DEFAULT_COLUMN_CONFIG).forEach(key => {
      allVisibleConfig[key] = {
        ...DEFAULT_COLUMN_CONFIG[key],
        visible: true // Force all columns to be visible
      };
    });
    
    console.log('New config with all columns visible:', allVisibleConfig);
    
    // Clear the localStorage entry to ensure a clean state
    try {
      localStorage.removeItem(STORAGE_KEY_COLUMN_VISIBILITY);
      console.log('Cleared column visibility from localStorage');
    } catch (error) {
      console.error('Error clearing column visibility from localStorage:', error);
    }
    
    // Set the state with the new config where all columns are visible
    setColumnVisibility(allVisibleConfig);
    
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
    return nodeFilteredGuestsUtil(guests, selectedNode);
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
    setActiveSearchTerms([]);
    setSearchTerm('');
    setShowStopped(false);
  }, []);
  
  // Set up keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
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
        if (showFilters) {
          setShowFilters(false);
          setEscRecentlyPressed(true);
          setTimeout(() => setEscRecentlyPressed(false), 300);
        } else if (searchTerm) {
          setSearchTerm('');
        } else if (activeSearchTerms.length > 0) {
          setActiveSearchTerms([]);
        }
      }
      
      // Ctrl+F or Cmd+F to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          if (!showFilters) {
            setShowFilters(true);
          }
        }
      }
      
      // / to focus search
      if (e.key === '/' && !escRecentlyPressed) {
        e.preventDefault();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          if (!showFilters) {
            setShowFilters(true);
          }
        }
      }
    };
    
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [showFilters, searchTerm, activeSearchTerms, escRecentlyPressed]);
  
  // Add search term to active terms
  const addSearchTerm = (term) => {
    if (term && !activeSearchTerms.includes(term)) {
      setActiveSearchTerms([...activeSearchTerms, term]);
    }
  };
  
  // Remove search term from active terms
  const removeSearchTerm = (termToRemove) => {
    setActiveSearchTerms(activeSearchTerms.filter(term => term !== termToRemove));
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
      guestTypeFilter
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
    guestTypeFilter
  ]);
  
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
  
  return (
    <Box sx={{ width: '100%' }}>
      <ClickAwayListener onClickAway={handleClickAway}>
        <Box>
          {/* Filter toggle button */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" component="h2" gutterBottom>
              Systems
            </Typography>
            <IconButton
              onClick={handleFilterButtonClick}
              color={showFilters ? 'primary' : 'default'}
              ref={filterButtonRef}
              data-filter-button="true"
              size="small"
              sx={{ 
                border: '1px solid',
                borderColor: showFilters ? 'primary.main' : 'divider',
                borderRadius: 1,
                p: 0.5
              }}
            >
              <Badge
                badgeContent={activeFilterCount}
                color="primary"
                invisible={activeFilterCount === 0}
              >
                <FilterAltIcon />
              </Badge>
            </IconButton>
          </Box>
          
          {/* Filters section */}
          <NetworkFilters
            filters={filters}
            updateFilter={updateFilter}
            clearFilter={clearFilter}
            resetFilters={resetFilters}
            showStopped={showStopped}
            setShowStopped={setShowStopped}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            activeSearchTerms={activeSearchTerms}
            addSearchTerm={addSearchTerm}
            removeSearchTerm={removeSearchTerm}
            activeFilterCount={activeFilterCount}
            showFilters={showFilters}
            handleSliderDragStart={handleSliderDragStart}
            handleSliderDragEnd={handleSliderDragEnd}
            searchInputRef={searchInputRef}
            guestTypeFilter={guestTypeFilter}
            setGuestTypeFilter={setGuestTypeFilter}
          />
        </Box>
      </ClickAwayListener>
      
      {/* Main data table */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <TableContainer component={Paper} elevation={0}>
            <Table size="small" aria-label="systems table">
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