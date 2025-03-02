#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored messages
print_message() {
  echo -e "${GREEN}[RELEASE] $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}[WARNING] $1${NC}"
}

print_error() {
  echo -e "${RED}[ERROR] $1${NC}"
}

# Check if version is provided
if [ -z "$1" ]; then
  print_error "No version specified. Usage: ./release.sh <version> [skip-docker]"
  echo "Example: ./release.sh 1.0.13"
  exit 1
fi

VERSION=$1
SKIP_DOCKER=${2:-false}

# Check if the version format is valid (e.g., 1.0.13)
if ! [[ $VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  print_error "Invalid version format. Please use semantic versioning (e.g., 1.0.13)"
  exit 1
fi

# Check if git is clean
if [ -n "$(git status --porcelain)" ]; then
  print_warning "Working directory is not clean. Uncommitted changes will be included in the release."
  read -p "Continue? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_message "Release aborted."
    exit 1
  fi
fi

# Check if we're on the main branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ]; then
  print_warning "You are not on the main branch. Current branch: $CURRENT_BRANCH"
  read -p "Continue? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_message "Release aborted."
    exit 1
  fi
fi

print_message "Starting release process for version $VERSION"

# 1. Update version in files
print_message "Updating version in files..."

# Update version.js
cat > frontend/src/utils/version.js << EOF
// This file contains the version information for the application
// It is automatically updated when a new release is created

export const VERSION = '$VERSION'; // Updated by release script
EOF

# Update package.json
sed -i '' "s/\"version\": \"[0-9]*\.[0-9]*\.[0-9]*\"/\"version\": \"$VERSION\"/" package.json
sed -i '' "s/\"version\": \"[0-9]*\.[0-9]*\.[0-9]*\"/\"version\": \"$VERSION\"/" frontend/package.json

# Update Dockerfile labels
sed -i '' "s/LABEL org.opencontainers.image.version=\"[0-9]*\.[0-9]*\.[0-9]*\"/LABEL org.opencontainers.image.version=\"$VERSION\"/" Dockerfile

# 2. Commit version changes
print_message "Committing version changes..."
git add frontend/src/utils/version.js package.json frontend/package.json Dockerfile
git commit -m "Bump version to $VERSION"

# 3. Push changes to main
print_message "Pushing changes to main..."
git push origin main

# 4. Create and push tag
print_message "Creating and pushing tag v$VERSION..."
git tag -a "v$VERSION" -m "Release v$VERSION"
git push origin "v$VERSION"

# 5. Create GitHub release
print_message "Creating GitHub release..."
RELEASE_NOTES="Release v$VERSION"
gh release create "v$VERSION" --title "Release v$VERSION" --notes "$RELEASE_NOTES"

# 6. Build and push Docker image if not skipped
if [ "$SKIP_DOCKER" != "true" ] && [ "$SKIP_DOCKER" != "skip-docker" ]; then
  print_message "Building Docker image..."
  docker build --target production -t "rcourtman/pulse:$VERSION" -t rcourtman/pulse:latest .
  
  print_message "Pushing Docker image to Docker Hub..."
  docker push "rcourtman/pulse:$VERSION"
  docker push rcourtman/pulse:latest
  
  print_message "Verifying Docker image labels..."
  docker inspect --format='{{json .Config.Labels}}' "rcourtman/pulse:$VERSION"
else
  print_message "Skipping Docker build and push as requested."
fi

print_message "Release v$VERSION completed successfully!"
print_message "GitHub release: https://github.com/rcourtman/pulse/releases/tag/v$VERSION"
if [ "$SKIP_DOCKER" != "true" ] && [ "$SKIP_DOCKER" != "skip-docker" ]; then
  print_message "Docker image: rcourtman/pulse:$VERSION"
fi

# Wait for GitHub Actions workflows to start
print_message "Waiting for GitHub Actions workflows to start..."
sleep 10
gh run list --limit 5
