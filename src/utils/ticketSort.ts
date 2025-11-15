import { JiraTicket, SortOrder } from '../types';
import { llmService } from '../services/llm';
import { db } from '../services/database';

interface TicketWithScore extends JiraTicket {
  _sortScore?: number;
  _embedding?: number[];
}

// In-memory cache for embeddings within a session (for performance)
const embeddingCache = new Map<string, number[]>();

/**
 * Get or generate embedding for a ticket
 * Priority: 1) Memory cache, 2) Database, 3) Generate new
 */
async function getTicketEmbedding(ticket: JiraTicket): Promise<number[]> {
  const cacheKey = ticket.id;
  
  // Check memory cache first
  if (embeddingCache.has(cacheKey)) {
    return embeddingCache.get(cacheKey)!;
  }

  // Check if ticket already has embedding (from database)
  if (ticket.embedding && Array.isArray(ticket.embedding)) {
    embeddingCache.set(cacheKey, ticket.embedding);
    return ticket.embedding;
  }

  // Check database for stored embedding
  const storedEmbedding = await db.getTicketEmbedding(ticket.id);
  if (storedEmbedding) {
    embeddingCache.set(cacheKey, storedEmbedding);
    return storedEmbedding;
  }

  // Generate new embedding
  const text = llmService.getTicketText(ticket);
  const embedding = await llmService.generateEmbedding(text);
  
  // Cache in memory
  embeddingCache.set(cacheKey, embedding);
  
  // Save to database for persistence
  try {
    await db.saveTicketEmbedding(ticket.id, embedding);
  } catch (error) {
    console.error('Failed to save embedding to database:', error);
    // Continue anyway - we have it in memory cache
  }
  
  return embedding;
}

/**
 * Batch generate embeddings for multiple tickets in parallel
 * Uses controlled concurrency to avoid rate limits
 */
async function batchGenerateEmbeddings(
  tickets: JiraTicket[],
  batchSize: number = 20,
  concurrency: number = 3
): Promise<Map<string, number[]>> {
  const results = new Map<string, number[]>();
  
  // Filter tickets that need embeddings
  const ticketsNeedingEmbeddings: JiraTicket[] = [];
  const ticketTexts: string[] = [];
  
  for (const ticket of tickets) {
    // Check if already cached or in ticket object
    if (embeddingCache.has(ticket.id)) {
      results.set(ticket.id, embeddingCache.get(ticket.id)!);
      continue;
    }
    
    if (ticket.embedding && Array.isArray(ticket.embedding)) {
      embeddingCache.set(ticket.id, ticket.embedding);
      results.set(ticket.id, ticket.embedding);
      continue;
    }
    
    // Check database
    const storedEmbedding = await db.getTicketEmbedding(ticket.id);
    if (storedEmbedding) {
      embeddingCache.set(ticket.id, storedEmbedding);
      results.set(ticket.id, storedEmbedding);
      continue;
    }
    
    // Needs new embedding
    ticketsNeedingEmbeddings.push(ticket);
    ticketTexts.push(llmService.getTicketText(ticket));
  }
  
  if (ticketsNeedingEmbeddings.length === 0) {
    return results;
  }
  
  console.log(`Generating embeddings for ${ticketsNeedingEmbeddings.length} tickets in parallel...`);
  
  // Process in batches with controlled concurrency
  const batches: Array<{ tickets: JiraTicket[]; texts: string[] }> = [];
  for (let i = 0; i < ticketsNeedingEmbeddings.length; i += batchSize) {
    batches.push({
      tickets: ticketsNeedingEmbeddings.slice(i, i + batchSize),
      texts: ticketTexts.slice(i, i + batchSize),
    });
  }
  
  // Process batches with concurrency control
  const processBatch = async (batch: { tickets: JiraTicket[]; texts: string[] }) => {
    try {
      const embeddings = await llmService.generateEmbeddingsBatch(batch.texts);
      
      // Store embeddings
      for (let i = 0; i < batch.tickets.length; i++) {
        const ticket = batch.tickets[i];
        const embedding = embeddings[i];
        
        // Cache in memory
        embeddingCache.set(ticket.id, embedding);
        results.set(ticket.id, embedding);
        
        // Save to database (async, don't wait)
        db.saveTicketEmbedding(ticket.id, embedding).catch(error => {
          console.error(`Failed to save embedding for ${ticket.key}:`, error);
        });
      }
      
      return batch.tickets.length;
    } catch (error) {
      console.error('Batch embedding generation failed:', error);
      // Fall back to individual generation for this batch
      const fallbackResults = await Promise.all(
        batch.tickets.map(async (ticket) => {
          try {
            const embedding = await getTicketEmbedding(ticket);
            results.set(ticket.id, embedding);
            return 1;
          } catch (err) {
            console.error(`Failed to generate embedding for ${ticket.key}:`, err);
            return 0;
          }
        })
      );
      return fallbackResults.reduce((sum: number, count) => sum + count, 0);
    }
  };
  
  // Execute batches with controlled concurrency
  let completed = 0;
  for (let i = 0; i < batches.length; i += concurrency) {
    const currentBatches = batches.slice(i, i + concurrency);
    const counts = await Promise.all(currentBatches.map(processBatch));
    completed += counts.reduce((sum, count) => sum + count, 0);
    console.log(`Generated ${completed}/${ticketsNeedingEmbeddings.length} embeddings...`);
  }
  
  console.log(`✅ Completed generating ${completed} embeddings`);
  
  return results;
}

