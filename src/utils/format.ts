/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === undefined || bytes === null || isNaN(bytes) || bytes === 0) return '0 B';
  
  const k = 1024;
  const dm = decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format percentage to string with % symbol
 */
export function formatPercentage(value: number): string {
  if (value === undefined || value === null || isNaN(value)) return '0%';
  return `${Math.round(value)}%`;
}

/**
 * Convert bytes to megabytes
 */
export function bytesToMB(bytes: number): number {
  return bytes / (1024 * 1024);
}

/**
 * Convert megabytes to bytes
 */
export function mbToBytes(mb: number): number {
  return mb * 1024 * 1024;
} 