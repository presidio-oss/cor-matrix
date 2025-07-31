# COR-Matrix Release Guide

This document provides comprehensive instructions for releasing both the API (Docker image) and Client SDK (NPM package) components of the COR-Matrix project.

## Overview

The COR-Matrix project consists of two main components that are released together:

- **API Server**: A Docker image published to GitHub Container Registry (GHCR)
- **Client SDK/CLI**: An NPM package published to the NPM registry

## Release Channels

The project supports two release channels:

### 1. Release Candidate (RC) Channel
- **Branch**: `rc`
- **Docker Tag**: `rc-v{version}` (e.g., `rc-v0.0.2`)
- **NPM Tag**: `rc` (e.g., `@presidio-dev/cor-matrix@0.0.7-rc`)
- **Purpose**: Pre-release testing and validation

### 2. Production Channel
- **Branch**: `main`
- **Docker Tag**: `v{version}` + `latest` (e.g., `v0.0.2`, `latest`)
- **NPM Tag**: `latest` (e.g., `@presidio-dev/cor-matrix@0.0.7`)
- **Purpose**: Stable production releases

## Versioning Strategy

Both components follow [Semantic Versioning (SemVer)](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

**Important**: Version bumps must be done manually in both `package.json` files before pushing to release branches.

## Release Process

### Prerequisites

Before starting a release, ensure you have:

1. **Permissions**:
   - Write access to the repository
   - NPM publish permissions for `@presidio-dev/cor-matrix`
   - GitHub Container Registry push permissions

2. **Environment Setup**:
   - Git configured with appropriate credentials
   - Access to both `main` and `rc` branches

3. **Quality Assurance**:
   - All tests passing locally
   - Integration tests validated
   - Code review completed

### Step-by-Step Release Process

#### 1. Prepare the Release

**For RC Release:**
```bash
# Switch to rc branch
git checkout rc
git pull origin rc

# Create a feature branch for version bump
git checkout -b release/v{version}-rc
```

**For Production Release:**
```bash
# Switch to main branch
git checkout main
git pull origin main

# Create a feature branch for version bump
git checkout -b release/v{version}
```

#### 2. Update Version Numbers

**Update API Version** (root `package.json`):
```bash
# Edit package.json
vim package.json

# Update the version field
{
  "name": "cor-matrix",
  "version": "0.0.3",  # ← Update this
  ...
}
```

**Update Client SDK Version** (`src/client/package.json`):
```bash
# Edit client package.json
vim src/client/package.json

# Update the version field
{
  "name": "@presidio-dev/cor-matrix",
  "version": "0.0.8",  # ← Update this
  ...
}
```

#### 3. Commit and Push Version Changes

```bash
# Stage the version changes
git add package.json src/client/package.json

# Commit with descriptive message
git commit -m "chore: bump version to v{api-version} (client: v{client-version})"

# Push the feature branch
git push origin release/v{version}[-rc]
```

#### 4. Create and Merge Pull Request

1. Create a Pull Request from your feature branch to the target branch (`rc` or `main`)
2. Title: `Release v{version}` or `Release v{version}-rc`
3. Include release notes in the PR description
4. Get required approvals
5. Merge the PR

#### 5. Trigger Automated Release

Once merged to `rc` or `main`, the GitHub Actions workflow will automatically:

1. **Run Integration Tests**: Comprehensive test suite using Testcontainers
2. **Build and Publish Docker Image**: 
   - Multi-platform build (linux/amd64, linux/arm64)
   - Push to `ghcr.io/your-org/cor-matrix/cor-matrix-api`
   - Tag with appropriate version
3. **Build and Publish NPM Package**:
   - Build the client SDK
   - Publish to NPM registry
   - Tag with `rc` or `latest`

#### 6. Verify Release

**Check Docker Image:**
```bash
# Pull and verify the Docker image
docker pull ghcr.io/your-org/cor-matrix/cor-matrix-api:v{version}
docker run --rm ghcr.io/your-org/cor-matrix/cor-matrix-api:v{version} --version
```

**Check NPM Package:**
```bash
# For production release
npm view @presidio-dev/cor-matrix@latest

# For RC release
npm view @presidio-dev/cor-matrix@rc

# Install and test
npm install @presidio-dev/cor-matrix@latest  # or @rc
```

## Release Artifacts

### Docker Image

**Registry**: `ghcr.io/your-org/cor-matrix/cor-matrix-api`

**Tags**:
- RC: `rc-v{version}` (e.g., `rc-v0.0.2`)
- Production: `v{version}` and `latest` (e.g., `v0.0.2`, `latest`)

**Platforms**: linux/amd64, linux/arm64

**Usage**:
```bash
# Production
docker run -p 3000:3000 ghcr.io/your-org/cor-matrix/cor-matrix-api:latest

# RC
docker run -p 3000:3000 ghcr.io/your-org/cor-matrix/cor-matrix-api:rc-v0.0.2
```

### NPM Package

**Package**: `@presidio-dev/cor-matrix`

**Tags**:
- RC: `rc` (e.g., `0.0.7-rc`)
- Production: `latest` (e.g., `0.0.7`)

**Installation**:
```bash
# Production
npm install @presidio-dev/cor-matrix

# RC
npm install @presidio-dev/cor-matrix@rc
```

## Troubleshooting

### Common Issues

#### Version Already Exists
**Problem**: Release fails because version already exists
**Solution**: 
1. Check if the version was already released
2. If needed, increment version number and retry
3. Use `npm view` and `docker manifest inspect` to check existing versions

#### Build Failures
**Problem**: Integration tests fail during release
**Solution**:
1. Run tests locally: `bun run test:integration`
2. Check test logs in GitHub Actions
3. Fix issues and push new commit to release branch

#### Permission Errors
**Problem**: Cannot push to registry
**Solution**:
1. Verify GitHub token has package write permissions
2. Check NPM token is valid and has publish permissions
3. Ensure repository secrets are properly configured

#### Docker Build Issues
**Problem**: Docker build fails
**Solution**:
1. Test build locally: `bun run build:api`
2. Check Dockerfile syntax and dependencies
3. Verify base image availability

### Manual Recovery

If automated release fails, you can manually publish:

**Manual Docker Push**:
```bash
# Build locally
docker build -t ghcr.io/your-org/cor-matrix/cor-matrix-api:v{version} -f src/api/Dockerfile .

# Login to GHCR
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Push
docker push ghcr.io/your-org/cor-matrix/cor-matrix-api:v{version}
```

**Manual NPM Publish**:
```bash
# Navigate to client directory
cd src/client

# Build
bun run build

# Login to NPM
npm login

# Publish
npm publish  # or npm publish --tag rc
```

## Release Checklist

### Pre-Release
- [ ] All tests passing locally
- [ ] Integration tests validated
- [ ] Version numbers updated in both `package.json` files

### During Release
- [ ] Feature branch created with version bump
- [ ] Pull request created and approved
- [ ] PR merged to target branch (`rc` or `main`)
- [ ] GitHub Actions workflow completed successfully

### Post-Release
- [ ] Docker image verified in GHCR
- [ ] NPM package verified in registry
- [ ] Installation tested from published artifacts
- [ ] Team notified of release

## Monitoring and Rollback

### Monitoring
- Monitor GitHub Actions workflow status
- Check registry availability after release
- Verify package installation in downstream projects

### Rollback Strategy
If a release needs to be rolled back:

1. **NPM**: Use `npm deprecate` to mark version as deprecated
2. **Docker**: Remove problematic tags (if possible) or publish hotfix
3. **Emergency**: Revert commits and release previous version with patch increment

## Support

For release-related issues:
1. Check GitHub Actions logs
2. Review this documentation
3. Contact the development team
4. Create an issue in the repository

---

**Last Updated**: July 2025
**Version**: 1.0
