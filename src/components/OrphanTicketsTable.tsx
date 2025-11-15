import { JiraTicket, SortOrder } from '../types';
import { Circle, ExternalLink } from 'lucide-react';
import { usePreferences } from '../hooks/usePreferences';
import { useMemo } from 'react';

interface OrphanTicketsTableProps {
  tickets: JiraTicket[];
  selectedTicket: JiraTicket | null;
  onSelectTicket: (ticket: JiraTicket) => void;
  sortOrder?: SortOrder;
}

export function OrphanTicketsTable({ tickets, selectedTicket, onSelectTicket, sortOrder = 'updated' }: OrphanTicketsTableProps) {
  const { preferences } = usePreferences();

  // Sort orphan tickets based on the current sort order
  // Note: Orphans are already sorted by the parent component when sortOrder is 'default'
  // For other sort orders, we apply local sorting
  const displayTickets = useMemo(() => {
    if (sortOrder === 'default') {
      // When using default sort, the parent already sorted them
      return tickets;
    }

    // Apply local sorting for other sort orders
    const sorted = [...tickets];
    switch (sortOrder) {
      case 'alphabetical':
        return sorted.sort((a, b) => a.key.localeCompare(b.key));
      case 'created':
        return sorted.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
      case 'updated':
        return sorted.sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime());
      case 'status':
        return sorted.sort((a, b) => a.status.localeCompare(b.status));
      case 'priority':
        return sorted.sort((a, b) => {
          const priorityOrder: Record<string, number> = {
            'Highest': 1, 'High': 2, 'Medium': 3, 'Low': 4, 'Lowest': 5
          };
          const aPriority = a.priority ? priorityOrder[a.priority] || 999 : 999;
          const bPriority = b.priority ? priorityOrder[b.priority] || 999 : 999;
          return aPriority - bPriority;
        });
      case 'assignee':
        return sorted.sort((a, b) => (a.assignee || 'Unassigned').localeCompare(b.assignee || 'Unassigned'));
      default:
        return sorted;
    }
  }, [tickets, sortOrder]);

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
    if (type.includes('story')) return '📖';
    if (type.includes('task')) return '✓';
    if (type.includes('bug')) return '🐛';
    return '•';
  };

  if (displayTickets.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-200 dark:border-dark-border smooth-transition animate-fade-in">
      <div className="p-4 border-b border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-surface">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <ExternalLink className="w-5 h-5" />
          Orphan Tickets ({displayTickets.length})
        </h3>
        <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
          Tickets without a parent Epic or Initiative
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-dark-surface border-b border-gray-200 dark:border-dark-border">
            <tr>
              {preferences.dataDisplay.showIcons && (
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Type
                </th>
              )}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                Key
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                Summary
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                Status
              </th>
              {preferences.dataDisplay.showAssignee && (
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Assignee
                </th>
              )}
              {preferences.dataDisplay.showPriority && (
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Priority
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-dark-border">
            {displayTickets.map((ticket) => (
              <tr
                key={ticket.id}
                onClick={() => onSelectTicket(ticket)}
                className={`
                  cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-surface smooth-transition
                  ${selectedTicket?.id === ticket.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                `}
              >
                {preferences.dataDisplay.showIcons && (
                  <td className="px-4 py-3 whitespace-nowrap">
                    {getIssueTypeIcon(ticket.issueType) && (
                      <span className="text-lg">{getIssueTypeIcon(ticket.issueType)}</span>
                    )}
                  </td>
                )}
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">
                    {ticket.key}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-gray-900 dark:text-gray-100 max-w-md truncate">
                    {ticket.summary}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Circle className={`w-3 h-3 fill-current ${getStatusColor(ticket.statusCategory)}`} />
                    <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-dark-surface text-gray-700 dark:text-gray-300 rounded">
                      {ticket.status}
                    </span>
                  </div>
                </td>
                {preferences.dataDisplay.showAssignee && (
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {ticket.assignee || '-'}
                    </span>
                  </td>
                )}
                {preferences.dataDisplay.showPriority && (
                  <td className="px-4 py-3 whitespace-nowrap">
                    {ticket.priority ? (
                      <span className="text-xs px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded">
                        {ticket.priority}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
