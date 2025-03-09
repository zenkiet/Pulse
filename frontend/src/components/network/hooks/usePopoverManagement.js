import { useState, useRef, useCallback } from 'react';

const usePopoverManagement = () => {
  // State for filter menu
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const openFilters = Boolean(filterAnchorEl);
  
  // State for search popover
  const [searchAnchorEl, setSearchAnchorEl] = useState(null);
  const openSearch = Boolean(searchAnchorEl);
  const searchInputRef = useRef(null);
  
  // State for type popover
  const [typeAnchorEl, setTypeAnchorEl] = useState(null);
  const openType = Boolean(typeAnchorEl);
  
  // State for visibility popover
  const [visibilityAnchorEl, setVisibilityAnchorEl] = useState(null);
  const openVisibility = Boolean(visibilityAnchorEl);
  
  // Add a ref for the filter button
  const filterButtonRef = useRef(null);
  
  // Add a ref for the search button
  const searchButtonRef = useRef(null);
  
  // Filter popover handlers
  const handleFilterButtonClick = useCallback((event) => {
    setFilterAnchorEl(event.currentTarget);
  }, []);
  
  const handleCloseFilterPopover = useCallback(() => {
    setFilterAnchorEl(null);
  }, []);
  
  // Search popover handlers
  const handleSearchButtonClick = useCallback((event) => {
    setSearchAnchorEl(event.currentTarget);
    // Focus the search input after a short delay to ensure the popover is open
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 100);
  }, []);
  
  const handleCloseSearchPopover = useCallback(() => {
    setSearchAnchorEl(null);
  }, []);
  
  // System type popover handlers
  const handleTypeButtonClick = useCallback((event) => {
    setTypeAnchorEl(event.currentTarget);
  }, []);
  
  const handleCloseTypePopover = useCallback(() => {
    setTypeAnchorEl(null);
  }, []);
  
  // Visibility popover handlers
  const handleVisibilityButtonClick = useCallback((event) => {
    setVisibilityAnchorEl(event.currentTarget);
  }, []);
  
  const handleCloseVisibilityPopover = useCallback(() => {
    setVisibilityAnchorEl(null);
  }, []);

  // Function to close all popovers
  const closeAllPopovers = useCallback(() => {
    setFilterAnchorEl(null);
    setSearchAnchorEl(null);
    setTypeAnchorEl(null);
    setVisibilityAnchorEl(null);
  }, []);

  return {
    filterAnchorEl,
    openFilters,
    searchAnchorEl,
    openSearch,
    searchInputRef,
    typeAnchorEl,
    openType,
    visibilityAnchorEl,
    openVisibility,
    filterButtonRef,
    searchButtonRef,
    handleFilterButtonClick,
    handleCloseFilterPopover,
    handleSearchButtonClick,
    handleCloseSearchPopover,
    handleTypeButtonClick,
    handleCloseTypePopover,
    handleVisibilityButtonClick,
    handleCloseVisibilityPopover,
    closeAllPopovers
  };
};

export default usePopoverManagement; 