# Embedding & Database Error Fix Guide

This guide explains how to resolve common issues with embeddings and database schema errors.

## Common Issues

### 1. Token Limit Exceeded Error

**Symptoms:**
```
BadRequestError: 400 This model's maximum context length is 8191 tokens, 
however you requested 12145 tokens. Please reduce your prompt tokens length.
```

**Cause:**
When generating embeddings in batches, the combined text of all tickets in a batch can exceed the OpenAI embedding model's token limit (8191 tokens for `text-embedding-3-small`).

**Fix:**
We've implemented automatic batch splitting:
- The system now estimates token count before sending requests
- If a batch exceeds the token limit, it's automatically split into smaller batches
- The default batch size has been reduced from 50 to 20 tickets
- Batches are processed recursively until they fit within the limit

**What Changed:**
- `src/services/llm.ts`: Added `estimateTokenCount()` method and recursive batch splitting in `generateEmbeddingsBatch()`
- `src/utils/ticketSort.ts`: Reduced default batch size from 50 to 20

### 2. Missing `parent_summaries` Table

**Symptoms:**
```
Error: no such table: parent_summaries
```

**Cause:**
The database schema wasn't properly migrated to version 5, which includes the `parent_summaries` table for caching AI-generated summaries of parent tickets.

**Fix:**
We've improved the database migration and creation logic:
- Better error handling during migration
- Explicit table existence checks before creation
- More detailed logging during migration process

**What Changed:**
- `src/services/database.ts`: Improved migration 4->5 and table creation logic

### 3. Storage Near Limit Warning

**Symptoms:**
```
⚠️ Storage near limit - not persisting embeddings. 
They will be kept in memory for this session.
```

**Cause:**
Browser localStorage has a limit (typically 5-10MB). When embeddings are stored, they can consume significant space.

**Behavior:**
- When storage exceeds 80% capacity, embeddings are no longer persisted to localStorage
- Embeddings are kept in memory for the current session
- They will need to be regenerated on the next session
- Your ticket data remains safe

**Manual Fix (if needed):**
If you want to persist embeddings again, clear old data:
1. Open browser DevTools (F12)
2. Console tab
3. Run: `clearDatabaseAndReload()`

## Debug Utilities

We've added several debug utilities available in the browser console:

### `fixDatabaseSchema()`
Checks your database schema and fixes issues:
```javascript
// In browser console (F12)
fixDatabaseSchema()
```

### `clearDatabaseAndReload()`
Clears the database and reloads the page (forces fresh schema):
```javascript
// In browser console (F12)
clearDatabaseAndReload()
```

### `clearJiravizDB()`
Clears the database without reloading:
```javascript
// In browser console (F12)
clearJiravizDB()
```

## Manual Database Reset

If automatic fixes don't work, you can manually reset your database:

1. **Open Browser DevTools** (F12)
2. **Go to Application tab** (Chrome) or Storage tab (Firefox)
3. **Find Local Storage** → Your site URL
4. **Delete these items:**
   - `jiraviz_db`
   - `jiraviz_db_version`
5. **Reload the page**
6. **Re-sync your Jira data**

**Note:** Your Jira configuration (URL, credentials) and preferences are stored separately and won't be affected.

## After Applying Fixes

After these fixes are applied:

1. **Reload the page** to ensure new code is loaded
2. If you see the `parent_summaries` error, run in console:
   ```javascript
   clearDatabaseAndReload()
   ```
3. **Re-sync your Jira data** after database reset
4. Embeddings will now generate without token limit errors
5. Storage warnings will appear if localStorage is filling up

## Technical Details

### Embedding Token Estimation

We use a conservative estimation:
- **1 token ≈ 4 characters** (actual OpenAI tokenization varies)
- Token limit: **8000 tokens** (buffer from 8191 max)
- Automatic recursive splitting if batch exceeds limit

### Batch Processing

- **Default batch size:** 20 tickets
- **Concurrency:** 3 batches in parallel
- **Fallback:** Individual embedding generation if batch fails

### Database Schema Version

Current version: **5**

Schema includes:
- `tickets` - All Jira ticket data
- `summaries` - Individual and aggregated summaries
- `config` - App configuration
- `parent_summaries` - Cached parent ticket summaries (new in v5)

## Troubleshooting

### Issue: Embeddings still failing with token limit

**Solution:**
1. Reduce batch size further by checking ticket description lengths
2. The system should auto-split, but if it doesn't:
   ```javascript
   // Check if you have very long ticket descriptions
   console.log('Checking ticket sizes...')
   ```

### Issue: Database still showing missing table

**Solution:**
1. Force database recreation:
   ```javascript
   clearDatabaseAndReload()
   ```
2. Check console for migration logs after reload
3. If still failing, check browser console for SQL errors

### Issue: Storage keeps filling up

**Solution:**
1. Embeddings consume ~1-2KB per ticket
2. For large projects (1000+ tickets), embeddings alone can use 1-2MB
3. Options:
   - Accept that embeddings won't persist (they work in memory)
   - Periodically clear old data
   - Use browser storage inspection to see what's using space

## Prevention

To avoid these issues in the future:

1. **Keep browser updated** - Better localStorage handling
2. **Monitor storage usage** - Check DevTools → Application → Storage
3. **Regular syncs** - Don't let data get too stale
4. **Clear old data** - Periodically reset if you don't need historical data

## Related Documentation

- [Storage Optimization Guide](../architecture/STORAGE_OPTIMIZATION.md)
- [Quota Fix Guide](./QUOTA_FIX_GUIDE.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)

