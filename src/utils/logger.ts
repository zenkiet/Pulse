import winston from 'winston';
import config from '../config';

// Define custom format to avoid binary data serialization
const customFormat = winston.format.printf(({ timestamp, level, message, component, nodeId, ...meta }) => {
  // Filter out binary data and large objects from meta
  const filteredMeta = { ...meta };
  
  // Remove service field if it's the default
  if (filteredMeta.service === 'pulse') {
    delete filteredMeta.service;
  }
  
  // Remove error.config and other large objects that might contain binary data
  if (filteredMeta.error && typeof filteredMeta.error === 'object') {
    // Keep only essential error information
    const error = filteredMeta.error as any;
    filteredMeta.error = { 
      message: error.message || 'Unknown error',
      name: error.name || 'Error',
      code: error.code || undefined
    };
  }
  
  // Format the log message
  const metaStr = Object.keys(filteredMeta).length ? `\n${JSON.stringify(filteredMeta, null, 2)}` : '';
  const componentStr = component ? `[${component}]` : '';
  const nodeStr = nodeId ? `[${nodeId}]` : '';
  return `${timestamp} ${level} ${componentStr}${nodeStr}: ${message}${metaStr}`;
});

// Create console transport with custom format
const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    customFormat
  )
});

// Create the logger
const logger = winston.createLogger({
  level: config.logLevel,
  defaultMeta: { service: 'pulse' },
  transports: [consoleTransport]
});

// Add file transport in production with custom format
if (config.nodeEnv === 'production') {
  const fileFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    customFormat
  );
  
  logger.add(
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  );
  
  logger.add(
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  );
}

// Create a child logger with component context
export function createLogger(component: string, nodeId?: string) {
  return logger.child({ component, nodeId });
}

export default logger; 