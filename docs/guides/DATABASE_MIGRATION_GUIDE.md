# Database Migration Guide for Formatted Text Feature

## What Happened

If you encountered an error like:
```
SyntaxError: Unexpected token 'C', "Closed" is not valid JSON
```

This was caused by a database schema update to support formatted text rendering. The issue has been fixed!

## The Fix

The database query logic has been updated to:
1. Use explicit column names instead of positional indices
2. Safely handle the new `descriptionADF` column in existing databases
3. Gracefully fall back if ADF data parsing fails

## What You Need to Do

### Option 1: Refresh the Page (Recommended)
Simply **refresh your browser** - the fix is already applied and your database will work correctly now.

### Option 2: Re-sync from Jira
If you still see issues:
1. Click the "Sync" button in the app
2. This will refresh all ticket data from Jira with proper formatting

### Option 3: Clear Database (Last Resort)
If problems persist, you can clear the local database:

1. Open browser console (F12)
2. Run:
   ```javascript
   localStorage.removeItem('jiraviz-db');
   ```
3. Refresh the page
4. Sync from Jira again

## What's New After the Fix

✅ Ticket descriptions show with full formatting (bold, italic, lists, etc.)
✅ Comments preserve their original formatting
✅ Existing databases are automatically compatible
✅ No data loss - plain text is still preserved

## Technical Details

### What Changed
- Added `descriptionADF` column to store Atlassian Document Format data
- Updated all database queries to use explicit column selection
- Added error handling for JSON parsing of ADF data

### Migration Safety
- Old tickets without ADF data will display plain text (as before)
- New/re-synced tickets will have formatted display
- The migration is non-destructive and backward compatible

## Need Help?

If you continue to experience issues after trying these steps, please:
1. Check the browser console for errors
2. Try clearing the database (Option 3 above)
3. Report the issue with console error details

## Prevention

This type of issue won't occur again because:
- Queries now use explicit column names
- JSON parsing has error handling
- Database schema changes are more robust

