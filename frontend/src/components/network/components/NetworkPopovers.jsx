import React from 'react';
import {
  Popover,
  Paper,
  Box,
  Typography,
  TextField,
  IconButton,
  Chip,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  MenuItem,
  Switch,
  Slider
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import ComputerIcon from '@mui/icons-material/Computer';
import DnsIcon from '@mui/icons-material/Dns';
import ViewListIcon from '@mui/icons-material/ViewList';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';

const NetworkPopovers = ({
  // Search popover props
  searchAnchorEl,
  openSearch,
  handleCloseSearchPopover,
  searchTerm,
  setSearchTerm,
  activeSearchTerms,
  addSearchTerm,
  removeSearchTerm,
  searchInputRef,
  
  // Type popover props
  typeAnchorEl,
  openType,
  handleCloseTypePopover,
  guestTypeFilter,
  setGuestTypeFilter,
  
  // Visibility popover props
  visibilityAnchorEl,
  openVisibility,
  handleCloseVisibilityPopover,
  showStopped,
  setShowStopped,
  
  // Filter popover props
  filterAnchorEl,
  openFilters,
  handleCloseFilterPopover,
  filters,
  updateFilter,
  handleSliderDragStart,
  handleSliderDragEnd,
  resetFilters,
  
  // Formatters
  formatPercentage,
  formatNetworkRateForFilter
}) => {
  return (
    <>
      {/* Search popover */}
      <Popover
        id="search-menu"
        anchorEl={searchAnchorEl}
        open={openSearch}
        onClose={handleCloseSearchPopover}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          elevation: 3,
          sx: { 
            borderRadius: 2,
            overflow: 'hidden'
          }
        }}
      >
        <Paper sx={{ width: 350, p: 0, overflow: 'hidden' }}>
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2" gutterBottom>
              Search Systems
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Search for specific systems by name, ID, or other properties.
            </Typography>
          </Box>
          
          <Box sx={{ p: 2 }}>
            <Box
              component="form"
              onSubmit={(e) => {
                e.preventDefault();
                if (searchTerm.trim()) {
                  addSearchTerm(searchTerm.trim());
                  setSearchTerm('');
                }
              }}
              sx={{ display: 'flex', alignItems: 'center' }}
            >
              <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
              <TextField
                fullWidth
                size="small"
                placeholder="Search systems..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchTerm.trim()) {
                    e.preventDefault();
                    addSearchTerm(searchTerm.trim());
                    setSearchTerm('');
                  }
                }}
                inputRef={searchInputRef}
                autoFocus
                variant="standard"
                InputProps={{
                  disableUnderline: true,
                  endAdornment: searchTerm ? (
                    <IconButton
                      size="small"
                      aria-label="clear search"
                      onClick={() => setSearchTerm('')}
                      sx={{ p: 0.5 }}
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  ) : null
                }}
                sx={{ flex: 1 }}
              />
            </Box>
          
            {activeSearchTerms.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Active Search Terms
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {activeSearchTerms.map((term) => (
                    <Chip
                      key={term}
                      label={term}
                      size="small"
                      onDelete={() => removeSearchTerm(term)}
                    />
                  ))}
                </Box>
              </Box>
            )}
            
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button 
                size="small" 
                onClick={() => {
                  setActiveSearchTerms([]);
                  setSearchTerm('');
                  handleCloseSearchPopover();
                }}
              >
                Clear All
              </Button>
            </Box>
          </Box>
        </Paper>
      </Popover>
      
      {/* System type popover */}
      <Popover
        id="type-menu"
        anchorEl={typeAnchorEl}
        open={openType}
        onClose={handleCloseTypePopover}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          elevation: 3,
          sx: { 
            borderRadius: 2,
            overflow: 'hidden'
          }
        }}
      >
        <Paper sx={{ width: 300, p: 0, overflow: 'hidden' }}>
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2" gutterBottom>
              System Type
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Filter systems by their type.
            </Typography>
          </Box>
          
          <Box sx={{ p: 2 }}>
            <ToggleButtonGroup
              value={guestTypeFilter}
              exclusive
              onChange={(event, newValue) => {
                if (newValue !== null) {
                  setGuestTypeFilter(newValue);
                  handleCloseTypePopover();
                }
              }}
              aria-label="system type filter"
              size="small"
              sx={{ 
                width: '100%',
                '& .MuiToggleButton-root': {
                  borderRadius: 1.5,
                  py: 1,
                  textTransform: 'none',
                  fontWeight: 500,
                  '&.Mui-selected': {
                    backgroundColor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': {
                      backgroundColor: 'primary.dark',
                    },
                    '& .MuiSvgIcon-root': {
                      color: 'primary.contrastText'
                    }
                  },
                  '&:hover': {
                    backgroundColor: 'action.hover'
                  }
                },
                '& .MuiToggleButtonGroup-grouped': {
                  mx: 0.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  '&:not(:first-of-type)': {
                    borderLeft: '1px solid',
                    borderLeftColor: 'divider',
                  },
                  '&:first-of-type': {
                    ml: 0
                  },
                  '&:last-of-type': {
                    mr: 0
                  }
                }
              }}
            >
              <ToggleButton value="all" aria-label="all systems" sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ViewListIcon fontSize="small" sx={{ mr: 1 }} />
                  All Systems
                </Box>
              </ToggleButton>
              <ToggleButton value="vm" aria-label="virtual machines only" sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ComputerIcon fontSize="small" sx={{ mr: 1 }} />
                  VMs Only
                </Box>
              </ToggleButton>
              <ToggleButton value="ct" aria-label="containers only" sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <DnsIcon fontSize="small" sx={{ mr: 1 }} />
                  CTs Only
                </Box>
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Paper>
      </Popover>
      
      {/* Visibility popover */}
      <Popover
        id="visibility-menu"
        anchorEl={visibilityAnchorEl}
        open={openVisibility}
        onClose={handleCloseVisibilityPopover}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          elevation: 3,
          sx: { 
            borderRadius: 2,
            overflow: 'hidden'
          }
        }}
      >
        <Paper sx={{ width: 300, p: 0, overflow: 'hidden' }}>
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2" gutterBottom>
              System Visibility
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Control which systems are visible.
            </Typography>
          </Box>
          
          <Box sx={{ p: 2 }}>
            <MenuItem dense onClick={() => {
              setShowStopped(!showStopped);
              handleCloseVisibilityPopover();
            }}
            sx={{
              borderRadius: 1.5,
              '&:hover': {
                backgroundColor: 'action.hover'
              }
            }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                width: '100%',
                justifyContent: 'space-between'
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {showStopped ? (
                    <VisibilityIcon fontSize="small" color="primary" sx={{ mr: 1 }} />
                  ) : (
                    <VisibilityOffIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                  )}
                  <Typography variant="body2">
                    {showStopped ? 'Hide Stopped Systems' : 'Show Stopped Systems'}
                  </Typography>
                </Box>
                <Switch
                  checked={showStopped}
                  onChange={(e) => {
                    setShowStopped(e.target.checked);
                    handleCloseVisibilityPopover();
                  }}
                  size="small"
                />
              </Box>
            </MenuItem>
          </Box>
        </Paper>
      </Popover>
      
      {/* Resource thresholds popover */}
      <Popover
        id="filter-menu"
        anchorEl={filterAnchorEl}
        open={openFilters}
        onClose={handleCloseFilterPopover}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          elevation: 3,
          sx: { 
            borderRadius: 2,
            overflow: 'hidden'
          }
        }}
      >
        <Paper sx={{ width: 350, p: 0, overflow: 'hidden' }}>
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2" gutterBottom>
              Resource Thresholds
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Filter systems by resource usage thresholds.
            </Typography>
          </Box>
          
          <Box sx={{ p: 2 }}>
            {/* CPU Filter */}
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="body2" color="text.secondary">
                  CPU Usage
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatPercentage(filters.cpu)}+
                </Typography>
              </Box>
              <Slider
                value={filters.cpu}
                onChange={(e, newValue) => updateFilter('cpu', newValue)}
                onMouseDown={() => handleSliderDragStart('cpu')}
                onMouseUp={handleSliderDragEnd}
                aria-labelledby="cpu-filter-slider"
                valueLabelDisplay="auto"
                valueLabelFormat={formatPercentage}
                min={0}
                max={100}
                size="small"
              />
            </Box>
            
            {/* Memory Filter */}
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="body2" color="text.secondary">
                  Memory Usage
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatPercentage(filters.memory)}+
                </Typography>
              </Box>
              <Slider
                value={filters.memory}
                onChange={(e, newValue) => updateFilter('memory', newValue)}
                onMouseDown={() => handleSliderDragStart('memory')}
                onMouseUp={handleSliderDragEnd}
                aria-labelledby="memory-filter-slider"
                valueLabelDisplay="auto"
                valueLabelFormat={formatPercentage}
                min={0}
                max={100}
                size="small"
              />
            </Box>
            
            {/* Disk Filter */}
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="body2" color="text.secondary">
                  Disk Usage
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatPercentage(filters.disk)}+
                </Typography>
              </Box>
              <Slider
                value={filters.disk}
                onChange={(e, newValue) => updateFilter('disk', newValue)}
                onMouseDown={() => handleSliderDragStart('disk')}
                onMouseUp={handleSliderDragEnd}
                aria-labelledby="disk-filter-slider"
                valueLabelDisplay="auto"
                valueLabelFormat={formatPercentage}
                min={0}
                max={100}
                size="small"
              />
            </Box>
            
            {/* Network Download Filter */}
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="body2" color="text.secondary">
                  Download Rate
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatNetworkRateForFilter(filters.download)}+
                </Typography>
              </Box>
              <Slider
                value={filters.download}
                onChange={(e, newValue) => updateFilter('download', newValue)}
                onMouseDown={() => handleSliderDragStart('download')}
                onMouseUp={handleSliderDragEnd}
                aria-labelledby="download-filter-slider"
                valueLabelDisplay="auto"
                valueLabelFormat={formatNetworkRateForFilter}
                min={0}
                max={100}
                size="small"
              />
            </Box>
            
            {/* Network Upload Filter */}
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="body2" color="text.secondary">
                  Upload Rate
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatNetworkRateForFilter(filters.upload)}+
                </Typography>
              </Box>
              <Slider
                value={filters.upload}
                onChange={(e, newValue) => updateFilter('upload', newValue)}
                onMouseDown={() => handleSliderDragStart('upload')}
                onMouseUp={handleSliderDragEnd}
                aria-labelledby="upload-filter-slider"
                valueLabelDisplay="auto"
                valueLabelFormat={formatNetworkRateForFilter}
                min={0}
                max={100}
                size="small"
              />
            </Box>
          </Box>
          
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
              size="small" 
              variant="outlined" 
              onClick={() => {
                resetFilters();
                handleCloseFilterPopover();
              }}
              startIcon={<FilterAltOffIcon />}
            >
              Reset All Thresholds
            </Button>
          </Box>
        </Paper>
      </Popover>
    </>
  );
};

export default NetworkPopovers; 