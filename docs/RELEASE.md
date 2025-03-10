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
- GitHub CLI (`gh`) installed and authenticated
- All changes committed to main branch
- All items in the checklist below completed

## Release Checklist

1. **Preparation**
   - [ ] Ensure all desired changes are committed and pushed to main
   - [ ] Run tests to verify everything is working correctly
   - [ ] Decide on new version number (MAJOR.MINOR.PATCH)

2. **Documentation**
   - [ ] Update CHANGELOG.md with new version section and date
   - [ ] Document all changes under appropriate categories:
     - Added (new features)
     - Changed (changes in existing functionality)
     - Deprecated (soon-to-be removed features)
     - Removed (now removed features)
     - Fixed (bug fixes)
     - Security (security fixes)

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

2. Commit version updates:
   ```bash
   git add frontend/src/utils/version.js package.json frontend/package.json Dockerfile
   git commit -m "chore: bump version to X.Y.Z"
   git push origin main
   ```

3. Create and push tag:
   ```bash
   git tag -a vX.Y.Z -m "Release vX.Y.Z"
   git push origin vX.Y.Z
   ```

4. Build and push Docker images:
   ```bash
   # For multi-architecture builds
   docker buildx use multiarch-builder
   docker buildx build --platform linux/amd64,linux/arm64 -t rcourtman/pulse:X.X.X -t rcourtman/pulse:latest --push .
   ```

5. Create GitHub release:
   ```bash
   gh release create vX.Y.Z --title "Release vX.Y.Z" --notes-file CHANGELOG.md
   ```

6. Verify the release:
   - [ ] Check GitHub Actions workflows completed successfully
   - [ ] Pull and test the Docker image
   - [ ] Verify version number in UI
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
- Check multi-arch builder setup

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