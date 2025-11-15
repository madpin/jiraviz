// Jira Types
export interface JiraTicket {
  id: string;
  key: string;
  summary: string;
  description: string | null;
  descriptionADF?: any; // Original Atlassian Document Format data for rich formatting
  status: string;
  statusCategory: string;
  issueType: string;
  priority: string | null;
  assignee: string | null;
  assigneeEmail: string | null;
  assigneeAccountId: string | null;
  reporter: string | null;
  reporterEmail: string | null;
  reporterAccountId: string | null;
  created: string;
  updated: string;
  parentId: string | null;
  parentKey: string | null;
  subtasks: string[];
  labels: string[];
  components: string[];
  projectKey: string;
  // Additional useful fields
  comments: JiraComment[];
  dueDate: string | null;
  resolutionDate: string | null;
  resolution: string | null;
  timeTracking: {
    originalEstimate?: string;
    remainingEstimate?: string;
    timeSpent?: string;
  } | null;
  attachmentCount: number;
  // AI/ML fields
  embedding?: number[] | null;
}

export interface JiraComment {
  id: string;
  author: string;
  body: string;
  bodyADF?: any; // Original Atlassian Document Format data for rich formatting
  created: string;
  updated: string;
}

export interface JiraUser {
  accountId: string;
  displayName: string;
  emailAddress?: string;
  avatarUrl?: string;
}

// Configuration Types
export interface JiraConfig {
  url: string;
  token: string;
  userEmail: string;
  defaultProject: string;
}

export interface LLMConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  headers: Record<string, string>;
}

export interface SyncPreferences {
  syncComments: boolean;
}

export interface AppConfig {
  jira?: JiraConfig;
  llm?: LLMConfig;
  sync?: SyncPreferences;
}

// Summary Types
export type SummaryType = 'individual' | 'aggregated';

export interface TicketSummary {
  id: string;
  ticketId: string;
  type: SummaryType;
  content: string;
  createdAt: string;
}

// Tree Node Types
export interface TicketTreeNode extends JiraTicket {
  children: TicketTreeNode[];
  isExpanded?: boolean;
}

// Filter Types
export interface TicketFilters {
  status?: string[];
  assignee?: string[];
  reporter?: string[];
  issueType?: string[];
  component?: string[];
  search?: string;
  dateField?: 'updated' | 'created';
  dateFrom?: string;
  dateTo?: string;
  minComments?: number;
  hideEmptyParents?: boolean;
}

// User Preferences Types
export type ThemeMode = 'light' | 'dark' | 'system';
export type AccentColor = 'cyan' | 'purple' | 'green' | 'pink';
export type Density = 'compact' | 'comfortable' | 'spacious';
export type FontSize = 'small' | 'medium' | 'large';
export type AnimationSpeed = 'reduced' | 'normal' | 'enhanced';
export type DetailPanelPosition = 'right' | 'bottom' | 'floating';
export type TreeViewStyle = 'card' | 'list' | 'compact';

export interface VisualPreferences {
  theme: ThemeMode;
  accentColor: AccentColor;
  density: Density;
  fontSize: FontSize;
  animationSpeed: AnimationSpeed;
}

export interface LayoutPreferences {
  detailPanelPosition: DetailPanelPosition;
  detailPanelWidth: number;
  treeViewStyle: TreeViewStyle;
  sidebarCollapsible: boolean;
  rememberPanelSizes: boolean;
}

export type SortOrder = 
  | 'default' // Owner tickets first, then related, then parents, then orphans
  | 'alphabetical' // By ticket key (A-Z)
  | 'created' // By creation date (newest first)
  | 'updated' // By update date (newest first)
  | 'status' // By status
  | 'priority' // By priority
  | 'assignee'; // By assignee name

export interface DataDisplayPreferences {
  showAssignee: boolean;
  showPriority: boolean;
  showLabels: boolean;
  showDueDate: boolean;
  showDescription: boolean;
  showTicketCounts: boolean;
  showIcons: boolean;
  dateFormat: 'short' | 'long' | 'relative';
  defaultSortOrder: SortOrder;
  showReporter: boolean;
  showLastUpdated: boolean;
  closedTicketsDays: number;
}

export interface UserPreferences {
  visual: VisualPreferences;
  layout: LayoutPreferences;
  dataDisplay: DataDisplayPreferences;
}

// Parent Summary Cache Types
export interface ParentSummaryCache {
  parentId: string;
  summary: string;
  childrenIds: string[];
  createdAt: string;
}

