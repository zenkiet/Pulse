#!/bin/bash
set -e
# Build the tool
echo "🔨 Building screenshot tool..."
npm run build
# Run the screenshot tool
echo "📸 Taking screenshots..."
npm start -- --url "http://localhost:3000" --config "screenshot-config.json"
