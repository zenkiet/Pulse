import { useState, useCallback, useEffect } from 'react';
import { STORAGE_KEY_SORT } from '../../../constants/networkConstants';

const useSortManagement = () => {
  // Sort state
  const [sortConfig, setSortConfig] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SORT);
      return saved ? JSON.parse(saved) : { key: 'id', direction: 'asc' };
    } catch (e) {
      console.error('Error loading sort preferences:', e);
      return { key: 'id', direction: 'asc' };
    }
  });

  // Request sort by key
  const requestSort = useCallback((key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  // Save sort preferences whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SORT, JSON.stringify(sortConfig));
  }, [sortConfig]);

  return {
    sortConfig,
    setSortConfig,
    requestSort
  };
};

export default useSortManagement; 