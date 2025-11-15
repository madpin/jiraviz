import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useWizardState } from '../../hooks/useWizardState';

export function ProjectInput() {
  const navigate = useNavigate();
  const { state, updateWizardState } = useWizardState();
  const [projectDescription, setProjectDescription] = useState(state.projectDescription || '');
  const [error, setError] = useState('');

  const handleContinue = () => {
    if (!projectDescription.trim()) {
      setError('Please enter a project description');
      return;
    }

    // Save directly to sessionStorage to ensure it persists before navigation
    const trimmedDescription = projectDescription.trim();
    try {
      const currentState = sessionStorage.getItem('jiraviz_wizard_state');
      const stateObj = currentState ? JSON.parse(currentState) : {};
      stateObj.projectDescription = trimmedDescription;
      sessionStorage.setItem('jiraviz_wizard_state', JSON.stringify(stateObj));
    } catch (err) {
      console.error('Error saving wizard state to sessionStorage:', err);
    }
    
    // Also update React state
    updateWizardState({ projectDescription: trimmedDescription });
    
    // Navigate to next step
    navigate('/wizard/epic-select');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleContinue();
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-200 dark:border-dark-border p-8 smooth-transition">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          What project are you working on?
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Describe your project goals, scope, and desired outcomes. This helps AI find relevant epics and create better tickets.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Project Description *
            </label>
            <textarea
              value={projectDescription}
              onChange={(e) => {
                setProjectDescription(e.target.value);
                setError('');
              }}
              onKeyDown={handleKeyDown}
              placeholder="Example: We're building a customer dashboard that displays analytics and allows users to manage their account settings..."
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-neon-cyan focus:border-transparent smooth-transition placeholder-gray-400 dark:placeholder-gray-500"
              autoFocus
            />
            {error && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400 animate-fade-in">
                {error}
              </p>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('[ProjectInput] Button clicked!');
                handleContinue();
              }}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 dark:bg-neon-cyan text-white dark:text-gray-900 rounded-lg hover:bg-blue-700 dark:hover:bg-cyan-400 font-medium shadow-lg dark:shadow-glow-cyan smooth-transition"
            >
              Continue
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Press Ctrl + Enter to continue
          </p>
        </div>
      </div>
    </div>
  );
}

