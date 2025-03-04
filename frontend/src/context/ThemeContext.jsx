import React, { createContext, useState, useContext, useEffect, useMemo } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Storage key
const STORAGE_KEY_DARK_MODE = 'app_dark_mode';

// Create the context
export const ThemeContext = createContext({
  darkMode: false,
  toggleDarkMode: () => {},
});

// Custom hook to use the theme context
export const useThemeContext = () => useContext(ThemeContext);

// Theme provider component
export const AppThemeProvider = ({ children }) => {
  // Initialize dark mode from localStorage or system preference
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DARK_MODE);
      if (saved === null) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
      return JSON.parse(saved) === true;
    } catch (e) {
      console.error('Error loading dark mode preference:', e);
      return false;
    }
  });

  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      // Only update if the user hasn't set a preference
      if (localStorage.getItem(STORAGE_KEY_DARK_MODE) === null) {
        setDarkMode(e.matches);
      }
    };

    // Add event listener
    mediaQuery.addEventListener('change', handleChange);
    
    // Cleanup
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Save dark mode preference when it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_DARK_MODE, JSON.stringify(darkMode));
  }, [darkMode]);

  // Toggle dark mode function
  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };

  // Context value
  const themeContextValue = useMemo(() => ({
    darkMode,
    toggleDarkMode,
  }), [darkMode]);

  // Create MUI theme based on dark mode state
  const theme = useMemo(() => createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: '#3a7bd5',
        light: '#5e9cf5',
        dark: '#2c5ea3',
        contrastText: '#ffffff',
      },
      secondary: {
        main: darkMode ? '#bb86fc' : '#00b8d4',
        light: darkMode ? '#d7b8fc' : '#62ebff',
        dark: darkMode ? '#9d4edd' : '#0088a3',
        contrastText: '#ffffff',
      },
      background: {
        default: darkMode ? '#121212' : '#f8f9fa',
        paper: darkMode ? '#1e1e1e' : '#ffffff',
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
      text: {
        primary: darkMode ? '#e0e0e0' : '#212121',
        secondary: darkMode ? '#a0a0a0' : '#757575',
        disabled: darkMode ? '#6c6c6c' : '#9e9e9e',
      },
      divider: darkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
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
            boxShadow: darkMode 
              ? '0 2px 10px rgba(0, 0, 0, 0.5)' 
              : '0 2px 10px rgba(0, 0, 0, 0.05)',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            boxShadow: darkMode 
              ? '0 2px 10px rgba(0, 0, 0, 0.2)' 
              : '0 2px 10px rgba(0, 0, 0, 0.05)',
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            padding: '12px 16px',
            borderBottomColor: darkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(224, 224, 224, 1)',
          },
          head: {
            fontWeight: 600,
            color: darkMode ? '#e0e0e0' : '#424242',
            userSelect: 'none',
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
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            transition: 'background-color 0.3s ease, color 0.3s ease',
            scrollbarWidth: 'thin',
            scrollbarColor: darkMode ? '#3a3a3a #1e1e1e' : '#bbb #f1f1f1',
            userSelect: 'none',
            '&::-webkit-scrollbar': {
              width: '8px',
              height: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: darkMode ? '#1e1e1e' : '#f1f1f1',
            },
            '&::-webkit-scrollbar-thumb': {
              background: darkMode ? '#3a3a3a' : '#bbb',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: darkMode ? '#555' : '#999',
            },
          },
        },
      },
    },
  }), [darkMode]);

  return (
    <ThemeContext.Provider value={themeContextValue}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
}; 