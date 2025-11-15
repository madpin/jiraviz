import { useMemo, useState, useEffect } from 'react';
import { JiraTicket, TicketTreeNode, SortOrder, TicketFilters } from '../types';
import { Circle, ChevronDown, ChevronRight, MessageSquare, Info, Sparkles } from 'lucide-react';
import { OrphanTicketsTable } from './OrphanTicketsTable';
import { usePreferences } from '../hooks/usePreferences';
import { sortTickets, checkSimilarityFeatureAvailability } from '../utils/ticketSort';
import { useConfig } from '../hooks/useConfig';
import { isDateInRange, getTimeAgo } from '../utils/dateUtils';
import { db } from '../services/database';

interface VisualTreeViewProps {
  tickets: JiraTicket[];
  selectedTicket: JiraTicket | null;
  onSelectTicket: (ticket: JiraTicket) => void;
  filters: TicketFilters;
}

export function VisualTreeView({ tickets, selectedTicket, onSelectTicket, filters }: VisualTreeViewProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const { preferences } = usePreferences();
  const { config } = useConfig();
  const [currentSortOrder, setCurrentSortOrder] = useState<SortOrder>(preferences.dataDisplay.defaultSortOrder);
  const [sortedTickets, setSortedTickets] = useState<JiraTicket[]>([]);
  const [isSorting, setIsSorting] = useState(false);
  const [sortError, setSortError] = useState<string | null>(null);
  const [similarityStatus, setSimilarityStatus] = useState<{ available: boolean; message: string } | null>(null);
  const [checkingSimilarity, setCheckingSimilarity] = useState(false);
  const [parentSummaries, setParentSummaries] = useState<Map<string, string>>(new Map());
  const [generatingSummaries, setGeneratingSummaries] = useState<Set<string>>(new Set());

  // Apply filters with parent chain inclusion
  const filteredTickets = useMemo(() => {
    if (!filters || Object.keys(filters).length === 0) {
      return tickets;
    }

    // Find tickets that match filter criteria
    const matchingTickets = tickets.filter(ticket => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matches = ticket.summary.toLowerCase().includes(searchLower) ||
                       ticket.key.toLowerCase().includes(searchLower) ||
                       (ticket.description && ticket.description.toLowerCase().includes(searchLower));
        if (!matches) return false;
      }

      // Assignee filter
      if (filters.assignee && filters.assignee.length > 0) {
        if (!ticket.assignee || !filters.assignee.includes(ticket.assignee)) return false;
      }

      // Reporter filter
      if (filters.reporter && filters.reporter.length > 0) {
        if (!ticket.reporter || !filters.reporter.includes(ticket.reporter)) return false;
      }

      // Status filter
      if (filters.status && filters.status.length > 0) {
        if (!filters.status.includes(ticket.status)) return false;
      }

      // Date filter
      if (filters.dateFrom || filters.dateTo) {
        const dateField = filters.dateField || 'updated';
        const dateToCheck = dateField === 'updated' ? ticket.updated : ticket.created;
        if (!isDateInRange(dateToCheck, filters.dateFrom, filters.dateTo)) return false;
      }

      // Min comments filter
      if (filters.minComments !== undefined && filters.minComments > 0) {
        const commentCount = ticket.comments?.length || 0;
        if (commentCount < filters.minComments) return false;
      }

      // Component filter
      if (filters.component && filters.component.length > 0) {
        const hasMatchingComponent = ticket.components.some(comp => filters.component?.includes(comp));
        if (!hasMatchingComponent) return false;
      }

      return true;
    });

    // Build a set of ticket IDs to include (matching + their parent chains)
    const ticketsToInclude = new Set<string>();
    const ticketMapById = new Map(tickets.map(t => [t.id, t]));
    const ticketMapByKey = new Map(tickets.map(t => [t.key, t]));

    matchingTickets.forEach(ticket => {
      ticketsToInclude.add(ticket.id);

      // Traverse up parent chain
      let currentTicket = ticket;
      while (currentTicket.parentId || currentTicket.parentKey) {
        const parent = currentTicket.parentId
          ? ticketMapById.get(currentTicket.parentId)
          : currentTicket.parentKey
            ? ticketMapByKey.get(currentTicket.parentKey)
            : null;

        if (!parent) break;
        ticketsToInclude.add(parent.id);
        currentTicket = parent;
      }
    });

    return tickets.filter(t => ticketsToInclude.has(t.id));
  }, [tickets, filters]);

  // Function to calculate aggregated comment count (including all descendants)
  const calculateCommentCount = (ticket: JiraTicket, allTickets: JiraTicket[]): { own: number; total: number } => {
    const own = ticket.comments?.length || 0;
    
    // Recursively count comments from children
    const countChildrenComments = (ticketId: string, ticketKey: string): number => {
      const children = allTickets.filter(t => t.parentId === ticketId || t.parentKey === ticketKey);
      let count = 0;
      
      for (const child of children) {
        count += (child.comments?.length || 0);
        count += countChildrenComments(child.id, child.key);
      }
      
      return count;
    };
    
    const childrenComments = countChildrenComments(ticket.id, ticket.key);
    
    return {
      own,
      total: own + childrenComments
    };
  };

  // Function to find all parent IDs for a given ticket
  const findParentPath = (ticketId: string, ticketsArray: JiraTicket[]): string[] => {
    const path: string[] = [];
    const ticketMapById = new Map(ticketsArray.map(t => [t.id, t]));
    const ticketMapByKey = new Map(ticketsArray.map(t => [t.key, t]));
    
    let currentTicket = ticketMapById.get(ticketId);
    while (currentTicket && (currentTicket.parentId || currentTicket.parentKey)) {
      // Try to find parent by ID first, then by Key
      const parent = currentTicket.parentId
        ? ticketMapById.get(currentTicket.parentId)
        : currentTicket.parentKey
          ? ticketMapByKey.get(currentTicket.parentKey)
          : null;
      
      if (!parent) break;
      
      path.push(parent.id);
      currentTicket = parent;
    }
    
    return path;
  };

  // Check similarity feature availability when Smart Order is selected
  useEffect(() => {
    const checkFeature = async () => {
      if (currentSortOrder === 'default') {
        setCheckingSimilarity(true);
        const status = await checkSimilarityFeatureAvailability(config?.llm);
        setSimilarityStatus(status);
        setCheckingSimilarity(false);
      } else {
        setSimilarityStatus(null);
      }
    };

    checkFeature();
  }, [currentSortOrder, config?.llm]);

  // Sort tickets when tickets or sort order changes
  useEffect(() => {
    const applySorting = async () => {
      setIsSorting(true);
      setSortError(null);
      try {
        const sorted = await sortTickets(
          filteredTickets,
          currentSortOrder,
          config?.jira?.userEmail,
          config?.llm
        );
        setSortedTickets(sorted);
      } catch (error: any) {
        console.error('Error sorting tickets:', error);
        const errorMessage = error?.message || 'Unknown error';
        setSortError(errorMessage);
        
        // Fallback to unsorted tickets
        setSortedTickets(filteredTickets);
        
        // If default sort failed, switch to 'updated' as fallback
        if (currentSortOrder === 'default') {
          console.log('Smart sort failed, falling back to "updated" sort order');
          console.log('Error was:', errorMessage);
          setCurrentSortOrder('updated');
        }
      } finally {
        setIsSorting(false);
      }
    };

    if (filteredTickets.length > 0) {
      applySorting();
    } else {
      setSortedTickets([]);
    }
  }, [filteredTickets, currentSortOrder, config?.jira?.userEmail, config?.llm]);

  // Auto-expand tree when a ticket is selected
  useEffect(() => {
    if (selectedTicket) {
      const parentPath = findParentPath(selectedTicket.id, sortedTickets);
      if (parentPath.length > 0) {
        setExpandedNodes(prev => {
          const next = new Set(prev);
          parentPath.forEach(parentId => next.add(parentId));
          // Also expand the selected ticket itself if it has children
          next.add(selectedTicket.id);
          return next;
        });
      }
    }
  }, [selectedTicket, sortedTickets]);

  // Load parent summaries from cache
  useEffect(() => {
    const loadSummaries = async () => {
      const summaries = new Map<string, string>();
      for (const ticket of sortedTickets) {
        const hasChildren = sortedTickets.some(t => t.parentId === ticket.id || t.parentKey === ticket.key);
        if (hasChildren) {
          const cached = await db.getParentSummary(ticket.id);
          if (cached) {
            summaries.set(ticket.id, cached.summary);
          }
        }
      }
      setParentSummaries(summaries);
    };

    if (sortedTickets.length > 0) {
      loadSummaries();
    }
  }, [sortedTickets]);

  const { treeData, orphans } = useMemo(() => {
    const ticketMap = new Map<string, TicketTreeNode>();
    const ticketMapByKey = new Map<string, TicketTreeNode>();
    const rootNodes: TicketTreeNode[] = [];
    const orphanTickets: JiraTicket[] = [];

    // First pass: create all nodes and build lookup maps
    sortedTickets.forEach((ticket) => {
      const node = {
        ...ticket,
        children: [],
        isExpanded: expandedNodes.has(ticket.id),
      };
      ticketMap.set(ticket.id, node);
      ticketMapByKey.set(ticket.key, node);
    });

    // Second pass: build tree structure
    sortedTickets.forEach((ticket) => {
      const node = ticketMap.get(ticket.id)!;
      
      // Try to find parent by ID first, then by Key
      let parent: TicketTreeNode | undefined;
      if (ticket.parentId) {
        parent = ticketMap.get(ticket.parentId);
      } else if (ticket.parentKey) {
        parent = ticketMapByKey.get(ticket.parentKey);
      }
      
      if (parent) {
        // Has a parent that exists in our dataset - add as child
        parent.children.push(node);
      } else if (!ticket.parentId && !ticket.parentKey) {
        // No parent reference - this is a root-level ticket
        // Show in tree if it's a hierarchical type OR has children
        const hasChildren = sortedTickets.some(t => 
          t.parentId === ticket.id || t.parentKey === ticket.key
        );
        const isHierarchicalType = ['Initiative', 'Epic', 'Story', 'Feature'].some(
          type => ticket.issueType.toLowerCase().includes(type.toLowerCase())
        );
        
        // Apply hideEmptyParents filter
        if (filters.hideEmptyParents && (isHierarchicalType || ticket.issueType.toLowerCase().includes('epic'))) {
          // Only include if it has children
          if (hasChildren) {
            rootNodes.push(node);
          } else {
            orphanTickets.push(ticket);
          }
        } else if (hasChildren || isHierarchicalType) {
          rootNodes.push(node);
        } else {
          // Tasks/bugs without parents or children are orphans
          orphanTickets.push(ticket);
        }
      } else {
        // Has parent reference but parent doesn't exist in our dataset - this is an orphan
        orphanTickets.push(ticket);
      }
    });

    return { treeData: rootNodes, orphans: orphanTickets };
  }, [sortedTickets, expandedNodes, filters.hideEmptyParents]);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const getStatusColor = (statusCategory: string) => {
    switch (statusCategory.toLowerCase()) {
      case 'done':
        return 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-800 dark:text-green-200';
      case 'indeterminate':
        return 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200';
      case 'new':
      case 'todo':
        return 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200';
      default:
        return 'bg-gray-100 dark:bg-gray-800/30 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200';
    }
  };

  const getStatusDotColor = (statusCategory: string) => {
    switch (statusCategory.toLowerCase()) {
      case 'done':
        return 'text-green-600 dark:text-green-400';
      case 'indeterminate':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'new':
      case 'todo':
        return 'text-blue-600 dark:text-neon-cyan';
      default:
        return 'text-gray-600 dark:text-gray-300';
    }
  };

  const getIssueTypeIcon = (issueType: string) => {
    if (!preferences.dataDisplay.showIcons) return null;
    const type = issueType.toLowerCase();
    if (type.includes('initiative')) return '🎯';
    if (type.includes('epic')) return '📚';
    if (type.includes('story')) return '📖';
    if (type.includes('task')) return '✓';
    if (type.includes('bug')) return '🐛';
    if (type.includes('subtask')) return '◦';
    return '•';
  };

  const getDensityClasses = () => {
    switch (preferences.visual.density) {
      case 'compact':
        return 'p-2';
      case 'spacious':
        return 'p-6';
      default:
        return 'p-4';
    }
  };

  const renderTreeNode = (node: TicketTreeNode, depth: number = 0) => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const isSelected = selectedTicket?.id === node.id;
    
    // Calculate comment counts
    const commentCounts = calculateCommentCount(node as JiraTicket, sortedTickets);
    const hasComments = commentCounts.total > 0;
    const hasChildComments = commentCounts.total > commentCounts.own;

    const parentSummary = parentSummaries.get(node.id);
    const isGeneratingSummary = generatingSummaries.has(node.id);

    const handleGenerateSummary = async (e: React.MouseEvent) => {
      e.stopPropagation();
      setGeneratingSummaries(prev => new Set(prev).add(node.id));
      
      try {
        const children = sortedTickets.filter(t => t.parentId === node.id || t.parentKey === node.key);
        
        // Use the llmService directly
        const { llmService } = await import('../services/llm');
        if (config?.llm) {
          llmService.configure(config.llm);
          const summary = await llmService.summarizeChildren(node as JiraTicket, children);
          
          // Save to cache
          const cache = {
            parentId: node.id,
            summary,
            childrenIds: children.map(c => c.id).sort(),
            createdAt: new Date().toISOString(),
          };
          await db.saveParentSummary(cache);
          
          // Update state
          setParentSummaries(prev => new Map(prev).set(node.id, summary));
        }
      } catch (error) {
        console.error('Failed to generate summary:', error);
      } finally {
        setGeneratingSummaries(prev => {
          const next = new Set(prev);
          next.delete(node.id);
          return next;
        });
      }
    };

    return (
      <div key={node.id} className="relative animate-fade-in">
        {/* Card */}
        <div className="flex items-start gap-3 mb-4">
          {/* Vertical line for non-root nodes */}
          {depth > 0 && (
            <div 
              className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-300 dark:bg-dark-border smooth-transition" 
              style={{ left: `${depth * 48 - 18}px` }} 
            />
          )}
          
          {/* Horizontal connecting line */}
          {depth > 0 && (
            <div 
              className="absolute top-6 w-6 h-0.5 bg-gray-300 dark:bg-dark-border smooth-transition" 
              style={{ left: `${depth * 48 - 18}px` }}
            />
          )}

          <div style={{ marginLeft: `${depth * 48}px` }} className="flex-1">
            <div
              onClick={() => {
                onSelectTicket(node as JiraTicket);
                // Toggle expansion if it has children
                if (hasChildren) {
                  toggleNode(node.id);
                }
              }}
              className={`
                relative border-2 rounded-lg ${getDensityClasses()} shadow-sm hover:shadow-lg smooth-transition cursor-pointer
                ${isSelected 
                  ? 'ring-2 ring-blue-400 dark:ring-neon-cyan border-blue-400 dark:border-neon-cyan shadow-glow-cyan' 
                  : 'border-gray-300 dark:border-dark-border hover:border-gray-400 dark:hover:border-gray-500'}
                ${getStatusColor(node.statusCategory)}
              `}
            >
              {/* Expand/collapse button */}
              {hasChildren && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleNode(node.id);
                  }}
                  className="absolute -left-3 top-1/2 -translate-y-1/2 bg-white dark:bg-dark-card border-2 border-gray-300 dark:border-dark-border rounded-full p-1 hover:bg-gray-50 dark:hover:bg-dark-surface smooth-transition shadow-md"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                  )}
                </button>
              )}

              {/* Card content */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {getIssueTypeIcon(node.issueType) && (
                    <span className="text-xl">{getIssueTypeIcon(node.issueType)}</span>
                  )}
                  <span className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">{node.key}</span>
                  <Circle className={`w-2 h-2 fill-current ${getStatusDotColor(node.statusCategory)}`} />
                  <span className="text-xs px-2 py-0.5 bg-white dark:bg-dark-surface bg-opacity-60 dark:bg-opacity-60 rounded smooth-transition">
                    {node.status}
                  </span>
                  
                  {/* Comment count badge */}
                  {hasComments && (
                    <span 
                      className="flex items-center gap-1 text-xs px-2 py-0.5 bg-white dark:bg-dark-surface bg-opacity-80 dark:bg-opacity-80 rounded border border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300"
                      title={hasChildComments 
                        ? `${commentCounts.own} comment(s) on this ticket, ${commentCounts.total} total including children`
                        : `${commentCounts.own} comment(s)`
                      }
                    >
                      <MessageSquare className="w-3 h-3" />
                      {hasChildComments ? (
                        <span>{commentCounts.own}/{commentCounts.total}</span>
                      ) : (
                        <span>{commentCounts.own}</span>
                      )}
                    </span>
                  )}

                  {/* Children summary button - in header row */}
                  {hasChildren && (
                    <button
                      onClick={handleGenerateSummary}
                      disabled={isGeneratingSummary}
                      className="ml-auto flex items-center gap-1 px-2 py-0.5 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded border border-purple-200 dark:border-purple-700 hover:bg-purple-200 dark:hover:bg-purple-900/50 disabled:opacity-50 smooth-transition"
                      title={parentSummary ? 'Regenerate children summary' : 'Generate children summary'}
                    >
                      <Sparkles className={`w-3 h-3 ${isGeneratingSummary ? 'animate-pulse' : ''}`} />
                      {isGeneratingSummary ? 'AI...' : parentSummary ? 'Regen' : 'AI'}
                    </button>
                  )}
                </div>
                
                <div className="font-medium text-sm line-clamp-2 text-gray-900 dark:text-gray-100">{node.summary}</div>
                
                <div className="flex items-center gap-3 flex-wrap text-xs">
                  {preferences.dataDisplay.showAssignee && node.assignee && (
                    <div className="text-gray-600 dark:text-gray-300">
                      👤 Assignee: {node.assignee}
                    </div>
                  )}
                  
                  {preferences.dataDisplay.showReporter && node.reporter && (
                    <div className="text-gray-600 dark:text-gray-300">
                      👨‍💼 Reporter: {node.reporter}
                    </div>
                  )}
                  
                  {preferences.dataDisplay.showLastUpdated && (
                    <div className="text-gray-500 dark:text-gray-400">
                      📅 {getTimeAgo(node.updated)}
                    </div>
                  )}
                </div>
                
                {preferences.dataDisplay.showTicketCounts && hasChildren && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {node.children.length} {node.children.length === 1 ? 'child' : 'children'}
                  </div>
                )}

                {/* Parent Summary Section - Compact Display */}
                {hasChildren && parentSummary && (
                  <div className="mt-2 pt-2 border-t border-gray-200 dark:border-dark-border">
                    <details className="group">
                      <summary className="cursor-pointer flex items-center gap-1 text-xs text-purple-700 dark:text-purple-300 hover:text-purple-900 dark:hover:text-purple-100 smooth-transition">
                        <Sparkles className="w-3 h-3" />
                        <span className="font-semibold">AI Summary</span>
                        <ChevronRight className="w-3 h-3 group-open:rotate-90 smooth-transition" />
                      </summary>
                      <div className="mt-2 bg-purple-50 dark:bg-purple-900/20 p-2 rounded border border-purple-200 dark:border-purple-700">
                        <p className="text-xs text-purple-800 dark:text-purple-200 leading-relaxed whitespace-pre-wrap">
                          {parentSummary}
                        </p>
                      </div>
                    </details>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Children */}
        {isExpanded && hasChildren && (
          <div className="relative">
            {node.children.map((child) => 
              renderTreeNode(child, depth + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  const sortOrderOptions: { value: SortOrder; label: string }[] = [
    { value: 'default', label: 'Smart Order (Owner → Related → Parents)' },
    { value: 'alphabetical', label: 'Alphabetical (A-Z)' },
    { value: 'created', label: 'Created Date (Newest)' },
    { value: 'updated', label: 'Updated Date (Newest)' },
    { value: 'status', label: 'Status' },
    { value: 'priority', label: 'Priority' },
    { value: 'assignee', label: 'Assignee' },
  ];

  return (
    <>
      {/* Sort Order Controls */}
      <div className="px-6 pt-4 pb-2 space-y-3">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Sort by:
          </label>
          <select
            value={currentSortOrder}
            onChange={(e) => setCurrentSortOrder(e.target.value as SortOrder)}
            disabled={isSorting}
            className="px-3 py-2 text-sm bg-white dark:bg-dark-surface border border-gray-300 dark:border-dark-border rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-neon-cyan focus:border-transparent smooth-transition disabled:opacity-50"
          >
            {sortOrderOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {isSorting && (
            <span className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">
              Sorting...
            </span>
          )}
          {sortError && (
            <span className="text-xs text-red-600 dark:text-red-400" title={sortError}>
              ⚠️ Sort error (using fallback)
            </span>
          )}
        </div>

        {/* Similarity Feature Status - only show for Smart Order */}
        {currentSortOrder === 'default' && (
          <div className="animate-fade-in">
            {checkingSimilarity ? (
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-dark-surface px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-border">
                <Info className="w-4 h-4 animate-pulse" />
                <span>Checking similarity feature availability...</span>
              </div>
            ) : similarityStatus && (
              <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${
                similarityStatus.available
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
                  : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
              }`}>
                <Info className="w-4 h-4 flex-shrink-0" />
                <span>{similarityStatus.message}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tree Section */}
      <div className={`${getDensityClasses()} space-y-6`}>
        {treeData.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-300">
            <p>No hierarchical tickets found</p>
            <p className="text-sm mt-2">Initiatives and Epics will appear here</p>
          </div>
        ) : (
          treeData.map((node) => renderTreeNode(node, 0))
        )}
      </div>
      
      {/* Orphan Tickets Section */}
      {orphans.length > 0 && (
        <div className="px-6 pb-6">
          <OrphanTicketsTable
            tickets={orphans}
            selectedTicket={selectedTicket}
            onSelectTicket={onSelectTicket}
            sortOrder={currentSortOrder}
          />
        </div>
      )}
    </>
  );
}
