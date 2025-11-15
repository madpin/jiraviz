import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['sql.js'],
  },
  server: {
    fs: {
      strict: false,
    },
    proxy: {
      // Proxy LLM API requests to avoid CORS issues in development
      // Maps /api/llm/* to https://llm-proxy.sandbox.indeed.net/openai/v1/*
      '/api/llm': {
        target: 'https://llm-proxy.sandbox.indeed.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/llm/, '/openai/v1'),
        secure: false,
      },
      // Proxy Jira API requests to avoid CORS issues in development
      // Maps /api/jira/* to https://indeed.atlassian.net/*
      '/api/jira': {
        target: 'https://indeed.atlassian.net', 
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/jira/, ''),
        secure: false,
      },
    },
  },
})

