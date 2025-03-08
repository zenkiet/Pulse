import React, { useMemo } from 'react';
import {
  TableRow,
  TableCell,
  Typography,
  Box,
  Chip
} from '@mui/material';
import { StatusIndicator, ProgressWithLabel } from './UIComponents';
import { formatBytes, formatNetworkRate, formatUptime, formatPercentage } from '../../utils/formatters';
import { calculateDynamicColumnWidths } from '../../utils/networkUtils';

const NetworkTableRow = ({ 
  guest, 
  metrics, 
  columnVisibility, 
  getNodeName,
  extractNumericId,
  forceUpdateCounter
}) => {
  // Determine if the guest is running
  const isRunning = guest.status.toLowerCase() === 'running';
  
  // Get metrics for this guest
  const cpuMetrics = metrics?.cpu?.[guest.id] || null;
  const memoryMetrics = metrics?.memory?.[guest.id] || null;
  const diskMetrics = metrics?.disk?.[guest.id] || null;
  const networkMetrics = metrics?.network?.[guest.id] || null;
  
  // Determine guest type
  const isVM = guest.type === 'qemu';
  const guestTypeLabel = isVM ? 'VM' : 'CT';
  const guestTypeColor = isVM ? 'primary' : 'secondary';
  
  // Get the CPU usage value
  const cpuUsage = cpuMetrics?.usage ?? 0;
  
  // Get memory usage
  const memoryUsage = memoryMetrics?.usagePercent ?? 0;
  
  // Get disk usage
  const diskUsage = diskMetrics?.usagePercent ?? 0;
  
  // Get network rates
  const networkInRate = networkMetrics?.inRate ?? 0;
  const networkOutRate = networkMetrics?.outRate ?? 0;
  
  // Check if any columns are visible
  const hasVisibleColumns = Object.values(columnVisibility).some(col => col.visible);
  
  // If no columns are visible, don't render the row
  if (!hasVisibleColumns) {
    return null;
  }
  
  // Calculate dynamic column widths based on visible columns
  const columnWidths = useMemo(() => {
    return calculateDynamicColumnWidths(columnVisibility);
  }, [columnVisibility, forceUpdateCounter]);
  
  return (
    <TableRow
      hover
      sx={{
        '&:last-child td, &:last-child th': { border: 0 },
        opacity: isRunning ? 1 : 0.7,
      }}
    >
      {/* Node Column */}
      {columnVisibility.node.visible && (
        <TableCell sx={{ width: columnWidths.node, minWidth: 80 }}>
          <Typography variant="body2" noWrap>
            {getNodeName(guest.node)}
          </Typography>
        </TableCell>
      )}
      
      {/* Type Column */}
      {columnVisibility.type.visible && (
        <TableCell sx={{ width: columnWidths.type, minWidth: 50 }}>
          <Chip
            label={guestTypeLabel}
            color={guestTypeColor}
            size="small"
            variant="outlined"
            sx={{ 
              minWidth: 36, 
              height: 22,
              fontSize: '0.7rem',
              fontWeight: 600
            }}
          />
        </TableCell>
      )}
      
      {/* ID Column */}
      {columnVisibility.id.visible && (
        <TableCell sx={{ width: columnWidths.id, minWidth: 70 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <StatusIndicator status={guest.status} />
            <Typography 
              variant="body2" 
              sx={{ ml: 1.5 }}
              noWrap
            >
              {extractNumericId(guest.id)}
            </Typography>
          </Box>
        </TableCell>
      )}
      
      {/* Name Column */}
      {columnVisibility.name.visible && (
        <TableCell sx={{ width: columnWidths.name, minWidth: 150 }}>
          <Typography 
            variant="body2" 
            sx={{ 
              fontWeight: 500,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: 200
            }}
          >
            {guest.name}
          </Typography>
        </TableCell>
      )}
      
      {/* CPU Column */}
      {columnVisibility.cpu.visible && (
        <TableCell sx={{ width: columnWidths.cpu, minWidth: 120 }}>
          <ProgressWithLabel 
            value={cpuUsage} 
            color={cpuUsage > 80 ? "error" : cpuUsage > 60 ? "warning" : "primary"}
            disabled={!isRunning}
            tooltipText={isRunning ? 
              `CPU: ${formatPercentage(cpuUsage)} utilized` : 
              "System is not running"}
          />
        </TableCell>
      )}
      
      {/* Memory Column */}
      {columnVisibility.memory.visible && (
        <TableCell sx={{ width: columnWidths.memory, minWidth: 120 }}>
          <ProgressWithLabel 
            value={memoryUsage} 
            color={memoryUsage > 80 ? "error" : memoryUsage > 60 ? "warning" : "primary"}
            disabled={!isRunning}
            tooltipText={isRunning ? 
              memoryMetrics?.total ? 
                `Memory: ${formatBytes(memoryMetrics.used || 0)} / ${formatBytes(memoryMetrics.total)} (${formatPercentage(memoryUsage)})` :
                `Memory: ${formatPercentage(memoryUsage)} utilized` : 
              "System is not running"}
          />
        </TableCell>
      )}
      
      {/* Disk Column */}
      {columnVisibility.disk.visible && (
        <TableCell sx={{ width: columnWidths.disk, minWidth: 120 }}>
          <ProgressWithLabel 
            value={diskUsage} 
            color={diskUsage > 80 ? "error" : diskUsage > 60 ? "warning" : "primary"}
            disabled={!isRunning}
            tooltipText={isRunning ? 
              diskMetrics?.total ? 
                `Disk: ${formatBytes(diskMetrics.used || 0)} / ${formatBytes(diskMetrics.total)} (${formatPercentage(diskUsage)})` :
                `Disk: ${formatPercentage(diskUsage)} utilized` : 
              "System is not running"}
          />
        </TableCell>
      )}
      
      {/* Download Column */}
      {columnVisibility.download.visible && (
        <TableCell sx={{ width: columnWidths.download, minWidth: 100 }}>
          {isRunning && networkMetrics ? (
            <Typography variant="body2" color="primary" noWrap fontWeight="medium">
              ↓ {formatNetworkRate(networkInRate)}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.disabled" noWrap>
              ↓ -
            </Typography>
          )}
        </TableCell>
      )}
      
      {/* Upload Column */}
      {columnVisibility.upload.visible && (
        <TableCell sx={{ width: columnWidths.upload, minWidth: 100 }}>
          {isRunning && networkMetrics ? (
            <Typography variant="body2" color="secondary" noWrap fontWeight="medium">
              ↑ {formatNetworkRate(networkOutRate)}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.disabled" noWrap>
              ↑ -
            </Typography>
          )}
        </TableCell>
      )}
      
      {/* Uptime Column */}
      {columnVisibility.uptime.visible && (
        <TableCell sx={{ width: columnWidths.uptime, minWidth: 80 }}>
          <Typography 
            variant="body2" 
            color={isRunning ? "text.primary" : "text.disabled"}
            noWrap
          >
            {isRunning ? formatUptime(guest.uptime) : "-"}
          </Typography>
        </TableCell>
      )}
    </TableRow>
  );
};

export default NetworkTableRow; 