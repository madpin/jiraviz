import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Edit, X, Home, Plus, RefreshCw } from 'lucide-react';
import { useWizardState } from '../../hooks/useWizardState';
import { jiraService } from '../../services/jira';
import { getRandomJoke } from '../../constants/loadingJokes';

export function TicketReview() {
  const navigate = useNavigate();
  const { state, resetWizardState } = useWizardState();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdTicketKey, setCreatedTicketKey] = useState('');
  const [joke, setJoke] = useState(getRandomJoke());

  useEffect(() => {
    if (!state.generatedTicket) {
      navigate('/wizard/ticket-input');
    }
  }, []);

  if (!state.generatedTicket) {
    return null;
  }

  const { generatedTicket: ticket } = state;

  const handleCreate = async () => {
    setLoading(true);
    setError('');
    setJoke(getRandomJoke());

    try {
      const result = await jiraService.createTicket({
        summary: ticket.summary,
        description: ticket.description,
        issueType: ticket.issueType,
        parentKey: state.selectedEpic?.key,
      });

      setCreatedTicketKey(result.key);
    } catch (err: any) {
      console.error('Error creating ticket:', err);
      setError(err.message || 'Failed to create ticket');
      setLoading(false);
    }
  };

  const handleEdit = () => {
    navigate('/wizard/ticket-input');
  };

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel? Your progress will be lost.')) {
      resetWizardState();
      navigate('/');
    }
  };

  const handleCreateAnother = () => {
    // Keep epic selection, reset ticket data
    resetWizardState();
    navigate('/wizard/project');
  };

  const handleDone = () => {
    resetWizardState();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-200 dark:border-dark-border p-8 text-center smooth-transition">
          <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600 dark:text-neon-cyan" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Creating ticket in Jira...
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Your AI-enhanced ticket is being created
          </p>
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
            <p className="text-sm text-blue-800 dark:text-blue-200">{joke}</p>
          </div>
        </div>
      </div>
    );
  }

  if (createdTicketKey) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-200 dark:border-dark-border p-8 text-center smooth-transition">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
            <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Ticket Created Successfully!
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Your ticket has been created in Jira
          </p>

          <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700 mb-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Ticket Key</p>
            <p className="text-3xl font-mono font-bold text-blue-600 dark:text-neon-cyan">
              {createdTicketKey}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleCreateAnother}
              className="flex items-center justify-center gap-2 px-6 py-3 border-2 border-blue-600 dark:border-neon-cyan text-blue-600 dark:text-neon-cyan rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 font-medium smooth-transition"
            >
              <Plus className="w-5 h-5" />
              Create Another
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
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-200 dark:border-dark-border p-8 smooth-transition">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Review Ticket
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Double-check the AI draft before creating the Jira issue
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg animate-fade-in">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Summary
            </label>
            <div className="px-4 py-3 bg-gray-50 dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-dark-border">
              <p className="font-semibold text-gray-900 dark:text-gray-100">{ticket.summary}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <div className="px-4 py-3 bg-gray-50 dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-dark-border max-h-96 overflow-y-auto">
              <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{ticket.description}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type
              </label>
              <div className="px-4 py-3 bg-gray-50 dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-dark-border">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{ticket.issueType}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Epic
              </label>
              <div className="px-4 py-3 bg-gray-50 dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-dark-border">
                <span className="text-sm font-mono text-blue-600 dark:text-neon-cyan font-semibold">
                  {state.selectedEpic?.key}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Happy? Create the ticket or jump back to tweak copy
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4">
            <button
              onClick={handleCancel}
              className="flex items-center justify-center gap-2 px-6 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-dark-surface rounded-lg hover:bg-gray-200 dark:hover:bg-dark-border smooth-transition"
            >
              <X className="w-5 h-5" />
              Cancel
            </button>
            <button
              onClick={handleEdit}
              className="flex items-center justify-center gap-2 px-6 py-3 border-2 border-blue-600 dark:border-neon-cyan text-blue-600 dark:text-neon-cyan rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 font-medium smooth-transition"
            >
              <Edit className="w-5 h-5" />
              Edit
            </button>
            <button
              onClick={handleCreate}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 dark:bg-neon-green text-white dark:text-gray-900 rounded-lg hover:bg-green-700 dark:hover:bg-green-400 font-medium shadow-lg dark:shadow-glow-green smooth-transition disabled:opacity-50"
            >
              <CheckCircle className="w-5 h-5" />
              Create Ticket
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

