# QUICK FIX: Database Column Error

## The Error
```
❌ Sync failed: table tickets has no column named comments
```

## Why This Happens
Your database was created with an older schema that doesn't have the `comments` column and other newer fields. The migration code needs a page reload to run.

---

## ✅ Solution (Choose One)

### Option 1: Use the UI Button (Easiest)

1. **Reload the page** (to load the new code)
2. **Open Settings** (click the Settings button in the top right)
3. **Go to "Data Display" tab**
4. **Scroll to bottom** - you'll see "Database Management"
5. **Click "Clear Local Database"**
6. **Confirm** the dialog
7. The page will reload automatically
8. **Re-sync from Jira**

### Option 2: Use Browser Console (Quick)

1. **Reload the page** first
2. **Open DevTools** (F12 or right-click → Inspect)
3. **Go to Console tab**
4. **Run this command:**
   ```javascript
   clearJiravizDB()
   ```
5. **Reload the page** when prompted
6. **Re-sync from Jira**

### Option 3: Manual Clear (Most Control)

1. **Open DevTools** (F12 or right-click → Inspect)
2. **Go to Application tab**
3. **Expand "Local Storage"** in left sidebar
4. **Click on your site**
5. **Delete these items:**
   - `jiraviz_db`
   - `jiraviz_db_version`
6. **Reload the page**
7. **Re-sync from Jira**

---

## After Clearing

1. The database will be recreated with the **correct schema**
2. The migration from version 2→3 will happen automatically
3. All columns (`comments`, `dueDate`, `resolutionDate`, etc.) will be present
4. Syncing will work without errors ✅

---

## What Gets Deleted?

When you clear the database, you lose:
- ❌ Cached tickets (will be restored on next sync)
- ❌ AI summaries (can be regenerated)

You **do NOT** lose:
- ✅ Your Jira/LLM configuration
- ✅ Your preferences (theme, layout, etc.)
- ✅ Any data in Jira itself

---

## Need Help?

If you're still seeing errors after clearing:

1. **Check browser console** for any error messages
2. **Verify you reloaded** the page after clearing
3. **Check Jira credentials** are correct in Settings
4. **Try "Sync All Tickets"** instead of "Sync Epics"

