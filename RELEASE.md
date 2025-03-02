# Release Process for ProxMox Pulse

This document outlines the release process for the ProxMox Pulse application.

## Prerequisites

The release script is designed for repository owners with proper authentication:

- Git authentication configured for the repository
- Docker Hub authentication configured
- GitHub CLI (`gh`) installed and authenticated
- Bash shell environment

## Using the Release Script

The `release.sh` script automates the entire release process, including:

1. Updating version numbers in all relevant files
2. Committing and pushing changes
3. Creating and pushing Git tags
4. Building and pushing Docker images
5. Creating GitHub releases

### Basic Usage

```bash
./release.sh <new_version>
```

Example:
```bash
./release.sh 1.0.13
```

### What the Script Does

1. **Validation**:
   - Checks that a version number is provided in the correct format (X.Y.Z)
   - Ensures there are no uncommitted changes before proceeding
   - Pulls the latest changes from the main branch

2. **Version Updates**:
   - Updates `frontend/src/utils/version.js`
   - Updates version in `package.json`
   - Updates version in `frontend/package.json`
   - Updates version label in `Dockerfile`

3. **Git Operations**:
   - Commits all version changes
   - Pushes changes to the main branch
   - Creates an annotated tag for the release
   - Pushes the tag to the remote repository

4. **Docker Operations**:
   - Builds the Docker image targeting the production stage
   - Tags the image with both the specific version and 'latest'
   - Pushes both tags to Docker Hub

5. **GitHub Release**:
   - Creates a GitHub release for the new version

### Safety Features

- Prevents releases with uncommitted changes
- Validates version format
- Uses error handling to stop on any failure

## Manual Release Process

If you need to perform a release manually, follow these steps:

1. Update version in `frontend/src/utils/version.js`
2. Update version in `package.json` and `frontend/package.json` using `npm version`
3. Update version label in `Dockerfile`
4. Commit and push all changes
5. Create and push a tag for the release
6. Build and push Docker images
7. Create a GitHub release

## Troubleshooting

If the script fails:

1. Check the error message for details
2. Resolve any issues (uncommitted changes, authentication problems, etc.)
3. You may need to clean up partial changes before retrying

For Docker build failures, you can build manually with:
```bash
docker build --target production -t rcourtman/pulse:<version> -t rcourtman/pulse:latest .
``` 