# JiraViz - Jira Ticket Visualizer

A modern, frontend-only tool for managing and visualizing Jira tickets with AI-powered summaries.

## Features

- 🌳 **Tree-Style Navigation**: Hierarchical view of tickets showing parent-child relationships (Initiatives → Epics → Stories → Subtasks)
- 🤖 **AI Summaries**: Generate individual ticket summaries or aggregated summaries for multiple tickets using OpenAI
- 💾 **Local Storage**: All data stored locally using sql.js (SQLite in the browser)
- 🔄 **Smart Sync**: Auto-fetches initiatives and epics when no tickets present, or manually sync all tickets
- ✏️ **Full CRUD Operations**: Create, read, update, and delete tickets
- 💬 **Comments**: View and add comments to tickets
- 🎨 **Status Indicators**: Color-coded status badges for quick visual identification
- 🔍 **Search & Filter**: Filter tickets by status, search by key or summary
- ⚙️ **Configurable Project**: Works with any Jira project (default: EVO)

## Tech Stack

- React 18 + TypeScript + Vite
- Tailwind CSS for styling
- sql.js for local SQLite database
- TanStack Query for data management
- OpenAI API for ticket summarization
- Jira REST API v3

## Prerequisites

- Node.js 18+ and npm
- A Jira account with API access
- An OpenAI API key (or compatible LLM API)

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

The application will open at `http://localhost:5173`

### 3. Configure Settings

On first launch, you'll be prompted to configure:

#### Jira Configuration
- **Jira URL**: Your Atlassian instance URL (e.g., `https://your-domain.atlassian.net`)
- **Email**: Your Jira account email
- **API Token**: Generate one at [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)
- **Default Project**: The project key (e.g., `EVO`)

#### LLM Configuration
- **Base URL**: API endpoint (default: `https://api.openai.com/v1`)
- **API Key**: Your OpenAI API key
- **Model**: Model name (default: `gpt-5-mini`)
- **Custom Headers**: Optional JSON object for additional headers

### 4. Sync Tickets

Click the "Sync" button in the header to fetch tickets from Jira. All tickets are stored locally and can be accessed offline.

## Usage

### Initial Sync

When you first open the app after configuration, it will automatically fetch all initiatives and epics from your configured project. This happens once when the database is empty.

### Tree Navigation

- Click on any ticket to view details in the right panel
- Use chevron icons to expand/collapse parent tickets
- Color-coded status indicators:
  - 🟢 Green: Done
  - 🟡 Yellow: In Progress
  - 🔵 Blue: To Do

### Syncing More Tickets

**Sync Button Options** (hover to see dropdown):
- **Sync Epics & Stories**: Fetches initiatives, epics, and their immediate children (recommended, faster)
- **Sync All Tickets**: Fetches every ticket in the project (slower but complete)

### Filtering

- Use the search bar to find tickets by key or summary
- Click status badges to filter by status
- Click "Clear filters" to reset

### AI Summaries

- **Individual Summary**: Click "Generate" in the ticket detail panel
- **Aggregated Summary**: Click "Summarize" button above the tree to get an overview of all visible tickets

### Editing Tickets

1. Select a ticket from the tree
2. Click "Edit" in the detail panel
3. Modify fields as needed
4. Click "Save" to sync changes back to Jira

### Comments

1. Click "Load" in the Comments section of ticket detail
2. View existing comments
3. Add new comments in the text area
4. Comments are synced with Jira

## Project Structure

```
/jiraviz
├── src/
│   ├── components/          # React components
│   │   ├── Settings.tsx     # Configuration UI
│   │   ├── TicketTree.tsx   # Tree view component
│   │   └── TicketDetail.tsx # Ticket detail panel
│   ├── services/            # Core services
│   │   ├── database.ts      # sql.js database layer
│   │   ├── jira.ts          # Jira API client
│   │   └── llm.ts           # OpenAI integration
│   ├── hooks/               # React hooks
│   │   ├── useConfig.ts     # Configuration management
│   │   ├── useTickets.ts    # Ticket operations
│   │   └── useSummary.ts    # AI summary generation
│   ├── types/               # TypeScript types
│   │   └── index.ts
│   ├── utils/               # Utility functions
│   ├── App.tsx              # Main application
│   └── main.tsx             # Entry point
├── docs/                    # Documentation
│   ├── guides/              # User guides
│   ├── implementation/      # Technical implementation
│   └── architecture/        # Architecture docs
├── package.json
├── vite.config.ts
├── CHANGELOG.md
├── QUICKSTART.md
└── README.md
```

## Data Storage

All data is stored locally in your browser using **IndexedDB**:
- **Configuration**: IndexedDB config store
- **Tickets & Summaries**: SQL.js database stored in IndexedDB
- **Preferences**: IndexedDB preferences store

**Storage capacity**: 50-500 MB (browser-dependent, 10-50x more than localStorage)

**Benefits**:
- Large storage capacity for thousands of tickets with embeddings
- Fast binary storage (no base64 encoding)
- No quota exceeded errors

To reset all data, open browser DevTools and run:
```javascript
indexedDB.deleteDatabase('jiraviz')
// Then reload the page
```

**Note**: Private/incognito mode may have limited or no IndexedDB access. The app will run in memory-only mode with a warning banner.

## Building for Production

```bash
npm run build
```

The build output will be in the `dist` directory. You can serve it with any static file server.

## Documentation

For more detailed documentation, see the [docs](./docs) directory:
- **[Guides](./docs/guides)** - User guides and troubleshooting
- **[Implementation](./docs/implementation)** - Technical implementation details
- **[Architecture](./docs/architecture)** - Architecture and design docs

## Troubleshooting

For comprehensive troubleshooting, see [docs/guides/TROUBLESHOOTING.md](./docs/guides/TROUBLESHOOTING.md)

### "Failed to initialize database"
- Clear browser cache and reload
- Check browser console for specific errors
- Ensure browser supports IndexedDB

### "Failed to sync with Jira" or CORS Errors

**This is the most common issue!**

The error message will say: `"Access to XMLHttpRequest... has been blocked by CORS policy"`

**Solution:**
1. **Restart your dev server** - The Vite proxy is configured but requires restart
2. Stop the server (Ctrl+C) and run `npm run dev` again
3. The proxy will forward requests through `localhost:5173` to Jira

**Why this happens:**
- Browsers block direct API calls to Jira (CORS security policy)
- In development: Vite proxy solves this
- In production: Deploy the built app to a static host or use a proxy server

**Other checks:**
- Verify Jira URL is correct (no trailing slash)
- Check API token is valid
- Ensure you have permissions to access the project

### "Failed to generate summary"
- Verify LLM API key is correct
- Check base URL is correct
- Ensure you have sufficient API credits

## Security Notes

- All credentials are stored in browser localStorage (not encrypted at rest)
- API calls are made directly from the browser
- For production use, consider implementing proper credential encryption
- This is a frontend-only tool - no backend server is used

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

