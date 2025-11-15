import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, RefreshCw } from 'lucide-react';
import { useWizardState } from '../../hooks/useWizardState';
import { useConfig } from '../../hooks/useConfig';
import { llmService } from '../../services/llm';
import { knowledgeBaseService } from '../../services/knowledgeBase';
import { getRandomJoke } from '../../constants/loadingJokes';

export function MultiTicketInput() {
  const navigate = useNavigate();
  const { state, updateWizardState } = useWizardState();
  const { config } = useConfig();
  const [taskDescription, setTaskDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [joke, setJoke] = useState(getRandomJoke());
  const [progress, setProgress] = useState({ current: 0, total: 0, stage: '' });

  useEffect(() => {
    if (!state.selectedEpic) {
      navigate('/wizard/epic-select');
    }
    
    // Configure LLM service if available
    if (config?.llm) {
      llmService.configure(config.llm);
    }
  }, []);

  const handlePlan = async () => {
    if (!taskDescription.trim()) {
      setError('Please describe the work to split');
      return;
    }

    setLoading(true);
    setError('');
    setJoke(getRandomJoke());
    setProgress({ current: 0, total: 0, stage: 'Analyzing task and planning tickets...' });

    try {
      console.log('[MultiTicketInput] Starting ticket planning...');
      
      // Get AI to plan ticket splits
      const plan = await llmService.planTicketSplits(
        state.projectDescription,
        taskDescription,
        6
      );

      console.log('[MultiTicketInput] Plan received:', plan);

      if (!plan || plan.length === 0) {
        setError('AI could not propose ticket splits. Try adding more detail.');
        setLoading(false);
        return;
      }

      setProgress({ current: 0, total: plan.length, stage: `Planning complete! Generating ${plan.length} detailed tickets...` });
      console.log(`[MultiTicketInput] Generating ${plan.length} ticket drafts...`);

      // Generate drafts for each planned ticket
      const drafts = [];
      const failures: string[] = [];

      for (let i = 0; i < plan.length; i++) {
        const outline = plan[i];
        const ticketTitle = outline.title || outline.summary || `Ticket ${i + 1}`;
        setProgress({ 
          current: i + 1, 
          total: plan.length, 
          stage: `Generating: ${ticketTitle}` 
        });
        
        console.log(`[MultiTicketInput] Generating draft ${i + 1}/${plan.length}...`);
        
        const query = outline.summary || outline.title || taskDescription;
        const kbContext = await knowledgeBaseService.search(query);
        const gleanContext = ''; // No Glean in browser

        try {
          const { summary, description, issueType } = await llmService.generateTicketFromOutline(
            state.projectDescription,
            outline,
            kbContext,
            gleanContext
          );

          drafts.push({
            id: `draft-${Date.now()}-${Math.random()}`,
            outline,
            summary,
            description,
            issueType,
            deleted: false,
          });
          
          console.log(`[MultiTicketInput] Draft ${i + 1} generated successfully`);
        } catch (ticketError: any) {
          console.error(`[MultiTicketInput] Error generating draft ${i + 1}:`, ticketError);
          failures.push(outline.summary || outline.title || 'Unknown');
        }
      }

      setProgress({ current: plan.length, total: plan.length, stage: 'Finalizing...' });
      console.log(`[MultiTicketInput] Generated ${drafts.length} drafts, ${failures.length} failures`);

      if (drafts.length === 0) {
        setError('Could not generate any ticket drafts. Please refine your request.');
        setLoading(false);
        return;
      }

      if (failures.length > 0) {
        console.warn('[MultiTicketInput] Some tickets failed to generate:', failures);
      }

      // Save to sessionStorage before navigation
      try {
        const currentState = sessionStorage.getItem('jiraviz_wizard_state');
        const stateObj = currentState ? JSON.parse(currentState) : {};
        stateObj.multiTicketPlan = plan;
        stateObj.multiTicketDrafts = drafts;
        sessionStorage.setItem('jiraviz_wizard_state', JSON.stringify(stateObj));
        console.log('[MultiTicketInput] Saved to sessionStorage');
      } catch (err) {
        console.error('[MultiTicketInput] Error saving to sessionStorage:', err);
      }

      updateWizardState({
        multiTicketPlan: plan,
        multiTicketDrafts: drafts,
      });

      console.log('[MultiTicketInput] Navigating to multi-overview');
      navigate('/wizard/multi-overview');
    } catch (err: any) {
      console.error('[MultiTicketInput] Error planning tickets:', err);
      setError(err.message || 'Failed to plan tickets');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-200 dark:border-dark-border p-8 text-center smooth-transition">
          <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600 dark:text-neon-cyan" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            AI is designing ticket splits...
          </h3>
          
          {/* Progress indicator */}
          {progress.total > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                <span className="font-semibold text-blue-600 dark:text-neon-cyan">
                  {progress.current} / {progress.total}
                </span>
                <span>tickets generated</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-dark-surface rounded-full h-2 mb-2">
                <div
                  className="bg-blue-600 dark:bg-neon-cyan h-2 rounded-full smooth-transition"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
          
          {/* Current stage */}
          <p className="text-gray-600 dark:text-gray-400 mb-4 min-h-[24px]">
            {progress.stage || 'Breaking work into multiple actionable tickets'}
          </p>
          
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
            <p className="text-sm text-blue-800 dark:text-blue-200">{joke}</p>
          </div>
          
          {progress.total > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
              This may take 30-60 seconds depending on the number of tickets...
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-200 dark:border-dark-border p-8 smooth-transition">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Multi-Ticket Planner
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Describe the larger body of work to split into tickets
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg animate-fade-in">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Task Description *
            </label>
            <textarea
              value={taskDescription}
              onChange={(e) => {
                setTaskDescription(e.target.value);
                setError('');
              }}
              placeholder="Outline the task, goals, or milestones that likely need multiple tickets...&#10;&#10;Example: Build a user dashboard with analytics charts, profile management, and notification settings. Users should be able to customize their view and export data..."
              rows={10}
              className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-neon-cyan focus:border-transparent smooth-transition placeholder-gray-400 dark:placeholder-gray-500"
              autoFocus
            />
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Tip: Mention constraints, dependencies, and desired outcomes for better splits
            </p>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={handlePlan}
              disabled={loading || !taskDescription.trim()}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 dark:bg-neon-cyan text-white dark:text-gray-900 rounded-lg hover:bg-blue-700 dark:hover:bg-cyan-400 font-medium shadow-lg dark:shadow-glow-cyan smooth-transition disabled:opacity-50"
            >
              <Sparkles className="w-5 h-5" />
              Plan Tickets
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

