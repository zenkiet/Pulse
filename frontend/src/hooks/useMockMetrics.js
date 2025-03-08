import { useState, useEffect } from 'react';

/**
 * Custom hook to provide mock metrics data for testing
 * @returns {Object} The mock metrics data
 */
const useMockMetrics = (guestData) => {
  const [mockMetrics, setMockMetrics] = useState({
    cpu: {},
    memory: {},
    disk: {},
    network: {}
  });

  // Generate initial mock metrics
  useEffect(() => {
    if (!guestData || guestData.length === 0) return;
    
    const newMockMetrics = {
      cpu: {},
      memory: {},
      disk: {},
      network: {}
    };
    
    guestData.forEach(guest => {
      // Generate random CPU usage between 5% and 80%
      newMockMetrics.cpu[guest.id] = {
        usage: Math.floor(Math.random() * 75) + 5
      };
      
      // Generate random memory usage between 10% and 90%
      const memoryPercent = Math.floor(Math.random() * 80) + 10;
      newMockMetrics.memory[guest.id] = {
        used: Math.floor(Math.random() * 8 * 1024 * 1024 * 1024) + 512 * 1024 * 1024, // 512MB to 8.5GB
        total: 16 * 1024 * 1024 * 1024, // 16GB
        usagePercent: memoryPercent
      };
      
      // Generate random disk usage between 20% and 95%
      const diskPercent = Math.floor(Math.random() * 75) + 20;
      newMockMetrics.disk[guest.id] = {
        used: Math.floor(Math.random() * 900 * 1024 * 1024 * 1024) + 100 * 1024 * 1024 * 1024, // 100GB to 1TB
        total: 1024 * 1024 * 1024 * 1024, // 1TB
        usagePercent: diskPercent
      };
      
      // Generate random network rates
      newMockMetrics.network[guest.id] = {
        inRate: Math.floor(Math.random() * 10 * 1024 * 1024) + 1024, // 1KB/s to 10MB/s
        outRate: Math.floor(Math.random() * 5 * 1024 * 1024) + 1024 // 1KB/s to 5MB/s
      };
    });
    
    setMockMetrics(newMockMetrics);
  }, [guestData]);
  
  // Update mock metrics periodically
  useEffect(() => {
    if (!guestData || guestData.length === 0) return;
    
    const interval = setInterval(() => {
      setMockMetrics(prev => {
        const updated = { ...prev };
        
        // ... existing code ...
      });
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [guestData]);

  return mockMetrics;
};

export default useMockMetrics; 