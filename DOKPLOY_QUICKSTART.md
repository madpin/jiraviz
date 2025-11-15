# 🚀 Deploy JiraViz to Dokploy - Quick Start

## Files Created for You ✅

1. **Dockerfile** - Multi-stage Docker build (Node.js + Nginx)
2. **nginx.conf** - Nginx configuration for SPA routing
3. **dokploy.json** - Dokploy configuration
4. **.dockerignore** - Exclude unnecessary files from build
5. **docs/guides/DOKPLOY_DEPLOYMENT.md** - Complete deployment guide

## 3-Step Deployment

### Step 1: Test Build Locally (Optional)

```bash
# Build Docker image
docker build -t jiraviz:0.2.0 .

# Test locally
docker run -p 8080:80 jiraviz:0.2.0

# Visit http://localhost:8080
```

### Step 2: Push to Git

```bash
git add .
git commit -m "Add Dokploy deployment configuration"
git push origin main
```

### Step 3: Deploy in Dokploy

**In Dokploy Dashboard:**

1. Click **"New Application"**
2. Select **"Git Repository"**
3. Enter your repository URL
4. Configure:
   - **Name**: `jiraviz`
   - **Branch**: `main`
   - **Build Type**: Dockerfile (auto-detected)
   - **Port**: `80`
   - **Domain**: `jiraviz.yourdomain.com`
5. Click **"Deploy"**

**Done!** 🎉 Dokploy will:
- Clone your repository
- Build the Docker image (~2-3 min)
- Deploy the container
- Set up SSL with Let's Encrypt
- Your app will be live!

## Quick Configuration

### Domain Setup

1. In your DNS provider, add an A record:
   ```
   jiraviz.yourdomain.com → your-dokploy-server-ip
   ```

2. In Dokploy, add domain and enable SSL

### Health Check

Dokploy will monitor your app at `/health` endpoint:
```bash
curl https://jiraviz.yourdomain.com/health
# Response: healthy
```

### Resources

Default settings in `dokploy.json`:
- **Memory**: 512MB
- **CPU**: 0.5 cores
- **Port**: 80

Adjust if needed in Dokploy dashboard.

## After Deployment

### Test Your App

1. Visit `https://jiraviz.yourdomain.com`
2. Configure Jira credentials in Settings
3. Configure LLM API in Settings
4. Click "Sync" to fetch tickets
5. Generate a summary

### Monitor

In Dokploy dashboard:
- **Logs** tab - View application logs
- **Metrics** tab - CPU/Memory usage
- **Health** - Green = healthy

### Update Your App

```bash
# Make changes to your code
git add .
git commit -m "Update feature"
git push origin main

# Dokploy auto-deploys (if enabled)
# Or click "Redeploy" in Dokploy dashboard
```

## Troubleshooting

### Build fails?
```bash
# Check logs in Dokploy dashboard
# Or test locally:
docker build -t jiraviz:0.2.0 .
```

### Container won't start?
```bash
# Check container logs in Dokploy
# Verify nginx.conf syntax:
nginx -t -c nginx.conf
```

### App shows blank page?
- Check browser console for errors
- Verify assets are loading
- Check CORS settings (see full guide)

## Need CORS Proxy?

If you get CORS errors when calling Jira API, update `nginx.conf` to add proxy rules. See **DOKPLOY_DEPLOYMENT.md** for details.

## Complete Guide

For detailed instructions, see:
- **docs/guides/DOKPLOY_DEPLOYMENT.md** - Full deployment guide
- **RELEASE_CHECKLIST.md** - General release checklist

## Architecture

```
┌─────────────────┐
│   User Browser  │
│  (localStorage) │
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────┐
│  Dokploy Server │
│                 │
│  ┌───────────┐  │
│  │   Nginx   │  │ ← Serves static files
│  │   (80)    │  │ ← Handles SPA routing
│  └───────────┘  │ ← Health checks
│                 │
│  JiraViz Docker │
│  Container      │
└─────────────────┘
         │
         ├──────────────► Jira API (configured by user)
         │
         └──────────────► OpenAI API (configured by user)
```

---

**Ready to deploy!** All configuration files are in place. Just push to Git and deploy in Dokploy. 🚀

