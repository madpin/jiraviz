# Advanced Ticket Sorting Implementation

## Overview

This implementation adds a sophisticated ticket sorting system with multiple ordering strategies, including an intelligent "default" order that uses embeddings to find related tickets.

## Features Implemented

### 1. Sort Order Types

Added 7 different sort orders to organize tickets:

- **Default (Smart Order)**: Prioritizes tickets by relevance to the owner
  - Owner's tickets (assigned or reported by user) first
  - Related tickets found via AI embeddings
  - Parent tickets with children
  - Orphan tickets
  
- **Alphabetical**: Sort by ticket key (A-Z)
- **Created**: Sort by creation date (newest first)
- **Updated**: Sort by update date (newest first)
- **Status**: Group by status
- **Priority**: Order by priority level
- **Assignee**: Group by assignee name

### 2. AI-Powered Related Ticket Detection

The default sort order uses OpenAI embeddings to find semantically related tickets:

- Generates text embeddings for ticket content (summary, description, labels)
- Calculates cosine similarity between tickets
- Identifies related tickets with 75% similarity threshold
- Caches embeddings for performance

### 3. User Interface Enhancements

- **Sort Order Dropdown**: Added to VisualTreeView for easy switching
- **Settings Panel**: Updated with all sort order options
- **Loading Indicators**: Shows "Sorting..." when processing
- **Responsive Sorting**: Automatically re-sorts when data changes

### 4. Component Updates

#### Modified Files:

1. **src/types/index.ts**
   - Added `SortOrder` type with 7 options
   - Updated `DataDisplayPreferences` to use new type

2. **src/services/llm.ts**
   - Added `generateEmbedding()` method
   - Added `getTicketText()` to create text representation
   - Added `cosineSimilarity()` for vector comparison

3. **src/utils/ticketSort.ts** (NEW)
   - Comprehensive sorting utility
   - Async support for embedding-based sorting
   - Embedding cache for performance
   - Separate sorting functions for each order type

4. **src/hooks/usePreferences.ts**
   - Updated default sort order to 'default'

5. **src/components/VisualTreeView.tsx**
   - Added sort order state management
   - Integrated sorting utility
   - Added UI dropdown for sort selection
   - Passes sort order to child components

6. **src/components/OrphanTicketsTable.tsx**
   - Added `sortOrder` prop
   - Implements local sorting for non-default orders
   - Respects parent sorting for default order

7. **src/components/Settings.tsx**
   - Updated sort order options in settings panel
   - Better labels for each sort type

8. **src/components/TicketTree.tsx**
   - Fixed unused variable warning

## How It Works

### Default Sort Order Algorithm

1. **Owner Tickets** (Score: 1,000,000)
   - Finds tickets where user is assignee or reporter
   - Sorts by updated date (newest first)

2. **Related Tickets** (Score: 100,000)
   - For each owner ticket:
     - Generates embedding vector
     - Compares with all other tickets
     - Includes tickets with similarity ≥ 0.75
   - Sorts by updated date

3. **Parent Tickets** (Score: 10,000)
   - Tickets that have children
   - Excludes already-included tickets
   - Sorts by created date (newest first)

4. **Orphan Tickets** (Score: 1)
   - All remaining tickets
   - Sorts by created date (newest first)

### Performance Optimizations

- **Embedding Cache**: Prevents regenerating embeddings for same tickets
- **Async Processing**: Doesn't block UI during sorting
- **Smart Recalculation**: Only re-sorts when tickets or sort order changes
- **Memoization**: Uses React useMemo for computed values

## Usage

### For Users

1. **Change Sort Order**: Use the dropdown at the top of the ticket view
2. **Set Default**: Go to Settings → Data Display → Default Sort Order
3. **Smart Ordering**: Keep "Smart Order (Owner First)" for intelligent sorting based on your tickets

### For Developers

```typescript
import { sortTickets } from '../utils/ticketSort';

// Sort tickets with any order
const sorted = await sortTickets(
  tickets,
  'default', // or any SortOrder
  userEmail // required for 'default' order
);

// Clear embedding cache when needed
import { clearEmbeddingCache } from '../utils/ticketSort';
clearEmbeddingCache();
```

## Technical Details

### Embedding Model
- Uses OpenAI's `text-embedding-3-small` model
- Generates 1536-dimension vectors
- Fast and cost-effective

### Similarity Threshold
- Default threshold: 0.75 (75% similarity)
- Can be adjusted in `ticketSort.ts`
- Higher = more strict, Lower = more inclusive

### Caching Strategy
- In-memory cache using Map
- Keys: Ticket IDs
- Values: Embedding vectors
- Cleared on demand or component unmount

## Future Enhancements

Possible improvements:

1. **Persist Embeddings**: Store in database for persistence across sessions
2. **Adjustable Threshold**: Allow users to set similarity threshold
3. **Relationship Visualization**: Show why tickets are related
4. **Batch Embedding**: Generate embeddings in parallel
5. **Alternative Models**: Support different embedding providers
6. **Custom Sort Orders**: Allow users to create custom sort logic
7. **Sort History**: Remember recently used sort orders

## Configuration

### LLM Requirements
- Requires OpenAI-compatible API
- Must support embeddings endpoint
- Model: `text-embedding-3-small` (or compatible)

### User Configuration
- Set in Settings → Jira Configuration
- `userEmail` field used for owner detection
- No additional setup required for embeddings

## Performance Considerations

- **Initial Sort**: May take 2-5 seconds for 100+ tickets with embeddings
- **Subsequent Sorts**: Near-instant with caching
- **Memory Usage**: ~1KB per ticket for embeddings
- **API Costs**: ~$0.0001 per ticket for embeddings (one-time)

## Error Handling

- Falls back to simple sorting if embedding generation fails
- Logs errors to console for debugging
- Gracefully handles missing data
- Does not block UI on errors

## Testing

To test the implementation:

1. **Default Order**: Assign some tickets to yourself, verify they appear first
2. **Related Tickets**: Create tickets with similar descriptions, check if they group together
3. **Other Orders**: Try each sort order and verify correct ordering
4. **Settings**: Change default order in settings, verify it persists

## Notes

- Embedding generation requires LLM API configuration
- First sort with embeddings will be slower (generating embeddings)
- Embedding cache is cleared on page refresh
- Works with all existing ticket types and filters