/**
 * Find tickets related to a given ticket using embeddings
 * @unused - Reserved for future feature implementation
 */
// @ts-expect-error - Reserved for future feature, intentionally unused
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function findRelatedTickets(
  ticket: JiraTicket,
  allTickets: JiraTicket[],
  threshold: number = 0.7
): Promise<JiraTicket[]> {
  try {
    const ticketEmbedding = await getTicketEmbedding(ticket);
    const relatedTickets: Array<{ ticket: JiraTicket; similarity: number }> = [];

    for (const otherTicket of allTickets) {
      if (otherTicket.id === ticket.id) continue;
      
      const otherEmbedding = await getTicketEmbedding(otherTicket);
      const similarity = llmService.cosineSimilarity(ticketEmbedding, otherEmbedding);
      
      if (similarity >= threshold) {
        relatedTickets.push({ ticket: otherTicket, similarity });
      }
    }

    return relatedTickets
      .sort((a, b) => b.similarity - a.similarity)
      .map(r => r.ticket);
  } catch (error) {
    console.error('Error finding related tickets:', error);
    return [];
  }
}

/**
 * Check if a user identifier matches a ticket's assignee or reporter
 * Supports matching by email, username, or partial display name
 * Priority: Checks assignee first, then reporter (if assignee doesn't match)
 */
