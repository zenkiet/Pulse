#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
VERSION_TYPE="patch"
DOCKER_PUSH=true
GITHUB_RELEASE=true
DOCKER_USERNAME="rcourtman"
DOCKER_REPO="pulse"

# Display help
function show_help {
  echo -e "${BLUE}ProxMox Pulse Release Script${NC}"
  echo -e "Usage: $0 [options]"
  echo -e ""
  echo -e "Options:"
  echo -e "  -h, --help                 Show this help message"
  echo -e "  -t, --type TYPE            Version type to bump (patch, minor, major) [default: patch]"
  echo -e "  --skip-docker              Skip Docker image build and push"
  echo -e "  --skip-github              Skip GitHub release creation"
  echo -e "  -u, --docker-username USER Docker Hub username [default: rcourtman]"
  echo -e "  -r, --docker-repo REPO     Docker Hub repository [default: pulse]"
  echo -e ""
  echo -e "Examples:"
  echo -e "  $0                         # Release patch version (1.0.x -> 1.0.x+1)"
  echo -e "  $0 -t minor                # Release minor version (1.x.0 -> 1.x+1.0)"
  echo -e "  $0 -t major                # Release major version (x.0.0 -> x+1.0.0)"
  echo -e "  $0 --skip-docker           # Release without Docker operations"
  echo -e ""
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -h|--help)
      show_help
      exit 0
      ;;
    -t|--type)
      VERSION_TYPE="$2"
      if [[ ! "$VERSION_TYPE" =~ ^(patch|minor|major)$ ]]; then
        echo -e "${RED}Error: Version type must be 'patch', 'minor', or 'major'${NC}"
        exit 1
      fi
      shift 2
      ;;
    --skip-docker)
      DOCKER_PUSH=false
      shift
      ;;
    --skip-github)
      GITHUB_RELEASE=false
      shift
      ;;
    -u|--docker-username)
      DOCKER_USERNAME="$2"
      shift 2
      ;;
    -r|--docker-repo)
      DOCKER_REPO="$2"
      shift 2
      ;;
    *)
      echo -e "${RED}Error: Unknown option: $1${NC}"
      show_help
      exit 1
      ;;
  esac
done

echo -e "${YELLOW}Starting release process...${NC}"

# Step 1: Check current version
echo -e "${YELLOW}Checking current version...${NC}"
CURRENT_VERSION=$(grep -o "'[0-9]\+\.[0-9]\+\.[0-9]\+'" frontend/src/utils/version.js | tr -d "'")
echo "Current version: $CURRENT_VERSION"

# Step 2: Determine next version based on version type
echo -e "${YELLOW}Determining next version (${VERSION_TYPE})...${NC}"
MAJOR=$(echo $CURRENT_VERSION | cut -d. -f1)
MINOR=$(echo $CURRENT_VERSION | cut -d. -f2)
PATCH=$(echo $CURRENT_VERSION | cut -d. -f3)

if [[ "$VERSION_TYPE" == "major" ]]; then
  NEW_MAJOR=$((MAJOR + 1))
  NEW_MINOR=0
  NEW_PATCH=0
  NEW_VERSION="$NEW_MAJOR.$NEW_MINOR.$NEW_PATCH"
elif [[ "$VERSION_TYPE" == "minor" ]]; then
  NEW_MAJOR=$MAJOR
  NEW_MINOR=$((MINOR + 1))
  NEW_PATCH=0
  NEW_VERSION="$NEW_MAJOR.$NEW_MINOR.$NEW_PATCH"
else # patch
  NEW_MAJOR=$MAJOR
  NEW_MINOR=$MINOR
  NEW_PATCH=$((PATCH + 1))
  NEW_VERSION="$NEW_MAJOR.$NEW_MINOR.$NEW_PATCH"
fi

echo "New version will be: $NEW_VERSION"

# Confirm with user
read -p "Do you want to proceed with the release? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${RED}Release process aborted.${NC}"
  exit 0
fi

# Step 3: Check for uncommitted changes (ignoring .cursor/ directory)
echo -e "${YELLOW}Checking for uncommitted changes...${NC}"
if [ -n "$(git status --porcelain | grep -v '^?? \.cursor/')" ]; then
  echo -e "${RED}Error: You have uncommitted changes. Please commit or stash them before releasing.${NC}"
  git status
  exit 1
else
  echo "No uncommitted changes (ignoring .cursor/ directory), proceeding with release."
