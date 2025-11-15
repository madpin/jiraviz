/**
 * Jira Field Validation
 * 
 * This validates that we're only using standard Jira REST API v3 fields
 * and not any custom or unusual fields.
 */

export const STANDARD_JIRA_FIELDS = {
  // Core issue fields
  'id': 'Unique identifier of the issue',
  'key': 'Issue key (e.g., PROJECT-123)',
  'summary': 'Issue summary/title',
  'description': 'Issue description in ADF format',
  'status': 'Current status of the issue',
  'issuetype': 'Type of issue (Story, Task, Bug, etc.)',
  'priority': 'Issue priority',
  'project': 'Project information',
  
  // User fields
  'assignee': 'User assigned to the issue',
  'reporter': 'User who reported the issue',
  'creator': 'User who created the issue',
  
  // Date fields
  'created': 'Creation timestamp',
  'updated': 'Last update timestamp',
  'resolutiondate': 'Resolution timestamp',
  'duedate': 'Due date',
  
  // Relationship fields
  'parent': 'Parent issue information',
  'subtasks': 'List of subtask issues',
  'issuelinks': 'Links to other issues',
  
  // Categorization fields
  'labels': 'Issue labels',
  'components': 'Project components',
  'fixVersions': 'Fix versions',
  'versions': 'Affected versions',
  
  // Comments and work log
  'comment': 'Comments on the issue',
  'worklog': 'Work log entries',
  
  // Additional standard fields
  'resolution': 'Issue resolution',
  'environment': 'Environment description',
  'timetracking': 'Time tracking information',
  'timeestimate': 'Original time estimate',
  'timeoriginalestimate': 'Original time estimate',
  'timespent': 'Time spent',
  
  // Attachments
  'attachment': 'File attachments',
} as const;

export const FIELDS_WE_USE = [
  'id',
  'key',
  'summary',
  'description',
  'status',
  'issuetype',
  'priority',
  'assignee',
  'reporter',
  'created',
  'updated',
  'parent',
  'subtasks',
  'labels',
  'components',
  'project',
] as const;

export const FIELDS_WE_SHOULD_FETCH = [
  'summary',
  'description',
  'status',
  'issuetype',
  'priority',
  'assignee',
  'reporter',
  'created',
  'updated',
  'parent',
  'subtasks',
  'labels',
  'components',
  'comment', // IMPORTANT: We should fetch comments!
  'duedate', // Useful for planning
  'resolutiondate', // Useful for tracking
  'resolution', // Useful for closed tickets
  'timetracking', // Useful for effort tracking
] as const;

export function validateFields(): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Validate all fields we use are standard
  FIELDS_WE_USE.forEach(field => {
    if (!(field in STANDARD_JIRA_FIELDS)) {
      issues.push(`Field "${field}" is not a standard Jira field`);
    }
  });
  
  return {
    valid: issues.length === 0,
    issues,
  };
}

export function getRecommendedFields(): string[] {
  return [...FIELDS_WE_SHOULD_FETCH];
}

// Log validation on import (dev mode only)
if (import.meta.env.DEV) {
  const result = validateFields();
  if (result.valid) {
    console.log('✅ All Jira fields are standard fields');
  } else {
    console.warn('⚠️ Field validation issues:', result.issues);
  }
}

