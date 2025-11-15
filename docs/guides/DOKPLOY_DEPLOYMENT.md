# Deploying JiraViz to Dokploy

This guide covers deploying JiraViz to Dokploy, a self-hosted deployment platform.

## Prerequisites

- Access to a Dokploy instance
- Docker installed on your Dokploy server
- Git repository with your JiraViz code

## Quick Start

JiraViz includes all necessary Dokploy configuration files:
- `Dockerfile` - Multi-stage Docker build
- `nginx.conf` - Nginx configuration for serving the SPA
- `dokploy.json` - Dokploy-specific configuration
- `.dockerignore` - Files to exclude from Docker build

## Deployment Methods

### Method 1: Deploy from Git Repository (Recommended)

1. **Push your code to Git** (GitHub, GitLab, or Gitea)
   ```bash
   git add .
   git commit -m "Prepare for Dokploy deployment"
   git push origin main
   ```

2. **In Dokploy Dashboard:**
   - Click "New Application"
   - Choose "Git Repository"
   - Enter your repository URL
   - Select branch (e.g., `main`)
   - Dokploy will auto-detect the `Dockerfile`

3. **Configure Settings:**
   - **Name**: `jiraviz`
   - **Port**: `80`
   - **Domain**: Your custom domain (e.g., `jiraviz.yourdomain.com`)
   - **Build Type**: Dockerfile
   - **Health Check**: Enabled (path: `/health`)

4. **Deploy:**
   - Click "Deploy"
   - Dokploy will build and deploy automatically

### Method 2: Deploy from Local Directory

1. **Build Docker image locally:**
   ```bash
   docker build -t jiraviz:0.2.0 .
   ```

2. **Push to Dokploy registry:**
   ```bash
   docker tag jiraviz:0.2.0 your-dokploy-registry/jiraviz:0.2.0
   docker push your-dokploy-registry/jiraviz:0.2.0
   ```

3. **Deploy via Dokploy CLI or Dashboard**

### Method 3: Docker Compose (if Dokploy supports)

Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  jiraviz:
    build: .
    ports:
      - "80:80"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 5s
