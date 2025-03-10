# Pulse Release Checklist

This checklist outlines the steps required to create a new release of Pulse. Follow these steps in order to ensure a smooth release process.

## 1. Preparation

- [ ] Ensure all desired changes are committed and pushed to the main branch
- [ ] Run tests to verify everything is working correctly
- [ ] Decide on the new version number (following semantic versioning: MAJOR.MINOR.PATCH)

## 2. Update Version Numbers

- [ ] Update version in root `package.json`
- [ ] Update version in `frontend/package.json`
- [ ] Update version in `Dockerfile` (LABEL version="x.x.x")
- [ ] Update version in `frontend/src/utils/version.js` (VERSION constant)

## 3. Update Changelog

- [ ] Add a new section to `CHANGELOG.md` with the new version number and date
- [ ] Document all significant changes under appropriate categories:
  - Added (for new features)
  - Changed (for changes in existing functionality)
  - Deprecated (for soon-to-be removed features)
  - Removed (for now removed features)
  - Fixed (for any bug fixes)
  - Security (for security fixes)

## 4. Build and Test Locally

- [ ] Build the backend:
  ```bash
  npm run build
  ```
- [ ] Build the frontend:
  ```bash
  cd frontend && npm run build && cd ..
  ```
- [ ] Test the application locally to ensure everything works correctly

## 5. Commit and Tag Release

- [ ] Commit all version changes:
  ```bash
  git add package.json frontend/package.json Dockerfile frontend/src/utils/version.js CHANGELOG.md
  git commit -m "chore: prepare release vX.X.X"
  ```
- [ ] Create a git tag for the release:
  ```bash
  git tag -a vX.X.X -m "Release vX.X.X"
  ```
- [ ] Push the commit and tag to GitHub:
  ```bash
  git push origin main
  git push origin vX.X.X
  ```

## 6. Build and Push Docker Images

- [ ] Ensure Docker buildx is set up for multi-architecture builds:
  ```bash
  docker buildx use multiarch-builder
  ```
- [ ] Build and push multi-architecture Docker images:
  ```bash
  docker buildx build --platform linux/amd64,linux/arm64 -t rcourtman/pulse:X.X.X -t rcourtman/pulse:latest --push .
  ```
- [ ] Verify the images were pushed correctly:
  ```bash
  docker buildx imagetools inspect rcourtman/pulse:X.X.X
  ```

## 7. Create GitHub Release

- [ ] Create a GitHub release for the tag:
  ```bash
  gh release create vX.X.X --title "Pulse vX.X.X" --notes "Release notes from CHANGELOG.md"
  ```

## 8. Verify the Release

- [ ] Pull and run the Docker image to verify it works correctly:
  ```bash
  docker pull rcourtman/pulse:X.X.X
  docker-compose up -d
  ```
- [ ] Check that the version number is displayed correctly in the UI
- [ ] Verify that the application functions as expected

## 9. Announce the Release

- [ ] Announce the new release to users through appropriate channels
- [ ] Update documentation if necessary

## 10. Post-Release

- [ ] Clean up any temporary files or branches created during the release process
- [ ] Start planning for the next release
