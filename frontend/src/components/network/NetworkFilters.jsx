import React from 'react';
import {
  Box,
  Typography,
  Chip,
  Slider,
  FormControlLabel,
  Switch,
  IconButton,
  Collapse,
  Paper,
  InputBase,
  Tooltip,
  Badge,
  alpha
} from '@mui/material';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { formatPercentage, formatNetworkRateForFilter, sliderValueToNetworkRate } from '../../utils/formatters';
import { KeyboardShortcut } from './UIComponents';

const NetworkFilters = ({
  filters,
  updateFilter,
  clearFilter,
  resetFilters,
  showStopped,
  setShowStopped,
  searchTerm,
  setSearchTerm,
  activeSearchTerms,
  addSearchTerm,
  removeSearchTerm,
  activeFilterCount,
  showFilters,
  handleSliderDragStart,
  handleSliderDragEnd,
  searchInputRef,
  guestTypeFilter,
  setGuestTypeFilter
}) => {
  // Handle search input submission
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      addSearchTerm(searchTerm.trim());
      setSearchTerm('');
    }
  };

  return (
    <Collapse in={showFilters} timeout={300}>
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 2,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: theme => alpha(theme.palette.background.paper, 0.8),
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Search and filter chips row */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            {/* Search input */}
            <Box
              component="form"
              onSubmit={handleSearchSubmit}
              sx={{
                display: 'flex',
                alignItems: 'center',
                flex: '1 1 auto',
                minWidth: 200,
                maxWidth: 400,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                px: 1,
                py: 0.5,
                mr: 1,
              }}
            >
              <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
              <InputBase
                placeholder="Search systems..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ ml: 1, flex: 1 }}
                inputRef={searchInputRef}
                inputProps={{ 'aria-label': 'search systems' }}
                endAdornment={
                  searchTerm ? (
                    <IconButton
                      size="small"
                      aria-label="clear search"
                      onClick={() => setSearchTerm('')}
                      sx={{ p: 0.5 }}
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  ) : null
                }
              />
              <Tooltip title="Press Enter to add search term">
                <KeyboardShortcut shortcut="↵" />
              </Tooltip>
            </Box>

            {/* Active search term chips */}
            {activeSearchTerms.map((term) => (
              <Chip
                key={term}
                label={term}
                onDelete={() => removeSearchTerm(term)}
                color="primary"
                variant="outlined"
                size="small"
              />
            ))}

            {/* Show stopped systems toggle */}
            <FormControlLabel
              control={
                <Switch
                  checked={showStopped}
                  onChange={(e) => setShowStopped(e.target.checked)}
                  color="primary"
                  size="small"
                />
              }
              label="Show Stopped"
              sx={{ ml: 'auto' }}
            />

            {/* Reset filters button */}
            {activeFilterCount > 0 && (
              <Tooltip title="Reset all filters">
                <IconButton
                  onClick={resetFilters}
                  size="small"
                  color="primary"
                  sx={{ ml: 1 }}
                >
                  <FilterAltOffIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>

          {/* Filter sliders */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {/* CPU Filter */}
            <Box sx={{ flex: '1 1 200px', maxWidth: 300 }}>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 1, display: 'flex', justifyContent: 'space-between' }}
              >
                <span>CPU Usage: {formatPercentage(filters.cpu)}</span>
                {filters.cpu > 0 && (
                  <IconButton
                    onClick={() => clearFilter('cpu')}
                    size="small"
                    sx={{ p: 0, ml: 1 }}
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                )}
              </Typography>
              <Slider
                value={filters.cpu}
                onChange={(e, newValue) => updateFilter('cpu', newValue)}
                onMouseDown={() => handleSliderDragStart('cpu')}
                onMouseUp={handleSliderDragEnd}
                aria-labelledby="cpu-filter-slider"
                valueLabelDisplay="auto"
                valueLabelFormat={formatPercentage}
              />
            </Box>

            {/* Memory Filter */}
            <Box sx={{ flex: '1 1 200px', maxWidth: 300 }}>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 1, display: 'flex', justifyContent: 'space-between' }}
              >
                <span>Memory Usage: {formatPercentage(filters.memory)}</span>
                {filters.memory > 0 && (
                  <IconButton
                    onClick={() => clearFilter('memory')}
                    size="small"
                    sx={{ p: 0, ml: 1 }}
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                )}
              </Typography>
              <Slider
                value={filters.memory}
                onChange={(e, newValue) => updateFilter('memory', newValue)}
                onMouseDown={() => handleSliderDragStart('memory')}
                onMouseUp={handleSliderDragEnd}
                aria-labelledby="memory-filter-slider"
                valueLabelDisplay="auto"
                valueLabelFormat={formatPercentage}
              />
            </Box>

            {/* Disk Filter */}
            <Box sx={{ flex: '1 1 200px', maxWidth: 300 }}>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 1, display: 'flex', justifyContent: 'space-between' }}
              >
                <span>Disk Usage: {formatPercentage(filters.disk)}</span>
                {filters.disk > 0 && (
                  <IconButton
                    onClick={() => clearFilter('disk')}
                    size="small"
                    sx={{ p: 0, ml: 1 }}
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                )}
              </Typography>
              <Slider
                value={filters.disk}
                onChange={(e, newValue) => updateFilter('disk', newValue)}
                onMouseDown={() => handleSliderDragStart('disk')}
                onMouseUp={handleSliderDragEnd}
                aria-labelledby="disk-filter-slider"
                valueLabelDisplay="auto"
                valueLabelFormat={formatPercentage}
              />
            </Box>

            {/* Download Filter */}
            <Box sx={{ flex: '1 1 200px', maxWidth: 300 }}>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 1, display: 'flex', justifyContent: 'space-between' }}
              >
                <span>Download: {formatNetworkRateForFilter(sliderValueToNetworkRate(filters.download))}</span>
                {filters.download > 0 && (
                  <IconButton
                    onClick={() => clearFilter('download')}
                    size="small"
                    sx={{ p: 0, ml: 1 }}
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                )}
              </Typography>
              <Slider
                value={filters.download}
                onChange={(e, newValue) => updateFilter('download', newValue)}
                onMouseDown={() => handleSliderDragStart('download')}
                onMouseUp={handleSliderDragEnd}
                aria-labelledby="download-filter-slider"
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => formatNetworkRateForFilter(sliderValueToNetworkRate(value))}
              />
            </Box>

            {/* Upload Filter */}
            <Box sx={{ flex: '1 1 200px', maxWidth: 300 }}>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 1, display: 'flex', justifyContent: 'space-between' }}
              >
                <span>Upload: {formatNetworkRateForFilter(sliderValueToNetworkRate(filters.upload))}</span>
                {filters.upload > 0 && (
                  <IconButton
                    onClick={() => clearFilter('upload')}
                    size="small"
                    sx={{ p: 0, ml: 1 }}
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                )}
              </Typography>
              <Slider
                value={filters.upload}
                onChange={(e, newValue) => updateFilter('upload', newValue)}
                onMouseDown={() => handleSliderDragStart('upload')}
                onMouseUp={handleSliderDragEnd}
                aria-labelledby="upload-filter-slider"
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => formatNetworkRateForFilter(sliderValueToNetworkRate(value))}
              />
            </Box>
          </Box>
        </Box>
      </Paper>
    </Collapse>
  );
};

export default NetworkFilters; 