import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TableCell, TableSortLabel, Tooltip } from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

const DraggableColumnHeader = ({
  id,
  label,
  width,
  minWidth,
  sortConfig,
  requestSort,
  isDragging,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    width: width || 'auto',
    minWidth: minWidth || 'auto',
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: isDragging ? 'rgba(0, 0, 0, 0.05)' : 'inherit',
  };

  // Helper function to get sort direction
  const getSortDirection = (key) => {
    if (!sortConfig || !key) return 'asc';
    return sortConfig.key === key ? sortConfig.direction : 'asc';
  };

  return (
    <TableCell 
      ref={setNodeRef} 
      style={style}
      {...attributes}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Tooltip title="Drag to reorder column">
          <span 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              marginRight: '8px',
              cursor: 'grab',
              color: '#1976d2'
            }}
            {...listeners}
          >
            <DragIndicatorIcon fontSize="small" color="primary" />
          </span>
        </Tooltip>
        <TableSortLabel
          active={sortConfig?.key === id}
          direction={getSortDirection(id)}
          onClick={() => requestSort(id)}
        >
          {label || id}
        </TableSortLabel>
      </div>
    </TableCell>
  );
};

export default DraggableColumnHeader; 