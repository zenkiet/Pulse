#!/bin/bash

# Script to build and push Docker images for Pulse to Docker Hub
# Usage: ./publish-docker.sh <version>
# Example: ./publish-docker.sh 1.0.0

# Exit on error
set -e

# Check if version is provided
if [ -z "$1" ]; then
  echo "Error: Version number is required"
  echo "Usage: ./publish-docker.sh <version>"
  echo "Example: ./publish-docker.sh 1.0.0"
  exit 1
fi

VERSION=$1
USERNAME="rcourtman"
REPO="pulse"

echo "🔨 Building Docker image for $USERNAME/$REPO:$VERSION..."
docker build -t $USERNAME/$REPO:$VERSION --target production .

echo "🏷️ Tagging additional versions..."
# Tag as latest
docker tag $USERNAME/$REPO:$VERSION $USERNAME/$REPO:latest

# Tag as major.minor (e.g., 1.0)
MAJOR_MINOR=$(echo $VERSION | cut -d. -f1,2)
docker tag $USERNAME/$REPO:$VERSION $USERNAME/$REPO:$MAJOR_MINOR

echo "🔑 Logging in to Docker Hub..."
echo "Please enter your Docker Hub password when prompted"
docker login -u $USERNAME

echo "⬆️ Pushing images to Docker Hub..."
docker push $USERNAME/$REPO:$VERSION
docker push $USERNAME/$REPO:latest
docker push $USERNAME/$REPO:$MAJOR_MINOR

echo "✅ Successfully published $USERNAME/$REPO:$VERSION to Docker Hub!"
echo "✅ Also published tags: latest, $MAJOR_MINOR"
echo ""
echo "Users can now pull your image with:"
echo "docker pull $USERNAME/$REPO:$VERSION"
echo ""
echo "Or use the latest version:"
echo "docker pull $USERNAME/$REPO:latest"
echo ""
echo "Run with:"
echo "docker run -d -p 7654:7654 --env-file .env --name pulse-app $USERNAME/$REPO:latest" 