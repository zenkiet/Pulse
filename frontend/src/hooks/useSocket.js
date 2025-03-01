import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

/**
 * Custom hook to manage WebSocket connections with Socket.io
 * @param {string} url - WebSocket server URL (defaults to current origin)
 * @returns {Object} Socket state and message handlers
 */
const useSocket = (url) => {
  // Use the provided URL, or the environment variable, or fall back to window.location.origin
  // This ensures the frontend connects to the same server that served it,
  // avoiding hardcoded URLs that might not work in different environments
  const socketUrl = url || import.meta.env.VITE_API_URL || window.location.origin;
  
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [nodeData, setNodeData] = useState([]);
  const [guestData, setGuestData] = useState([]);
  const [metricsData, setMetricsData] = useState([]);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting'); // 'connecting', 'connected', 'disconnected', 'error'
  
  // Use ref to maintain socket instance across renders
  const socketRef = useRef(null);

  // Initialize socket connection
  useEffect(() => {
    // Socket.io connection configuration
    socketRef.current = io(socketUrl, {
      transports: ['websocket', 'polling'],  // Allow fallback to polling
      reconnectionAttempts: 15,              // Increased from 10
      reconnectionDelay: 1500,               // Increased from 1000
      timeout: 10000,                        // Increased from 5000
      forceNew: true,
      autoConnect: true,
      reconnection: true,
      reconnectionDelayMax: 10000,           // Increased from 5000
      randomizationFactor: 0.5,
      // Add connection state recovery
      connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
        skipMiddlewares: true,
      }
    });

    console.log('Attempting to connect to WebSocket server at:', socketUrl);
    setConnectionStatus('connecting');
    
    // Connection event handlers
    socketRef.current.on('connect', () => {
      console.log('Socket connected successfully');
      setIsConnected(true);
      setError(null);
      setConnectionStatus('connected');
    });

    // Add graceful shutdown handler for page navigation/refresh
    const handleBeforeUnload = () => {
      if (socketRef.current) {
        console.log('Gracefully closing socket connection before page unload');
        socketRef.current.disconnect();
      }
    };
    
    // Add visibility change handler to manage connections when tab is hidden/visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        console.log('Page hidden, preparing for potential disconnect');
        // Don't disconnect, but prepare for it
        if (socketRef.current) {
          socketRef.current.io.opts.reconnection = true;
        }
      } else if (document.visibilityState === 'visible') {
        console.log('Page visible, ensuring connection');
        // Ensure we're connected when the page becomes visible again
        if (socketRef.current && !socketRef.current.connected) {
          console.log('Reconnecting after visibility change');
          socketRef.current.connect();
          setConnectionStatus('connecting');
        }
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    socketRef.current.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      setIsConnected(false);
      setError(`Connection error: ${err.message}`);
      setConnectionStatus('error');
      
      // Instead of using debug data, we'll just update the connection status
      console.log('Backend server appears to be offline or unreachable');
    });

    socketRef.current.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
      setConnectionStatus('disconnected');
    });

    // Check connection after 1 second and try fallback if needed
    const timeoutId = setTimeout(() => {
      if (socketRef.current && !socketRef.current.connected) {
        console.warn('Socket not connected after 1 second, attempting fallback...');
        // Try to reconnect with polling as a fallback
        socketRef.current.io.opts.transports = ['polling', 'websocket'];
        socketRef.current.connect();
      }
    }, 1000);

    // Message handler
    socketRef.current.on('message', (message) => {
      console.log('Received message:', message);
      setLastMessage(message);
      
      switch (message.type) {
        case 'CONNECTED':
          console.log('Connected to server:', message.payload);
          break;
        
        case 'NODE_STATUS_UPDATE':
          console.log('Received NODE_STATUS_UPDATE:', message.payload);
          handleNodeStatusUpdate(message.payload);
          break;
        
        case 'GUEST_STATUS_UPDATE':
          console.log('Received GUEST_STATUS_UPDATE:', message.payload);
          handleGuestStatusUpdate(message.payload);
          break;
        
        case 'METRICS_UPDATE':
          console.log('Received METRICS_UPDATE:', message.payload);
          handleMetricsUpdate(message.payload);
          break;
        
        case 'EVENT':
          console.log('Event:', message.payload);
          break;
        
        case 'ERROR':
          console.error('Error:', message.payload);
          setError(message.payload);
          break;
        
        default:
          console.warn('Unknown message type:', message.type);
      }
    });

    // Cleanup function
    return () => {
      clearTimeout(timeoutId);
      // Remove event listeners
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current.off();
        socketRef.current = null;
      }
    };
  }, [socketUrl]);

  // Handler for node status updates
  const handleNodeStatusUpdate = useCallback((payload) => {
    // Handle both single node and array of nodes
    const nodeData = Array.isArray(payload) ? payload : [payload];
    console.log('Processing node data:', nodeData);
    
    setNodeData(prevNodes => {
      const updatedNodes = [...prevNodes];
      
      nodeData.forEach(node => {
        const index = updatedNodes.findIndex(n => n.id === node.id);
        if (index >= 0) {
          updatedNodes[index] = node;
        } else {
          updatedNodes.push(node);
        }
      });
      
      console.log('Updated node data:', updatedNodes);
      return updatedNodes;
    });
  }, []);

  // Handler for guest status updates
  const handleGuestStatusUpdate = useCallback((payload) => {
    // Handle both single guest and array of guests
    const guestData = Array.isArray(payload) ? payload : [payload];
    console.log('Processing guest data:', guestData);
    
    setGuestData(prevGuests => {
      const updatedGuests = [...prevGuests];
      
      guestData.forEach(guest => {
        const index = updatedGuests.findIndex(g => g.id === guest.id);
        if (index >= 0) {
          updatedGuests[index] = guest;
        } else {
          updatedGuests.push(guest);
        }
      });
      
      console.log('Updated guest data:', updatedGuests);
      return updatedGuests;
    });
  }, []);

  // Handler for metrics updates
  const handleMetricsUpdate = useCallback((payload) => {
    // Handle both single metric and array of metrics
    const metricData = Array.isArray(payload) ? payload : [payload];
    console.log('Processing metrics data:', metricData);
    
    // Log the specific guest IDs we're receiving metrics for
    metricData.forEach(metric => {
      console.log(`Received metrics for guest: ${metric.guestId || 'unknown'} at ${new Date().toLocaleTimeString()}`);
    });
    
    // Important: Create a new metrics array instead of modifying the existing one
    // This ensures React detects the state change and re-renders
    setMetricsData(prevMetrics => {
      // Make a deep copy to ensure we don't modify the original state
      const newMetrics = [...prevMetrics];
      let hasChanges = false;
      
      metricData.forEach(metric => {
        if (!metric.guestId) {
          console.warn('Received metric without guestId:', metric);
          return;
        }
        
        const index = newMetrics.findIndex(m => m.guestId === metric.guestId);
        
        if (index >= 0) {
          // Update existing metric with new values
          newMetrics[index] = {
            ...newMetrics[index],
            ...metric,
            timestamp: metric.timestamp || Date.now()
          };
          console.log(`Updated metrics for ${metric.guestId}`);
          hasChanges = true;
        } else {
          // Add new metric
          newMetrics.push({
            ...metric,
            timestamp: metric.timestamp || Date.now()
          });
          console.log(`Added new metrics for ${metric.guestId}`);
          hasChanges = true;
        }
      });
      
      // Only update state if there were actual changes
      console.log('Updated metrics array:', newMetrics);
      return hasChanges ? newMetrics : prevMetrics;
    });
  }, []);

  // Function to manually attempt reconnection
  const reconnect = useCallback(() => {
    if (socketRef.current) {
      console.log('Manually attempting to reconnect...');
      setConnectionStatus('connecting');
      socketRef.current.connect();
    }
  }, []);

  // Function to subscribe to specific node or guest
  const subscribeToNode = useCallback((nodeId) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('subscribe:node', nodeId);
    }
  }, [isConnected]);

  const subscribeToGuest = useCallback((guestId) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('subscribe:guest', guestId);
    }
  }, [isConnected]);

  // Function to get historical data
  const getHistory = useCallback((id) => {
    return new Promise((resolve) => {
      if (socketRef.current && isConnected) {
        socketRef.current.emit('get:history', id, (data) => {
          resolve(data);
        });
      } else {
        resolve([]);
      }
    });
  }, [isConnected]);

  return {
    socket: socketRef.current,
    isConnected,
    lastMessage,
    error,
    nodeData,
    guestData,
    metricsData,
    connectionStatus,
    reconnect,
    subscribeToNode,
    subscribeToGuest,
    getHistory
  };
};

export default useSocket; 