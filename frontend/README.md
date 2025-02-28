# System Monitor Frontend

A React-based frontend for real-time system monitoring with socket.io for live data updates.

## Features

- Real-time network data monitoring
- WebSocket communication with the backend
- Responsive Material UI design
- Automatic reconnection handling

## Requirements

- Node.js 18.x or higher
- npm or yarn

## Installation

1. Install dependencies:

```bash
npm install
# or
yarn
```

2. Configure environment (if needed):

Create a `.env` file in the root directory with the following variables:
```
VITE_API_URL=http://your-backend-url:3000
```

## Development

To start the development server:

```bash
npm run dev
# or
yarn dev
```

This will start a development server at http://localhost:5173

## Building for Production

To create a production build:

```bash
npm run build
# or
yarn build
```

This will generate optimized files in the `dist` directory.

## Preview Production Build

To preview the production build locally:

```bash
npm run preview
# or
yarn preview
```

## Troubleshooting

If you're experiencing issues with real-time updates:

1. Check that the WebSocket server is running
2. Ensure your browser supports WebSockets
3. Check the network tab in your developer tools for any connection errors
4. Verify that the proxy settings in vite.config.js match your backend URL 