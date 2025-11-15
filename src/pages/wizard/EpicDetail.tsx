import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { useWizardState } from '../../hooks/useWizardState';

export function EpicDetail() {
  const navigate = useNavigate();
  const { state } = useWizardState();

  useEffect(() => {
    if (!state.selectedEpic) {
      navigate('/wizard/epic-select');
    }
  }, []);

  if (!state.selectedEpic) {
    return null;
  }

  const { selectedEpic: epic } = state;

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-200 dark:border-dark-border p-8 smooth-transition">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Epic Details
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Confirm this epic before drafting tickets
        </p>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Epic Key
            </label>
            <div className="px-4 py-3 bg-gray-50 dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-dark-border">
              <span className="font-mono text-blue-600 dark:text-neon-cyan font-semibold">
                {epic.key}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Summary
            </label>
            <div className="px-4 py-3 bg-gray-50 dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-dark-border">
              <p className="text-gray-900 dark:text-gray-100">{epic.summary}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <div className="px-4 py-3 bg-gray-50 dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-dark-border max-h-64 overflow-y-auto">
              <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                {epic.description || 'No description'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <div className="px-4 py-3 bg-gray-50 dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-dark-border">
                <span className="inline-flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                  {epic.status}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Created
              </label>
              <div className="px-4 py-3 bg-gray-50 dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-dark-border">
                <span className="text-sm text-gray-900 dark:text-gray-100">
                  {new Date(epic.created).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={() => navigate('/wizard/template')}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 dark:bg-neon-cyan text-white dark:text-gray-900 rounded-lg hover:bg-blue-700 dark:hover:bg-cyan-400 font-medium shadow-lg dark:shadow-glow-cyan smooth-transition"
            >
              <CheckCircle className="w-5 h-5" />
              Confirm & Continue
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

