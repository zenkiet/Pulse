import { useState, useCallback, useEffect } from 'react';
import {
  STORAGE_KEY_COLUMN_VISIBILITY,
  STORAGE_KEY_COLUMN_ORDER,
  DEFAULT_COLUMN_CONFIG
} from '../../../constants/networkConstants';

const useColumnManagement = (showNotification) => {
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
  
  // State for forcing re-renders
  const [forceUpdateCounter, setForceUpdateCounter] = useState(0);
  
  // Function to force a re-render
  const forceUpdate = useCallback(() => {
    setForceUpdateCounter(prev => prev + 1);
  }, []);
  
  // Toggle column visibility
  const toggleColumnVisibility = useCallback((columnId) => {
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
  }, [showNotification]);
  
  // Reset column visibility to defaults
  const resetColumnVisibility = useCallback(() => {
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
  }, [openColumnMenu, forceUpdate, showNotification]);
  
  // Handle column menu open
  const handleColumnMenuOpen = useCallback((event) => {
    setColumnMenuAnchorEl(event.currentTarget);
  }, []);
  
  // Handle column menu close
  const handleColumnMenuClose = useCallback(() => {
    setColumnMenuAnchorEl(null);
  }, []);
  
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

  return {
    columnVisibility,
    setColumnVisibility,
    columnOrder,
    setColumnOrder,
    columnMenuAnchorEl,
    openColumnMenu,
    forceUpdateCounter,
    forceUpdate,
    toggleColumnVisibility,
    resetColumnVisibility,
    handleColumnMenuOpen,
    handleColumnMenuClose
  };
};

export default useColumnManagement; 