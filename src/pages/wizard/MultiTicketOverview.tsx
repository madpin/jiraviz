import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit, Trash2, ArrowRight, RotateCcw } from 'lucide-react';
import { useWizardState } from '../../hooks/useWizardState';
import { TicketDraft } from '../../types';

export function MultiTicketOverview() {
  const navigate = useNavigate();
  const { state, updateWizardState } = useWizardState();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!state.multiTicketDrafts || state.multiTicketDrafts.length === 0) {
      navigate('/wizard/multi-input');
    }
  }, []);

  const activeTickets = state.multiTicketDrafts.filter((t) => !t.deleted);
  const deletedTickets = state.multiTicketDrafts.filter((t) => t.deleted);

  const handleToggleDelete = (ticketId: string) => {
    const updated = state.multiTicketDrafts.map((ticket) =>
      ticket.id === ticketId ? { ...ticket, deleted: !ticket.deleted } : ticket
    );
    updateWizardState({ multiTicketDrafts: updated });
  };

  const handleEdit = (ticketId: string) => {
    navigate(`/wizard/multi-edit/${ticketId}`);
  };

  const handleContinue = () => {
    if (activeTickets.length === 0) {
      alert('No active tickets to create. Please restore some tickets or go back.');
      return;
    }
    navigate('/wizard/multi-confirm');
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-200 dark:border-dark-border p-8 smooth-transition">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Review Planned Tickets
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Select a ticket to edit or delete before creation
        </p>

        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            {activeTickets.length} ticket{activeTickets.length !== 1 ? 's' : ''} ready to create
          </p>
        </div>

        {activeTickets.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-dark-surface mb-4">
              <Trash2 className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              All tickets deleted
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Restore tickets below or go back to replan
            </p>
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            {activeTickets.map((ticket) => (
              <div
                key={ticket.id}
                className={`p-4 border-2 rounded-lg smooth-transition cursor-pointer ${
                  selectedId === ticket.id
                    ? 'border-blue-500 dark:border-neon-cyan bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-dark-border hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                onClick={() => setSelectedId(ticket.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-blue-600 dark:text-neon-cyan">
                        {ticket.issueType}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        · {ticket.outline.priority} Priority
                      </span>
                    </div>
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      {ticket.summary}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {ticket.description}
                    </p>
                    {ticket.outline.rationale && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-2 italic">
                        Why: {ticket.outline.rationale}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(ticket.id);
                      }}
                      className="p-2 text-blue-600 dark:text-neon-cyan hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg smooth-transition"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleDelete(ticket.id);
                      }}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg smooth-transition"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {deletedTickets.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Deleted Tickets ({deletedTickets.length})
            </h3>
            <div className="space-y-2">
              {deletedTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="p-3 border border-gray-200 dark:border-dark-border rounded-lg bg-gray-50 dark:bg-dark-surface smooth-transition opacity-60"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 line-through">
                        {ticket.summary}
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggleDelete(ticket.id)}
                      className="flex items-center gap-1 px-3 py-1 text-xs text-blue-600 dark:text-neon-cyan hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded smooth-transition"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Restore
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-dark-border">
          <button
            onClick={handleContinue}
            disabled={activeTickets.length === 0}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 dark:bg-neon-cyan text-white dark:text-gray-900 rounded-lg hover:bg-blue-700 dark:hover:bg-cyan-400 font-medium shadow-lg dark:shadow-glow-cyan smooth-transition disabled:opacity-50"
          >
            Continue
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

