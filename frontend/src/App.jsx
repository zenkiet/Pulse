import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  AppBar, 
  Toolbar, 
  Paper, 
  IconButton, 
  Tooltip, 
  alpha,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import ComputerIcon from '@mui/icons-material/Computer';
import DnsIcon from '@mui/icons-material/Dns';
import ViewListIcon from '@mui/icons-material/ViewList';
import CheckIcon from '@mui/icons-material/Check';
import NetworkDisplay from './components/NetworkDisplay';
import { AppThemeProvider, useThemeContext } from './context/ThemeContext';
import useSocket from './hooks/useSocket';

function AppContent() {
  const { darkMode, toggleDarkMode } = useThemeContext();
  const [selectedNode, setSelectedNode] = useState('all');
  const { nodeData, guestData } = useSocket();
  
  // Transform the node data from the API into the format needed for the dropdown
  const availableNodes = React.useMemo(() => {
    // Start with the "All Nodes" option
    const nodes = [
      { id: 'all', name: 'All Nodes', count: 0 }
    ];
    
    // Add nodes from the API
    if (nodeData && nodeData.length > 0) {
      // Count guests for each node
      const nodeCounts = {};
      
      // Initialize counts for each node
      nodeData.forEach(node => {
        // Extract node number from the id (e.g., "node-1" -> "node1")
        const nodeId = node.id.replace('-', '');
        nodeCounts[nodeId] = 0;
      });
      
      // Count guests for each node
      if (guestData && guestData.length > 0) {
        guestData.forEach(guest => {
          if (guest.node) {
            // Convert "node-1" to "node1" format
            const normalizedNodeId = guest.node.replace('-', '');
            if (nodeCounts[normalizedNodeId] !== undefined) {
              nodeCounts[normalizedNodeId]++;
            }
          }
        });
      }
      
      // Add nodes to the list with their counts
      nodeData.forEach(node => {
        // Extract node number from the id (e.g., "node-1" -> "node1")
        const nodeId = node.id.replace('-', '');
        
        // Add the node to the list
        nodes.push({
          id: nodeId,
          name: node.name,
          count: nodeCounts[nodeId] || 0
        });
      });
      
      // Update the count for "All Nodes"
      nodes[0].count = guestData ? guestData.length : 0;
    }
    
    return nodes;
  }, [nodeData, guestData]);
  
  // Handle node selection change
  const handleNodeChange = (event) => {
    setSelectedNode(event.target.value);
  };
  
  return (
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
              fontWeight: 700,
              letterSpacing: '0.03em',
            }}
          >
            {/* Enhanced Logo - Made clickable to refresh page */}
            <Box 
              onClick={() => {
                window.location.reload();
                // Reset to default state if needed
                setSelectedNode('all');
              }}
              sx={{ 
                display: 'flex', 
                alignItems: 'center',
                cursor: 'pointer',
                '&:hover': {
                  opacity: 0.9,
                },
              }}
            >
              <Box 
                component="span" 
                sx={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  mr: 1.5,
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.1) 100%)',
                  boxShadow: '0 0 10px rgba(0,0,0,0.1)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Pulse Animation Rings */}
                <Box 
                  component="span" 
                  sx={{ 
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.4)',
                    animation: 'pulse 2s infinite',
                    '@keyframes pulse': {
                      '0%': {
                        transform: 'scale(0.5)',
                        opacity: 1,
                      },
                      '100%': {
                        transform: 'scale(1.2)',
                        opacity: 0,
                      },
                    },
                  }}
                />
                <Box 
                  component="span" 
                  sx={{ 
                    width: 18, 
                    height: 18, 
                    borderRadius: '50%', 
                    background: 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)',
                    boxShadow: '0 0 0 2px rgba(255, 255, 255, 0.5), 0 0 8px rgba(0,0,0,0.1)',
                    zIndex: 2,
                  }} 
                />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'baseline' }}>
                Pulse
                <Typography 
                  component="span" 
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent triggering the parent onClick (page refresh)
                    window.open('https://github.com/rcourtman/pulse', '_blank');
                  }}
                  sx={{ 
                    ml: 1, 
                    opacity: 0.8, 
                    fontWeight: 400,
                    fontSize: '0.7rem',
                    bgcolor: 'rgba(255,255,255,0.15)',
                    px: 0.8,
                    py: 0.2,
                    borderRadius: 1,
                    letterSpacing: '0.02em',
                    cursor: 'pointer',
                    '&:hover': {
                      opacity: 1,
                      bgcolor: 'rgba(255,255,255,0.25)',
                    },
                    transition: 'all 0.2s ease'
                  }}
                >
                  v1.0.10
                </Typography>
              </Box>
            </Box>
          </Typography>
          
          {/* Node Selection Dropdown */}
          <FormControl 
            variant="outlined" 
            size="small"
            sx={{ 
              minWidth: { xs: 120, sm: 200 },
              mr: 2,
              '& .MuiOutlinedInput-root': {
                color: 'white',
                borderRadius: 2,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.7)',
                },
                '& .MuiSelect-icon': {
                  color: 'rgba(255, 255, 255, 0.7)',
                }
              }
            }}
          >
            <Select
              value={selectedNode}
              onChange={handleNodeChange}
              displayEmpty
              renderValue={(selected) => {
                const node = availableNodes.find(n => n.id === selected);
                return (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {selected === 'all' ? (
                      <ViewListIcon fontSize="small" />
                    ) : (
                      <DnsIcon fontSize="small" />
                    )}
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {node ? node.name : 'Select Node'}
                    </Typography>
                    {node && (
                      <Chip 
                        label={node.count} 
                        size="small" 
                        sx={{ 
                          height: 20, 
                          fontSize: '0.7rem',
                          bgcolor: 'rgba(255, 255, 255, 0.2)',
                          color: 'white',
                          ml: 'auto'
                        }} 
                      />
                    )}
                  </Box>
                );
              }}
              MenuProps={{
                PaperProps: {
                  sx: {
                    maxHeight: 300,
                    mt: 0.5,
                    borderRadius: 2,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                    '& .MuiMenuItem-root': {
                      py: 1,
                      px: 2,
                    }
                  }
                }
              }}
            >
              {availableNodes.map((node) => (
                <MenuItem 
                  key={node.id} 
                  value={node.id}
                  sx={{ 
                    borderRadius: 1,
                    my: 0.5,
                    '&.Mui-selected': {
                      bgcolor: theme => alpha(theme.palette.primary.main, 0.1),
                      '&:hover': {
                        bgcolor: theme => alpha(theme.palette.primary.main, 0.15),
                      }
                    }
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {node.id === 'all' ? (
                      <ViewListIcon fontSize="small" color="primary" />
                    ) : (
                      <ComputerIcon fontSize="small" color="primary" />
                    )}
                  </ListItemIcon>
                  <ListItemText 
                    primary={node.name} 
                    primaryTypographyProps={{ 
                      variant: 'body2',
                      fontWeight: selectedNode === node.id ? 600 : 400
                    }} 
                  />
                  <Chip 
                    label={node.count} 
                    size="small" 
                    sx={{ 
                      height: 20, 
                      fontSize: '0.7rem',
                      bgcolor: theme => alpha(theme.palette.primary.main, 0.1),
                      color: 'primary.main'
                    }} 
                  />
                  {selectedNode === node.id && (
                    <CheckIcon 
                      fontSize="small" 
                      color="primary" 
                      sx={{ ml: 1, fontSize: '1rem' }} 
                    />
                  )}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          {/* Dark Mode Toggle Button */}
          <Tooltip title={darkMode ? "Switch to light mode" : "Switch to dark mode"}>
            <IconButton
              onClick={toggleDarkMode}
              size="small"
              color="inherit"
              sx={{ 
                ml: 1,
                borderRadius: 2,
                p: { xs: 0.8, sm: 1 },
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                },
              }}
            >
              {darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
          </Tooltip>
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
          {/* Network Display Component - pass the selected node as a prop */}
          <NetworkDisplay selectedNode={selectedNode} />
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
          Pulse © {new Date().getFullYear()}
        </Typography>
      </Paper>
    </Box>
  );
}

function App() {
  return (
    <AppThemeProvider>
      <AppContent />
    </AppThemeProvider>
  );
}

export default App; 