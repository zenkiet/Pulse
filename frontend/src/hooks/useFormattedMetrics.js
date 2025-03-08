import { useMemo } from 'react';

/**
 * Custom hook to transform metrics data from the useSocket hook into the format expected by the components
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
      // In the original code, metrics were accessed as metrics.metrics.cpu, etc.
      const metricData = metric.metrics || {};
      
      // CPU metrics
      if (typeof metricData.cpu === 'number') {
        result.cpu[guestId] = {
          usage: metricData.cpu
        };
      }
      
      // Memory metrics
      const memoryData = metricData.memory || {};
      if (memoryData) {
        result.memory[guestId] = {
          used: memoryData.used,
          total: memoryData.total,
          usagePercent: memoryData.percentUsed || 
            (memoryData.total && memoryData.used ? 
              (memoryData.used / memoryData.total) * 100 : 0)
        };
      }
      
      // Disk metrics
      const diskData = metricData.disk || {};
      if (diskData) {
        result.disk[guestId] = {
          used: diskData.used,
          total: diskData.total,
          usagePercent: diskData.percentUsed || 
            (diskData.total && diskData.used ? 
              (diskData.used / diskData.total) * 100 : 0)
        };
      }
      
      // Network metrics
      const networkData = metricData.network || {};
      if (networkData) {
        result.network[guestId] = {
          inRate: networkData.inRate || 0,
          outRate: networkData.outRate || 0
        };
      }
    });
    
    return result;
  }, [metricsData]);
};

export default useFormattedMetrics; 