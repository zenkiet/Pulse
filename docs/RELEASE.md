# Pulse Release Guide

This document outlines the process and checklist for creating new releases of the ProxMox Pulse application.

## Release Types

Releases should be created when there are:
- New features
- Bug fixes
- Security updates
- Breaking changes
- Significant dependency updates that affect runtime behavior

For development-only changes (like dev dependency updates), wait for the next feature/bugfix release.

## Prerequisites

Before creating a release, ensure you have:
- Git configured with appropriate credentials
- Docker installed and logged in to Docker Hub
- Docker buildx configured for multi-architecture builds:
  ```bash
  # Check if buildx is available
  docker buildx version
  
  # List existing builders
  docker buildx ls
  
  # Create a new builder if needed
  docker buildx create --name multiarch-builder --driver docker-container --bootstrap
  
  # Use the builder
  docker buildx use multiarch-builder
  
  # Verify platforms
  docker buildx inspect --bootstrap
  ```
- GitHub CLI (`gh`) installed and authenticated
- All changes committed to main branch
- All items in the checklist below completed

## Release Checklist

1. **Preparation**
   - [ ] Ensure all desired changes are committed and pushed to main
   - [ ] Run tests to verify everything is working correctly
   - [ ] Decide on new version number (MAJOR.MINOR.PATCH)

2. **Documentation**
   - [ ] Find the last release version:
     ```bash
     # List all release tags
     git tag -l 'v*' --sort=-v:refname | head -n1
     
     # Or find it in CHANGELOG.md
     head -n5 CHANGELOG.md
     ```
   - [ ] Review commits since last release:
     ```bash
     # Using the last release tag (e.g., v1.3.1)
     git log v1.3.1..HEAD --pretty=format:"%h %s"
     
     # Or using commit dates if needed
     git log --since="$(git log -1 --format=%ai v1.3.1)" --pretty=format:"%h %s"
     ```
   - [ ] Update CHANGELOG.md with new version section and date
   - [ ] Categorize changes based on commit types:
     - feat: → Added (new features)
     - fix: → Fixed (bug fixes)
     - security: → Security (security fixes)
     - chore:/refactor:/perf: → Changed (changes in existing functionality)
     - deprecate: → Deprecated (soon-to-be removed features)
     - remove: → Removed (now removed features)
     - docs: → Documentation (if significant)
   - [ ] Ensure all significant changes are documented in the changelog
   - [ ] Review and clean up the changelog entries:
     - Use clear, user-focused language
     - Group related changes together
     - Remove internal/trivial changes
     - Highlight breaking changes or required actions

3. **Testing**
   - [ ] Build and test backend: `npm run build`
   - [ ] Build and test frontend: `cd frontend && npm run build && cd ..`
   - [ ] Test application locally
   - [ ] Verify all new features/fixes work as expected

## Release Process

1. Update version numbers in:
   - `frontend/src/utils/version.js`
   - `package.json`
   - `frontend/package.json`
   - `Dockerfile` labels

2. Rebuild the frontend to ensure version changes are included:
   ```bash
   cd frontend && npm run build && cd ..
   ```

3. Test the build locally:
   ```bash
   # Build and run locally to verify version
   docker compose up -d --build
   # Check the version in UI at http://localhost:7654
   ```

4. Commit version updates and built frontend:
   ```bash
   git add frontend/src/utils/version.js package.json frontend/package.json Dockerfile frontend/dist
   git commit -m "chore: bump version to X.Y.Z"
   git push origin main
   ```

5. Create and push tag:
   ```bash
   git tag -a vX.Y.Z -m "Release vX.Y.Z"
   git push origin vX.Y.Z
   ```

6. Build and push Docker images:
   ```bash
   # Verify buildx setup
   docker buildx ls
   
   # Ensure using correct builder
   docker buildx use multiarch-builder
   
   # Build and push multi-architecture images
   docker buildx build \
     --platform linux/amd64,linux/arm64 \
     --tag rcourtman/pulse:X.X.X \
     --tag rcourtman/pulse:latest \
     --push \
     .
   
   # Verify the images and architectures
   docker buildx imagetools inspect rcourtman/pulse:X.X.X
   ```

7. Create GitHub release:
   ```bash
   # Extract the latest version's changes from CHANGELOG.md
   awk '/^## \[.*\]/{p=NR==1}p' CHANGELOG.md > release-notes.tmp
   
   # Create the release using the extracted notes
   gh release create vX.Y.Z --title "Release vX.Y.Z" --notes-file release-notes.tmp
   
   # Clean up
   rm release-notes.tmp
   ```

8. Verify the release:
   - [ ] Check GitHub Actions workflows completed successfully
   - [ ] Pull and test the Docker image on a fresh system
   - [ ] Verify version number in UI matches the release version
   - [ ] Verify application functionality

## Troubleshooting

### GitHub Actions Issues
- Check workflow files in `.github/workflows/`
- Ensure proper event triggers
- Check GitHub Actions tab for errors

### Docker Issues
- Verify Docker daemon is running
- Check Docker Hub authentication: `docker login`
- Verify push permissions
- Check multi-arch builder setup:
  ```bash
  # If buildx builder is missing or not working
  docker buildx create --name multiarch-builder --driver docker-container --bootstrap
  docker buildx use multiarch-builder
  docker buildx inspect --bootstrap
  ```
- If build fails, try rebuilding the builder:
  ```bash
  docker buildx rm multiarch-builder
  docker buildx create --name multiarch-builder --driver docker-container --bootstrap
  ```

### Version Mismatches
- Verify all version files are updated
- Check for consistency across all files
- Create patch release if needed

## Post-Release

1. Verify the release is working in production
2. Clean up any temporary files/branches
3. Announce release to users if needed
4. Update documentation if required
5. Start planning next release 