# Developer Documentation

This document provides detailed information about the ProxMox Pulse codebase structure, key components, and design decisions to help new contributors understand the project.

## Project Architecture

ProxMox Pulse uses a modern web application architecture with a Node.js backend and a React frontend:

```
pulse/
├── src/                  # Backend source code
│   ├── api/              # API routes and controllers
│   ├── models/           # Data models
│   ├── services/         # Business logic and external services
│   ├── utils/            # Utility functions
│   ├── websocket/        # WebSocket implementation
│   └── server.js         # Main server entry point
├── frontend/             # Frontend React application
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── pages/        # Page components
│   │   ├── services/     # API client services
│   │   ├── store/        # State management
│   │   ├── styles/       # CSS/SCSS styles
│   │   └── utils/        # Utility functions
│   └── public/           # Static assets
└── scripts/              # Utility scripts
```

## Key Components

### Backend

#### ProxMox API Client (`src/services/proxmox-api.js`)

This service handles all communication with the ProxMox API. It:
- Authenticates with ProxMox servers
- Retrieves node, VM, and container information
- Polls for updates at configured intervals
- Handles error conditions and retries

#### WebSocket Server (`src/websocket/server.js`)

The WebSocket server:
- Broadcasts real-time updates to connected clients
- Manages client connections
- Handles authentication and authorization
- Implements message queuing for reliability

#### Metrics Collection (`src/services/metrics.js`)

This service:
- Collects and processes metrics from ProxMox nodes
- Calculates derived metrics (averages, trends)
- Maintains historical data for the configured retention period
- Optimizes data for transmission to clients

### Frontend

#### Dashboard Components (`frontend/src/components/Dashboard/`)

The dashboard components:
- Display summary information for all nodes
- Show resource usage charts
- Provide filtering and sorting options
- Handle responsive layouts for different screen sizes

#### Resource Monitoring (`frontend/src/components/Resources/`)

These components:
- Display detailed resource information for VMs and containers
- Implement real-time updates via WebSocket
- Provide filtering and search functionality
- Visualize resource usage with charts and graphs

#### WebSocket Client (`frontend/src/services/websocket.js`)

The WebSocket client:
- Establishes and maintains connection to the server
- Handles reconnection logic
- Processes incoming messages
- Dispatches updates to the application state

## Design Decisions

### Split Development Architecture

We use a split architecture during development:
- Backend server (port 7654): Handles ProxMox API communication
- Frontend server (port 3000): Provides hot reloading for React

This separation allows for:
- Independent development of frontend and backend
- Better developer experience with hot reloading
- Clear separation of concerns

In production, these are combined into a single service.

### Real-time Updates

We chose WebSockets for real-time updates because:
- They provide lower latency than polling
- They reduce server load compared to frequent HTTP requests
- They enable push notifications for important events
- They work well with the reactive nature of the frontend

### State Management

The frontend uses a combination of:
- React Context for global state
- React Query for server state
- Local component state for UI-specific state

This approach:
- Minimizes unnecessary re-renders
- Separates server and client state concerns
- Provides optimistic updates for better UX

### Error Handling

We implement comprehensive error handling:
- Backend errors are logged and monitored
- API errors are retried with exponential backoff
- User-facing errors are displayed with actionable information
- Critical errors trigger notifications

## Performance Considerations

### Data Optimization

To ensure good performance:
- We minimize data sent over the wire by filtering server-side
- We use compression for WebSocket messages
- We implement pagination for large datasets
- We optimize polling intervals based on data volatility

### Rendering Optimization

The frontend optimizes rendering by:
- Using React.memo for expensive components
- Implementing virtualized lists for large datasets
- Debouncing rapidly changing values
- Using web workers for CPU-intensive operations

## Testing

### Backend Testing

Backend tests focus on:
- Unit tests for business logic
- Integration tests for API endpoints
- Mock tests for external services

### Frontend Testing

Frontend tests include:
- Component tests with React Testing Library
- Hook tests for custom hooks
- End-to-end tests for critical user flows

## Common Development Tasks

### Adding a New Metric

To add a new metric:
1. Add the metric to the ProxMox API client
2. Update the metrics processing service
3. Add the metric to the WebSocket payload
4. Create or update frontend components to display the metric
5. Add tests for the new functionality

### Adding a New Feature

When adding a new feature:
1. Create an issue describing the feature
2. Discuss the implementation approach
3. Implement backend changes
4. Implement frontend changes
5. Add tests
6. Update documentation

## Troubleshooting

### Common Development Issues

- **WebSocket connection issues**: Check that both servers are running and ports are not blocked
- **Hot reloading not working**: Verify that the Vite dev server is running correctly
- **API errors**: Check the ProxMox API token permissions and server connectivity
- **Build errors**: Ensure all dependencies are installed and compatible

### Debugging Tips

- Use the browser developer tools to inspect network requests and WebSocket messages
- Check the server logs for backend errors
- Use React DevTools to inspect component state and props
- Set `LOG_LEVEL=debug` in your .env file for more verbose logging 