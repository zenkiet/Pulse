# Version Update Workflow

This GitHub workflow automatically updates the application version when a new release is created.

## How it works

1. When you create a new release on GitHub, the workflow is triggered
2. It updates the `frontend/src/utils/version.js` file with the new version number
3. It also updates the version in both the root and frontend `package.json` files
4. The changes are committed and pushed back to the repository

## Creating a new release

To create a new release and update the version displayed in the app:

1. Go to your GitHub repository
2. Click on "Releases" in the right sidebar
3. Click "Create a new release" or "Draft a new release"
4. Enter a tag version (e.g., `v1.0.1` or `1.0.1`)
5. Add a title and description for your release
6. Click "Publish release"

The workflow will automatically update the version in your codebase.

## Notes

- The version displayed in the app header will be updated to match the release tag
- If you use a tag with a 'v' prefix (e.g., `v1.0.1`), the 'v' will be removed in the version file, but the app already adds the 'v' when displaying it
- Make sure your repository has the necessary permissions for the GitHub Action to push changes 