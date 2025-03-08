import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Accordion, 
  AccordionSummary, 
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RefreshIcon from '@mui/icons-material/Refresh';
import BugReportIcon from '@mui/icons-material/BugReport';
import { formatBytes, formatPercentage } from '../../utils/formatters';
import { detectCpuValueFormat, normalizeCpuValue } from '../../utils/metricsDebugger';

/**
 * Component for debugging metrics data
 */
const MetricsDebugPanel = ({ rawMetrics, formattedMetrics }) => {
  const [expanded, setExpanded] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);
  
  // Force refresh
  const handleRefresh = () => {
    setRefreshCounter(prev => prev + 1);
  };
  
  // Sample metrics for testing
  const [sampleMetrics, setSampleMetrics] = useState([
    { type: 'Decimal CPU (0-1)', value: 0.05, normalized: normalizeCpuValue(0.05) },
    { type: 'Percentage CPU (0-100)', value: 25, normalized: normalizeCpuValue(25) },
    { type: 'High CPU (>100)', value: 150, normalized: normalizeCpuValue(150) },
    { type: 'Zero CPU', value: 0, normalized: normalizeCpuValue(0) },
  ]);
  
  // Update sample metrics when refresh is triggered
  useEffect(() => {
    setSampleMetrics([
      { type: 'Decimal CPU (0-1)', value: Math.random(), normalized: normalizeCpuValue(Math.random()) },
      { type: 'Percentage CPU (0-100)', value: Math.random() * 100, normalized: normalizeCpuValue(Math.random() * 100) },
      { type: 'High CPU (>100)', value: 100 + Math.random() * 100, normalized: normalizeCpuValue(100 + Math.random() * 100) },
      { type: 'Zero CPU', value: 0, normalized: normalizeCpuValue(0) },
    ]);
  }, [refreshCounter]);
  
  // Extract metrics data for display
  const metricsData = React.useMemo(() => {
    if (!rawMetrics || !Array.isArray(rawMetrics) || rawMetrics.length === 0) {
      return [];
    }
    
    return rawMetrics.map(metric => {
      if (!metric || !metric.guestId) return null;
      
      const cpuValue = typeof metric.cpu === 'number' ? metric.cpu : null;
      const cpuFormat = cpuValue !== null ? detectCpuValueFormat(cpuValue) : 'unknown';
      const normalizedCpu = cpuValue !== null ? normalizeCpuValue(cpuValue) : null;
      
      return {
        guestId: metric.guestId,
        cpu: cpuValue,
        cpuFormat,
        normalizedCpu,
        memory: typeof metric.memory === 'number' ? metric.memory : null,
        memoryTotal: typeof metric.memoryTotal === 'number' ? metric.memoryTotal : null,
        memoryPercentage: (metric.memory && metric.memoryTotal) ? (metric.memory / metric.memoryTotal) * 100 : null,
        netIn: typeof metric.netIn === 'number' ? metric.netIn : null,
        netOut: typeof metric.netOut === 'number' ? metric.netOut : null,
      };
    }).filter(Boolean);
  }, [rawMetrics, refreshCounter]);
  
  // Extract formatted metrics data for display
  const formattedMetricsData = React.useMemo(() => {
    if (!formattedMetrics || !formattedMetrics.cpu) {
      return [];
    }
    
    const guestIds = Object.keys(formattedMetrics.cpu);
    
    return guestIds.map(guestId => {
      const cpu = formattedMetrics.cpu[guestId];
      const memory = formattedMetrics.memory[guestId];
      const disk = formattedMetrics.disk[guestId];
      const network = formattedMetrics.network[guestId];
      
      return {
        guestId,
        cpuUsage: cpu?.usage ?? null,
        memoryUsed: memory?.used ?? null,
        memoryTotal: memory?.total ?? null,
        memoryPercentage: memory?.usagePercent ?? null,
        diskUsed: disk?.used ?? null,
        diskTotal: disk?.total ?? null,
        diskPercentage: disk?.usagePercent ?? null,
        netIn: network?.inRate ?? null,
        netOut: network?.outRate ?? null,
      };
    });
  }, [formattedMetrics, refreshCounter]);
  
  return (
    <Accordion 
      expanded={expanded} 
      onChange={() => setExpanded(!expanded)}
      sx={{ 
        mt: 2, 
        mb: 2,
        border: '1px dashed',
        borderColor: 'warning.main',
        '&:before': { display: 'none' }
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{ 
          bgcolor: 'warning.light',
          color: 'warning.contrastText',
          '& .MuiAccordionSummary-content': {
            alignItems: 'center'
          }
        }}
      >
        <BugReportIcon sx={{ mr: 1 }} />
        <Typography variant="subtitle1" fontWeight="bold">
          Metrics Debug Panel
        </Typography>
        <Tooltip title="Refresh data">
          <IconButton 
            size="small" 
            onClick={(e) => { 
              e.stopPropagation(); 
              handleRefresh(); 
            }}
            sx={{ ml: 2 }}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            CPU Value Normalization Test
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Type</TableCell>
                  <TableCell>Raw Value</TableCell>
                  <TableCell>Format</TableCell>
                  <TableCell>Normalized (0-100%)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sampleMetrics.map((sample, index) => (
                  <TableRow key={index}>
                    <TableCell>{sample.type}</TableCell>
                    <TableCell>{sample.value.toFixed(4)}</TableCell>
                    <TableCell>{detectCpuValueFormat(sample.value)}</TableCell>
                    <TableCell>{sample.normalized.toFixed(2)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
        
        {metricsData.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Raw Metrics Data ({metricsData.length} guests)
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Guest ID</TableCell>
                    <TableCell>CPU Value</TableCell>
                    <TableCell>CPU Format</TableCell>
                    <TableCell>Normalized CPU</TableCell>
                    <TableCell>Memory</TableCell>
                    <TableCell>Network In</TableCell>
                    <TableCell>Network Out</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {metricsData.slice(0, 5).map((metric, index) => (
                    <TableRow key={index}>
                      <TableCell>{metric.guestId}</TableCell>
                      <TableCell>{metric.cpu !== null ? metric.cpu.toFixed(4) : 'N/A'}</TableCell>
                      <TableCell>{metric.cpuFormat}</TableCell>
                      <TableCell>{metric.normalizedCpu !== null ? `${metric.normalizedCpu.toFixed(2)}%` : 'N/A'}</TableCell>
                      <TableCell>
                        {metric.memory !== null && metric.memoryTotal !== null
                          ? `${formatBytes(metric.memory)} / ${formatBytes(metric.memoryTotal)} (${formatPercentage(metric.memoryPercentage)})`
                          : 'N/A'
                        }
                      </TableCell>
                      <TableCell>{metric.netIn !== null ? formatBytes(metric.netIn) + '/s' : 'N/A'}</TableCell>
                      <TableCell>{metric.netOut !== null ? formatBytes(metric.netOut) + '/s' : 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {metricsData.length > 5 && (
              <Typography variant="caption" color="text.secondary">
                Showing 5 of {metricsData.length} guests
              </Typography>
            )}
          </Box>
        )}
        
        {formattedMetricsData.length > 0 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Formatted Metrics Data ({formattedMetricsData.length} guests)
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Guest ID</TableCell>
                    <TableCell>CPU Usage</TableCell>
                    <TableCell>Memory</TableCell>
                    <TableCell>Disk</TableCell>
                    <TableCell>Network In</TableCell>
                    <TableCell>Network Out</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {formattedMetricsData.slice(0, 5).map((metric, index) => (
                    <TableRow key={index}>
                      <TableCell>{metric.guestId}</TableCell>
                      <TableCell>{metric.cpuUsage !== null ? `${metric.cpuUsage.toFixed(2)}%` : 'N/A'}</TableCell>
                      <TableCell>
                        {metric.memoryUsed !== null && metric.memoryTotal !== null
                          ? `${formatBytes(metric.memoryUsed)} / ${formatBytes(metric.memoryTotal)} (${formatPercentage(metric.memoryPercentage)})`
                          : 'N/A'
                        }
                      </TableCell>
                      <TableCell>
                        {metric.diskUsed !== null && metric.diskTotal !== null
                          ? `${formatBytes(metric.diskUsed)} / ${formatBytes(metric.diskTotal)} (${formatPercentage(metric.diskPercentage)})`
                          : 'N/A'
                        }
                      </TableCell>
                      <TableCell>{metric.netIn !== null ? formatBytes(metric.netIn) + '/s' : 'N/A'}</TableCell>
                      <TableCell>{metric.netOut !== null ? formatBytes(metric.netOut) + '/s' : 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {formattedMetricsData.length > 5 && (
              <Typography variant="caption" color="text.secondary">
                Showing 5 of {formattedMetricsData.length} guests
              </Typography>
            )}
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  );
};

export default MetricsDebugPanel; 