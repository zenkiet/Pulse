PulseApp.ui = PulseApp.ui || {};

PulseApp.ui.common = (() => {
    let searchInput = null;
    let backupsSearchInput = null;

    function init() {
        searchInput = document.getElementById('dashboard-search');
        backupsSearchInput = document.getElementById('backups-search');

        setupTableSorting('main-table');
        setupTableSorting('backups-overview-table');

        _setupDashboardFilterListeners();
        _setupBackupFilterListeners();
        _setupResetButtonListeners();
        _setupGlobalKeydownListeners();
        _setupTabSwitchListeners();
        applyInitialFilterUI();
        applyInitialSortUI();
        
        // Initialize reset button state
        setTimeout(() => updateResetButtonState(), 100); // Small delay to ensure all UI is initialized
    }

    function applyInitialFilterUI() {
        const groupByNode = PulseApp.state.get('groupByNode');
        const filterGuestType = PulseApp.state.get('filterGuestType');
        const filterStatus = PulseApp.state.get('filterStatus');
        const backupsFilterHealth = PulseApp.state.get('backupsFilterHealth');
        const backupsFilterGuestType = PulseApp.state.get('backupsFilterGuestType');
        const backupsFilterBackupType = PulseApp.state.get('backupsFilterBackupType') || 'all';
        // Initialize backup type filter if not set
        if (!PulseApp.state.get('backupsFilterBackupType')) {
            PulseApp.state.set('backupsFilterBackupType', 'all');
        }

        const groupRadio = document.getElementById(groupByNode ? 'group-grouped' : 'group-list');
        if (groupRadio) groupRadio.checked = true;
        const typeRadio = document.getElementById(`filter-${filterGuestType === 'ct' ? 'lxc' : filterGuestType}`);
        if (typeRadio) typeRadio.checked = true;
        const statusRadio = document.getElementById(`filter-status-${filterStatus}`);
        if (statusRadio) statusRadio.checked = true;
        const backupHealthRadio = document.getElementById(`backups-filter-status-${backupsFilterHealth}`);
        if (backupHealthRadio) backupHealthRadio.checked = true;
        const backupTypeRadio = document.getElementById(`backups-filter-type-${backupsFilterGuestType}`);
        if (backupTypeRadio) backupTypeRadio.checked = true;
        const calendarBackupRadio = document.getElementById(`backups-filter-backup-${backupsFilterBackupType}`);
        if (calendarBackupRadio) calendarBackupRadio.checked = true;
    }

    function applyInitialSortUI() {
        const mainSortState = PulseApp.state.getSortState('main');
        const backupsSortState = PulseApp.state.getSortState('backups');

        const initialMainHeader = document.querySelector(`#main-table th[data-sort="${mainSortState.column}"]`);
        if (initialMainHeader) {
          updateSortUI('main-table', initialMainHeader);
        }

        const initialBackupsHeader = document.querySelector(`#backups-overview-table th[data-sort="${backupsSortState.column}"]`);
        if (initialBackupsHeader) {
          updateSortUI('backups-overview-table', initialBackupsHeader);
        }
    }

    function _setupDashboardFilterListeners() {
        document.querySelectorAll('input[name="group-filter"]').forEach(radio => {
            radio.addEventListener('change', function() {
                if (this.checked) {
                    PulseApp.state.set('groupByNode', this.value === 'grouped');
                    PulseApp.ui.dashboard.updateDashboardTable();
                    if (searchInput) searchInput.dispatchEvent(new Event('input'));
                    PulseApp.state.saveFilterState();
                    updateResetButtonState();
                }
            });
        });

        document.querySelectorAll('input[name="type-filter"]').forEach(radio => {
            radio.addEventListener('change', function() {
                if (this.checked) {
                    PulseApp.state.set('filterGuestType', this.value);
                    PulseApp.ui.dashboard.updateDashboardTable();
                    if (searchInput) searchInput.dispatchEvent(new Event('input'));
                    PulseApp.state.saveFilterState();
                    if (PulseApp.ui.thresholds && typeof PulseApp.ui.thresholds.updateLogControlsVisibility === 'function') {
                        PulseApp.ui.thresholds.updateLogControlsVisibility();
                    }
                    updateResetButtonState();
                }
            });
        });

        document.querySelectorAll('input[name="status-filter"]').forEach(radio => {
            radio.addEventListener('change', function() {
                if (this.checked) {
                    PulseApp.state.set('filterStatus', this.value);
                    PulseApp.ui.dashboard.updateDashboardTable();
                    if (searchInput) searchInput.dispatchEvent(new Event('input'));
                    PulseApp.state.saveFilterState();
                    if (PulseApp.ui.thresholds && typeof PulseApp.ui.thresholds.updateLogControlsVisibility === 'function') {
                        PulseApp.ui.thresholds.updateLogControlsVisibility();
                    }
                    updateResetButtonState();
                }
            });
        });

        if (searchInput) {
            const debouncedUpdate = PulseApp.utils.debounce(function() {
                PulseApp.ui.dashboard.updateDashboardTable();
                if (PulseApp.ui.thresholds && typeof PulseApp.ui.thresholds.updateLogControlsVisibility === 'function') {
                    PulseApp.ui.thresholds.updateLogControlsVisibility();
                }
                updateResetButtonState();
            }, 300);
            
            searchInput.addEventListener('input', debouncedUpdate);
        } else {
            console.warn('Element #dashboard-search not found - text filtering disabled.');
        }
    }

    function _setupBackupFilterListeners() {
        document.querySelectorAll('input[name="backups-type-filter"]').forEach(radio => {
            radio.addEventListener('change', function() {
                if (this.checked) {
                    PulseApp.state.set('backupsFilterGuestType', this.value);
                    PulseApp.ui.backups.updateBackupsTab(true); // Mark as user action
                    PulseApp.state.saveFilterState();
                }
            });
        });

        document.querySelectorAll('input[name="backups-status-filter"]').forEach(radio => {
            radio.addEventListener('change', function() {
                if (this.checked) {
                    PulseApp.state.set('backupsFilterHealth', this.value);
                    PulseApp.ui.backups.updateBackupsTab(true); // Mark as user action
                    PulseApp.state.saveFilterState();
                }
            });
        });

        document.querySelectorAll('input[name="backups-backup-filter"]').forEach(radio => {
            radio.addEventListener('change', function() {
                if (this.checked) {
                    // Clear any selected calendar day when filter changes
                    if (PulseApp.ui.calendarHeatmap && PulseApp.ui.calendarHeatmap.clearSelection) {
                        PulseApp.ui.calendarHeatmap.clearSelection();
                    }
                    
                    PulseApp.state.set('backupsFilterBackupType', this.value);
                    PulseApp.ui.backups.updateBackupsTab(true); // Mark as user action
                    PulseApp.state.saveFilterState();
                }
            });
        });

    }

    function _setupResetButtonListeners() {
        const resetButton = document.getElementById('reset-filters-button');
        if (resetButton) {
            resetButton.addEventListener('click', resetDashboardView);
        } else {
            console.warn('Reset button #reset-filters-button not found.');
        }
        // Note: Reset button for backups tab is handled within backups.js init
    }

    function _setupGlobalKeydownListeners() {
        document.addEventListener('keydown', function(event) {
            const activeElement = document.activeElement;
            const isSearchInputFocused = activeElement === searchInput || activeElement === backupsSearchInput;
            const isGeneralInputElement = !isSearchInputFocused && (
                activeElement.tagName === 'INPUT' || 
                activeElement.tagName === 'TEXTAREA' || 
                activeElement.isContentEditable
            );

            // Handle Escape key
            if (event.key === 'Escape') {
                // Check which tab is actually visible (not just has active class)
                const mainTab = document.getElementById('main');
                const backupsTab = document.getElementById('backups');
                
                if (backupsTab && !backupsTab.classList.contains('hidden')) {
                    PulseApp.ui.backups.resetBackupsView();
                } else if (mainTab && !mainTab.classList.contains('hidden')) {
                    resetDashboardView();
                }
            } 
            // Handle Enter key in search inputs
            else if (isSearchInputFocused && event.key === 'Enter') {
                activeElement.blur();
                event.preventDefault();
            } 
            // Handle typing characters for auto-focus search inputs
            else if (
                !isSearchInputFocused &&
                !isGeneralInputElement &&
                !event.metaKey &&
                !event.ctrlKey &&
                !event.altKey &&
                !event.shiftKey &&
                event.key.length === 1 &&
                event.key !== ' ' &&
                /[a-zA-Z0-9]/.test(event.key) // Only alphanumeric characters
            ) {
                // Check which tab is actually visible (not just has active class)
                const mainTab = document.getElementById('main');
                const backupsTab = document.getElementById('backups');
                
                if (backupsTab && !backupsTab.classList.contains('hidden') && backupsSearchInput) {
                    // Backups tab is visible
                    backupsSearchInput.focus();
                    backupsSearchInput.value = event.key; // Set the typed character immediately
                    event.preventDefault(); // Prevent the character from being typed twice
                } else if (mainTab && !mainTab.classList.contains('hidden') && searchInput) {
                    // Main tab is visible
                    searchInput.focus();
                    searchInput.value = event.key; // Set the typed character immediately
                    event.preventDefault(); // Prevent the character from being typed twice
                }
            }
        });
    }

    function _setupTabSwitchListeners() {
        // Listen for tab clicks to clear search inputs when switching tabs
        document.querySelectorAll('.tab[data-tab]').forEach(tab => {
            tab.addEventListener('click', function() {
                const targetTab = this.getAttribute('data-tab');
                
                // Clear search inputs when switching between main and backups tabs
                if (targetTab === 'main' && backupsSearchInput && backupsSearchInput.value) {
                    // Switching to main tab, clear backups search if it has content
                    backupsSearchInput.value = '';
                    // Trigger search update to clear filtered results
                    if (PulseApp.ui && PulseApp.ui.backups) {
                        PulseApp.ui.backups.updateBackupsTab();
                    }
                } else if (targetTab === 'backups' && searchInput && searchInput.value) {
                    // Switching to backups tab, clear main search if it has content
                    searchInput.value = '';
                    // Trigger dashboard update to clear filtered results
                    if (PulseApp.ui && PulseApp.ui.dashboard) {
                        PulseApp.ui.dashboard.updateDashboardTable();
                    }
                }
            });
        });
    }

    function updateSortUI(tableId, clickedHeader, explicitKey = null) {
        const tableElement = document.getElementById(tableId);
        if (!tableElement) return;

        let derivedKey;
         if (tableId.startsWith('pbs-')) {
             const match = tableId.match(/pbs-recent-(backup|verify|sync|prunegc)-tasks-table-/);
             derivedKey = match && match[1] ? `pbs${match[1].charAt(0).toUpperCase() + match[1].slice(1)}` : null;
         } else if (tableId.startsWith('nodes-')) {
             derivedKey = 'nodes';
         } else if (tableId.startsWith('main-')) {
             derivedKey = 'main';
         } else if (tableId.startsWith('backups-')) {
             derivedKey = 'backups';
         } else {
             derivedKey = null;
         }

        const tableKey = explicitKey || derivedKey;
        if (!tableKey) {
            console.error(`[updateSortUI] Could not determine sort key for tableId: ${tableId}`);
            return;
        }

        const currentSort = PulseApp.state.getSortState(tableKey);
        if (!currentSort) {
            console.error(`[updateSortUI] No sort state found for key: '${tableKey}'`);
            return;
        }

        const headers = tableElement.querySelectorAll('th.sortable');
        headers.forEach(header => {
            header.classList.remove('bg-blue-50', 'dark:bg-blue-900/20');
            const arrow = header.querySelector('.sort-arrow');
            if (arrow) arrow.remove();

            if (header === clickedHeader && currentSort.column) {
                header.classList.add('bg-blue-50', 'dark:bg-blue-900/20');
                const arrowSpan = document.createElement('span');
                arrowSpan.className = 'sort-arrow ml-1';
                arrowSpan.textContent = currentSort.direction === 'asc' ? '▲' : '▼';
                header.appendChild(arrowSpan);
            }
        });
    }

    function setupTableSorting(tableId) {
        const tableElement = document.getElementById(tableId);
        if (!tableElement) {
            console.warn(`Table #${tableId} not found for sort setup.`);
            return;
        }
        const tableTypeMatch = tableId.match(/^([a-zA-Z]+)-/);
        if (!tableTypeMatch) {
            console.warn(`Could not determine table type from ID: ${tableId}`);
            return;
        }
        const tableType = tableTypeMatch[1];

        tableElement.querySelectorAll('th.sortable').forEach(th => {
          // Make sortable headers keyboard accessible
          th.setAttribute('tabindex', '0');
          th.setAttribute('role', 'button');
          th.setAttribute('aria-label', `Sort by ${th.textContent.trim()}`);
          
          const handleSort = () => {
            const column = th.getAttribute('data-sort');
            if (!column) return;

            const currentSortState = PulseApp.state.getSortState(tableType);
            let newDirection = 'asc';
            if (currentSortState && currentSortState.column === column) {
                newDirection = currentSortState.direction === 'asc' ? 'desc' : 'asc';
            }

            PulseApp.state.setSortState(tableType, column, newDirection);

            switch(tableType) {
                case 'main':
                    PulseApp.ui.dashboard.updateDashboardTable();
                    break;
                case 'backups':
                    PulseApp.ui.backups.updateBackupsTab();
                    break;
                default:
                    console.error('Unknown table type for sorting update:', tableType);
            }

            updateSortUI(tableId, th);
          };
          
          th.addEventListener('click', handleSort);
          th.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleSort();
            }
          });
        });
    }

    function resetDashboardView() {
        // Reset search
        if (searchInput) searchInput.value = '';

        // Reset filters to defaults
        PulseApp.state.set('groupByNode', true);
        document.getElementById('group-grouped').checked = true;
        PulseApp.state.set('filterGuestType', 'all');
        document.getElementById('filter-all').checked = true;
        PulseApp.state.set('filterStatus', 'all');
        document.getElementById('filter-status-all').checked = true;

        // Note: Thresholds are now handled by their own dedicated reset button

        // Update table and save states
        PulseApp.ui.dashboard.updateDashboardTable();
        PulseApp.state.saveFilterState();
        // Sort state is not reset by this action intentionally
        
        // Update reset button highlighting
        updateResetButtonState();
    }
    
    function hasActiveFilters() {
        // Check search input
        if (searchInput && searchInput.value.trim() !== '') return true;
        
        // Check filters
        const filterGuestType = PulseApp.state.get('filterGuestType');
        const filterStatus = PulseApp.state.get('filterStatus');
        const groupByNode = PulseApp.state.get('groupByNode');
        
        if (filterGuestType !== 'all' || filterStatus !== 'all' || groupByNode !== true) return true;
        
        // Note: Thresholds are no longer included - they have their own reset button
        
        return false;
    }
    
    function updateResetButtonState() {
        const resetButton = document.getElementById('reset-filters-button');
        if (!resetButton) return;
        
        const hasActiveStates = hasActiveFilters();
        
        if (hasActiveStates) {
            // Highlighted state - button is active
            resetButton.className = 'flex items-center justify-center p-1 h-11 w-11 sm:h-7 sm:w-7 text-xs border-2 border-orange-500 rounded bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/40 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors flex-shrink-0';
        } else {
            // Default state - button is inactive
            resetButton.className = 'flex items-center justify-center p-1 h-11 w-11 sm:h-7 sm:w-7 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none transition-colors flex-shrink-0';
        }
    }

    function generateNodeGroupHeaderCellHTML(text, colspan, cellTag = 'td') {
        const baseClasses = 'py-0.5 px-2 text-left font-medium text-xs sm:text-sm text-gray-700 dark:text-gray-300';
        
        // Check if we can make this node name clickable
        const hostUrl = PulseApp.utils.getHostUrl(text);
        let nodeContent = text;
        
        if (hostUrl) {
            nodeContent = `<a href="${hostUrl}" target="_blank" rel="noopener noreferrer" class="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-150 cursor-pointer" title="Open ${text} web interface">${text}</a>`;
        }
        
        // Always create individual cells so first one can be sticky
        let html = `<${cellTag} class="sticky left-0 bg-gray-200 dark:bg-gray-700 z-10 ${baseClasses}">${nodeContent}</${cellTag}>`;
        // Add empty cells for remaining columns
        for (let i = 1; i < colspan; i++) {
            html += `<${cellTag} class="bg-gray-200 dark:bg-gray-700"></${cellTag}>`;
        }
        return html;
    }

    return {
        init,
        updateSortUI,
        setupTableSorting,
        resetDashboardView,
        generateNodeGroupHeaderCellHTML,
        updateResetButtonState,
        hasActiveFilters
    };
})();
