#!/bin/bash
set -e

# Check if a version argument was provided
if [ -z "$1" ]; then
  echo "Error: Version number is required"
  echo "Usage: ./scripts/release.sh <version>"
  echo "Example: ./scripts/release.sh 1.0.13"
  exit 1
fi

VERSION=$1
VERSION_TAG="v$VERSION"
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Ensure we're on the main branch
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo "Error: You must be on the main branch to create a release"
  exit 1
fi

# Ensure the working directory is clean
if [ -n "$(git status --porcelain)" ]; then
  echo "Error: Working directory is not clean. Please commit or stash changes first."
  exit 1
fi

# Pull latest changes
echo "Pulling latest changes from origin/main..."
git pull origin main

# Update version numbers in files
echo "Updating version to $VERSION in files..."
# Update version.js
cat > frontend/src/utils/version.js << EOF
// This file contains the version information for the application
// It is automatically updated when a new release is created

export const VERSION = '$VERSION'; // Updated by GitHub Actions
EOF

# Update package.json files
sed -i '' "s/\"version\": \"[0-9]*\.[0-9]*\.[0-9]*\"/\"version\": \"$VERSION\"/" package.json
sed -i '' "s/\"version\": \"[0-9]*\.[0-9]*\.[0-9]*\"/\"version\": \"$VERSION\"/" frontend/package.json

# Update Docker labels
sed -i '' "s/LABEL org.opencontainers.image.version=\"[0-9]*\.[0-9]*\.[0-9]*\"/LABEL org.opencontainers.image.version=\"$VERSION\"/" Dockerfile

# Commit version changes
echo "Committing version changes..."
git add frontend/src/utils/version.js package.json frontend/package.json Dockerfile
git commit -m "Bump version to $VERSION"

# Push changes to main
echo "Pushing changes to main..."
git push origin main

# Create and push tag
echo "Creating and pushing tag $VERSION_TAG..."
git tag -a "$VERSION_TAG" -m "Release $VERSION_TAG"
git push origin "$VERSION_TAG"

# Build Docker image (production target)
echo "Building Docker image rcourtman/pulse:$VERSION and rcourtman/pulse:latest..."
docker build --target production -t "rcourtman/pulse:$VERSION" -t "rcourtman/pulse:latest" .

# Push Docker images
echo "Pushing Docker images to Docker Hub..."
docker push "rcourtman/pulse:$VERSION"
docker push "rcourtman/pulse:latest"

# Create GitHub release
echo "Creating GitHub release $VERSION_TAG..."
gh release create "$VERSION_TAG" --title "Release $VERSION_TAG" --notes "Release $VERSION_TAG"

echo "Release $VERSION_TAG completed successfully!"
echo "Docker images pushed: rcourtman/pulse:$VERSION and rcourtman/pulse:latest"
echo "GitHub release created: $VERSION_TAG"
echo ""
echo "The GitHub Actions workflows should now be running to update the version files."
echo "You can check their status with: gh run list --limit 5" 