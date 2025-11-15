# Deployment Guide

This guide covers deploying JiraViz to production.

## Overview

JiraViz is a **frontend-only** application that runs entirely in the browser. All data is stored locally using:
- **localStorage** for configuration
- **sql.js** (SQLite in browser) for tickets and summaries

There is no backend server required, making deployment simple.

## Building for Production

### 1. Install Dependencies

```bash
npm install
```

### 2. Build the Application

```bash
npm run build
```

This will:
- Run TypeScript type checking
- Bundle the application with Vite
- Output production-ready files to the `dist/` directory

### 3. Preview the Build (Optional)

Test the production build locally:

```bash
npm run preview
```

## Deployment Options

### Option 1: Static File Hosting (Recommended)

Deploy the `dist/` directory to any static file hosting service:

#### Netlify

1. Install Netlify CLI: `npm install -g netlify-cli`
2. Deploy: `netlify deploy --prod --dir=dist`

Or use Netlify's drag-and-drop interface at [netlify.com/drop](https://netlify.com/drop)

#### Vercel

1. Install Vercel CLI: `npm install -g vercel`
2. Deploy: `vercel --prod`

Or connect your GitHub repository at [vercel.com](https://vercel.com)

#### GitHub Pages

1. Push your code to GitHub
2. Go to repository Settings → Pages
3. Set source to "GitHub Actions" or deploy the `dist/` folder manually
4. Access at `https://username.github.io/jiraviz`

**Note for GitHub Pages**: If deploying to a subdirectory (e.g., `https://username.github.io/jiraviz/`), update `vite.config.ts`:

```typescript
export default defineConfig({
  base: '/jiraviz/', // Add this line
  // ... rest of config
})
```

#### AWS S3 + CloudFront

1. Create an S3 bucket and enable static website hosting
2. Upload the `dist/` directory contents
3. (Optional) Set up CloudFront for HTTPS and caching
4. Configure bucket policy for public read access

#### Azure Static Web Apps

1. Create a Static Web App in Azure Portal
2. Connect to your GitHub repository
3. Configure build settings:
   - App location: `/`
   - Output location: `dist`
   - Build command: `npm run build`

### Option 2: Docker Container

Create a `Dockerfile`:

```dockerfile
FROM nginx:alpine
COPY dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Build and run:

```bash
docker build -t jiraviz .
docker run -p 8080:80 jiraviz
```

### Option 3: Node.js Server (with serve)

Install serve globally:

```bash
npm install -g serve
```

Serve the production build:

```bash
serve -s dist -p 3000
```

## CORS Considerations

### Important: CORS and Jira API Access

JiraViz makes API calls directly from the browser to:
1. **Jira REST API** - for fetching/updating tickets
2. **LLM API** (OpenAI or compatible) - for generating summaries

#### CORS Challenges

Modern browsers block cross-origin requests (CORS) for security. Since JiraViz runs entirely in the browser, you may encounter CORS issues when calling Jira's API.

#### Solutions

**Option 1: Browser Extension (Development Only)**
- Install a CORS extension (e.g., "CORS Unblock" or "Allow CORS")
- ⚠️ **Not recommended for production** - security risk

**Option 2: Proxy Server (Recommended for Production)**

Deploy a lightweight proxy server to forward requests:

**Example using Nginx:**

```nginx
server {
    listen 80;
    server_name jiraviz.example.com;

    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }

    # Proxy Jira requests
    location /api/jira {
        proxy_pass https://your-domain.atlassian.net;
        proxy_set_header Authorization $http_authorization;
        proxy_hide_header Access-Control-Allow-Origin;
        add_header Access-Control-Allow-Origin *;
    }
}
```

**Example using Node.js (Express):**

```javascript
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();

// Serve static files
app.use(express.static(path.join(__dirname, 'dist')));

// Proxy Jira API requests
app.use('/api/jira', createProxyMiddleware({
  target: 'https://your-domain.atlassian.net',
  changeOrigin: true,
  pathRewrite: { '^/api/jira': '' },
}));

// Fallback to index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(3000, () => console.log('Server running on port 3000'));
```

**Option 3: Jira Cloud App (Advanced)**

For enterprise deployments, consider creating a Jira Cloud App that handles authentication and API calls server-side.

## Environment-Specific Configuration

### Development vs Production

The app automatically detects the environment:

- **Development** (`npm run dev`): Uses Vite dev server
- **Production** (built): Runs from static files

### Configuration Storage

All configuration is stored in **browser localStorage**:
- Jira credentials (URL, email, API token, project key)
- LLM configuration (base URL, API key, model)
- User preferences
- Local ticket database

**Important**: Configuration is per-browser/per-device. Users must configure settings on each browser/device they use.

## Security Best Practices

### 1. API Key Security

⚠️ **API keys are stored in localStorage** (not encrypted at rest)

**Recommendations:**
- Use Jira API tokens with minimal required permissions
- Regularly rotate API tokens
- Consider implementing server-side authentication for production
- Educate users about not using shared/public computers

### 2. HTTPS

Always deploy over HTTPS to protect API keys in transit:
- Most static hosting providers (Netlify, Vercel, GitHub Pages) provide free HTTPS
- For custom domains, use Let's Encrypt or your hosting provider's SSL

### 3. Content Security Policy (CSP)

Add CSP headers to your deployment:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://api.openai.com https://*.atlassian.net;
```

## Post-Deployment Checklist

- [ ] Application loads correctly
- [ ] Settings panel is accessible
- [ ] Can configure Jira credentials
- [ ] Can configure LLM settings
- [ ] Can sync tickets from Jira
- [ ] Tickets display in tree view
- [ ] Can generate AI summaries
- [ ] Can create/edit/delete tickets
- [ ] Browser localStorage persists data
- [ ] HTTPS is enabled
- [ ] No console errors in browser DevTools

## Updating the Application

To deploy an update:

1. Pull latest changes: `git pull`
2. Install dependencies: `npm install`
3. Build: `npm run build`
4. Deploy the new `dist/` directory

## Troubleshooting Deployment

### Build Fails

**Error**: TypeScript compilation errors
- **Solution**: Run `npm run build` locally to see errors
- Check console for specific TypeScript issues
- Ensure all dependencies are installed

### Application Loads but Shows Blank Page

**Possible causes:**
1. **Base path incorrect** (GitHub Pages subdirectory)
   - Update `vite.config.ts` with correct `base` path
2. **Console errors** - Check browser DevTools
3. **File paths** - Ensure all assets loaded correctly

### CORS Errors in Production

**Error**: "Blocked by CORS policy"
- **Solution**: Implement a proxy server (see CORS section above)
- Or use a browser extension for testing (not production)

### localStorage Quota Exceeded

**Error**: "QuotaExceededError"
- **Solution**: The app automatically handles this by removing embeddings
- Users can also run `clearJiravizDB()` in browser console to reset

## Monitoring and Maintenance

Since JiraViz is frontend-only:
- No server logs or monitoring needed
- User issues are browser-specific
- Check browser console for errors
- Monitor Jira and OpenAI API usage/quotas

## Support and Updates

- **Documentation**: See `/docs` directory
- **Issues**: Check browser console for errors
- **Updates**: Redeploy after pulling latest changes from repository

---

For questions or issues, refer to [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

