# Formatted Text Display - User Guide

## What's New

JiraViz now displays ticket descriptions and comments with **full formatting** as they appear in Jira!

## Supported Formatting

### Text Formatting
- **Bold text**
- *Italic text*
- ~~Strikethrough~~
- <u>Underline</u>
- `Inline code`

### Structure
- # Headings (H1 through H6)
- Bullet lists
- Numbered lists
- Nested lists
- Blockquotes
- Horizontal rules

### Code
```javascript
// Code blocks with syntax
function example() {
  return "formatted!";
}
```

### Links
- External links
- Internal Jira links
- Link cards

### Advanced Elements
- Tables with headers and cells
- Info/Warning/Success/Error panels
- Task lists with checkboxes ☑
- @mentions
- Status badges
- Images and attachments

## What You'll See

### Before (Plain Text):
```
This is *bold* text with a list:
* Item 1
* Item 2
```

### After (Formatted):
This is **bold** text with a list:
• Item 1
• Item 2

## Where It Works

✅ Ticket descriptions in detail panel
✅ Comments on tickets
✅ Both light and dark themes

## What Stays the Same

- Editing still uses plain textarea (WYSIWYG coming later)
- Search still works on the text content
- Export and sync unchanged
- Database compatible with older versions

## Automatic Update

When you sync with Jira:
1. New formatting data is automatically downloaded
2. Existing tickets will show formatting on next sync
3. No manual action required

## Troubleshooting

**Q: I don't see formatting on my old tickets?**
A: Re-sync from Jira to download the formatting data.

**Q: Formatting looks wrong?**
A: This might be a complex Jira element. Please report which ticket type shows the issue.

**Q: Can I edit with formatting?**
A: Not yet - editing is still plain text. The formatting will be preserved when you update in Jira and sync again.

## Technical Details

See `FORMATTING_IMPLEMENTATION.md` for implementation details.

