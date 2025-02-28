import React from 'react';
import { Container, Box, Typography, AppBar, Toolbar, Paper } from '@mui/material';
import NetworkDisplay from './components/NetworkDisplay';
import { AppThemeProvider } from './context/ThemeContext';

function App() {
  return (
    <AppThemeProvider>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: '100vh',
      }}>
        <AppBar position="static" color="primary" elevation={0}>
          <Toolbar sx={{ px: { xs: 2, sm: 3 } }}>
            <Typography 
              variant="h6" 
              component="div" 
              sx={{ 
                flexGrow: 1, 
                display: 'flex', 
                alignItems: 'center',
                fontWeight: 600,
                letterSpacing: '0.02em',
              }}
            >
              <Box 
                component="span" 
                sx={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  mr: 1.5,
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                }}
              >
                <Box 
                  component="span" 
                  sx={{ 
                    width: 20, 
                    height: 20, 
                    borderRadius: '50%', 
                    bgcolor: 'white',
                    boxShadow: '0 0 0 2px rgba(255, 255, 255, 0.5)',
                  }} 
                />
              </Box>
              System Monitor
            </Typography>
          </Toolbar>
        </AppBar>
        
        <Container 
          maxWidth="lg" 
          sx={{ 
            mt: { xs: 2, sm: 4 }, 
            mb: { xs: 2, sm: 4 }, 
            flexGrow: 1,
            px: { xs: 2, sm: 3 },
          }}
        >
          <Box sx={{ my: { xs: 2, sm: 4 } }}>
            {/* Network Display Component */}
            <NetworkDisplay />
          </Box>
        </Container>
        
        <Paper 
          sx={{ 
            padding: 2, 
            marginTop: 'auto',
            borderRadius: 0,
            bgcolor: 'background.paper',
            borderTop: '1px solid',
            borderColor: 'divider',
          }} 
          component="footer"
          elevation={0}
        >
          <Typography variant="body2" color="text.secondary" align="center">
            System Monitor © {new Date().getFullYear()}
          </Typography>
        </Paper>
      </Box>
    </AppThemeProvider>
  );
}

export default App; 