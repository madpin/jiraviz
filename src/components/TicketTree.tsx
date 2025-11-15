import { useState, useMemo, useEffect } from 'react';
import { JiraTicket, TicketTreeNode } from '../types';
import { ChevronRight, ChevronDown, Circle, Sparkles, MessageSquare } from 'lucide-react';
import { useSummary } from '../hooks/useSummary';
import { usePreferences } from '../hooks/usePreferences';

interface TicketTreeProps {
  tickets: JiraTicket[];
  selectedTicket: JiraTicket | null;
  onSelectTicket: (ticket: JiraTicket) => void;
}

export function TicketTree({ tickets, selectedTicket, onSelectTicket }: TicketTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [showAggregatedSummary, setShowAggregatedSummary] = useState(false);
  const { preferences } = usePreferences();
  
  const { generateAggregatedSummary, isGenerating } = useSummary();
  const [aggregatedSummary, setAggregatedSummary] = useState<string | null>(null);

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

  // Auto-expand tree when a ticket is selected
  useEffect(() => {
    if (selectedTicket) {
      const parentPath = findParentPath(selectedTicket.id, tickets);
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
  }, [selectedTicket, tickets]);

  // Build tree structure
  const treeData = useMemo(() => {
    // First, identify tickets that match the filters
    const matchingTickets = tickets.filter((ticket) => {
      const matchesSearch = !searchQuery || 
        ticket.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.key.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(ticket.status);
      
      return matchesSearch && matchesStatus;
    });

    // Track which tickets directly match filters (for visual differentiation)
    const matchingTicketIds = new Set(matchingTickets.map(t => t.id));
    
    // Create maps of all tickets by ID and by Key for parent chain traversal
    const allTicketsById = new Map(tickets.map(t => [t.id, t]));
    const allTicketsByKey = new Map(tickets.map(t => [t.key, t]));
    
    // Collect all tickets to include: matching tickets + their parent chains
    const ticketsToInclude = new Set<string>();
    const parentsToAutoExpand = new Set<string>();
    
    matchingTickets.forEach(ticket => {
      // Add the matching ticket itself
      ticketsToInclude.add(ticket.id);
      
      // Traverse up the parent chain and add all parents
      let currentTicket = ticket;
      while (currentTicket.parentId || currentTicket.parentKey) {
        // Try to find parent by ID first, then by Key
        const parent = currentTicket.parentId 
          ? allTicketsById.get(currentTicket.parentId)
          : currentTicket.parentKey 
            ? allTicketsByKey.get(currentTicket.parentKey)
            : null;
        
        if (!parent) break;
        
        ticketsToInclude.add(parent.id);
        parentsToAutoExpand.add(parent.id); // Auto-expand parents to show filtered children
        currentTicket = parent;
      }
    });

    // Build the tree with all included tickets
    const ticketMap = new Map<string, TicketTreeNode & { matchesFilter?: boolean }>();
    const ticketMapByKey = new Map<string, TicketTreeNode & { matchesFilter?: boolean }>();
    const rootNodes: (TicketTreeNode & { matchesFilter?: boolean })[] = [];

    // First pass: create all nodes
    ticketsToInclude.forEach((ticketId) => {
      const ticket = allTicketsById.get(ticketId);
      if (!ticket) return;
      
      const node = {
        ...ticket,
        children: [],
        isExpanded: expandedNodes.has(ticket.id) || parentsToAutoExpand.has(ticket.id),
        matchesFilter: matchingTicketIds.has(ticket.id),
      };
      ticketMap.set(ticket.id, node);
      ticketMapByKey.set(ticket.key, node);
    });

    // Second pass: build tree structure
    ticketsToInclude.forEach((ticketId) => {
      const ticket = allTicketsById.get(ticketId);
      if (!ticket) return;
      
      const node = ticketMap.get(ticket.id)!;
      
      // Try to find parent by ID first, then by Key
      let parent: (TicketTreeNode & { matchesFilter?: boolean }) | undefined;
      if (ticket.parentId) {
        parent = ticketMap.get(ticket.parentId);
      } else if (ticket.parentKey) {
        parent = ticketMapByKey.get(ticket.parentKey);
      }
      
      if (parent) {
        parent.children.push(node);
      } else {
        rootNodes.push(node);
      }
    });

    return rootNodes;
  }, [tickets, searchQuery, statusFilter, expandedNodes]);

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
    if (type.includes('epic')) return '📚';
    if (type.includes('story')) return '📖';
    if (type.includes('task')) return '✓';
    if (type.includes('bug')) return '🐛';
    if (type.includes('subtask')) return '◦';
    return '•';
  };

  const uniqueStatuses = useMemo(() => {
    return Array.from(new Set(tickets.map(t => t.status)));
  }, [tickets]);

  const handleGenerateAggregatedSummary = async () => {
    const visibleTickets = searchQuery || statusFilter.length > 0
      ? tickets.filter(t => {
          const matchesSearch = !searchQuery || 
            t.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.key.toLowerCase().includes(searchQuery.toLowerCase());
          const matchesStatus = statusFilter.length === 0 || statusFilter.includes(t.status);
          return matchesSearch && matchesStatus;
        })
      : tickets;

    if (visibleTickets.length === 0) return;

    try {
      const summary = await generateAggregatedSummary(visibleTickets.slice(0, 20)); // Limit to 20 for context
      setAggregatedSummary(summary.content);
      setShowAggregatedSummary(true);
    } catch (error) {
      console.error('Failed to generate summary:', error);
    }
  };

  const renderNode = (node: TicketTreeNode & { matchesFilter?: boolean }, depth: number = 0) => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const isSelected = selectedTicket?.id === node.id;
    const matchesFilter = node.matchesFilter !== false; // Default to true if not specified
    
    // Calculate comment counts
    const commentCounts = calculateCommentCount(node as JiraTicket, tickets);
    const hasComments = commentCounts.total > 0;
    const hasChildComments = commentCounts.total > commentCounts.own;

    return (
      <div key={node.id} className="animate-fade-in">
        <div
          className={`flex items-center gap-2 py-2 px-3 cursor-pointer rounded-lg smooth-transition ${
            isSelected 
              ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-neon-cyan shadow-glow-cyan' 
              : matchesFilter 
                ? 'hover:bg-gray-100 dark:hover:bg-dark-surface' 
                : 'bg-gray-50 dark:bg-dark-surface opacity-60 hover:bg-gray-100 dark:hover:bg-dark-border hover:opacity-80'
          }`}
          style={{ paddingLeft: `${depth * 24 + 12}px` }}
          onClick={() => onSelectTicket(node as JiraTicket)}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(node.id);
              }}
              className="p-0.5 hover:bg-gray-200 dark:hover:bg-dark-border rounded smooth-transition"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-700 dark:text-gray-300" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-700 dark:text-gray-300" />
              )}
            </button>
          )}
          {!hasChildren && <div className="w-5" />}
          
          {getIssueTypeIcon(node.issueType) && (
            <span className="text-lg">{getIssueTypeIcon(node.issueType)}</span>
          )}
          
          <Circle className={`w-3 h-3 fill-current ${getStatusColor(node.statusCategory)}`} />
          
          <span className="text-sm font-mono text-gray-600 dark:text-gray-300">{node.key}</span>
          
          <span className="flex-1 text-sm text-gray-900 dark:text-gray-100 truncate">{node.summary}</span>
          
          {/* Comment count badge */}
          {hasComments && (
            <span 
              className="flex items-center gap-1 text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-700"
              title={hasChildComments 
                ? `${commentCounts.own} comment(s) on this ticket, ${commentCounts.total} total including children`
                : `${commentCounts.own} comment(s)`
              }
            >
              <MessageSquare className="w-3 h-3" />
              {hasChildComments ? (
                <span>{commentCounts.own} / {commentCounts.total}</span>
              ) : (
                <span>{commentCounts.own}</span>
              )}
            </span>
          )}
          
          {!matchesFilter && (
            <span 
              className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded border border-amber-300 dark:border-amber-700"
              title="This ticket is shown for context (doesn't match current filters)"
            >
              Context
            </span>
          )}
          
          <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-dark-surface text-gray-600 dark:text-gray-300 rounded">
            {node.status}
          </span>
          
          {preferences.dataDisplay.showPriority && node.priority && (
            <span className="text-xs px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded">
              {node.priority}
            </span>
          )}
        </div>

        {isExpanded && node.children.length > 0 && (
          <div>
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Filters and Search */}
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm p-4 space-y-3 border border-gray-200 dark:border-dark-border smooth-transition">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tickets..."
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-neon-cyan focus:border-transparent smooth-transition placeholder-gray-400 dark:placeholder-gray-500"
          />
          <button
            onClick={handleGenerateAggregatedSummary}
            disabled={isGenerating || tickets.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 dark:bg-neon-purple text-white dark:text-gray-900 rounded-lg hover:bg-purple-700 dark:hover:bg-purple-400 disabled:opacity-50 shadow-lg dark:shadow-glow-purple smooth-transition"
          >
            <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-pulse' : ''}`} />
            {isGenerating ? 'Summarizing...' : 'Summarize'}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {uniqueStatuses.map((status) => (
            <button
              key={status}
              onClick={() => {
                setStatusFilter((prev) =>
                  prev.includes(status)
                    ? prev.filter((s) => s !== status)
                    : [...prev, status]
                );
              }}
              className={`px-3 py-1 text-sm rounded-lg border smooth-transition ${
                statusFilter.includes(status)
                  ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                  : 'bg-white dark:bg-dark-surface border-gray-300 dark:border-dark-border text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-border'
              }`}
            >
              {status}
            </button>
          ))}
          {statusFilter.length > 0 && (
            <button
              onClick={() => setStatusFilter([])}
              className="px-3 py-1 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 smooth-transition"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Aggregated Summary */}
      {showAggregatedSummary && aggregatedSummary && (
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-4 animate-fade-in">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-purple-900 dark:text-purple-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              AI Summary
            </h3>
            <button
              onClick={() => setShowAggregatedSummary(false)}
              className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200 text-sm smooth-transition"
            >
              Hide
            </button>
          </div>
          <p className="text-sm text-purple-800 dark:text-purple-200 whitespace-pre-wrap">{aggregatedSummary}</p>
        </div>
      )}

      {/* Tree View */}
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-200 dark:border-dark-border smooth-transition">
        <div className="p-4 border-b border-gray-200 dark:border-dark-border flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            {(() => {
              const countNodes = (nodes: any[]): { total: number; matching: number } => {
                return nodes.reduce((acc, node) => {
                  const childCounts = countNodes(node.children);
                  return {
                    total: acc.total + 1 + childCounts.total,
                    matching: acc.matching + (node.matchesFilter !== false ? 1 : 0) + childCounts.matching
                  };
                }, { total: 0, matching: 0 });
              };
              const counts = countNodes(treeData);
              const hasFilters = searchQuery || statusFilter.length > 0;
              
              if (hasFilters && counts.total > counts.matching) {
                return `Tickets (${counts.matching} matching, ${counts.total} total with context)`;
              }
              return `Tickets (${counts.total})`;
            })()}
          </h3>
          <button
            onClick={() => {
              if (expandedNodes.size > 0) {
                setExpandedNodes(new Set());
              } else {
                setExpandedNodes(new Set(tickets.map(t => t.id)));
              }
            }}
            className="text-sm text-blue-600 dark:text-neon-cyan hover:text-blue-800 dark:hover:text-cyan-400 smooth-transition"
          >
            {expandedNodes.size > 0 ? 'Collapse All' : 'Expand All'}
          </button>
        </div>

        <div className="p-2 max-h-[calc(100vh-300px)] overflow-y-auto">
          {treeData.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-300">
              <p>No tickets found</p>
              <p className="text-sm mt-2">Try adjusting your filters or sync with Jira</p>
            </div>
          ) : (
            treeData.map((node) => renderNode(node))
          )}
        </div>
      </div>
    </div>
  );
}
