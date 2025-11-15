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
    // Proxy configuration removed - not needed for production
    // In development, the app will use direct API calls to configured Jira/LLM endpoints
    // Users configure these endpoints in the Settings panel
  },
})

