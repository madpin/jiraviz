import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { useTickets } from '../hooks/useTickets';

interface CreateTicketProps {
  onClose: () => void;
  onSuccess: () => void;
  parentKey?: string;
}

export function CreateTicket({ onClose, onSuccess, parentKey }: CreateTicketProps) {
  const { createTicket } = useTickets();
  
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [issueType, setIssueType] = useState('Task');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!summary.trim()) {
      setError('Summary is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await createTicket({
        summary: summary.trim(),
        description: description.trim(),
        issueType,
        parentKey,
      });
      
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to create ticket:', err);
      setError('Failed to create ticket. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-2xl dark:shadow-glow-cyan w-full max-w-2xl mx-4 border border-gray-200 dark:border-dark-border smooth-transition">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border bg-gradient-to-r from-gray-50 to-gray-100 dark:from-dark-surface dark:to-dark-card">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Create New Ticket</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-surface smooth-transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {parentKey && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Creating subtask under: <span className="font-semibold">{parentKey}</span>
              </p>
            </div>
          )}

          <div className="animate-fade-in">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Issue Type *
            </label>
            <select
              value={issueType}
              onChange={(e) => setIssueType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-neon-cyan focus:border-transparent smooth-transition"
            >
              <option value="Task">Task</option>
              <option value="Story">Story</option>
              <option value="Bug">Bug</option>
              <option value="Epic">Epic</option>
              {parentKey && <option value="Sub-task">Sub-task</option>}
            </select>
          </div>

          <div className="animate-fade-in">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Summary *
            </label>
            <input
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Brief description of the ticket"
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-neon-cyan focus:border-transparent smooth-transition placeholder-gray-400 dark:placeholder-gray-500"
              required
            />
          </div>

          <div className="animate-fade-in">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of the ticket"
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-neon-cyan focus:border-transparent smooth-transition placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg animate-fade-in">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-dark-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-dark-surface rounded-lg hover:bg-gray-200 dark:hover:bg-dark-border smooth-transition"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-neon-cyan text-white dark:text-gray-900 rounded-lg hover:bg-blue-700 dark:hover:bg-cyan-400 disabled:opacity-50 shadow-lg dark:shadow-glow-cyan smooth-transition"
            >
              <Plus className="w-4 h-4" />
              {isSubmitting ? 'Creating...' : 'Create Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
