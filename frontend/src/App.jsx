import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Container, Box, Typography, AppBar, Toolbar, Paper } from '@mui/material';
import NetworkDisplay from './components/NetworkDisplay';

// Create a theme instance with improved colors and styling
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#3a7bd5',
      light: '#5e9cf5',
      dark: '#2c5ea3',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#00b8d4',
      light: '#62ebff',
      dark: '#0088a3',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f8f9fa',
      paper: '#ffffff',
    },
    success: {
      main: '#4caf50',
      light: '#80e27e',
      dark: '#087f23',
    },
    warning: {
      main: '#ff9800',
      light: '#ffc947',
      dark: '#c66900',
    },
    error: {
      main: '#f44336',
      light: '#ff7961',
      dark: '#ba000d',
    },
    info: {
      main: '#2196f3',
      light: '#64b5f6',
      dark: '#0069c0',
    },
    grey: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#eeeeee',
      300: '#e0e0e0',
      400: '#bdbdbd',
      500: '#9e9e9e',
      600: '#757575',
      700: '#616161',
      800: '#424242',
      900: '#212121',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h6: {
      fontWeight: 500,
      letterSpacing: '0.0075em',
    },
    body1: {
      fontSize: '0.9rem',
    },
    body2: {
      fontSize: '0.8rem',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '12px 16px',
        },
        head: {
          fontWeight: 600,
          color: '#424242',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:last-child td, &:last-child th': {
            border: 0,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: '100vh',
        background: 'linear-gradient(to bottom, #f8f9fa, #e8eaf6)',
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
            borderColor: 'grey.200',
          }} 
          component="footer"
          elevation={0}
        >
          <Typography variant="body2" color="text.secondary" align="center">
            System Monitor © {new Date().getFullYear()}
          </Typography>
        </Paper>
      </Box>
    </ThemeProvider>
  );
}

export default App; 