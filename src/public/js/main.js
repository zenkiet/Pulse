document.addEventListener('DOMContentLoaded', function() {
    const PulseApp = window.PulseApp || {};

    function updateAllUITables() {
        if (!PulseApp.state || !PulseApp.state.get('initialDataReceived')) {
            return;
        }
        
        // Global scroll preservation for all main scrollable containers
        const allContainers = [
            document.querySelector('.table-container'), // Main dashboard table
            document.querySelector('#node-summary-cards-container'), // Node cards
            document.querySelector('#storage-info-content'), // Storage tab
            document.querySelector('#pbs-instances-container'), // PBS tab
            document.querySelector('#backups-table-container'), // Backups tab
            // Also find any overflow-x-auto or overflow-y-auto containers that might be scrolled
            ...Array.from(document.querySelectorAll('.overflow-x-auto, .overflow-y-auto, [style*="overflow"]'))
        ];
        
        const scrollableContainers = allContainers.filter((container, index, array) => {
            // Remove duplicates and null containers
            return container && array.indexOf(container) === index;
        });
        
        // Capture all scroll positions before any updates
        const scrollPositions = scrollableContainers.map(container => {
            const position = {
                element: container,
                scrollLeft: container.scrollLeft,
                scrollTop: container.scrollTop
            };
            if (position.scrollLeft > 0 || position.scrollTop > 0) {
            }
            return position;
        });
        
        const nodesData = PulseApp.state.get('nodesData');
        const pbsDataArray = PulseApp.state.get('pbsDataArray');

        // Disable individual scroll preservation to avoid conflicts
        const originalPreserveScrollPosition = PulseApp.utils.preserveScrollPosition;
        PulseApp.utils.preserveScrollPosition = (element, updateFn) => {
            // Just run the update function without scroll preservation
            updateFn();
        };

        PulseApp.ui.nodes?.updateNodeSummaryCards(nodesData);
        PulseApp.ui.dashboard?.updateDashboardTable();
        PulseApp.ui.storage?.updateStorageInfo();
        PulseApp.ui.pbs?.updatePbsInfo(pbsDataArray);
        PulseApp.ui.backups?.updateBackupsTab();
        
        // Restore the original function
        PulseApp.utils.preserveScrollPosition = originalPreserveScrollPosition;

        // Update tab availability based on PBS data
        PulseApp.ui.tabs?.updateTabAvailability();

        updateLoadingOverlayVisibility(); // Call the helper function

        PulseApp.thresholds?.logging?.checkThresholdViolations();
        
        // Update alerts when state changes
        const state = PulseApp.state.getFullState();
        PulseApp.alerts?.updateAlertsFromState?.(state);
        
        // Check and show configuration banner if needed
        PulseApp.ui.configBanner?.checkAndShowBanner();
        
        // Optimized scroll preservation
        const mainTableContainer = document.querySelector('.table-container');
        if (mainTableContainer) {
            const savedScrollTop = mainTableContainer.scrollTop;
            const savedScrollLeft = mainTableContainer.scrollLeft;
            
            if (savedScrollTop > 0 || savedScrollLeft > 0) {
                // Single efficient restoration strategy
                const restoreScroll = () => {
                    mainTableContainer.scrollTo({
                        top: savedScrollTop,
                        left: savedScrollLeft,
                        behavior: 'instant'
                    });
                };
                
                // Primary restoration - immediate
                requestAnimationFrame(restoreScroll);
                
                // Fallback restoration - after layout
                setTimeout(() => {
                    if (Math.abs(mainTableContainer.scrollTop - savedScrollTop) > 5) {
                        restoreScroll();
                    }
                }, 100);
            }
        }
    }

    function updateLoadingOverlayVisibility() {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (!loadingOverlay) return;

        const isConnected = PulseApp.socketHandler?.isConnected();
        const initialDataReceived = PulseApp.state?.get('initialDataReceived');

        if (loadingOverlay.style.display !== 'none') { // Only act if currently visible
            if (isConnected && initialDataReceived) {
                loadingOverlay.style.display = 'none';
            } else if (!isConnected) {
            }
            // If initialDataReceived is false, or socket is connected but no data yet, overlay remains.
        } else if (!isConnected && loadingOverlay.style.display === 'none') {
            // If overlay is hidden but socket disconnects, re-show it.
            loadingOverlay.style.display = 'flex'; // Or 'block', or its original display type
        }
    }

    function initializeModules() {
        PulseApp.state?.init?.();
        PulseApp.config?.init?.();
        PulseApp.utils?.init?.();
        PulseApp.theme?.init?.();
        // Ensure socketHandler.init receives both callbacks if it's designed to accept them
        // If socketHandler.init only expects one, this might need adjustment in socketHandler.js
        PulseApp.socketHandler?.init?.(updateAllUITables, updateLoadingOverlayVisibility); 
        PulseApp.tooltips?.init?.();
        PulseApp.alerts?.init?.();

        PulseApp.ui = PulseApp.ui || {};
        PulseApp.ui.tabs?.init?.();
        PulseApp.ui.nodes?.init?.();
        PulseApp.ui.dashboard?.init?.();
        PulseApp.ui.storage?.init?.();
        PulseApp.ui.pbs?.initPbsEventListeners?.();
        PulseApp.ui.backups?.init?.();
        PulseApp.ui.settings?.init?.();
        PulseApp.ui.thresholds?.init?.();
        PulseApp.ui.alerts?.init?.();
        PulseApp.ui.common?.init?.();

        PulseApp.thresholds = PulseApp.thresholds || {};
    }

    function validateCriticalElements() {
        const criticalElements = [
            'connection-status',
            'main-table',
            'dashboard-search',
            'dashboard-status-text',
            'app-version'
        ];
        let allFound = true;
        criticalElements.forEach(id => {
            if (!document.getElementById(id)) {
                console.error(`Critical element #${id} not found!`);
            }
        });
        if (!document.querySelector('#main-table tbody')) {
             console.error('Critical element #main-table tbody not found!');
        }
        return allFound;
    }

    function fetchVersion() {
        const versionSpan = document.getElementById('app-version');
        if (!versionSpan) {
            console.error('Version span element not found');
            return;
        }
        
        fetch('/api/version')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.version) {
                    versionSpan.textContent = data.version;
                    
                    // Check if this is a release candidate
                    const versionBadge = document.getElementById('version-badge');
                    if (versionBadge && data.version) {
                        const isVersionRC = data.version.includes('-rc') || 
                                           data.version.includes('-alpha') || 
                                           data.version.includes('-beta');
                        const isDevelopBranch = data.isDevelopment || data.gitBranch === 'develop';
                        const isRC = isVersionRC || isDevelopBranch;
                        
                        if (isRC) {
                            versionBadge.textContent = 'RC';
                            versionBadge.classList.remove('hidden');
                        }
                    }
                    
                    // Also update the page title
                    const isVersionRC = data.version && (data.version.includes('-rc') || 
                                       data.version.includes('-alpha') || 
                                       data.version.includes('-beta'));
                    const isDevelopBranch = data.isDevelopment || data.gitBranch === 'develop';
                    const isRC = isVersionRC || isDevelopBranch;
                    document.title = isRC ? 'Pulse RC' : 'Pulse';
                    
                    // Check if update is available
                    if (data.updateAvailable && data.latestVersion) {
                        // Check if update indicator already exists
                        const existingIndicator = document.getElementById('update-indicator');
                        if (!existingIndicator) {
                            // Create update indicator
                            const updateIndicator = document.createElement('span');
                            updateIndicator.id = 'update-indicator';
                            updateIndicator.className = 'ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
                            updateIndicator.innerHTML = `
                                <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clip-rule="evenodd"/>
                                </svg>
                                v${data.latestVersion} available
                            `;
                            updateIndicator.title = 'Click to view the latest release';
                            updateIndicator.style.cursor = 'pointer';
                            updateIndicator.addEventListener('click', (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                window.open('https://github.com/rcourtman/Pulse/releases/latest', '_blank');
                            });
                            
                            // Insert after version link
                            versionSpan.parentNode.insertBefore(updateIndicator, versionSpan.nextSibling);
                        }
                    } else {
                        // Remove update indicator if no update available
                        const existingIndicator = document.getElementById('update-indicator');
                        if (existingIndicator) {
                            existingIndicator.remove();
                        }
                    }
                } else {
                    versionSpan.textContent = 'unknown';
                }
            })
            .catch(error => {
                console.error('Error fetching version:', error);
                versionSpan.textContent = 'error';
            });
    }

    if (!validateCriticalElements()) {
        console.error("Stopping JS execution due to missing critical elements.");
        return;
    }

    initializeModules();
    
    // Check if configuration is missing or contains placeholders and automatically open settings modal
    checkAndOpenSettingsIfNeeded();
    
    // Fetch version immediately and retry after a short delay if needed
    fetchVersion();
    
    // Also try again after DOM is fully ready and socket might be connected
    setTimeout(() => {
        const versionSpan = document.getElementById('app-version');
        if (versionSpan && (versionSpan.textContent === 'loading...' || versionSpan.textContent === 'error')) {
            fetchVersion();
        }
    }, 2000);
    
    // Periodically check for updates (every 6 hours)
    setInterval(() => {
        fetchVersion();
    }, 6 * 60 * 60 * 1000);
    
    /**
     * Check if configuration is missing or contains placeholder values and open settings modal
     */
    async function checkAndOpenSettingsIfNeeded() {
        try {
            // Wait a moment for the socket connection to establish and initial data to arrive
            setTimeout(async () => {
                try {
                    const response = await fetch('/api/health');
                    if (response.ok) {
                        const health = await response.json();
                        
                        // Check if configuration has placeholder values or no data is available
                        if (health.system && health.system.configPlaceholder) {
                            // Wait for settings module to be fully initialized
                            setTimeout(() => {
                                if (PulseApp.ui.settings && typeof PulseApp.ui.settings.openModal === 'function') {
                                    PulseApp.ui.settings.openModal();
                                }
                            }, 500);
                        }
                    }
                } catch (error) {
                    console.error('[Main] Error checking configuration status:', error);
                }
            }, 2000); // Wait 2 seconds for everything to settle
        } catch (error) {
            console.error('[Main] Error in checkAndOpenSettingsIfNeeded:', error);
        }
    }
});

