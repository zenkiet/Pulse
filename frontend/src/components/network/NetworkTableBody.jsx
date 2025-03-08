import React, { useEffect } from 'react';
import {
  TableBody,
  TableRow,
  TableCell,
  Box,
  Typography,
  Chip,
  Button
} from '@mui/material';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import NetworkTableRow from './NetworkTableRow';

const NetworkTableBody = ({
  sortedAndFilteredData,
  guestData,
  metricsData,
  columnVisibility,
  getNodeName,
  extractNumericId,
  resetFilters,
  showStopped,
  setShowStopped,
  guestTypeFilter,
  resetColumnVisibility,
  forceUpdateCounter
}) => {
  // Check if any columns are visible
  const hasVisibleColumns = Object.values(columnVisibility).some(col => col.visible);
  
  // Force re-render when forceUpdateCounter changes
  useEffect(() => {
    if (forceUpdateCounter > 0) {
      console.log('NetworkTableBody re-rendering due to forceUpdateCounter:', forceUpdateCounter);
    }
  }, [forceUpdateCounter]);
  
  // If no columns are visible, show a message
  if (!hasVisibleColumns) {
    return (
      <TableBody>
        <TableRow>
          <TableCell colSpan={12} align="center" sx={{ py: 8 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2 }}>
              <VisibilityOffIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2, opacity: 0.6 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No Columns Visible
              </Typography>
              <Typography variant="body2" color="text.disabled" sx={{ mb: 2 }}>
                All columns are currently hidden. Please show at least one column.
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
                <Button 
                  variant="contained" 
                  color="primary" 
                  onClick={() => {
                    console.log('Reset button clicked in NetworkTableBody');
                    
                    // Direct reset - create a new configuration with all columns visible
                    const allVisibleConfig = {};
                    Object.keys(columnVisibility).forEach(key => {
                      allVisibleConfig[key] = {
                        ...columnVisibility[key],
                        visible: true // Force all columns to be visible
                      };
                    });
                    
                    // Call the resetColumnVisibility function from the parent
                    resetColumnVisibility();
                  }}
                  sx={{ mt: 1 }}
                >
                  Reset to Default Columns
                </Button>
                
                {/* Debug button - only visible in development */}
                {process.env.NODE_ENV === 'development' && (
                  <>
                    <Button 
                      variant="outlined" 
                      color="warning" 
                      onClick={() => {
                        console.log('Debug button clicked');
                        console.log('Current column visibility:', columnVisibility);
                        
                        // Log localStorage state
                        try {
                          const saved = localStorage.getItem('network_display_column_visibility');
                          console.log('Saved column visibility in localStorage:', saved);
                        } catch (error) {
                          console.error('Error reading localStorage:', error);
                        }
                      }}
                      size="small"
                      sx={{ mt: 1 }}
                    >
                      Debug Column State
                    </Button>
                    
                    <Button 
                      variant="outlined" 
                      color="error" 
                      onClick={() => {
                        console.log('Force reset button clicked');
                        
                        // Clear all localStorage entries related to the table
                        try {
                          localStorage.removeItem('network_display_column_visibility');
                          localStorage.removeItem('network_display_filters');
                          localStorage.removeItem('network_display_sort');
                          localStorage.removeItem('network_display_show_stopped');
                          localStorage.removeItem('network_display_show_filters');
                          localStorage.removeItem('network_display_search_terms');
                          console.log('Cleared all table settings from localStorage');
                          
                          // Reload the page to reset all state
                          window.location.reload();
                        } catch (error) {
                          console.error('Error clearing localStorage:', error);
                        }
                      }}
                      size="small"
                      sx={{ mt: 1 }}
                    >
                      Force Reset & Reload
                    </Button>
                  </>
                )}
              </Box>
            </Box>
          </TableCell>
        </TableRow>
      </TableBody>
    );
  }
  
  return (
    <TableBody>
      {sortedAndFilteredData.length > 0 ? (
        sortedAndFilteredData.map((guest) => (
          <NetworkTableRow
            key={guest.id}
            guest={guest}
            metrics={metricsData}
            columnVisibility={columnVisibility}
            getNodeName={getNodeName}
            extractNumericId={extractNumericId}
            forceUpdateCounter={forceUpdateCounter}
          />
        ))
      ) : (
        <TableRow>
          <TableCell colSpan={Object.values(columnVisibility).filter(col => col.visible).length + 1} align="center" sx={{ py: 8 }}>
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
            colSpan={Object.values(columnVisibility).filter(col => col.visible).length + 1} 
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
  );
};

export default NetworkTableBody; 