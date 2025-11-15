import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppRouter } from './AppRouter.tsx'
import './index.css'
import './utils/clearDatabase' // Make database clear utility available globally
import './utils/fixDatabase' // Make database fix utilities available globally

// Check for localStorage data and show migration notice
const hasLegacyData = localStorage.getItem('jiraviz_db') || localStorage.getItem('jiraviz_config') || localStorage.getItem('jiraviz-preferences');
if (hasLegacyData) {
  console.log('');
  console.log('🔄 ═══════════════════════════════════════════════════════════');
  console.log('   JiraViz Storage Migration Notice');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('ℹ️  JiraViz has migrated to IndexedDB storage');
  console.log('ℹ️  Previous localStorage data is not automatically migrated');
  console.log('');
  console.log('📋 What to do:');
  console.log('   1. Re-sync your tickets from Jira (click "Sync Epics")');
  console.log('   2. Reconfigure settings if needed (click Settings icon)');
  console.log('   3. Set your preferences again if desired');
  console.log('');
  console.log('✨ Benefits:');
  console.log('   • 10-50x more storage capacity (50-500 MB)');
  console.log('   • No more quota exceeded errors');
  console.log('   • Better performance for large datasets');
  console.log('   • Support for thousands of tickets with embeddings');
  console.log('');
  console.log('🧹 To clear old localStorage data:');
  console.log('   localStorage.clear()');
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AppRouter />
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>,
)


