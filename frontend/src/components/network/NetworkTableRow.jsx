import React, { useMemo } from 'react';
import {
  TableRow,
  TableCell,
  Typography,
  Box,
  Chip,
  Tooltip
} from '@mui/material';
import { StatusIndicator, ProgressWithLabel } from './UIComponents';
import { formatBytes, formatNetworkRate, formatUptime, formatPercentage, formatBytesWithUnit } from '../../utils/formatters';
import { calculateDynamicColumnWidths } from '../../utils/networkUtils';

const NetworkTableRow = ({ 
  guest, 
  metrics, 
  columnVisibility, 
  getNodeName,
  extractNumericId,
  columnOrder,
  activeFilteredColumns = {}
}) => {
  // Determine if the guest is running
  const isRunning = guest.status?.toLowerCase() === 'running';
  
  // Get metrics for this guest
  const cpuMetrics = metrics?.cpu?.[guest?.id] || null;
  const memoryMetrics = metrics?.memory?.[guest?.id] || null;
  const diskMetrics = metrics?.disk?.[guest?.id] || null;
  const networkMetrics = metrics?.network?.[guest?.id] || null;
  
  // Determine guest type
  const isVM = guest.type === 'qemu';
  const guestTypeLabel = isVM ? 'VM' : 'CT';
  const guestTypeColor = isVM ? 'primary' : 'secondary';
  
  // Get the CPU usage value
  const cpuUsage = cpuMetrics?.usage ?? 0;
  
  // Get memory usage with unit awareness
  const memoryUsage = memoryMetrics?.usagePercent ?? 0;
  const memoryUnit = memoryMetrics?.unit || 'bytes';
  const memoryTotal = memoryMetrics?.total ?? 0;
  const memoryUsed = memoryMetrics?.used ?? 0;
  
  // Get disk usage with unit awareness
  const diskUsage = diskMetrics?.usagePercent ?? 0;
  const diskUnit = diskMetrics?.unit || 'bytes';
  const diskTotal = diskMetrics?.total ?? 0;
  const diskUsed = diskMetrics?.used ?? 0;
  
  // Get network rates with unit awareness
  const downloadRate = networkMetrics?.inRate ?? 0;
  const uploadRate = networkMetrics?.outRate ?? 0;
  
  // Get uptime
  const uptime = guest.uptime ?? 0;
  
  // Calculate dynamic column widths based on visible columns
  const columnWidths = useMemo(() => {
    return calculateDynamicColumnWidths(columnVisibility);
  }, [columnVisibility]);
  
  // Get visible columns in the correct order
  const visibleColumns = useMemo(() => {
    if (!columnOrder || !Array.isArray(columnOrder) || columnOrder.length === 0) {
      return [];
    }
    
    // Filter visible columns and sort them according to columnOrder
    return columnOrder
      .filter(id => columnVisibility[id]?.visible)
      .map(id => ({ id, ...columnVisibility[id] }))
      .filter(Boolean);
  }, [columnVisibility, columnOrder]);

  // Render cell content based on column ID
  const renderCellContent = (columnId) => {
    if (!columnId) return null;
    
    switch (columnId) {
      case 'node':
        return (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="body2" noWrap>
              {getNodeName(guest?.node)}
            </Typography>
          </Box>
        );
      case 'type':
        return (
          <Typography 
            variant="caption" 
            sx={{ 
              color: isVM ? 'primary.main' : 'secondary.main',
              fontWeight: 'medium',
              fontSize: '0.7rem',
              padding: '2px 4px',
              border: '1px solid',
              borderColor: isVM ? 'primary.main' : 'secondary.main',
              borderRadius: '4px',
              display: 'inline-block',
              lineHeight: 1,
              textAlign: 'center'
            }}
          >
            {guestTypeLabel}
          </Typography>
        );
      case 'id':
        return (
          <Typography variant="body2" color="text.secondary">
            {extractNumericId(guest?.id)}
          </Typography>
        );
      case 'status':
        return (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            width: '100%',
            height: '100%'
          }}>
            <Tooltip title={isRunning ? 'Running' : 'Stopped'}>
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <StatusIndicator status={isRunning ? 'running' : 'stopped'} />
              </Box>
            </Tooltip>
          </Box>
        );
      case 'name':
        return (
          <Typography variant="body2" noWrap>
            {guest?.name}
          </Typography>
        );
      case 'cpu':
        return (
          <ProgressWithLabel 
            value={cpuUsage} 
            label={`${formatPercentage(cpuUsage)}`} 
            color={cpuUsage > 90 ? 'error' : cpuUsage > 70 ? 'warning' : 'primary'}
          />
        );
      case 'memory':
        return (
          <ProgressWithLabel 
            value={memoryUsage} 
            label={`${formatBytesWithUnit(memoryUsed, memoryUnit)} / ${formatBytesWithUnit(memoryTotal, memoryUnit)}`} 
            color={memoryUsage > 90 ? 'error' : memoryUsage > 70 ? 'warning' : 'primary'}
          />
        );
      case 'disk':
        return (
          <ProgressWithLabel 
            value={diskUsage} 
            label={`${formatBytesWithUnit(diskUsed, diskUnit)} / ${formatBytesWithUnit(diskTotal, diskUnit)}`} 
            color={diskUsage > 90 ? 'error' : diskUsage > 70 ? 'warning' : 'primary'}
          />
        );
      case 'download':
        return (
          <Typography variant="body2" color="text.secondary">
            {formatNetworkRate(downloadRate)}
          </Typography>
        );
      case 'upload':
        return (
          <Typography variant="body2" color="text.secondary">
            {formatNetworkRate(uploadRate)}
          </Typography>
        );
      case 'uptime':
        return (
          <Typography variant="body2" color="text.secondary">
            {isRunning ? formatUptime(uptime) : '—'}
          </Typography>
        );
      default:
        return null;
    }
  };

  return (
    <TableRow 
      hover
      sx={{ 
        opacity: isRunning ? 1 : 0.6,
        '&:hover': {
          opacity: 1
        }
      }}
    >
      {/* Render cells based on column order */}
      {Array.isArray(visibleColumns) && visibleColumns.length > 0 ? (
        visibleColumns.map(column => (
          column && (
            <TableCell 
              key={column.id}
              sx={{ 
                width: columnWidths?.[column.id] || 'auto',
                minWidth: getMinWidthForColumn(column.id),
                backgroundColor: activeFilteredColumns[column.id] ? 'rgba(25, 118, 210, 0.04)' : 'inherit',
                ...(column.id === 'status' && {
                  textAlign: 'center',
                  padding: '0px 8px'
                })
              }}
            >
              {renderCellContent(column.id)}
            </TableCell>
          )
        ))
      ) : (
        <TableCell colSpan={2}>No visible columns</TableCell>
      )}
    </TableRow>
  );
};

// Helper function to get minimum width for each column
const getMinWidthForColumn = (columnId) => {
  const minWidths = {
    node: 70,
    type: 35,    // Reduced from 45px to make it more compact
    id: 60,
    status: 40,   // Reduced from 90px since we're only showing the icon now
    name: 130,
    cpu: 100,
    memory: 100,
    disk: 100,
    download: 90,
    upload: 90,
    uptime: 70
  };
  
  return minWidths[columnId] || 90;
};

export default NetworkTableRow; 