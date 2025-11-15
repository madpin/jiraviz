# Storage Optimization for Embeddings

## Problem

JiraViz uses AI embeddings (vector representations of ticket text) to find related tickets and provide smart sorting. However, these embeddings are large:
- Each embedding is typically 1536+ dimensions
- Each dimension is a floating-point number
- For 100 tickets, embeddings can consume 2-3 MB of storage
- Browser localStorage is limited to 5-10 MB total

This can cause `QuotaExceededError` when trying to save the database.

## Solution

The app now intelligently manages embeddings with these strategies:

### 1. **In-Memory Caching**
- Embeddings are always kept in memory during your session
- Fast access without reading from disk
- No storage impact while working

### 2. **Automatic Storage Management**
- Monitors localStorage usage automatically
- When usage exceeds 80%, stops persisting embeddings
- Automatically clears embeddings if quota is exceeded
- Falls back to memory-only storage

### 3. **Graceful Degradation**
- If embeddings can't be persisted, they're kept in memory
- Works perfectly for the current session
- Embeddings regenerate on next session (only if using smart sorting)

### 4. **Smart Save Logic**
```javascript
// Before saving embeddings:
1. Check if storage is near limit (>80%)
2. If yes: Keep in memory only, skip persistence
3. If no: Try to save
4. If QuotaExceededError: Clear all embeddings, continue
```

## User Impact

### ✅ What Works
- **Smart sorting** works perfectly in your current session
- **Related ticket finding** works as expected
- **No more quota errors** that break the app
- **All ticket data** is always preserved (embeddings are optional)

### ⚠️ What Changes
- **Embeddings may regenerate** on next session if they couldn't be saved
- **Slight delay** when first using smart sorting (generating embeddings)
- **Storage space** is prioritized for actual ticket data

### 💡 Best Practices

1. **For Large Projects (>100 tickets)**:
   - Embeddings will use memory-only mode
   - They regenerate each session when needed
   - This is expected and optimal

2. **For Small Projects (<50 tickets)**:
   - Embeddings can be persisted
   - Faster startup on subsequent visits

3. **If You See Storage Warnings**:
   - This is normal and handled automatically
   - No action needed on your part
   - Ticket data is always safe

## Technical Details

### Storage Budget Allocation
```
Total localStorage: ~5 MB
├── Ticket data: ~3-4 MB (priority)
├── Comments & metadata: ~500 KB
├── Config & preferences: ~100 KB
└── Embeddings: ~500 KB (optional, memory if >80%)
```

### Error Handling Flow
```
save() → QuotaExceededError
    ↓
clearEmbeddings()
    ↓
retry save()
    ↓
success (without embeddings)
```

### Memory vs. Storage
- **Memory (RAM)**: Fast, temporary, cleared on page refresh
- **Storage (localStorage)**: Persistent, limited, shared across origin

## Monitoring Storage

Check your current usage in browser console:
```javascript
// Get storage info
const info = db.getStorageInfo();
console.log(`Using ${info.percentage.toFixed(1)}% of storage`);
console.log(`${(info.used / 1024).toFixed(0)} KB used of ${(info.total / 1024).toFixed(0)} KB total`);
```

## Manual Operations

### Clear Embeddings Only (Keep Ticket Data)
```javascript
db.clearEmbeddings();
```

### Check if Near Limit
```javascript
if (db.isStorageNearLimit()) {
  console.log('Storage is over 80% - embeddings will use memory only');
}
```

### Full Database Clear (Nuclear Option)
```javascript
// Only if you want to start fresh
localStorage.removeItem('jiraviz-db');
location.reload();
```

## FAQ

**Q: Will I lose my tickets?**
A: No! Ticket data is always preserved. Only embeddings (which can be regenerated) are affected.

**Q: Why do embeddings need so much space?**
A: AI embeddings are high-dimensional vectors (1536 floats) needed for semantic similarity. They're necessary for smart sorting but optional for storage.

**Q: Can I disable embeddings completely?**
A: Embeddings only generate when using "Smart/Default" sorting. Use other sort orders (alphabetical, date, etc.) to avoid embeddings entirely.

**Q: How long does it take to regenerate embeddings?**
A: Typically 1-3 seconds for 50 tickets with batch processing. It happens automatically and you'll see progress in the console.

**Q: Does this affect the AI summary feature?**
A: No, AI summaries are separate and much smaller. They're always persisted.

## Performance Impact

| Operation | With Persisted Embeddings | Memory-Only Embeddings |
|-----------|--------------------------|------------------------|
| First Load | ✅ Instant | ⏱️ 1-3s generation |
| Subsequent Loads | ✅ Instant | ⏱️ 1-3s generation |
| Smart Sort | ✅ Instant | ✅ Instant (cached) |
| Regular Sort | ✅ Instant | ✅ Instant |
| Storage Used | 📦 High | 📦 Low |

## Future Improvements

Potential enhancements being considered:
1. IndexedDB storage for embeddings (larger quota)
2. Embedding compression (reduce size by 50-70%)
3. Server-side embedding cache
4. Selective embedding (only for frequently accessed tickets)

## Summary

The app now intelligently manages storage to ensure:
- ✅ Your ticket data is always safe
- ✅ No more quota exceeded errors
- ✅ Smart sorting still works perfectly
- ✅ Optimal use of limited browser storage
- ✅ Automatic recovery from storage issues

No action needed on your part - it all happens automatically! 🎉

