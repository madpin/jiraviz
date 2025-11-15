# CI/CD Quick Reference for jiraviz

## Repository Information
- **Repository**: https://github.com/madpin/jiraviz
- **Container Registry**: ghcr.io/madpin/jiraviz

## GitHub Actions Badge

Add this to your README.md to show build status:

```markdown
[![Docker Build](https://github.com/madpin/jiraviz/actions/workflows/docker-build.yml/badge.svg)](https://github.com/madpin/jiraviz/actions/workflows/docker-build.yml)
```

## Quick Commands

### Pull Latest Image
```bash
docker pull ghcr.io/madpin/jiraviz:latest
```

### Run Container
```bash
docker run -d -p 8080:80 --name jiraviz ghcr.io/madpin/jiraviz:latest
```

### Create and Push Version Tag
```bash
# Create version tag
git tag v0.2.1
git push origin v0.2.1

# This will automatically:
# 1. Trigger GitHub Actions workflow
# 2. Build Docker image for amd64 and arm64
# 3. Push to ghcr.io with tags: v0.2.1, 0.2.1, 0.2, 0, latest
```

### View Published Packages
Visit: https://github.com/madpin/jiraviz/pkgs/container/jiraviz

### View Workflow Runs
Visit: https://github.com/madpin/jiraviz/actions/workflows/docker-build.yml

## Docker Compose Example

```yaml
version: '3.8'

services:
  jiraviz:
    image: ghcr.io/madpin/jiraviz:latest
    ports:
      - "8080:80"
    restart: unless-stopped
```

## Make Package Public (Optional)

After first successful build:

1. Go to https://github.com/madpin?tab=packages
2. Click on `jiraviz` package
3. Click **Package settings** (on the right)
4. Scroll to **Danger Zone**
5. Click **Change visibility** → **Public**

This allows anyone to pull your image without authentication.

## First Time Setup Checklist

- [ ] Push the workflow file to GitHub
- [ ] Check workflow permissions in Settings → Actions → General
- [ ] Wait for first workflow run to complete
- [ ] (Optional) Make package public
- [ ] (Optional) Add badge to README.md
- [ ] Test pulling and running the image

## Important Notes

### Package Lock File

The Dockerfile is configured to work with or without a `package-lock.json` file:
- If `package-lock.json` exists, it uses `npm install --frozen-lockfile` for reproducible builds
- If not, it falls back to `npm install`

**Recommendation**: Generate and commit a `package-lock.json` for better reproducibility:
```bash
npm install
git add package-lock.json
git commit -m "Add package-lock.json for reproducible builds"
```

## Available Image Tags

After pushing to main:
- `ghcr.io/madpin/jiraviz:main`
- `ghcr.io/madpin/jiraviz:latest`
- `ghcr.io/madpin/jiraviz:main-<git-sha>`

After tagging v1.2.3:
- `ghcr.io/madpin/jiraviz:1.2.3`
- `ghcr.io/madpin/jiraviz:1.2`
- `ghcr.io/madpin/jiraviz:1`
- `ghcr.io/madpin/jiraviz:latest`

## Supported Architectures

- linux/amd64 (Intel/AMD x86_64)
- linux/arm64 (Apple Silicon, AWS Graviton, ARM servers)

## Next Steps

1. Commit and push the workflow files:
   ```bash
   git add .github/workflows/docker-build.yml .dockerignore docs/
   git commit -m "Add GitHub Actions CI/CD pipeline for Docker builds"
   git push origin main
   ```

2. Check the Actions tab: https://github.com/madpin/jiraviz/actions

3. Once built, pull and test:
   ```bash
   docker pull ghcr.io/madpin/jiraviz:latest
   docker run -p 8080:80 ghcr.io/madpin/jiraviz:latest
   ```

For detailed documentation, see [GITHUB_CICD.md](./GITHUB_CICD.md)

