import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Home, Plus, RefreshCw } from 'lucide-react';
import { useWizardState } from '../../hooks/useWizardState';
import { jiraService } from '../../services/jira';
import { getRandomJoke } from '../../constants/loadingJokes';

export function MultiTicketConfirm() {
  const navigate = useNavigate();
  const { state, resetWizardState } = useWizardState();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<{
    successes: Array<{ summary: string; key: string }>;
    failures: Array<{ summary: string; error: string }>;
  } | null>(null);
  const [joke, setJoke] = useState(getRandomJoke());
  const [currentTicket, setCurrentTicket] = useState('');

  const activeTickets = state.multiTicketDrafts.filter((t) => !t.deleted);

  useEffect(() => {
    if (activeTickets.length === 0) {
      navigate('/wizard/multi-overview');
    }
  }, []);

  const handleCreate = async () => {
    setLoading(true);
    setError('');
    setJoke(getRandomJoke());

    const successes: Array<{ summary: string; key: string }> = [];
    const failures: Array<{ summary: string; error: string }> = [];

    try {
      for (const ticket of activeTickets) {
        setCurrentTicket(ticket.summary);

        try {
          const result = await jiraService.createTicket({
            summary: ticket.summary,
            description: ticket.description,
            issueType: ticket.issueType,
            parentKey: state.selectedEpic?.key,
          });

          successes.push({ summary: ticket.summary, key: result.key });
        } catch (ticketError: any) {
          console.error('Error creating ticket:', ticketError);
          failures.push({
            summary: ticket.summary,
            error: ticketError.message || 'Unknown error',
          });
        }
      }

      setResults({ successes, failures });
    } catch (err: any) {
      console.error('Error creating tickets:', err);
      setError(err.message || 'Failed to create tickets');
    } finally {
      setLoading(false);
      setCurrentTicket('');
    }
  };

  const handleDone = () => {
    resetWizardState();
    navigate('/');
  };

  const handleCreateAnother = () => {
    resetWizardState();
    navigate('/wizard/project');
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-200 dark:border-dark-border p-8 text-center smooth-transition">
          <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600 dark:text-neon-cyan" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Creating tickets in Jira...
          </h3>
          {currentTicket && (
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Creating: <span className="font-semibold">{currentTicket}</span>
            </p>
          )}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
            <p className="text-sm text-blue-800 dark:text-blue-200">{joke}</p>
          </div>
        </div>
      </div>
    );
  }

  if (results) {
    return (
      <div className="max-w-3xl mx-auto animate-fade-in">
        <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-200 dark:border-dark-border p-8 smooth-transition">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
              <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Tickets Created!
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {results.successes.length} of {activeTickets.length} tickets created successfully
            </p>
          </div>

          {results.successes.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-green-700 dark:text-green-400 mb-3">
                Successfully Created ({results.successes.length})
              </h3>
              <div className="space-y-2">
                {results.successes.map((success, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
                  >
                    <span className="text-sm text-gray-900 dark:text-gray-100">{success.summary}</span>
                    <span className="text-sm font-mono font-semibold text-green-600 dark:text-green-400">
                      {success.key}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.failures.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-red-700 dark:text-red-400 mb-3">
                Failed ({results.failures.length})
              </h3>
              <div className="space-y-2">
                {results.failures.map((failure, index) => (
                  <div
                    key={index}
                    className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                  >
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                      {failure.summary}
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400">{failure.error}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4 border-t border-gray-200 dark:border-dark-border">
            <button
              onClick={handleCreateAnother}
              className="flex items-center justify-center gap-2 px-6 py-3 border-2 border-blue-600 dark:border-neon-cyan text-blue-600 dark:text-neon-cyan rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 font-medium smooth-transition"
            >
              <Plus className="w-5 h-5" />
              Create More
            </button>
            <button
              onClick={handleDone}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 dark:bg-neon-cyan text-white dark:text-gray-900 rounded-lg hover:bg-blue-700 dark:hover:bg-cyan-400 font-medium shadow-lg dark:shadow-glow-cyan smooth-transition"
            >
              <Home className="w-5 h-5" />
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-200 dark:border-dark-border p-8 smooth-transition">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Confirm Ticket Batch
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Review the tickets that will be created in Jira
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg animate-fade-in">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <div className="space-y-6 mb-6">
          {activeTickets.map((ticket, index) => (
            <div
              key={ticket.id}
              className="p-6 bg-gray-50 dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-dark-border"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {index + 1}. {ticket.summary}
                </h3>
                <span className="text-sm font-medium px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                  {ticket.issueType}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap line-clamp-3">
                {ticket.description}
              </p>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-dark-border">
          <button
            onClick={handleCreate}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 dark:bg-neon-green text-white dark:text-gray-900 rounded-lg hover:bg-green-700 dark:hover:bg-green-400 font-medium shadow-lg dark:shadow-glow-green smooth-transition disabled:opacity-50"
          >
            <CheckCircle className="w-5 h-5" />
            Create Tickets
          </button>
        </div>
      </div>
    </div>
  );
}

