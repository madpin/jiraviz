import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save } from 'lucide-react';
import { useWizardState } from '../../hooks/useWizardState';

export function MultiTicketEdit() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { state, updateWizardState } = useWizardState();
  
  const ticket = state.multiTicketDrafts.find((t) => t.id === id);
  
  const [summary, setSummary] = useState(ticket?.summary || '');
  const [description, setDescription] = useState(ticket?.description || '');
  const [issueType, setIssueType] = useState(ticket?.issueType || 'Task');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ticket) {
      navigate('/wizard/multi-overview');
    }
  }, [ticket]);

  if (!ticket) {
    return null;
  }

  const handleSave = () => {
    if (!summary.trim() || !description.trim()) {
      setError('Summary and description are required');
      return;
    }

    const updated = state.multiTicketDrafts.map((t) =>
      t.id === id
        ? { ...t, summary: summary.trim(), description: description.trim(), issueType }
        : t
    );

    updateWizardState({ multiTicketDrafts: updated });
    navigate('/wizard/multi-overview');
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-200 dark:border-dark-border p-8 smooth-transition">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Edit Ticket Draft
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Adjust summary, description, or issue type before creation
        </p>

        {ticket.outline.title && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Ticket Outline: <span className="font-semibold">{ticket.outline.title}</span>
            </p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg animate-fade-in">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Summary *
            </label>
            <input
              type="text"
              value={summary}
              onChange={(e) => {
                setSummary(e.target.value);
                setError('');
              }}
              className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-neon-cyan focus:border-transparent smooth-transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setError('');
              }}
              rows={12}
              className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-neon-cyan focus:border-transparent smooth-transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Issue Type *
            </label>
            <select
              value={issueType}
              onChange={(e) => setIssueType(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-neon-cyan focus:border-transparent smooth-transition"
            >
              <option value="Task">Task</option>
              <option value="Story">Story</option>
              <option value="Bug">Bug</option>
              <option value="Epic">Epic</option>
            </select>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 dark:bg-neon-cyan text-white dark:text-gray-900 rounded-lg hover:bg-blue-700 dark:hover:bg-cyan-400 font-medium shadow-lg dark:shadow-glow-cyan smooth-transition"
            >
              <Save className="w-5 h-5" />
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

