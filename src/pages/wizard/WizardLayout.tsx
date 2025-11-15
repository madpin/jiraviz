import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, X } from 'lucide-react';
import { useWizardState } from '../../hooks/useWizardState';

const WIZARD_STEPS = [
  { path: '/wizard/project', label: 'Project', order: 1 },
  { path: '/wizard/epic-select', label: 'Epic', order: 2 },
  { path: '/wizard/epic-create', label: 'Epic', order: 2 },
  { path: '/wizard/epic-detail', label: 'Confirm', order: 3 },
  { path: '/wizard/template', label: 'Template', order: 4 },
  { path: '/wizard/ticket-input', label: 'Input', order: 5 },
  { path: '/wizard/ticket-review', label: 'Review', order: 6 },
  { path: '/wizard/multi-input', label: 'Plan', order: 5 },
  { path: '/wizard/multi-overview', label: 'Review', order: 6 },
  { path: '/wizard/multi-edit', label: 'Edit', order: 6 },
  { path: '/wizard/multi-confirm', label: 'Confirm', order: 7 },
];

export function WizardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { resetWizardState } = useWizardState();

  const currentStep = WIZARD_STEPS.find((step) => location.pathname === step.path);
  const currentOrder = currentStep?.order || 0;

  // Get unique steps for progress indicator
  const progressSteps = [
    { order: 1, label: 'Project' },
    { order: 2, label: 'Epic' },
    { order: 3, label: 'Confirm' },
    { order: 4, label: 'Template' },
    { order: 5, label: 'Create' },
    { order: 6, label: 'Review' },
  ];

  const handleClose = () => {
    if (window.confirm('Are you sure you want to exit the wizard? Your progress will be lost.')) {
      resetWizardState();
      navigate('/');
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg smooth-transition">
      {/* Header */}
      <div className="bg-white dark:bg-dark-card border-b border-gray-200 dark:border-dark-border shadow-sm smooth-transition">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-lg smooth-transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-neon-cyan dark:to-neon-purple bg-clip-text text-transparent">
              AI Ticket Wizard
            </h1>
            <button
              onClick={handleClose}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-lg smooth-transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center justify-between">
            {progressSteps.map((step, index) => (
              <div key={step.order} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium smooth-transition ${
                      currentOrder >= step.order
                        ? 'bg-blue-600 dark:bg-neon-cyan text-white dark:text-gray-900'
                        : 'bg-gray-200 dark:bg-dark-surface text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {step.order}
                  </div>
                  <span
                    className={`mt-1 text-xs font-medium smooth-transition ${
                      currentOrder >= step.order
                        ? 'text-blue-600 dark:text-neon-cyan'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {index < progressSteps.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 mx-2 smooth-transition ${
                      currentOrder > step.order
                        ? 'bg-blue-600 dark:bg-neon-cyan'
                        : 'bg-gray-200 dark:bg-dark-surface'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Outlet />
      </div>
    </div>
  );
}

