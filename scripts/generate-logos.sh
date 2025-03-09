#!/bin/bash

# Script to generate Pulse logo PNGs in various sizes

# Ensure we're in the project root
cd "$(dirname "$0")/.." || exit

# Create the logos directory if it doesn't exist
mkdir -p public/logos

# Install the canvas dependency if not already installed
if ! npm list canvas >/dev/null 2>&1; then
  echo "Installing canvas dependency..."
  npm install canvas
fi

# Generate the logos
echo "Generating square logos (icon only)..."
node scripts/generate-logo-pngs.js

echo "Generating rectangular logos (with text)..."
node scripts/generate-logo-with-text.js

echo ""
echo "Logo generation complete!"
echo "Logo files are available in the public/logos directory."
echo ""
echo "Available logo files:"
ls -la public/logos/*.png

# Make the script executable
chmod +x "$(dirname "$0")/generate-logos.sh" 