import { useMemo } from 'react';

/**
 * Custom hook to transform metrics data from the useSocket hook into the format expected by the components
 * Uses space-efficient data representations for important metrics
 * @param {Array} metricsData - The metrics data from the useSocket hook
 * @returns {Object} The transformed metrics data
 */
const useFormattedMetrics = (metricsData) => {
  return useMemo(() => {
    // Initialize the structure
    const result = {
      cpu: {},
      memory: {},
      disk: {},
      network: {}
    };

    // If no metrics data, return empty structure
    if (!metricsData || !Array.isArray(metricsData) || metricsData.length === 0) {
      return result;
    }

    // Process each metric in the array
    metricsData.forEach(metric => {
      if (!metric || !metric.guestId) {
        return;
      }
      
      const guestId = metric.guestId;
      
      // Extract metrics from the metrics object structure
      const metricData = metric.metrics || {};
      
      // CPU metrics - store as integer percentage (0-100)
      if (typeof metricData.cpu === 'number') {
        const cpuValue = metricData.cpu;
        // Convert to integer percentage if needed (assuming it's already a percentage)
        const cpuPercentage = Math.round(cpuValue);
        
        result.cpu[guestId] = {
          usage: cpuPercentage
        };
      }
      
      // Memory metrics - store values in appropriate units
      const memoryData = metricData.memory || {};
      if (memoryData) {
        // Store percentage as integer (0-100)
        const memoryPercentage = memoryData.usedPercentage !== undefined 
          ? Math.round(memoryData.usedPercentage)
          : (memoryData.total && memoryData.used 
              ? Math.round((memoryData.used / memoryData.total) * 100) 
              : 0);
        
        result.memory[guestId] = {
          used: memoryData.used,
          total: memoryData.total,
          usagePercent: memoryPercentage
        };
      }
      
      // Disk metrics - store values in appropriate units
      const diskData = metricData.disk || {};
      if (diskData) {
        // Store percentage as integer (0-100)
        const diskPercentage = diskData.usedPercentage !== undefined
          ? Math.round(diskData.usedPercentage)
          : (diskData.total && diskData.used 
              ? Math.round((diskData.used / diskData.total) * 100) 
              : 0);
        
        result.disk[guestId] = {
          used: diskData.used,
          total: diskData.total,
          usagePercent: diskPercentage
        };
      }
      
      // Network metrics - round to appropriate precision
      const networkData = metricData.network || {};
      if (networkData) {
        // Round network rates to integers if they're small, or to 2 decimal places if large
        const inRate = networkData.inRate || 0;
        const outRate = networkData.outRate || 0;
        
        result.network[guestId] = {
          // Use appropriate precision based on value size
          inRate: inRate < 1000 ? Math.round(inRate) : inRate,
          outRate: outRate < 1000 ? Math.round(outRate) : outRate
        };
      }
    });
    
    return result;
  }, [metricsData]);
};

export default useFormattedMetrics; 