// Global function to cycle through alert options
window.cycleAlertOption = function(span) {
    try {
        const options = JSON.parse(span.getAttribute('data-options'));
        const currentValue = span.getAttribute('data-value');
        
        // Find current option index
        const currentIndex = options.findIndex(option => option.value === currentValue);
        
        // Get next option (cycle back to 0 if at end)
        const nextIndex = (currentIndex + 1) % options.length;
        const nextOption = options[nextIndex];
        
        // Update span
        span.textContent = nextOption.label;
        span.setAttribute('data-value', nextOption.value);
        
        // Trigger change event
        const changeEvent = new CustomEvent('change', {
            detail: { value: nextOption.value, label: nextOption.label }
        });
        span.dispatchEvent(changeEvent);
    } catch (error) {
        console.error('Error cycling alert option:', error);
    }
};

// Global function to cycle slider values in steps
window.cycleSliderValue = function(span) {
    try {
        const currentValue = parseInt(span.getAttribute('data-value'));
        const min = parseInt(span.getAttribute('data-min'));
        const max = parseInt(span.getAttribute('data-max'));
        const step = parseInt(span.getAttribute('data-step'));
        
        // Calculate next value
        let nextValue = currentValue + step;
        if (nextValue > max) {
            nextValue = min; // Wrap around to minimum
        }
        
        // Update span
        const unit = max <= 100 ? '%' : '';
        span.textContent = `${nextValue}${unit}`;
        span.setAttribute('data-value', nextValue);
        
        // Trigger change event
        const changeEvent = new CustomEvent('change', {
            detail: { value: nextValue }
        });
        span.dispatchEvent(changeEvent);
    } catch (error) {
        console.error('Error cycling slider value:', error);
    }
};
