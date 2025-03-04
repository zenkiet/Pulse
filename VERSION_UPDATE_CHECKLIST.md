# Version Update Checklist

## AI Assistant Prompt
When you need to update the application version, copy and use this prompt:

```
I need to update the application version to X.Y.Z. Please:
1. List ALL files that contain version information
2. Show me the current version in each file
3. Explain the build and deployment process needed
4. Outline verification steps to ensure the version is updated everywhere
5. Execute the changes only after confirming the above
```

## Files to Check
- `docker-compose.yml` - Container image version
- `Dockerfile` - Version label
- `package.json` - Root package version
- `frontend/package.json` - Frontend package version
- `frontend/src/utils/version.js` - Frontend displayed version

## Build Process Requirements
1. Update all version files
2. Rebuild frontend code
3. Build new Docker image
4. Push Docker image to registry
5. Deploy updated container

## Verification Steps
1. Check Docker image version: `docker images rcourtman/pulse`
2. Verify container version: `docker compose ps`
3. Check application header version in browser
4. Verify API version if applicable
5. Clear browser cache if needed: `Ctrl/Cmd + Shift + R`

## Common Issues
- Version mismatch between files
- Cached frontend code
- Docker image not rebuilt after version changes
- Old container still running
- Browser caching old version

## Rollback Process
If needed, revert to previous version:
```bash
# Pull previous version
docker compose down
docker pull rcourtman/pulse:previous.version
# Update docker-compose.yml version
# Restart container
docker compose up -d
``` 