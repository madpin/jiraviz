# GitHub CI/CD Pipeline

This document explains how to use the GitHub Actions CI/CD pipeline for building and pushing Docker images.

## Overview

The CI/CD pipeline automatically builds and pushes Docker images to GitHub Container Registry (GHCR) when:
- Code is pushed to `main` or `master` branch
- A version tag is created (e.g., `v1.0.0`)
- A pull request is opened (builds only, doesn't push)
- Manually triggered via workflow dispatch

## Setup

### 1. Enable GitHub Container Registry

The workflow uses GitHub's built-in Container Registry (ghcr.io), which requires no additional setup. The workflow automatically uses the `GITHUB_TOKEN` secret that's available in all GitHub Actions workflows.

### 2. Repository Settings

Ensure your repository has the following permissions:

1. Go to **Settings** → **Actions** → **General**
2. Under "Workflow permissions", select **Read and write permissions**
3. Check **Allow GitHub Actions to create and approve pull requests**

**Note**: The workflow includes build attestations which require:
- `id-token: write` permission (for OIDC token generation)
- `attestations: write` permission (for creating attestations)

These are configured in the workflow file. If attestation fails, the workflow will continue successfully.

### 3. Package Visibility (Optional)

After the first successful build:

1. Go to your GitHub profile → **Packages**
2. Find the `jiraviz` package
3. Click **Package settings**
4. Under "Danger Zone", you can change visibility to **Public** if desired

## Usage

### Automatic Builds

#### Push to Main Branch
```bash
git push origin main
```
Creates image with tags:
- `ghcr.io/[owner]/jiraviz:main`
- `ghcr.io/[owner]/jiraviz:latest`
- `ghcr.io/[owner]/jiraviz:main-<git-sha>`

#### Create Version Tag
```bash
git tag v1.2.3
git push origin v1.2.3
```
Creates image with tags:
- `ghcr.io/[owner]/jiraviz:1.2.3`
- `ghcr.io/[owner]/jiraviz:1.2`
- `ghcr.io/[owner]/jiraviz:1`
- `ghcr.io/[owner]/jiraviz:latest`

#### Pull Requests
Pull requests will build the image but won't push it to the registry. This ensures the Docker build works before merging.

### Manual Trigger

1. Go to **Actions** tab in your repository
2. Select **Build and Push Docker Image** workflow
3. Click **Run workflow**
4. Select branch and click **Run workflow**

## Pulling Images

### Public Images
If your package is public:
```bash
docker pull ghcr.io/madpin/jiraviz:latest
```

### Private Images
If your package is private, authenticate first:
```bash
# Create a Personal Access Token (PAT) with read:packages scope
# Go to Settings → Developer settings → Personal access tokens → Tokens (classic)

echo $GITHUB_TOKEN | docker login ghcr.io -u madpin --password-stdin
docker pull ghcr.io/madpin/jiraviz:latest
```

## Running the Image

```bash
# Run on port 8080
docker run -p 8080:80 ghcr.io/madpin/jiraviz:latest

# With environment variables (if needed)
docker run -p 8080:80 \
  -e VARIABLE_NAME=value \
  ghcr.io/madpin/jiraviz:latest

# Access the application
open http://localhost:8080
```

## Advanced Configuration

### Multi-platform Builds

The workflow builds for both `linux/amd64` and `linux/arm64` architectures, ensuring compatibility with:
- x86_64 servers and workstations
- ARM-based systems (Apple Silicon, AWS Graviton, Raspberry Pi, etc.)

### Build Cache

The workflow uses GitHub Actions cache to speed up builds:
- First build: ~5-10 minutes
- Subsequent builds: ~1-3 minutes (if dependencies haven't changed)

### Adding Docker Hub Support

To also push to Docker Hub, uncomment the Docker Hub login step in `.github/workflows/docker-build.yml` and add these secrets:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Add **New repository secret**:
   - `DOCKERHUB_USERNAME`: Your Docker Hub username
   - `DOCKERHUB_TOKEN`: Docker Hub access token (create at hub.docker.com/settings/security)

3. Update the metadata step to include Docker Hub:
```yaml
- name: Extract metadata (tags, labels)
  id: meta
  uses: docker/metadata-action@v5
  with:
    images: |
      ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
      dockerhub-username/jiraviz
```

## Troubleshooting

### Build Fails with "permission denied"

Ensure workflow permissions are set to "Read and write permissions" in repository settings.

### Image Push Fails

1. Check that the workflow has `packages: write` permission
2. Verify that `GITHUB_TOKEN` has necessary scopes
3. Check repository package settings

### Can't Pull Private Image

1. Create a Personal Access Token with `read:packages` scope
2. Authenticate with Docker:
   ```bash
   echo $TOKEN | docker login ghcr.io -u USERNAME --password-stdin
   ```

### Build is Slow

- First builds are slower due to layer caching
- Subsequent builds should be faster
- Consider reducing the number of dependencies if builds are consistently slow

## Image Tags Explained

| Event | Example Tags |
|-------|-------------|
| Push to main | `main`, `latest`, `main-abc1234` |
| Push to develop | `develop`, `develop-abc1234` |
| Tag v1.2.3 | `1.2.3`, `1.2`, `1`, `latest` |
| Pull Request #42 | `pr-42` |

## Security

### Image Attestation

The workflow generates build provenance attestations for all images, providing:
- Verifiable build information
- Supply chain security
- Compliance with SLSA requirements

Attestations are generated automatically and stored with the image. If attestation fails (e.g., due to permission issues), the build will still succeed. To verify an attestation:

```bash
# Install GitHub CLI if not already installed
gh attestation verify oci://ghcr.io/madpin/jiraviz:latest --owner madpin
```

### Scanning (Optional)

To add vulnerability scanning, add this step before pushing:
```yaml
- name: Run Trivy vulnerability scanner
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ steps.meta.outputs.version }}
    format: 'sarif'
    output: 'trivy-results.sarif'

- name: Upload Trivy results to GitHub Security
  uses: github/codeql-action/upload-sarif@v2
  with:
    sarif_file: 'trivy-results.sarif'
```

## Best Practices

1. **Use Semantic Versioning**: Tag releases as `v1.0.0`, `v1.0.1`, etc.
2. **Test Before Tagging**: Let PR builds verify the Docker image works
3. **Pin Base Images**: Update Node and nginx versions explicitly in Dockerfile
4. **Review Build Logs**: Check Actions tab regularly for build issues
5. **Monitor Image Size**: Keep an eye on image size to ensure efficient deployments

## Related Documentation

- [Docker Deployment Guide](./DEPLOYMENT.md)
- [Dokploy Deployment Guide](./DOKPLOY_DEPLOYMENT.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)

