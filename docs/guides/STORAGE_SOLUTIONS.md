# Storage Solutions for JiraViz

## ✅ IMPLEMENTED: IndexedDB Storage

As of the latest version, JiraViz now uses **IndexedDB** for all persistent storage, replacing the previous localStorage implementation.

## What Changed

### Before (localStorage)
- 5-10 MB storage limit
- Base64 encoding overhead (40% size increase)
- Quota exceeded errors with large datasets
- Manual quota management required

### After (IndexedDB)
- **50-500 MB storage capacity** (browser-dependent)
- **Binary storage** (no encoding overhead)
- **No quota errors** for normal use
- **Automatic schema management**
- **Better performance** for large datasets

## Storage Architecture

### Three Object Stores

1. **`database`** - SQL.js database (binary blob)
   - Contains all tickets, summaries, relationships
   - Stored as `Uint8Array` for optimal performance
   - No base64 conversion needed

2. **`config`** - Application configuration
   - Jira credentials and settings
   - LLM API configuration
   - Sync preferences

3. **`preferences`** - User preferences
   - Theme and visual settings
   - Layout preferences
   - Data display options

## Browser Compatibility

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome/Edge | ✅ Full (v24+) | Excellent performance |
| Firefox | ✅ Full (v16+) | Excellent performance |
| Safari | ✅ Full (v10+) | Good performance |
| Private/Incognito | ⚠️ Limited | Falls back to memory-only |

**Coverage**: ~98% of modern browsers

## Memory-Only Fallback

If IndexedDB is unavailable (e.g., private browsing), the app:
- ✅ Continues to work normally during the session
- ⚠️ Shows a warning banner at the top
- ⚠️ Data does not persist across page reloads
- ℹ️ Console warnings provide clear feedback

### Warning Banner

Users will see:
```
⚠️ Storage Unavailable - Memory-Only Mode
IndexedDB storage is not available in your current browser context
(possibly due to private/incognito mode). Your data will work normally
during this session but will not persist after closing the browser.
```

## Storage Capacity

### Typical Scenarios

**Small Project** (50 tickets)
- Database size: ~500 KB
- With embeddings: ~800 KB
- Plenty of headroom

**Medium Project** (200 tickets)
- Database size: ~2 MB
- With embeddings: ~3.5 MB
- Comfortable fit

**Large Project** (1000 tickets)
- Database size: ~10 MB
- With embeddings: ~16 MB
- No problems

**Enterprise** (5000+ tickets)
- Database size: ~50 MB
- With embeddings: ~80 MB
- Still fits comfortably

### Checking Storage Usage

Open browser console and run:
```javascript
// Get detailed storage info
const info = await navigator.storage.estimate();
console.log(`Used: ${(info.usage / 1024 / 1024).toFixed(2)} MB`);
console.log(`Available: ${(info.quota / 1024 / 1024).toFixed(2)} MB`);
console.log(`Percentage: ${((info.usage / info.quota) * 100).toFixed(1)}%`);
```

## Migration from localStorage

### Fresh Start Approach

The migration uses a **fresh start** approach:
- Old localStorage data is not migrated
- Users re-sync their tickets from Jira
- Configuration may need to be re-entered
- Preferences may need to be set again

### Why Fresh Start?

1. **Cleaner**: No migration complexity or edge cases
2. **Faster**: No data transformation needed
3. **Safer**: No risk of corrupted data carry-over
4. **Simpler**: Users already know how to sync from Jira

### Migration Notice

On first load after upgrade, users see console messages:
```
ℹ️ JiraViz has migrated to IndexedDB storage
ℹ️ Previous localStorage data is not automatically migrated
ℹ️ Please re-sync your tickets from Jira and reconfigure settings
ℹ️ This is a one-time step that provides 10-50x more storage capacity
```

## Developer Guide

### Using the IndexedDB Service

