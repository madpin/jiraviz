# Troubleshooting Guide

## Issue: Tickets Not Showing or Blank Page When Clicking

If you're experiencing issues with tickets not displaying or getting a blank page when clicking them, follow these steps:

### Solution 1: Clear Database and Re-sync (Recommended)

The database migration may have left your data in an inconsistent state. The cleanest solution is to start fresh:

#### Step 1: Clear the Database

Open your browser console (F12) and run:

```javascript
clearJiraVizDatabase()
```

You should see:
```
✅ Database cleared successfully!
Please refresh the page and re-sync your tickets.
```

#### Step 2: Refresh the Page

Press `Ctrl+R` (or `Cmd+R` on Mac) to reload the app.

#### Step 3: Re-sync from Jira

1. Click the **"Sync"** button in the header
2. Choose **"Sync All Tickets"** to get everything fresh
3. Wait for sync to complete

#### Step 4: Verify

- ✅ Tickets should now appear
- ✅ Clicking tickets should open detail panel
- ✅ Everything should work normally

---

### Solution 2: Check Console for Errors

If clearing the database doesn't help, let's diagnose the issue:

#### Step 1: Open Browser Console

- **Chrome/Edge**: Press `F12` or `Ctrl+Shift+I`
- **Firefox**: Press `F12` or `Ctrl+Shift+K`
- **Safari**: Enable Developer Menu, then press `Cmd+Option+I`

#### Step 2: Look for Errors

Check the console for red error messages. Common errors and solutions:

**Error: "LLM API authentication failed"**
- Solution: Go to Settings → LLM Configuration
- Check your API key is correct
- Or switch to a different sort order (not "Smart Order")

**Error: "Network error"**
- Solution: Check your internet connection
- Check if LLM API URL is accessible
- Or switch to a different sort order

**Error: "Failed to read tickets"**
- Solution: Clear database (see Solution 1)
- Re-sync from Jira

#### Step 3: Share Error Details

If you see errors, note:
1. The error message
2. When it occurs (on load, when clicking, when sorting?)
3. What you were doing when it happened

---

### Solution 3: Disable Smart Sort

If the "Smart Order" sort is causing issues:

#### Option A: Use Different Sort

1. Click the **"Sort by:"** dropdown
2. Select any other option:
   - "Updated Date (Newest)"
   - "Created Date (Newest)"
   - "Alphabetical (A-Z)"
   - "Priority"
   - "Status"
   - "Assignee"

#### Option B: Fix Smart Sort

Smart sort requires LLM configuration:

1. Go to **Settings** (gear icon)
2. **LLM Configuration** section:
   - Set Base URL (e.g., `https://api.openai.com`)
   - Set API Key
   - Set Model (e.g., `gpt-4`)
3. Save settings
4. Try "Smart Order" again

---

### Solution 4: Reset to Defaults

If nothing else works, reset everything:

#### Browser Console Commands:

```javascript
// Clear database
clearJiraVizDatabase()

// Clear preferences
localStorage.removeItem('jiraviz-preferences')

// Clear config
localStorage.removeItem('jiraviz_config')

// Refresh page
location.reload()
```

Then reconfigure from scratch.

---

## Common Issues and Fixes

### Issue: "No hierarchical tickets found"

**Cause**: No Initiatives or Epics in your project, or they're not synced.

**Solution**:
1. Click "Sync" → "Sync All Tickets"
2. Or check if your project has Epics/Initiatives

### Issue: "Orphan Tickets" showing but no tree

**Cause**: Tickets don't have proper parent relationships.

**Solution**:
1. This is normal if tickets aren't linked to Epics
2. Tickets are still accessible in the Orphan Tickets table
3. You can click them to see details

### Issue: Blank page with no error

**Cause**: JavaScript error preventing render.

**Solution**:
1. Hard refresh: `Ctrl+Shift+R` (or `Cmd+Shift+R`)
2. Clear browser cache
3. Clear database (see Solution 1)

### Issue: Tickets show but clicking does nothing

**Cause**: React state issue or event handler problem.

**Solution**:
1. Check browser console for errors
2. Try refreshing the page
3. Try different sort order
4. Clear database and re-sync

### Issue: Smart sort shows "⚠️ Sort error"

**Cause**: LLM API issue or not configured.

**Solution**:
1. Check LLM configuration in Settings
2. Switch to different sort order
3. Check console for specific error

---

## Diagnostic Checklist

Before asking for help, check:

- [ ] Browser console open (F12)
- [ ] No red errors in console
- [ ] Jira is configured (Settings → Jira)
- [ ] At least one ticket synced
- [ ] Internet connection working
- [ ] Tried refreshing the page
- [ ] Tried clearing database
- [ ] Tried different sort order

---

## Still Having Issues?

If none of the above solutions work:

### Collect Diagnostic Info:

1. **Browser & Version**: (e.g., Chrome 120, Firefox 115)
2. **Console Errors**: Copy any red error messages
3. **Steps to Reproduce**: What did you do before it broke?
4. **Sort Order**: Which sort order is selected?
5. **Number of Tickets**: How many tickets do you have?

### Debug Mode:

Enable verbose logging in console:

```javascript
localStorage.setItem('DEBUG', 'jiraviz:*')
location.reload()
```

This will show detailed logs of what's happening.

---

## Prevention Tips

To avoid issues in the future:

1. **Keep LLM configured** if using Smart Sort
2. **Sync regularly** to keep data fresh
3. **Monitor console** for warnings
4. **Clear database** after major updates
5. **Use stable sort orders** (Updated, Created) for reliability

---

## Quick Reference

### Clear Database
```javascript
clearJiraVizDatabase()
```

### Clear Everything
```javascript
localStorage.clear()
location.reload()
```

### Check Database Version
```javascript
localStorage.getItem('jiraviz_db_version')
```

### View Current Sort Order
```javascript
JSON.parse(localStorage.getItem('jiraviz-preferences')).dataDisplay.defaultSortOrder
```

---

## Contact

If you continue to have issues:
- Check the documentation
- Look at recent changes in CHANGELOG.md
- File an issue with diagnostic info

