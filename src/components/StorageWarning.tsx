import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface StorageWarningProps {
  onDismiss?: () => void;
}

export function StorageWarning({ onDismiss }: StorageWarningProps) {
  const [dismissed, setDismissed] = useState(false);

  const handleDismiss = () => {
    setDismissed(true);
    if (onDismiss) {
      onDismiss();
    }
  };

  if (dismissed) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500/95 dark:bg-yellow-600/95 text-gray-900 dark:text-gray-100 px-4 py-3 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold mb-1">Storage Unavailable - Memory-Only Mode</h3>
          <p className="text-sm opacity-90">
            IndexedDB storage is not available in your current browser context (possibly due to private/incognito mode).
            Your data will work normally during this session but <strong>will not persist</strong> after closing the browser.
            Please use a regular browsing session for persistent storage.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded transition-colors"
          aria-label="Dismiss warning"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