```typescript
import { indexedDBService } from './services/indexedDB';

// Check availability
if (indexedDBService.isAvailable()) {
  console.log('IndexedDB is available');
}

// Save/load database
const dbData = db.export(); // Uint8Array
await indexedDBService.saveDatabase(dbData);

const loadedData = await indexedDBService.loadDatabase();
// Returns Uint8Array or null

// Save/load config
await indexedDBService.saveConfig({ /* config object */ });
const config = await indexedDBService.loadConfig();

// Save/load preferences
await indexedDBService.savePreferences({ /* prefs object */ });
const prefs = await indexedDBService.loadPreferences();

// Get storage info
const info = await indexedDBService.getStorageInfo();
console.log(info); // { used, total, percentage }

// Clear all data
await indexedDBService.clearAll();
```

### Database Service Changes

The `DatabaseService` class now:
- Uses IndexedDB instead of localStorage
- Stores binary data directly (no base64)
- Tracks IndexedDB availability
- Falls back to memory-only mode
- Simplified save logic (no quota checks)

### Hooks Changes

Both `useConfig` and `usePreferences` hooks:
- Made async (proper async/await)
- Use IndexedDB service methods
- Handle errors gracefully
- Support memory-only fallback

## Troubleshooting

### Data Not Persisting?

**Check IndexedDB availability**:
```javascript
console.log(indexedDBService.isAvailable());
```

If `false`, you're in memory-only mode:
- Check if in private/incognito browsing
- Check browser compatibility
- Check browser settings (storage permissions)

### Clear All Data

**Console method** (recommended):
```javascript
clearDatabaseAndReload()
```

**Manual method**:
1. Open DevTools (F12)
2. Go to Application > Storage
3. Clear IndexedDB: `jiraviz`
4. Clear Local Storage (for legacy data)
5. Reload page

### Storage Quota Issues

With IndexedDB, quota issues are rare. If you encounter them:

```javascript
// Check current usage
const info = await navigator.storage.estimate();
console.log(`Using ${(info.usage / info.quota * 100).toFixed(1)}%`);

// If over 80%, consider clearing embeddings
db.clearEmbeddings(); // They'll regenerate as needed
```

### Performance Issues

IndexedDB is generally faster than localStorage, but:

**Large initial sync**:
- Use batch operations
- Process in chunks
- Show progress indicators

**Slow page loads**:
- Check IndexedDB size
- Consider clearing old summaries
- Regenerate embeddings if corrupted

## Testing

### Verify IndexedDB Implementation

1. **Fresh install**
   - Clear all data
   - Reload page
   - Verify database created in IndexedDB
   - Sync tickets from Jira
   - Reload page - data should persist

2. **Memory-only fallback**
   - Open in incognito/private mode
   - Warning banner should appear
   - App should work normally
   - Reload - data should be gone
   - Console warnings should be clear

3. **Large datasets**
   - Sync 500+ tickets
   - Generate all embeddings
   - Check storage usage
   - Reload - should be instant
   - No quota errors

4. **Browser compatibility**
   - Test in Chrome, Firefox, Safari
   - Test in private mode
   - Test on mobile browsers
   - Verify consistent behavior

## Future Enhancements

Potential improvements:

1. **Compression**
   - Use pako.js for gzip compression
   - Further reduce storage requirements
   - Trade-off: slight CPU overhead

2. **Selective Sync**
   - Only store recent/relevant tickets
   - Archive old tickets
   - Reduce storage footprint

3. **Cloud Backup**
   - Optional backend sync
   - Cross-device access
   - Team collaboration

4. **Progressive Web App**
   - Offline-first architecture
   - Service worker caching
   - Background sync

## Summary

✅ **Implemented**: IndexedDB storage  
✅ **Capacity**: 50-500 MB (10-50x increase)  
✅ **Performance**: Binary storage (40% smaller)  
✅ **Reliability**: No quota errors  
✅ **Compatibility**: 98% of browsers  
✅ **Fallback**: Memory-only mode with warnings  
✅ **Migration**: Fresh start approach  

The IndexedDB migration provides a solid foundation for scaling JiraViz to handle enterprise-level datasets while maintaining excellent performance and user experience! 🎉
