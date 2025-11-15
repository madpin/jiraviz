# Fix Summary: Embedding Token Limit & Database Schema Issues

**Date:** 2025-11-15
**Issues Fixed:**
1. Token limit exceeded errors when generating embeddings
2. Missing `parent_summaries` table in database
3. Improved error handling and user debugging tools

---

## Changes Made

### 1. Token Limit Fix (`src/services/llm.ts`)

**Problem:** Batch embedding generation was sending too many tokens in a single API request, exceeding the 8191 token limit.

**Solution:**
- Added `estimateTokenCount()` method to estimate tokens before sending requests
- Implemented recursive batch splitting in `generateEmbeddingsBatch()`
- Automatically splits large batches into smaller ones that fit within the token limit
- Processes split batches in parallel for efficiency

**Key Code Changes:**
```typescript
// Before: No token checking, sent all texts in one request
async generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  const truncatedTexts = texts.map(text => this.truncateForEmbedding(text));
  const response = await this.client!.embeddings.create({...});
}

// After: Estimates tokens and splits if needed
async generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  const totalTokens = truncatedTexts.reduce((sum, text) => 
    sum + this.estimateTokenCount(text), 0);
  
  if (totalTokens > TOKEN_LIMIT) {
    // Split and process recursively
    const mid = Math.floor(texts.length / 2);
    const [first, second] = await Promise.all([
      this.generateEmbeddingsBatch(texts.slice(0, mid)),
      this.generateEmbeddingsBatch(texts.slice(mid))
    ]);
    return [...first, ...second];
  }
  // Process batch normally
}
```

### 2. Reduced Default Batch Size (`src/utils/ticketSort.ts`)

**Change:** Reduced default batch size from 50 to 20 tickets

**Reason:**
- 50 tickets at once was too aggressive and frequently exceeded token limits
- 20 tickets is a safer default that balances performance and reliability
- The new recursive splitting provides additional safety

**Code Change:**
```typescript
// Before:
batchSize: number = 50

// After:
batchSize: number = 20
```

### 3. Database Schema Improvements (`src/services/database.ts`)

**Problem:** `parent_summaries` table was not being created properly during migration.

**Solution:**
- Improved migration 4->5 with explicit table existence checking
- Added better error handling and logging
- Enhanced `createTables()` method with try-catch for `parent_summaries` table
- Added table existence verification

**Key Changes:**
```typescript
// Migration 4->5 improvements
const tableExists = this.db.exec(
  "SELECT name FROM sqlite_master WHERE type='table' AND name='parent_summaries'"
);

if (!tableExists || tableExists.length === 0 || tableExists[0].values.length === 0) {
  this.db.run(`CREATE TABLE parent_summaries (...)`);
  console.log('  - Created parent_summaries table');
} else {
  console.log('  - parent_summaries table already exists');
}
```

### 4. New Debug Utilities (`src/utils/fixDatabase.ts`)

**New File:** Provides utilities for users to fix database issues

**Features:**
- `fixDatabaseSchema()` - Checks and fixes database schema issues
- `clearDatabaseAndReload()` - Clears database and reloads the page
- Both functions available in browser console for easy debugging

**Usage:**
```javascript
// In browser console (F12)
fixDatabaseSchema()        // Check and fix schema
clearDatabaseAndReload()   // Reset database completely
```

### 5. Imported Debug Utilities (`src/main.tsx`)

**Change:** Added import for new debug utilities

```typescript
import './utils/fixDatabase' // Make database fix utilities available globally
```

### 6. New Documentation (`docs/guides/EMBEDDING_FIX_GUIDE.md`)

**New File:** Comprehensive guide for users facing these issues

**Contents:**
- Detailed explanation of each issue
- Step-by-step fix instructions
- Debug utility documentation
- Manual reset procedures
- Troubleshooting tips

---

## How These Changes Work Together

1. **Prevention:** Reduced batch size + token estimation prevents most errors
2. **Auto-Recovery:** Recursive batch splitting handles edge cases automatically
3. **Database Integrity:** Improved migration ensures schema is correct
4. **User Support:** Debug utilities + documentation help users fix issues

---

## Testing Recommendations

### For Users Currently Affected:

1. **Clear browser cache and reload** to get new code
2. **Run in console:** `clearDatabaseAndReload()`
3. **Re-sync Jira data** after page reloads
4. **Monitor console** for any remaining errors

### Expected Behavior After Fix:

✅ Embeddings generate without token limit errors
✅ Batches automatically split when needed
✅ Database has all required tables
✅ Clear logging shows what's happening
✅ Debug utilities available for quick fixes

### Still Seeing Errors?

If token limit errors persist:
- Check ticket descriptions aren't extremely long (>8000 chars each)
- Verify the fix was properly deployed
- Try reducing batch size further if needed

If database errors persist:
- Run `clearDatabaseAndReload()` in console
- Check console logs for migration messages
- Verify localStorage isn't corrupted

---

## Performance Impact

**Positive:**
- Fewer API errors = better user experience
- Parallel processing of split batches = minimal performance impact
- Better error messages = easier debugging

**Neutral:**
- Slightly more API calls when batches are split (but less than individual requests)
- Minimal overhead from token estimation (~0.1ms per ticket)

**No Negative Impact:**
- Embedding quality unchanged
- Storage usage unchanged
- API rate limits respected with existing concurrency controls

---

## Monitoring

To verify fixes are working:

1. **Console logs to watch for:**
   ```
   ✅ Created parent_summaries table
   Generated X/Y embeddings...
   ✅ Completed generating X embeddings
   ```

2. **Errors that should NOT appear:**
   ```
   ❌ maximum context length is 8191 tokens
   ❌ no such table: parent_summaries
   ```

3. **Storage warnings (expected if localStorage is full):**
   ```
   ⚠️ Storage near limit - not persisting embeddings
   ```
   This is normal and embeddings will work in memory.

---

## Files Modified

1. ✏️ `src/services/llm.ts` - Token estimation & recursive batch splitting
2. ✏️ `src/utils/ticketSort.ts` - Reduced default batch size
3. ✏️ `src/services/database.ts` - Improved schema creation & migration
4. ✏️ `src/main.tsx` - Imported new debug utilities
5. ➕ `src/utils/fixDatabase.ts` - New debug utilities
6. ➕ `docs/guides/EMBEDDING_FIX_GUIDE.md` - New user guide

---

## Rollback Plan (if needed)

If these changes cause issues:

1. **Restore batch size:**
   ```typescript
   batchSize: number = 50  // in ticketSort.ts
   ```

2. **Remove recursive splitting:**
   Revert `generateEmbeddingsBatch()` to simple implementation

3. **Database issues:**
   Users can always run `clearDatabaseAndReload()` to reset

---

## Future Improvements

Consider for future releases:

1. **Dynamic batch sizing** based on average ticket text length
2. **Better token counting** using actual tokenizer library
3. **Batch size configuration** in settings UI
4. **Database repair UI** instead of console-only tools
5. **Embedding compression** to reduce storage usage

---

## References

- OpenAI Embeddings API: https://platform.openai.com/docs/guides/embeddings
- SQL.js Documentation: https://sql.js.org/documentation/
- Related docs: `STORAGE_OPTIMIZATION.md`, `QUOTA_FIX_GUIDE.md`

