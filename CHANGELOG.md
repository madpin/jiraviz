# Changelog

## [0.2.0] - 2024-11-14

### Added
- **Auto-fetch on empty state**: Automatically fetches initiatives and epics when no tickets are present
- **Smart sync options**: Two sync modes available via dropdown menu
  - Sync Epics & Stories (default, faster)
  - Sync All Tickets (comprehensive)
- **Configurable project**: Project key is now fully configurable in settings
- **Better logging**: Console logs for debugging sync and configuration

### Fixed
- **SQL.js loading**: Now loads from CDN to avoid ES module issues with Vite
- **Configuration persistence**: Settings now properly reload after saving
- **TypeScript errors**: Fixed all type issues and build errors

### Changed
- Sync button now labeled "Sync Epics" with dropdown for options
- Default sync behavior focuses on initiatives, epics, and their children
- Project configuration is prominently displayed in header

## [0.1.0] - 2024-11-14

### Initial Release
- Tree-style ticket navigation
- Jira REST API integration
- OpenAI-powered ticket summaries
- Local SQLite storage with sql.js
- Full CRUD operations on tickets
- Comment support
- Search and filter functionality
- Settings management for Jira and LLM configuration

