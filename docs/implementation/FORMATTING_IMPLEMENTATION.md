# Text Formatting Implementation

## Overview
This implementation preserves the original formatting from Jira tickets (descriptions and comments) by converting Atlassian Document Format (ADF) to HTML and rendering it with proper styling.

## What Changed

### 1. New Files Created

#### `/src/utils/adfFormatter.ts`
- **Purpose**: Converts Atlassian Document Format (ADF) to HTML
- **Key Functions**:
  - `convertADFToHTML(adf)`: Comprehensive ADF to HTML converter
  - `extractTextFromADF(adf)`: Fallback plain text extractor (improved version)
- **Supported ADF Elements**:
  - Text formatting: bold, italic, underline, strikethrough, code
  - Headings (H1-H6)
  - Lists (bullet and numbered)
  - Code blocks
  - Blockquotes
  - Links
  - Tables
  - Panels (info, success, warning, error)
  - Task lists with checkboxes
  - Mentions (@user)
  - Emojis
  - Status badges
  - Images and media

#### `/src/components/FormattedText.tsx`
- **Purpose**: React component for safely rendering formatted text
- **Features**:
  - Handles both ADF objects and plain text
  - Safe HTML rendering with proper escaping
  - Automatic detection of content type
  - Graceful fallback for missing content

### 2. Modified Files

#### `/src/types/index.ts`
- Added `descriptionADF?: any` to `JiraTicket` interface
- Added `bodyADF?: any` to `JiraComment` interface
- These fields store the original ADF data for rich formatting

#### `/src/services/jira.ts`
- Updated `mapIssueToTicket()` to preserve `descriptionADF` field
- Updated comment mapping to preserve `bodyADF` field
- Updated `getComments()` to include `bodyADF`
- Text versions are still stored for backward compatibility and search

#### `/src/services/database.ts`
- Added `descriptionADF` column to tickets table schema
- Added migration support (ALTER TABLE) for existing databases
- Updated INSERT/UPDATE statements to handle new field
- Updated `getTickets()` and `getTicketById()` to retrieve ADF data
- Comments' `bodyADF` is automatically stored as part of the comments JSON

#### `/src/components/TicketDetail.tsx`
- Imported `FormattedText` component
- Replaced plain text description rendering with `FormattedText`
- Replaced plain text comment rendering with `FormattedText`
- Edit mode still uses textarea for simplicity

#### `/src/index.css`
- Added comprehensive CSS styling for `.formatted-text` class
- Styled all HTML elements that can be generated from ADF:
  - Headings, paragraphs, lists
  - Code and code blocks
  - Tables
  - Links, blockquotes, horizontal rules
  - Panels, task lists, mentions, status badges
  - Images
- Includes dark mode support for all elements

## How It Works

1. **Data Flow**:
   ```
   Jira API (ADF) → jira.ts (preserves ADF + extracts text) → 
   database.ts (stores both) → JiraTicket object → 
   FormattedText component → convertADFToHTML() → 
   Rendered HTML with CSS styling
   ```

2. **Rendering**:
   - When displaying a ticket/comment, check if ADF data exists
   - If yes: convert ADF to HTML and render with formatting
   - If no: fall back to plain text with basic line break preservation

3. **Safety**:
   - HTML is generated from trusted ADF structure (from Jira)
   - All text content is properly escaped to prevent XSS
   - Uses `dangerouslySetInnerHTML` but only with sanitized content

## Benefits

1. **Preserves Original Formatting**:
   - Bold, italic, underline, strikethrough
   - Headings and structure
   - Lists (bullets and numbers)
   - Code blocks with syntax
   - Links, images, tables
   - Special Jira elements (panels, task lists, mentions)

2. **Backward Compatible**:
   - Still stores plain text versions
   - Existing databases automatically migrated
   - Graceful fallback if ADF is missing

3. **No External Dependencies**:
   - Pure TypeScript/React implementation
   - No need for markdown or ADF rendering libraries
   - Uses only built-in browser rendering

4. **Fully Styled**:
   - Custom CSS for all elements
   - Dark mode support
   - Consistent with app's design system

## Usage

To display formatted Jira content:

```tsx
import { FormattedText } from './components/FormattedText';

// For descriptions
<FormattedText 
  content={ticket.descriptionADF || ticket.description}
  isADF={!!ticket.descriptionADF}
  className="text-gray-700 dark:text-gray-300"
/>

// For comments
<FormattedText 
  content={comment.bodyADF || comment.body}
  isADF={!!comment.bodyADF}
  className="text-sm"
/>
```

## Database Migration

The database automatically migrates when the app loads:
1. Creates `descriptionADF` column if it doesn't exist
2. Existing tickets will have `null` for this field initially
3. On next sync from Jira, ADF data will be populated
4. No data loss - plain text is preserved

### Migration Safety Features

To ensure smooth migration from old databases:
- **Explicit column selection**: Queries use named columns instead of `SELECT *` to avoid index mismatches
- **Safe JSON parsing**: ADF data parsing includes try-catch to handle unexpected values
- **Backward compatible**: Old databases without `descriptionADF` work perfectly (shows plain text)
- **Non-blocking errors**: If ADF parsing fails, app continues with plain text display

If you encounter JSON parsing errors after upgrade:
1. Refresh the browser - the fix is already in place
2. Re-sync from Jira to get fresh data
3. See `DATABASE_MIGRATION_GUIDE.md` for recovery steps

## Testing Recommendations

1. Test with various Jira ticket types (with different formatting)
2. Verify dark mode styling
3. Check that existing tickets still display correctly
4. Test creation/editing of tickets (should work as before)
5. Verify database migration on existing installations

## Future Enhancements

Possible improvements:
1. Support for ADF in edit mode (WYSIWYG editor)
2. Syntax highlighting for code blocks
3. Emoji rendering from shortnames
4. Better handling of Jira-specific attachments
5. Real-time preview when editing

