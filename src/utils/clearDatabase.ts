// Utility to clear the database - useful for fixing schema issues

export function clearLocalDatabase(): void {
  try {
    // Clear the database from localStorage
    localStorage.removeItem('jiraviz_db');
    localStorage.removeItem('jiraviz_db_version');
    
    console.log('✅ Database cleared successfully!');
    console.log('Please reload the page to recreate the database with the correct schema.');
    
    // Show user-friendly message
    alert('Database cleared! Please reload the page.');
  } catch (error) {
    console.error('Failed to clear database:', error);
    alert('Failed to clear database. Please try manually:\n1. Open DevTools (F12)\n2. Go to Application > Local Storage\n3. Delete jiraviz_db and jiraviz_db_version\n4. Reload the page');
  }
}

// Make it available in the browser console for debugging
if (typeof window !== 'undefined') {
  (window as any).clearJiravizDB = clearLocalDatabase;
  console.log('💡 Debug utility loaded: Run clearJiravizDB() in console to reset database');
}