```

Deploy:
```bash
docker-compose up -d
```

## Configuration

### Environment Variables

JiraViz is a frontend-only app, so no environment variables are needed at build time. Configuration happens in the browser via the Settings panel.

However, you can optionally set:
```bash
NODE_ENV=production  # Automatically set in Dockerfile
```

### Port Configuration

- **Container Port**: 80 (nginx)
- **Exposed Port**: Configure in Dokploy (usually 80 or 443 with reverse proxy)

### Domain & SSL

1. **In Dokploy Dashboard:**
   - Go to your JiraViz application
   - Click "Domains"
   - Add your domain (e.g., `jiraviz.yourdomain.com`)
   - Enable SSL/TLS (Dokploy usually handles Let's Encrypt automatically)

2. **DNS Configuration:**
   - Point your domain to your Dokploy server IP
   - Add A record: `jiraviz.yourdomain.com` → `your-server-ip`

## Build Process

The Dockerfile uses a multi-stage build:

1. **Builder Stage:**
   - Uses Node.js 18 Alpine
   - Installs dependencies with `npm ci`
   - Runs `npm run build` to create production assets
   - Output: `dist/` folder

2. **Production Stage:**
   - Uses Nginx Alpine
   - Copies built files from builder
   - Copies custom nginx configuration
   - Exposes port 80
   - Includes health check

**Build time:** ~2-3 minutes (depending on server specs)

## Monitoring & Health Checks

### Health Check Endpoint

The application includes a `/health` endpoint:
```bash
curl http://your-domain.com/health
# Response: healthy
```

### Dokploy Health Check Configuration

Already configured in `dokploy.json`:
```json
{
  "healthCheck": {
    "path": "/health",
    "interval": 30,
    "timeout": 3,
    "retries": 3
  }
}
```

### Logs

View logs in Dokploy:
```bash
# Via Dokploy Dashboard: Logs tab
# Or via Docker:
docker logs -f <container-name>
```

## Resource Requirements

### Minimum Requirements
- **Memory**: 256MB (512MB recommended)
- **CPU**: 0.25 cores (0.5 recommended)
- **Disk**: 100MB (for Docker image)

### Recommended Settings (in `dokploy.json`)
```json
{
  "resources": {
    "memory": "512Mi",
    "cpu": "0.5"
  }
}
```

## Updating Your Deployment

### Method 1: Auto-Deploy (CI/CD)

If you connected a Git repository:
1. Push changes to your repository
2. Dokploy auto-deploys on push (if configured)
3. Or manually trigger deploy in Dokploy dashboard

### Method 2: Manual Update

1. **Rebuild the image:**
   ```bash
   docker build -t jiraviz:0.2.0 .
   ```

2. **In Dokploy:**
   - Click "Redeploy" or "Rebuild"
   - Dokploy will pull latest code and rebuild

### Zero-Downtime Updates

Dokploy typically handles rolling updates automatically:
1. Builds new container
2. Starts new container
3. Runs health checks
4. Routes traffic to new container
5. Stops old container

## Troubleshooting

### Build Fails

**Error:** "npm ERR! code ELIFECYCLE"
```bash
# Solution: Clear npm cache and rebuild
docker build --no-cache -t jiraviz:0.2.0 .
```

**Error:** TypeScript compilation errors
```bash
# Solution: Ensure all files are committed
git status
git add .
git commit -m "Fix TypeScript errors"
```

### Container Won't Start

**Check logs:**
```bash
docker logs <container-id>
```

**Common issues:**
- Port 80 already in use → Change port mapping
- Nginx config syntax error → Validate `nginx.conf`
- Missing files in dist/ → Check build process

### Health Check Failing

**Test manually:**
```bash
docker exec -it <container-id> wget -O- http://localhost/health
```

**Common causes:**
- Nginx not starting → Check nginx error logs
- Wrong health check path → Verify `/health` endpoint exists

### Application Loads but Shows Blank Page

**Check browser console for errors:**
- CORS issues → See CORS section below
- Asset loading errors → Check base path in `vite.config.ts`

**For subdirectory deployments:**

If deploying to a subdirectory (e.g., `domain.com/jiraviz/`), update `vite.config.ts`:
```typescript
export default defineConfig({
  base: '/jiraviz/',  // Add this line
  // ... rest of config
})
```

Then rebuild:
```bash
npm run build
docker build -t jiraviz:0.2.0 .
```

## CORS Considerations

JiraViz makes API calls to:
1. Jira REST API
2. LLM API (OpenAI or compatible)

### Option 1: Direct API Calls (Simple)

Users configure endpoints directly in Settings panel. Works if:
- Jira/LLM APIs support CORS
- Or users use browser CORS extensions (not recommended for production)

### Option 2: Reverse Proxy (Recommended)

Add proxy configuration to `nginx.conf`:

```nginx
server {
    listen 80;
    server_name _;
    
    root /usr/share/nginx/html;
    index index.html;
    
    # Proxy Jira API requests
    location /api/jira/ {
        proxy_pass https://your-domain.atlassian.net/;
        proxy_set_header Host your-domain.atlassian.net;
        proxy_set_header Authorization $http_authorization;
        proxy_hide_header Access-Control-Allow-Origin;
        add_header Access-Control-Allow-Origin * always;
    }
    
    # Proxy LLM API requests
    location /api/llm/ {
        proxy_pass https://api.openai.com/v1/;
        proxy_set_header Host api.openai.com;
        proxy_set_header Authorization $http_authorization;
        proxy_hide_header Access-Control-Allow-Origin;
        add_header Access-Control-Allow-Origin * always;
    }
    
    # Existing configuration...
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Then rebuild and redeploy.

### Option 3: Separate Backend Service

For production, consider deploying a separate API gateway service in Dokploy.

## Security Best Practices

### 1. Enable HTTPS

Always use HTTPS in production:
- Dokploy handles Let's Encrypt automatically
- Or bring your own SSL certificate

### 2. Security Headers

Already included in `nginx.conf`:
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection
- Referrer-Policy

### 3. API Key Security

⚠️ **Important:** JiraViz stores API keys in browser localStorage

**Recommendations:**
- Use SSL/TLS (HTTPS) always
- Educate users about API key security
- Use Jira tokens with minimal permissions
- Consider implementing server-side authentication (future enhancement)

### 4. Update Regularly

```bash
# Update base images
docker pull node:18-alpine
docker pull nginx:alpine

# Rebuild
docker build -t jiraviz:0.2.0 .
```

## Scaling

### Horizontal Scaling

JiraViz is stateless (frontend-only), so it scales easily:

1. **In Dokploy:**
   - Increase replica count to 2-3+
   - Load balancer distributes traffic automatically

2. **All user data is client-side:**
   - localStorage (browser-specific)
   - No shared state between instances

### Vertical Scaling

If experiencing performance issues:
```json
{
  "resources": {
    "memory": "1Gi",
    "cpu": "1"
  }
}
```

## Monitoring

### Dokploy Dashboard

- CPU usage
- Memory usage
- Request count
- Response times
- Error rates

### External Monitoring

Set up uptime monitoring:
```bash
# Example: UptimeRobot, StatusCake, or self-hosted
curl http://your-domain.com/health
```

## Backup

Since JiraViz is stateless:
- **No database to backup**
- All data stored in user's browser
- Just backup your Git repository

## Cost Optimization

### Reduce Image Size

Already optimized:
- Multi-stage build
- Alpine Linux base images
- Production build (minified/gzipped)

**Final image size:** ~50-70MB

### Resource Limits

Set appropriate limits to save resources:
```json
{
  "resources": {
    "memory": "256Mi",  // Minimum for small deployments
    "cpu": "0.25"
  }
}
```

## Complete Deployment Checklist

- [ ] Code pushed to Git repository
- [ ] Dockerfile present
- [ ] nginx.conf configured
- [ ] dokploy.json configured
- [ ] Build succeeds locally: `docker build -t jiraviz .`
- [ ] Connected repository to Dokploy
- [ ] Configured domain name
- [ ] SSL/TLS enabled
- [ ] Health check passing
- [ ] Application accessible at domain
- [ ] Test in browser: Settings → Sync → Create ticket
- [ ] Monitor logs for errors
- [ ] Set up uptime monitoring

## Support

- **Dokploy Documentation**: https://dokploy.com/docs
- **JiraViz Issues**: Check your repository issues
- **Docker Hub**: https://hub.docker.com

## Example Deployment Commands

```bash
# 1. Build locally
docker build -t jiraviz:0.2.0 .

# 2. Test locally
docker run -p 8080:80 jiraviz:0.2.0
# Visit http://localhost:8080

# 3. Push to Dokploy (via Git)
git add .
git commit -m "Deploy to Dokploy"
git push origin main

# 4. Dokploy auto-deploys or manually trigger deploy
```

---

**You're all set!** 🚀 Your JiraViz application is now running on Dokploy.

