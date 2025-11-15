/**
 * Date utility functions for formatting and date range operations
 */

/**
 * Get a human-readable "time ago" string from a date
 * @param dateString ISO date string
 * @returns Human-readable time ago string (e.g., "7 days ago", "3 hours ago")
 */
export function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSecs < 60) {
    return 'just now';
  } else if (diffMins < 60) {
    return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  } else if (diffWeeks < 4) {
    return `${diffWeeks} ${diffWeeks === 1 ? 'week' : 'weeks'} ago`;
  } else if (diffMonths < 12) {
    return `${diffMonths} ${diffMonths === 1 ? 'month' : 'months'} ago`;
  } else {
    return `${diffYears} ${diffYears === 1 ? 'year' : 'years'} ago`;
  }
}

/**
 * Get date range for a preset option
 * @param preset Preset name: '7days', '1month', '3months', '6months'
 * @returns Object with from and to date strings (ISO format)
 */
export function getDateRangePreset(preset: string): { from: string; to: string } {
  const now = new Date();
  const from = new Date();

  switch (preset) {
    case '7days':
      from.setDate(now.getDate() - 7);
      break;
    case '1month':
      from.setMonth(now.getMonth() - 1);
      break;
    case '3months':
      from.setMonth(now.getMonth() - 3);
      break;
    case '6months':
      from.setMonth(now.getMonth() - 6);
      break;
    default:
      from.setDate(now.getDate() - 7);
  }

  return {
    from: from.toISOString().split('T')[0], // YYYY-MM-DD format
    to: now.toISOString().split('T')[0],
  };
}

/**
 * Check if a date is within a given range
 * @param dateString ISO date string to check
 * @param from Optional start date (ISO string or YYYY-MM-DD)
 * @param to Optional end date (ISO string or YYYY-MM-DD)
 * @returns True if date is within range (inclusive)
 */
export function isDateInRange(dateString: string, from?: string, to?: string): boolean {
  const date = new Date(dateString);
  
  if (from) {
    const fromDate = new Date(from);
    fromDate.setHours(0, 0, 0, 0);
    if (date < fromDate) {
      return false;
    }
  }

  if (to) {
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);
    if (date > toDate) {
      return false;
    }
  }

  return true;
}

/**
 * Check if a date is within the last N days
 * @param dateString ISO date string to check
 * @param days Number of days to check
 * @returns True if date is within the last N days
 */
export function isWithinLastNDays(dateString: string, days: number): boolean {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  return diffDays <= days;
}

/**
 * Format a date string to a readable format
 * @param dateString ISO date string
 * @param format Format type: 'short', 'long', or 'relative'
 * @returns Formatted date string
 */
export function formatDate(dateString: string, format: 'short' | 'long' | 'relative' = 'short'): string {
  const date = new Date(dateString);

  switch (format) {
    case 'short':
      return date.toLocaleDateString();
    case 'long':
      return date.toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    case 'relative':
      return getTimeAgo(dateString);
    default:
      return date.toLocaleDateString();
  }
}

