// Utility to clear the database - useful for fixing schema issues
import { indexedDBService } from '../services/indexedDB';

export async function clearLocalDatabase(): Promise<void> {
  try {
    // Only clear the ticket database, preserving config and preferences
    await indexedDBService.clearDatabaseOnly();
    
    console.log('✅ Database cleared successfully!');
    console.log('✨ Your Jira credentials and preferences have been preserved.');
    console.log('Please reload the page to recreate the database with the correct schema.');
    
    // Show user-friendly message
    alert('Database cleared!\n\n✅ Ticket data has been removed\n✨ Your credentials and settings are preserved\n\nPlease reload the page.');
  } catch (error) {
    console.error('Failed to clear database:', error);
    alert('Failed to clear database. Please try manually:\n1. Open DevTools (F12)\n2. Go to Application > Storage\n3. Clear IndexedDB\n4. Reload the page');
  }
}

// Complete reset function for debugging (clears everything including config)
export async function resetEverything(): Promise<void> {
  try {
    // Clear IndexedDB completely
    await indexedDBService.clearAll();
    
    // Also clear any legacy localStorage data
    localStorage.clear();
    
    console.log('✅ Complete reset successful!');
    console.log('⚠️ All data including credentials has been cleared.');
    console.log('Please reload the page to start fresh.');
    
    alert('Complete reset successful!\n\n⚠️ All data including credentials has been cleared.\n\nPlease reload the page.');
  } catch (error) {
    console.error('Failed to reset:', error);
    alert('Failed to reset. Please try manually clearing IndexedDB and localStorage.');
  }
}

// Make utilities available in the browser console for debugging
if (typeof window !== 'undefined') {
  (window as any).clearJiravizDB = clearLocalDatabase;
  (window as any).resetJiravizEverything = resetEverything;
  console.log('💡 Debug utilities loaded:');
  console.log('  - clearJiravizDB() - Clear ticket data only (preserves credentials)');
  console.log('  - resetJiravizEverything() - Complete reset (clears everything)');
}

