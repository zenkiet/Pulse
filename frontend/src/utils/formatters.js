// Helper function to format bytes
export const formatBytes = (bytes, decimals = 2) => {
  if (bytes === undefined || bytes === null || isNaN(bytes) || bytes === 0) return '0 B';
  
  const k = 1024;
  const dm = 0; // No decimals
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  // Ensure bytes is a positive number
  bytes = Math.abs(bytes);
  
  // Calculate the appropriate size index
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  
  // Ensure i is within bounds of the sizes array
  if (i < 0 || i >= sizes.length) {
    console.error(`Invalid size index: ${i} for bytes: ${bytes}`);
    return `${bytes} B`; // Fallback to bytes with B unit
  }
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Format network rate with unit information
 * @param {number} bytesPerSecond - The network rate in bytes per second
 * @param {string} unit - Optional unit information ('bytes', 'KB', 'MB', 'GB')
 * @returns {string} Formatted string with appropriate unit
 */
export const formatNetworkRate = (bytesPerSecond, unit = 'bytes') => {
  if (bytesPerSecond === null || bytesPerSecond === undefined) {
    return 'N/A';
  }
  
  // If the unit is specified, convert the value back to bytes for consistent formatting
  let bytesValue = bytesPerSecond;
  if (unit === 'KB') {
    bytesValue = bytesPerSecond * 1024;
  } else if (unit === 'MB') {
    bytesValue = bytesPerSecond * 1024 * 1024;
  } else if (unit === 'GB') {
    bytesValue = bytesPerSecond * 1024 * 1024 * 1024;
  }
  
  const units = ['B/s', 'KB/s', 'MB/s', 'GB/s', 'TB/s'];
  let value = bytesValue;
  let unitIndex = 0;
  
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  
  // Format with appropriate precision
  return value < 10 ? 
    `${value.toFixed(1)} ${units[unitIndex]}` : 
    `${Math.round(value)} ${units[unitIndex]}`;
};

// Helper function to format percentage
export const formatPercentage = (value) => {
  if (value === undefined || value === null || isNaN(value)) return '0%';
  return `${Math.round(value)}%`;
};

// Helper function to format uptime duration
export const formatUptime = (seconds) => {
  if (seconds === undefined || seconds === null || isNaN(seconds) || seconds === 0) return '-';
  
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
};

// Helper function to format network rates for filter display
export const formatNetworkRateForFilter = (bytesPerSecond) => {
  if (bytesPerSecond === undefined || bytesPerSecond === null || isNaN(bytesPerSecond) || bytesPerSecond === 0) return '0 B/s';
  
  // Simplified format for filter display
  const kb = bytesPerSecond / 1024;
  if (kb < 1000) {
    return `${Math.round(kb)} KB/s`;
  } else {
    return `${Math.round(kb/1024)} MB/s`;
  }
};

// Convert slider value (0-100) to actual bytes per second
export const sliderValueToNetworkRate = (value) => {
  // Max realistic rate for filter: ~10 MB/s = 10485760 B/s
  return value * 104858; // This gives us a range from 0 to ~10 MB/s
};

// Convert network rate to slider value (0-100)
export const networkRateToSliderValue = (bytesPerSecond) => {
  return Math.min(100, Math.round(bytesPerSecond / 104858));
};

/**
 * Format bytes with unit information
 * @param {number} bytes - The bytes value to format
 * @param {string} unit - Optional unit information ('bytes', 'KB', 'MB', 'GB')
 * @returns {string} Formatted string with appropriate unit
 */
export const formatBytesWithUnit = (bytes, unit = 'bytes') => {
  if (bytes === null || bytes === undefined) {
    return 'N/A';
  }
  
  // If the unit is specified, convert the value back to bytes for consistent formatting
  let bytesValue = bytes;
  if (unit === 'KB') {
    bytesValue = bytes * 1024;
  } else if (unit === 'MB') {
    bytesValue = bytes * 1024 * 1024;
  } else if (unit === 'GB') {
    bytesValue = bytes * 1024 * 1024 * 1024;
  }
  
  // Now format using the standard formatter
  return formatBytes(bytesValue);
}; 