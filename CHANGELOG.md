# Changelog

All notable changes to this project will be documented in this file.

## [1.3.0] - 2024-03-09

### Added
- Dashboard screenshot to README
- Ko-fi support button and Support section
- Code of Conduct based on Contributor Covenant
- GitHub templates and developer documentation
- Development architecture explanation to README
- start-dev.sh script to repository

### Changed
- Combine system type and visibility filters, improve UI design
- Refactor NetworkDisplay component into smaller, more manageable files with custom hooks and components
- Optimize column widths for space conservation in network table
- Refactor proxmox-client.ts into smaller modules for better maintainability
- Enhance network table UI with improved filtering and search functionality
- Improve space efficiency for important metric columns
- Standardize styling across all dropdown menus and popovers
- Move status column to leftmost position for better organization
- Center status icons for better visual alignment
- Replace status text with icon-only display to save space
- Update README with new screenshots and improved documentation
- Enhance export functionality with additional fields (Type, ID, Uptime) in NetworkDisplay
- Clarify node vs guest counts in dropdown by adding descriptive labels

### Fixed
- Fix search filtering for type terms and optimize type column width
- Update vite.config.js to use IPv4 (127.0.0.1) instead of IPv6 (::1) for WebSocket connections
- Fix transparent table headers in CT/VM list by adding solid background and border
- Fix column visibility issues in network table
- Improve dropdown behavior and styling
- Ensure 'No Matching Systems' message spans full table width

## [1.2.1] - 2024-03-04

Initial versioned release. 