function isUserMatch(userIdentifier: string, ticket: JiraTicket): boolean {
  if (!userIdentifier) return false;
  
  const lowerIdentifier = userIdentifier.toLowerCase();
  
  // PRIORITY 1: Check assignee matches first
  if (ticket.assigneeEmail && ticket.assigneeEmail.toLowerCase() === lowerIdentifier) {
    return true;
  }
  if (ticket.assignee) {
    const lowerAssignee = ticket.assignee.toLowerCase();
    // Match by display name or if identifier is part of display name
    if (lowerAssignee === lowerIdentifier || lowerAssignee.includes(lowerIdentifier) || lowerIdentifier.includes(lowerAssignee)) {
      return true;
    }
  }
  
  // PRIORITY 2: Only check reporter if assignee didn't match
  if (ticket.reporterEmail && ticket.reporterEmail.toLowerCase() === lowerIdentifier) {
    return true;
  }
  if (ticket.reporter) {
    const lowerReporter = ticket.reporter.toLowerCase();
    // Match by display name or if identifier is part of display name
    if (lowerReporter === lowerIdentifier || lowerReporter.includes(lowerIdentifier) || lowerIdentifier.includes(lowerReporter)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Sort tickets using the default order:
 * 1. Tickets assigned to or reported by the owner (user)
 * 2. Tickets related to owner's tickets (by embeddings)
 * 3. Parent tickets with children (by date)
 * 4. Orphan tickets (by date)
 */
async function sortByDefault(
  tickets: JiraTicket[],
  ownerIdentifier?: string,
  llmConfig?: any
): Promise<JiraTicket[]> {
  const sorted: TicketWithScore[] = [];
  const ownerTickets = new Set<string>();
  const relatedTickets = new Set<string>();
  const parentTickets = new Set<string>();
  
  // Step 1: Find tickets owned by the user (assignee or reporter)
  const ownerTicketsList: TicketWithScore[] = [];
  tickets.forEach(ticket => {
    if (ownerIdentifier && isUserMatch(ownerIdentifier, ticket)) {
      ownerTickets.add(ticket.id);
      ownerTicketsList.push({ ...ticket, _sortScore: 1000000 });
    }
  });
  
  // Sort owner tickets by updated date
  ownerTicketsList.sort((a, b) => 
    new Date(b.updated).getTime() - new Date(a.updated).getTime()
  );
  sorted.push(...ownerTicketsList);

  // Step 2: Find tickets related to owner's tickets using embeddings
  const relatedTicketsList: TicketWithScore[] = [];
  if (ownerTicketsList.length > 0 && ownerTicketsList.length <= 20 && llmConfig?.apiKey) {
    // Only try embeddings if we have a reasonable number of owner tickets AND LLM is configured
    try {
      // Configure LLM service before using embeddings
      llmService.configure(llmConfig);
      
      // Pre-generate embeddings in batch for all tickets (parallelized)
      console.log('Pre-generating embeddings in parallel...');
      const embeddingsMap = await batchGenerateEmbeddings(tickets);
      
      // Now find related tickets using the pre-generated embeddings
      for (const ownerTicket of ownerTicketsList) {
        try {
          const ownerEmbedding = embeddingsMap.get(ownerTicket.id);
          if (!ownerEmbedding) continue;
          
          const related: Array<{ ticket: JiraTicket; similarity: number }> = [];
          const nonOwnerTickets = tickets.filter(t => !ownerTickets.has(t.id));
          
          for (const otherTicket of nonOwnerTickets) {
            const otherEmbedding = embeddingsMap.get(otherTicket.id);
            if (!otherEmbedding) continue;
            
            const similarity = llmService.cosineSimilarity(ownerEmbedding, otherEmbedding);
            
            if (similarity >= 0.75) {
              related.push({ ticket: otherTicket, similarity });
            }
          }
          
          // Add related tickets
          related
            .sort((a, b) => b.similarity - a.similarity)
            .forEach(({ ticket }) => {
              if (!relatedTickets.has(ticket.id) && !ownerTickets.has(ticket.id)) {
                relatedTickets.add(ticket.id);
                relatedTicketsList.push({ ...ticket, _sortScore: 100000 });
              }
            });
        } catch (innerError) {
          console.warn(`Failed to find related tickets for ${ownerTicket.key}:`, innerError);
          // Continue with other tickets
        }
      }
      
      // Sort related tickets by updated date
      relatedTicketsList.sort((a, b) => 
        new Date(b.updated).getTime() - new Date(a.updated).getTime()
      );
      sorted.push(...relatedTicketsList);
    } catch (error) {
      console.error('Error processing related tickets (continuing without embeddings):', error);
      // If embeddings fail entirely, just skip this step
    }
  } else if (ownerTicketsList.length > 20) {
    console.log('Too many owner tickets for embedding analysis, skipping related tickets step');
  } else if (!llmConfig?.apiKey) {
    console.log('LLM not configured, skipping embedding-based related tickets step');
  }

  // Step 3: Find parent tickets with children
  const parentTicketsList: TicketWithScore[] = [];
  tickets.forEach(ticket => {
    const hasChildren = tickets.some(t => t.parentId === ticket.id);
    if (hasChildren && !ownerTickets.has(ticket.id) && !relatedTickets.has(ticket.id)) {
      parentTickets.add(ticket.id);
      parentTicketsList.push({ ...ticket, _sortScore: 10000 });
    }
  });
  
  // Sort parent tickets by created date (newest first)
  parentTicketsList.sort((a, b) => 
    new Date(b.created).getTime() - new Date(a.created).getTime()
  );
  sorted.push(...parentTicketsList);

  // Step 4: Add remaining tickets (orphans)
  const orphanTicketsList: TicketWithScore[] = [];
  tickets.forEach(ticket => {
    if (
      !ownerTickets.has(ticket.id) &&
      !relatedTickets.has(ticket.id) &&
      !parentTickets.has(ticket.id)
    ) {
      orphanTicketsList.push({ ...ticket, _sortScore: 1 });
    }
  });
  
  // Sort orphans by created date (newest first)
  orphanTicketsList.sort((a, b) => 
    new Date(b.created).getTime() - new Date(a.created).getTime()
  );
  sorted.push(...orphanTicketsList);

  return sorted;
}

/**
 * Sort tickets alphabetically by key
 */
function sortAlphabetically(tickets: JiraTicket[]): JiraTicket[] {
  return [...tickets].sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * Sort tickets by creation date (newest first)
 */
function sortByCreated(tickets: JiraTicket[]): JiraTicket[] {
  return [...tickets].sort((a, b) => 
    new Date(b.created).getTime() - new Date(a.created).getTime()
  );
}

/**
 * Sort tickets by update date (newest first)
 */
function sortByUpdated(tickets: JiraTicket[]): JiraTicket[] {
  return [...tickets].sort((a, b) => 
    new Date(b.updated).getTime() - new Date(a.updated).getTime()
  );
}

/**
 * Sort tickets by status
 */
function sortByStatus(tickets: JiraTicket[]): JiraTicket[] {
  const statusOrder: Record<string, number> = {
    'To Do': 1,
    'In Progress': 2,
    'In Review': 3,
    'Done': 4,
  };

  return [...tickets].sort((a, b) => {
    const aOrder = statusOrder[a.status] || 999;
    const bOrder = statusOrder[b.status] || 999;
    
    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }
    
    // If same status, sort by updated date
    return new Date(b.updated).getTime() - new Date(a.updated).getTime();
  });
}

/**
 * Sort tickets by priority
 */
function sortByPriority(tickets: JiraTicket[]): JiraTicket[] {
  const priorityOrder: Record<string, number> = {
    'Highest': 1,
    'High': 2,
    'Medium': 3,
    'Low': 4,
    'Lowest': 5,
  };

  return [...tickets].sort((a, b) => {
    const aPriority = a.priority ? priorityOrder[a.priority] || 999 : 999;
    const bPriority = b.priority ? priorityOrder[b.priority] || 999 : 999;
    
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }
    
    // If same priority, sort by updated date
    return new Date(b.updated).getTime() - new Date(a.updated).getTime();
  });
}

/**
 * Sort tickets by assignee name
 */
function sortByAssignee(tickets: JiraTicket[]): JiraTicket[] {
  return [...tickets].sort((a, b) => {
    const aAssignee = a.assignee || 'Unassigned';
    const bAssignee = b.assignee || 'Unassigned';
    
    if (aAssignee !== bAssignee) {
      return aAssignee.localeCompare(bAssignee);
    }
    
    // If same assignee, sort by updated date
    return new Date(b.updated).getTime() - new Date(a.updated).getTime();
  });
}

/**
 * Main sorting function that handles all sort orders
 */
export async function sortTickets(
  tickets: JiraTicket[],
  sortOrder: SortOrder,
  ownerIdentifier?: string,
  llmConfig?: any
): Promise<JiraTicket[]> {
  if (tickets.length === 0) return [];

  switch (sortOrder) {
    case 'default':
      return await sortByDefault(tickets, ownerIdentifier, llmConfig);
    case 'alphabetical':
      return sortAlphabetically(tickets);
    case 'created':
      return sortByCreated(tickets);
    case 'updated':
      return sortByUpdated(tickets);
    case 'status':
      return sortByStatus(tickets);
    case 'priority':
      return sortByPriority(tickets);
    case 'assignee':
      return sortByAssignee(tickets);
    default:
      return tickets;
  }
}

/**
 * Clear the embedding cache (useful when tickets are updated)
 */
export function clearEmbeddingCache(): void {
  embeddingCache.clear();
}

/**
 * Export batch embedding generation for external use
 * Generates embeddings for multiple tickets in parallel with controlled concurrency
 */
export { batchGenerateEmbeddings };

/**
 * Check if the similarity/embedding feature is available
 * Returns an object with availability status and a message
 */
export async function checkSimilarityFeatureAvailability(llmConfig?: any): Promise<{
  available: boolean;
  message: string;
}> {
  try {
    // First check if we have LLM config
    if (!llmConfig || !llmConfig.apiKey) {
      return {
        available: false,
        message: "⚠️ LLM not configured. Configure in Settings to enable AI-powered similarity matching."
      };
    }

    // Configure the LLM service with the provided config
    llmService.configure(llmConfig);
    
    // Try to generate a test embedding
    const testText = "Test ticket for similarity feature check";
    await llmService.generateEmbedding(testText);
    
    return {
      available: true,
      message: "✓ Smart similarity matching is enabled! Related tickets will be found using AI."
    };
  } catch (error: any) {
    const errorMessage = error?.message || 'Unknown error';
    
    if (errorMessage.includes('not configured')) {
      return {
        available: false,
        message: "⚠️ LLM not configured. Configure in Settings to enable AI-powered similarity matching."
      };
    } else if (errorMessage.includes('authentication failed') || errorMessage.includes('API key')) {
      return {
        available: false,
        message: "⚠️ LLM authentication failed. Please check your API key in Settings."
      };
    } else if (errorMessage.includes('rate limit')) {
      return {
        available: false,
        message: "⚠️ LLM rate limit exceeded. Similarity matching temporarily unavailable."
      };
    } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return {
        available: false,
        message: "⚠️ Network error connecting to LLM. Similarity matching unavailable."
      };
    }
    
    return {
      available: false,
      message: `⚠️ Similarity matching unavailable: ${errorMessage}`
    };
  }
}

