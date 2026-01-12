# Search Widget Lite

A minimal search widget for ArcGIS Experience Builder that publishes results via Output Data Source for consumption by native widgets (List, Table, etc.).

## Overview

This widget provides a simple search interface that:
1. Calls an external FME API to perform searches
2. Publishes results to an **Output Data Source**
3. Allows native Experience Builder widgets to consume and display the results

## Architecture

```
┌─────────────────────┐      ┌─────────────────────┐      ┌─────────────────────┐
│  Search Widget Lite │ ───► │  Output Data Source │ ───► │  List/Table Widget  │
│  (Search + API)     │      │  (FeatureLayer)     │      │  (Display Results)  │
└─────────────────────┘      └─────────────────────┘      └─────────────────────┘
```

## Installation

1. Copy the `search-widget-lite` folder to your Experience Builder extensions:
   ```bash
   cp -r search-widget-lite ~/arcgis-experience-builder-1.19/client/your-extensions/widgets/
   ```

2. Restart the Experience Builder client if running

3. The widget will appear in the widget panel under "Custom"

## Configuration

### Widget Settings

- **API Endpoint URL**: The FME API endpoint for search queries
- **API Token**: Authentication token for the API (optional)

### Output Data Source

The widget automatically creates an output data source named "Search Results" with the following fields:

| Field | Type | Description |
|-------|------|-------------|
| objectid | OID | Unique identifier |
| id | String | Item ID |
| title | String | Item title |
| name | String | Service name |
| description | String | Item description |
| type | String | Item type (FeatureServer, MapServer, etc.) |
| tags | String | Item tags (JSON array as string) |
| thumbnail | String | Thumbnail URL |
| rrf_score | Double | Relevance score (0-1) |
| score | Double | Score percentage (0-100) |
| prettyurl | String | Detail page URL |
| mapurl | String | Map viewer URL |
| url | String | Service URL |

## Usage

1. Add the Search Widget Lite to your experience
2. Configure the API endpoint in widget settings
3. Add a List or Table widget
4. Connect the List/Table to the "Search Results" output data source
5. Configure the List template to display desired fields (e.g., `{title}`, `{description}`)

## Development

### File Structure

```
search-widget-lite/
├── manifest.json          # Widget manifest
├── config.json            # Default configuration
├── config.ts              # TypeScript config interface
├── translations/
│   └── default.ts         # Translation strings
└── src/
    ├── runtime/
    │   └── widget.tsx     # Main widget component
    └── setting/
        └── setting.tsx    # Settings panel with Output DS schema
```

### Key Concepts

#### Output Data Source Schema

The schema must use **object format** with `jimuName` property for proper field mapping:

```typescript
const OUTPUT_DS_SCHEMA = {
    idField: 'objectid',
    fields: {
        title: {
            jimuName: 'title',
            name: 'title',
            alias: 'title',
            type: 'STRING',
            esriType: 'esriFieldTypeString'
        },
        // ... other fields
    }
};
```

#### Publishing Data

```typescript
// Get the output data source
const outputDs = DataSourceManager.getInstance().getDataSource(outputDsId);

// Create features with attributes
const features = results.map((item, index) => ({
    attributes: {
        objectid: index + 1,
        title: item.title,
        // ... other fields
    }
}));

// Build and set records
const records = features.map(f => outputDs.buildRecord(f));
outputDs.setSourceRecords(records);

// Signal data is ready
outputDs.setStatus(DataSourceStatus.Unloaded);
```

## Version History

- **v0.6.0**: Fixed Output Data Source field mapping with jimuName property
- **v0.5.0**: Added debugging for field mapping issues
- **v0.4.0**: Initial Output Data Source implementation

## License

MIT
