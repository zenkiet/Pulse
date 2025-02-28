import { io } from 'socket.io-client';

// This function can be called from the browser console to help debug WebSocket connections
const testWebSocketConnection = (url = 'http://localhost:3000') => {
  console.log(`Testing connection to: ${url}`);
  
  const socket = io(url, {
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
    reconnectionDelay: 500,
    timeout: 3000
  });
  
  socket.on('connect', () => {
    console.log('✅ CONNECTED SUCCESSFULLY!');
    console.log('Socket ID:', socket.id);
  });
  
  socket.on('connect_error', (err) => {
    console.error('❌ CONNECTION ERROR:', err);
    console.error('Message:', err.message);
  });
  
  socket.on('message', (msg) => {
    console.log('📩 RECEIVED MESSAGE:', msg);
  });
  
  socket.on('disconnect', () => {
    console.log('❌ DISCONNECTED');
  });
  
  return socket;
};

window.testConnection = testWebSocketConnection;

export default testWebSocketConnection; 