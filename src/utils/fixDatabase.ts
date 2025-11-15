// Utility to fix database schema issues
// This helps users who have corrupted databases or missing tables

export async function fixDatabaseSchema(): Promise<void> {
  try {
    console.log('🔧 Checking database schema...');
    
    // With IndexedDB, schema is managed automatically by the database service
    // This function is kept for backwards compatibility but is now simpler
    
    console.log('ℹ️  Database schema is managed automatically with IndexedDB');
    console.log('✅ If you have issues, use clearDatabaseAndReload() to start fresh');
  } catch (error) {
    console.error('Failed to check database schema:', error);
    throw error;
  }
}

export function clearDatabaseAndReload(): void {
  try {
    console.log('🧹 Clearing database...');
    
    // Clear IndexedDB
    indexedDB.deleteDatabase('jiraviz');
    
    // Also clear any legacy localStorage data
    localStorage.clear();
    
    console.log('✅ Database cleared successfully!');
    console.log('🔄 Reloading page...');
    
    // Reload the page
    window.location.reload();
  } catch (error) {
    console.error('Failed to clear database:', error);
    alert('Failed to clear database. Please try manually:\n1. Open DevTools (F12)\n2. Go to Application > Storage\n3. Clear IndexedDB and Local Storage\n4. Reload the page');
  }
}

// Make utilities available in the browser console for debugging
if (typeof window !== 'undefined') {
  (window as any).fixDatabaseSchema = fixDatabaseSchema;
  (window as any).clearDatabaseAndReload = clearDatabaseAndReload;
  console.log('💡 Debug utilities loaded:');
  console.log('  - fixDatabaseSchema() - Check database schema');
  console.log('  - clearDatabaseAndReload() - Clear database and reload page');
}


