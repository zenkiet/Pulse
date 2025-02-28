import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Container, Box, Typography, AppBar, Toolbar, Paper } from '@mui/material';
import NetworkDisplay from './components/NetworkDisplay';
// Import connection test utility
import './utils/testConnection';

// Create a theme instance
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              System Monitor
            </Typography>
          </Toolbar>
        </AppBar>
        
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
          <Box sx={{ my: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              Live System Metrics
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" paragraph>
              Real-time monitoring of system resources and network activity
            </Typography>
            
            {/* Network Display Component */}
            <NetworkDisplay />
          </Box>
        </Container>
        
        <Paper sx={{ padding: 2, marginTop: 'auto' }} component="footer">
          <Typography variant="body2" color="text.secondary" align="center">
            System Monitor © {new Date().getFullYear()}
          </Typography>
        </Paper>
      </Box>
    </ThemeProvider>
  );
}

export default App; 