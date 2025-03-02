#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Print usage information
function print_usage {
  echo -e "${YELLOW}Usage:${NC} $0 <new_version>"
  echo -e "Example: $0 1.0.13"
  echo ""
  echo -e "${YELLOW}Note:${NC} This script is intended for repository owners with proper Git and Docker Hub authentication."
}

# Check if version argument is provided
if [ $# -ne 1 ]; then
  echo -e "${RED}Error: Version number is required${NC}"
  print_usage
  exit 1
fi

NEW_VERSION=$1

# Validate version format (simple check)
if ! [[ $NEW_VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo -e "${RED}Error: Version must be in format X.Y.Z (e.g., 1.0.13)${NC}"
  exit 1
fi

echo -e "${YELLOW}Starting release process for version ${NEW_VERSION}...${NC}"

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
  echo -e "${RED}Error: You have uncommitted changes. Please commit or stash them before releasing.${NC}"
  git status
  exit 1
fi

# Pull latest changes
echo -e "${YELLOW}Pulling latest changes from main branch...${NC}"
git pull origin main

# Update version in files
echo -e "${YELLOW}Updating version to ${NEW_VERSION} in files...${NC}"

# Update frontend/src/utils/version.js
cat > frontend/src/utils/version.js << EOF
// This file contains the version information for the application
// It is automatically updated when a new release is created

export const VERSION = '${NEW_VERSION}'; // Updated by GitHub Actions
EOF

# Update package.json
npm version $NEW_VERSION --no-git-tag-version

# Update frontend/package.json
cd frontend && npm version $NEW_VERSION --no-git-tag-version && cd ..

# Update Dockerfile label
sed -i '' "s/LABEL org.opencontainers.image.version=\".*\"/LABEL org.opencontainers.image.version=\"${NEW_VERSION}\"/" Dockerfile

# Commit version changes
echo -e "${YELLOW}Committing version changes...${NC}"
git add frontend/src/utils/version.js package.json frontend/package.json Dockerfile
git commit -m "Bump version to ${NEW_VERSION}"

# Push changes to main
echo -e "${YELLOW}Pushing changes to main branch...${NC}"
git push origin main

# Create and push tag
echo -e "${YELLOW}Creating and pushing tag v${NEW_VERSION}...${NC}"
git tag -a "v${NEW_VERSION}" -m "Release v${NEW_VERSION}"
git push origin "v${NEW_VERSION}"

# Build Docker image (production stage)
echo -e "${YELLOW}Building Docker image for version ${NEW_VERSION}...${NC}"
docker build --target production -t "rcourtman/pulse:${NEW_VERSION}" -t rcourtman/pulse:latest .

# Push Docker images
echo -e "${YELLOW}Pushing Docker images to Docker Hub...${NC}"
docker push "rcourtman/pulse:${NEW_VERSION}"
docker push rcourtman/pulse:latest

# Create GitHub release
echo -e "${YELLOW}Creating GitHub release...${NC}"
gh release create "v${NEW_VERSION}" \
  --title "Release v${NEW_VERSION}" \
  --notes "Release v${NEW_VERSION}. See commit history for details."

echo -e "${GREEN}Release v${NEW_VERSION} completed successfully!${NC}"
echo -e "${YELLOW}Note: GitHub Actions workflows should now be running to update version files.${NC}"
echo -e "${YELLOW}You can check their status with: gh run list --limit 5${NC}"

exit 0
