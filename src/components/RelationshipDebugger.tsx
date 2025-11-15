import { useState } from 'react';
import { JiraTicket } from '../types';
import { Bug, ChevronDown, ChevronRight } from 'lucide-react';

interface RelationshipDebuggerProps {
  tickets: JiraTicket[];
}

export function RelationshipDebugger({ tickets }: RelationshipDebuggerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedKey, setSelectedKey] = useState('');

  // Create a map of tickets by key for quick lookup
  const ticketsByKey = new Map(tickets.map(t => [t.key, t]));
  
  // Find tickets that have children
  const parentsWithChildren = tickets
    .filter(t => tickets.some(child => child.parentKey === t.key))
    .map(parent => ({
      parent,
      children: tickets.filter(child => child.parentKey === parent.key)
    }));

  // Find orphan tickets (have parentKey but parent not found)
  const orphans = tickets.filter(t => 
    t.parentKey && !ticketsByKey.has(t.parentKey)
  );

  // Find tickets that SHOULD have parents but appear as roots
  // These are tickets with parentKey/parentId that point to missing tickets
  const potentialOrphans = tickets.filter(t => 
    t.parentKey || t.parentId
  );

  const selectedTicket = selectedKey ? ticketsByKey.get(selectedKey) : null;

  return (
    <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm border-2 border-orange-300 dark:border-orange-700 smooth-transition animate-fade-in">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-orange-50 dark:hover:bg-orange-900/10 smooth-transition"
      >
        <div className="flex items-center gap-2">
          <Bug className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Relationship Debugger</h3>
          <span className="text-sm text-gray-500 dark:text-gray-300">
            ({parentsWithChildren.length} parents, {orphans.length} orphans)
          </span>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-dark-border p-4 space-y-4">
          {/* Search for specific ticket */}
          <div className="animate-fade-in">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search by Ticket Key
            </label>
            <input
              type="text"
              value={selectedKey}
              onChange={(e) => setSelectedKey(e.target.value.toUpperCase())}
              placeholder="e.g., EVO-2622"
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 smooth-transition placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>

          {/* Selected ticket details */}
          {selectedTicket && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 animate-fade-in">
              <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
                {selectedTicket.key}: {selectedTicket.summary}
              </h4>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="font-medium text-gray-900 dark:text-gray-100">Parent Key:</span>{' '}
                  <span className="font-mono text-gray-700 dark:text-gray-300">
                    {selectedTicket.parentKey || '(none - this is a root ticket)'}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-900 dark:text-gray-100">Parent ID:</span>{' '}
                  <span className="font-mono text-gray-700 dark:text-gray-300">
                    {selectedTicket.parentId || '(none)'}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-900 dark:text-gray-100">Subtasks field:</span>{' '}
                  <span className="font-mono text-gray-700 dark:text-gray-300">
                    {selectedTicket.subtasks.length > 0 
                      ? selectedTicket.subtasks.join(', ') 
                      : '(no subtasks)'}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-900 dark:text-gray-100">Issue Type:</span>{' '}
                  <span className="text-gray-700 dark:text-gray-300">{selectedTicket.issueType}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-900 dark:text-gray-100">Children (by parentKey):</span>{' '}
                  <span className="text-gray-700 dark:text-gray-300">{tickets.filter(t => t.parentKey === selectedTicket.key).length} tickets</span>
                  <div className="ml-4 mt-1">
                    {tickets
                      .filter(t => t.parentKey === selectedTicket.key)
                      .map(child => (
                        <div key={child.key} className="text-xs font-mono text-gray-700 dark:text-gray-300">
                          {child.key}: {child.summary}
                        </div>
                      ))}
                  </div>
                </div>
                <div>
                  <span className="font-medium text-gray-900 dark:text-gray-100">Parent exists in DB:</span>{' '}
                  <span className="text-gray-700 dark:text-gray-300">
                    {selectedTicket.parentKey 
                      ? (ticketsByKey.has(selectedTicket.parentKey) ? '✅ Yes' : '❌ No (ORPHAN!)') 
                      : 'N/A (root ticket)'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Parents with children */}
          <div className="animate-fade-in">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Parent-Child Relationships ({parentsWithChildren.length})
            </h4>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {parentsWithChildren.map(({ parent, children }) => (
                <div key={parent.key} className="bg-gray-50 dark:bg-dark-surface border border-gray-300 dark:border-dark-border rounded p-3">
                  <div className="font-semibold text-sm mb-2 text-gray-900 dark:text-gray-100">
                    <span className="font-mono text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">{parent.key}</span>{' '}
                    <span className="text-gray-700 dark:text-gray-300">{parent.summary}</span>
                  </div>
                  <div className="ml-4 space-y-1">
                    {children.map(child => (
                      <div key={child.key} className="text-sm text-gray-800 dark:text-gray-200">
                        <span className="font-mono text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded text-xs">{child.key}</span>{' '}
                        {child.summary}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Orphan tickets */}
          {orphans.length > 0 && (
            <div className="animate-fade-in">
              <h4 className="font-semibold text-red-900 dark:text-red-300 mb-2">
                Orphan Tickets (parent not found) ({orphans.length})
              </h4>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {orphans.map(ticket => (
                  <div key={ticket.key} className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-2 text-sm">
                    <span className="font-mono text-gray-900 dark:text-gray-100">{ticket.key}</span>: <span className="text-gray-800 dark:text-gray-200">{ticket.summary}</span>
                    <div className="text-xs text-red-700 dark:text-red-300 mt-1">
                      Missing parent: <span className="font-mono">{ticket.parentKey}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tickets with parent info but parent missing */}
          {potentialOrphans.length > 0 && (
            <div className="animate-fade-in">
              <h4 className="font-semibold text-orange-900 dark:text-orange-300 mb-2">
                Tickets with Parent References ({potentialOrphans.length})
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-300 mb-2">
                These tickets have parentKey or parentId set. Check if their parents exist.
              </p>
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {potentialOrphans.map(ticket => {
                  const parentExists = ticket.parentKey ? ticketsByKey.has(ticket.parentKey) : false;
                  return (
                    <div 
                      key={ticket.key} 
                      className={`rounded p-2 text-sm ${
                        parentExists 
                          ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-900 dark:text-green-200' 
                          : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-mono font-semibold">{ticket.key}</span>: {ticket.summary}
                          <div className={`text-xs mt-1 font-medium ${
                            parentExists ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
                          }`}>
                            Parent: <span className="font-mono">{ticket.parentKey || ticket.parentId || 'N/A'}</span>
                            {' '}
                            {parentExists ? '✅ Exists' : '❌ Missing'}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Summary stats */}
          <div className="bg-gray-100 dark:bg-dark-surface border border-gray-300 dark:border-dark-border rounded p-4 text-sm space-y-2 animate-fade-in">
            <div className="text-gray-900 dark:text-gray-100"><strong className="text-gray-800 dark:text-gray-200">Total tickets:</strong> {tickets.length}</div>
            <div className="text-gray-900 dark:text-gray-100"><strong className="text-gray-800 dark:text-gray-200">Root tickets (no parent):</strong> {tickets.filter(t => !t.parentKey).length}</div>
            <div className="text-gray-900 dark:text-gray-100"><strong className="text-gray-800 dark:text-gray-200">Child tickets (has parent):</strong> {tickets.filter(t => t.parentKey).length}</div>
            <div className="text-gray-900 dark:text-gray-100"><strong className="text-gray-800 dark:text-gray-200">Parents with children:</strong> {parentsWithChildren.length}</div>
            <div className="text-gray-900 dark:text-gray-100"><strong className="text-gray-800 dark:text-gray-200">Orphans (missing parent):</strong> {orphans.length}</div>
            <div className="text-gray-900 dark:text-gray-100"><strong className="text-gray-800 dark:text-gray-200">Tickets with parent references:</strong> {potentialOrphans.length}</div>
          </div>
        </div>
      )}
    </div>
  );
}
