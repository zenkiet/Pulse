import React, { useMemo } from 'react';
import {
  TableHead,
  TableRow,
  TableCell,
  TableSortLabel,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  Badge,
  Divider,
  Typography,
  Button
} from '@mui/material';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { DEFAULT_COLUMN_CONFIG } from '../../constants/networkConstants';
import { calculateDynamicColumnWidths } from '../../utils/networkUtils';

const NetworkTableHeader = ({
  sortConfig,
  requestSort,
  columnVisibility,
  toggleColumnVisibility,
  resetColumnVisibility,
  columnMenuAnchorEl,
  handleColumnMenuOpen,
  handleColumnMenuClose,
  openColumnMenu,
  forceUpdateCounter
}) => {
  // Helper function to get sort direction
  const getSortDirection = (key) => {
    if (!sortConfig) return 'asc';
    return sortConfig.key === key ? sortConfig.direction : 'asc';
  };

  // Count visible columns
  const visibleColumnCount = Object.values(columnVisibility).filter(col => col.visible).length;
  
  // Check if any columns are visible
  const hasVisibleColumns = visibleColumnCount > 0;

  // Calculate dynamic column widths based on visible columns
  const columnWidths = useMemo(() => {
    return calculateDynamicColumnWidths(columnVisibility);
  }, [columnVisibility, forceUpdateCounter]);

  return (
    <TableHead>
      <TableRow>
        {/* If no columns are visible, show a message in the header */}
        {!hasVisibleColumns && (
          <TableCell colSpan={12} align="center">
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              py: 1
            }}>
              <VisibilityOffIcon sx={{ mr: 1, color: 'text.disabled' }} />
              <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
                All columns are hidden
              </Typography>
              <Button 
                size="small" 
                variant="outlined" 
                onClick={() => {
                  console.log('Reset button clicked in NetworkTableHeader');
                  
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
              >
                Reset Columns
              </Button>
            </Box>
          </TableCell>
        )}
        
        {/* Node Column */}
        {columnVisibility.node.visible && (
          <TableCell sx={{ width: columnWidths.node, minWidth: 80 }}>
            <TableSortLabel
              active={sortConfig.key === 'node'}
              direction={getSortDirection('node')}
              onClick={() => requestSort('node')}
            >
              Node
            </TableSortLabel>
          </TableCell>
        )}

        {/* Type Column */}
        {columnVisibility.type.visible && (
          <TableCell sx={{ width: columnWidths.type, minWidth: 50 }}>
            <TableSortLabel
              active={sortConfig.key === 'type'}
              direction={getSortDirection('type')}
              onClick={() => requestSort('type')}
            >
              Type
            </TableSortLabel>
          </TableCell>
        )}

        {/* ID Column */}
        {columnVisibility.id.visible && (
          <TableCell sx={{ width: columnWidths.id, minWidth: 70 }}>
            <TableSortLabel
              active={sortConfig.key === 'id'}
              direction={getSortDirection('id')}
              onClick={() => requestSort('id')}
            >
              ID
            </TableSortLabel>
          </TableCell>
        )}

        {/* Name Column */}
        {columnVisibility.name.visible && (
          <TableCell sx={{ width: columnWidths.name, minWidth: 150 }}>
            <TableSortLabel
              active={sortConfig.key === 'name'}
              direction={getSortDirection('name')}
              onClick={() => requestSort('name')}
            >
              Name
            </TableSortLabel>
          </TableCell>
        )}

        {/* CPU Column */}
        {columnVisibility.cpu.visible && (
          <TableCell sx={{ width: columnWidths.cpu, minWidth: 120 }}>
            <TableSortLabel
              active={sortConfig.key === 'cpu'}
              direction={getSortDirection('cpu')}
              onClick={() => requestSort('cpu')}
            >
              CPU
            </TableSortLabel>
          </TableCell>
        )}

        {/* Memory Column */}
        {columnVisibility.memory.visible && (
          <TableCell sx={{ width: columnWidths.memory, minWidth: 120 }}>
            <TableSortLabel
              active={sortConfig.key === 'memory'}
              direction={getSortDirection('memory')}
              onClick={() => requestSort('memory')}
            >
              Memory
            </TableSortLabel>
          </TableCell>
        )}

        {/* Disk Column */}
        {columnVisibility.disk.visible && (
          <TableCell sx={{ width: columnWidths.disk, minWidth: 120 }}>
            <TableSortLabel
              active={sortConfig.key === 'disk'}
              direction={getSortDirection('disk')}
              onClick={() => requestSort('disk')}
            >
              Disk
            </TableSortLabel>
          </TableCell>
        )}

        {/* Download Column */}
        {columnVisibility.download.visible && (
          <TableCell sx={{ width: columnWidths.download, minWidth: 100 }}>
            <TableSortLabel
              active={sortConfig.key === 'download'}
              direction={getSortDirection('download')}
              onClick={() => requestSort('download')}
            >
              Download
            </TableSortLabel>
          </TableCell>
        )}

        {/* Upload Column */}
        {columnVisibility.upload.visible && (
          <TableCell sx={{ width: columnWidths.upload, minWidth: 100 }}>
            <TableSortLabel
              active={sortConfig.key === 'upload'}
              direction={getSortDirection('upload')}
              onClick={() => requestSort('upload')}
            >
              Upload
            </TableSortLabel>
          </TableCell>
        )}

        {/* Uptime Column */}
        {columnVisibility.uptime.visible && (
          <TableCell sx={{ width: columnWidths.uptime, minWidth: 80 }}>
            <TableSortLabel
              active={sortConfig.key === 'uptime'}
              direction={getSortDirection('uptime')}
              onClick={() => requestSort('uptime')}
            >
              Uptime
            </TableSortLabel>
          </TableCell>
        )}

        {/* Column visibility menu button - always show this */}
        <TableCell padding="checkbox">
          <Tooltip title="Customize columns">
            <IconButton
              size="small"
              onClick={handleColumnMenuOpen}
              aria-controls={openColumnMenu ? 'column-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={openColumnMenu ? 'true' : undefined}
            >
              <Badge
                badgeContent={Object.keys(DEFAULT_COLUMN_CONFIG).length - visibleColumnCount}
                color="primary"
                invisible={visibleColumnCount === Object.keys(DEFAULT_COLUMN_CONFIG).length}
              >
                <ViewColumnIcon fontSize="small" />
              </Badge>
            </IconButton>
          </Tooltip>
          <Menu
            id="column-menu"
            anchorEl={columnMenuAnchorEl}
            open={openColumnMenu}
            onClose={handleColumnMenuClose}
            MenuListProps={{
              'aria-labelledby': 'column-visibility-button',
            }}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
          >
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Show/Hide Columns
              </Typography>
            </Box>
            <Divider />
            {Object.values(columnVisibility).map((column) => (
              <MenuItem
                key={column.id}
                onClick={() => toggleColumnVisibility(column.id)}
                dense
              >
                <Box
                  component="span"
                  sx={{
                    width: 20,
                    height: 20,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 0.5,
                    mr: 1,
                    bgcolor: column.visible ? 'primary.main' : 'transparent',
                    color: column.visible ? 'white' : 'transparent',
                  }}
                >
                  {column.visible && '✓'}
                </Box>
                {column.label}
              </MenuItem>
            ))}
            <Divider />
            <MenuItem 
              onClick={() => {
                console.log('Reset menu item clicked in NetworkTableHeader');
                
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
              dense
            >
              <Typography variant="body2" color="primary">
                Reset to Default
              </Typography>
            </MenuItem>
          </Menu>
        </TableCell>
      </TableRow>
    </TableHead>
  );
};

export default NetworkTableHeader; 