fi

# Step 4: Pull latest changes
echo -e "${YELLOW}Pulling latest changes from main branch...${NC}"
git pull origin main

# Step 5: Update version in files
echo -e "${YELLOW}Updating version to ${NEW_VERSION} in files...${NC}"

# Update frontend/src/utils/version.js
cat > frontend/src/utils/version.js << EOF
// This file contains the version information for the application
// It is automatically updated when a new release is created

export const VERSION = '$NEW_VERSION'; // Updated by release script
EOF

# Update package.json
npm version $NEW_VERSION --no-git-tag-version

# Update frontend/package.json
cd frontend && npm version $NEW_VERSION --no-git-tag-version && cd ..

# Update Dockerfile label
sed -i '' "s/LABEL org.opencontainers.image.version=\".*\"/LABEL org.opencontainers.image.version=\"$NEW_VERSION\"/" Dockerfile

# Step 6: Commit version changes
echo -e "${YELLOW}Committing version changes...${NC}"
git add frontend/src/utils/version.js package.json frontend/package.json Dockerfile
git commit -m "Bump version to $NEW_VERSION"

# Step 7: Push changes to main
echo -e "${YELLOW}Pushing changes to main branch...${NC}"
git push origin main

# Step 8: Create and push tag
echo -e "${YELLOW}Creating and pushing tag v${NEW_VERSION}...${NC}"
git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"
git push origin "v$NEW_VERSION"

# Step 9: Build and push Docker image if not skipped
if [ "$DOCKER_PUSH" = true ]; then
  # Build Docker image
  echo -e "${YELLOW}Building Docker image for version ${NEW_VERSION}...${NC}"
  docker build --target production -t "${DOCKER_USERNAME}/${DOCKER_REPO}:${NEW_VERSION}" -t "${DOCKER_USERNAME}/${DOCKER_REPO}:latest" .

  # Push Docker images
  echo -e "${YELLOW}Pushing Docker images to Docker Hub...${NC}"
  docker push "${DOCKER_USERNAME}/${DOCKER_REPO}:${NEW_VERSION}"
  docker push "${DOCKER_USERNAME}/${DOCKER_REPO}:latest"
else
  echo -e "${YELLOW}Skipping Docker image build and push as requested.${NC}"
fi

# Step 10: Create GitHub release if not skipped
if [ "$GITHUB_RELEASE" = true ]; then
  echo -e "${YELLOW}Creating GitHub release...${NC}"
  
  # Check if gh CLI is installed
  if ! command -v gh &> /dev/null; then
    echo -e "${RED}GitHub CLI (gh) is not installed. Skipping GitHub release creation.${NC}"
    echo -e "${YELLOW}You can create the release manually at: https://github.com/${DOCKER_USERNAME}/${DOCKER_REPO}/releases/new${NC}"
  else
    # Create release notes based on commits since last tag
    PREV_TAG=$(git describe --tags --abbrev=0 HEAD^ 2>/dev/null || echo "")
    if [ -n "$PREV_TAG" ]; then
      RELEASE_NOTES="## Changes since $PREV_TAG\n\n"
      RELEASE_NOTES+=$(git log --pretty=format:"* %s" $PREV_TAG..HEAD)
    else
      RELEASE_NOTES="Release v$NEW_VERSION with improvements and bug fixes. See commit history for details."
    fi
    
    # Create GitHub release
    gh release create "v$NEW_VERSION" \
      --title "Release v$NEW_VERSION" \
      --notes "$RELEASE_NOTES"
  fi
else
  echo -e "${YELLOW}Skipping GitHub release creation as requested.${NC}"
fi

echo -e "${GREEN}Release v${NEW_VERSION} completed successfully!${NC}"
echo -e "${GREEN}===============================================${NC}"
echo -e "${GREEN}Version:       ${NC}v$NEW_VERSION"
echo -e "${GREEN}Docker Image:  ${NC}${DOCKER_USERNAME}/${DOCKER_REPO}:${NEW_VERSION}"
echo -e "${GREEN}GitHub Tag:    ${NC}v$NEW_VERSION"
if [ "$GITHUB_RELEASE" = true ]; then
  echo -e "${GREEN}GitHub Release:${NC} https://github.com/${DOCKER_USERNAME}/${DOCKER_REPO}/releases/tag/v$NEW_VERSION"
fi
echo -e "${GREEN}===============================================${NC}" 