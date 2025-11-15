# JiraViz - Quick Start Guide

## Installation & Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Start the development server
```bash
npm run dev
```

Open your browser to `http://localhost:5173`

## First-Time Configuration

When you first open the app, you'll be prompted to configure your settings:

### Jira Configuration
1. **Jira URL**: Your Atlassian instance (e.g., `https://your-domain.atlassian.net`)
2. **Email**: Your Jira account email
3. **API Token**: Generate at https://id.atlassian.com/manage-profile/security/api-tokens
4. **Default Project**: The project key you want to work with (default: `EVO`)

### LLM Configuration
1. **Base URL**: `https://api.openai.com/v1` (or your custom endpoint)
2. **API Key**: Your OpenAI API key (starts with `sk-`)
3. **Model**: `gpt-5-mini` (recommended) or any compatible model
4. **Custom Headers**: Leave as `{}` unless you need custom headers

## Basic Usage

### Syncing Tickets
1. Click the **"Sync"** button in the top right
2. This will fetch all tickets from your configured Jira project
3. Tickets are stored locally for offline access

### Navigating Tickets
- **Tree View**: Tickets are organized hierarchically (Epics → Stories → Subtasks)
- **Click** on any ticket to view details in the right panel
- **Expand/Collapse**: Use chevron icons to show/hide child tickets
- **Search**: Use the search bar to filter by ticket key or summary
- **Filter by Status**: Click status badges to filter

### Creating Tickets
1. Click **"New Ticket"** button
2. Fill in the summary and description
3. Select issue type (Task, Story, Bug, Epic)
4. Click **"Create Ticket"**

### Editing Tickets
1. Select a ticket from the tree
2. Click **"Edit"** in the detail panel
3. Modify fields
4. Click **"Save"** to sync back to Jira

### AI Summaries

#### Individual Ticket Summary
1. Select a ticket
2. Click **"Generate"** button in the AI Summary section
3. Summary is cached for future reference

#### Aggregated Summary
1. Filter tickets as desired (or view all)
2. Click **"Summarize"** button above the tree
3. Get an overview of all visible tickets

### Comments
1. Select a ticket
2. Click **"Load"** in the Comments section
3. View existing comments
4. Add new comments and they sync to Jira

## Tips

- **Status Colors**:
  - 🟢 Green = Done
  - 🟡 Yellow = In Progress
  - 🔵 Blue = To Do
  
- **Issue Type Icons**:
  - 📚 = Epic
  - 📖 = Story
  - ✓ = Task
  - 🐛 = Bug
  - ◦ = Subtask

- **Keyboard Tips**:
  - Use Ctrl+F (Cmd+F) to search in your browser
  - Click "Expand All" to see all child tickets at once

## Data Storage

- All data is stored in your browser (localStorage + sql.js)
- Clearing browser data will erase local tickets (but not Jira data)
- Sync regularly to keep data fresh

## Troubleshooting

### "Failed to sync with Jira"
- Verify your Jira URL has no trailing slash
- Check that your API token is correct
- Ensure you have access to the project

### "Failed to generate summary"
- Verify your OpenAI API key is correct
- Check that you have API credits available
- Ensure the base URL is correct

### Tickets not appearing
- Click the "Sync" button to refresh from Jira
- Check your project key is correct
- Verify filters aren't hiding tickets

## Development

### Build for production
```bash
npm run build
```

### Run linter
```bash
npm run lint
```

### Preview production build
```bash
npm run preview
```

## Next Steps

1. Configure your Jira and LLM settings
2. Sync your tickets
3. Explore the tree navigation
4. Try generating AI summaries
5. Edit and manage your tickets

For more details, see the full [README.md](README.md)

