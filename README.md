# API Search Widget for ArcGIS Experience Builder

A custom widget for ArcGIS Experience Builder Developer Edition that integrates with the FME search API to search and display records.

## Features

- 🔍 **Search Integration**: Calls FME search API with configurable endpoint and token
- 🎨 **Modern UI**: Calcite-styled result cards with thumbnails, badges, and tags
- 📊 **View Modes**: Toggle between grid and list views
- 📄 **Pagination**: Navigate through large result sets
- 🔀 **Sorting**: Sort by relevance or title
- ⚙️ **Configurable**: Settings panel for API URL, token, and display options

## Installation

### Prerequisites

1. **ArcGIS Experience Builder Developer Edition**
   - Download from: https://developers.arcgis.com/experience-builder/guide/downloads/
   - Requires Node.js (check recommended version)

2. **ArcGIS Online Account** (for Client ID)

### Setup Steps

1. **Download & Install Experience Builder**
   ```bash
   # After downloading, unzip to your preferred location
   cd ~/arcgis-experience-builder
   ```

2. **Create Client ID**
   - Go to ArcGIS Online > Content > New Item > Application > Other Application
   - Add redirect URL: `https://localhost:3001/`
   - Copy the Client ID

3. **Start Server**
   ```bash
   cd ~/arcgis-experience-builder/server
   npm ci
   npm start
   ```
   - Open https://localhost:3001/ and enter your org URL + Client ID

4. **Copy Widget**
   ```bash
   # Copy to Experience Builder extensions folder
   cp -r ./search-widget ~/arcgis-experience-builder/client/your-extensions/widgets/
   ```

5. **Start Client**
   ```bash
   cd ~/arcgis-experience-builder/client
   npm ci
   npm start
   ```

6. **Use the Widget**
   - Create a new experience in Experience Builder
   - Find "API Search Widget" in the widget panel
   - Drag onto canvas and configure

## Configuration

The widget can be configured via the settings panel in Experience Builder:

| Setting | Description | Default |
|---------|-------------|---------|
| API Base URL | FME search endpoint | `https://fme-docker.tensing.app:443/...` |
| API Token | Authentication token | (pre-configured) |
| Results per Page | Number of results per page | 40 |
| Description Length | Max description characters | 100 |

## File Structure

```
search-widget/
├── manifest.json          # Widget metadata
├── config.ts              # Default configuration
├── translations/
│   └── default.ts         # i18n strings
└── src/
    ├── runtime/
    │   └── widget.tsx     # Main widget component
    └── setting/
        └── setting.tsx    # Settings panel
```

## API Response Format

The widget expects search results in this format:

```json
{
  "title": "Layer Name",
  "description": "Description text",
  "type": "Feature Layer",
  "thumbnail": "https://...",
  "tags": "tag1, tag2, tag3",
  "rrf_score": 0.85,
  "prettyurl": "https://...",
  "mapurl": "https://..."
}
```

## Development

To modify the widget:

1. Edit files in `search-widget/src/`
2. The webpack server will auto-reload on most changes
3. For structural changes (new files, manifest edits), restart the client service

## License

Apache-2.0
