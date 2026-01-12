# ArcGIS Experience Builder Custom Widget Development

## Project Overview

This project provides **two approaches** for integrating the FME search API with ArcGIS:

1. **Experience Builder Widget** (`search-widget/`) - Full custom widget for Developer Edition
2. **ArcGIS Hub Integration** (`hub-integration/`) - JavaScript injection for Hub sites

## Approach 1: Experience Builder Widget


### Key Files

```
search-widget/
├── manifest.json              # Widget metadata (no jimu-ui dependency)
├── src/
│   └── runtime/
│       └── widget.tsx         # Main widget using plain HTML elements
└── translations/
    └── default.ts             # i18n strings (optional)
```

### Key Points for Widget Development

1. **Only import from `jimu-core`** - avoid `jimu-ui` unless you test it thoroughly
2. **Use plain HTML elements** instead of Calcite/jimu-ui components for reliability
3. **Keep manifest.json minimal** - remove unnecessary dependencies
4. **Widget location**: `client/your-extensions/widgets/<widget-name>/`
5. **Required manifest fields**: `name`, `label`, `type`, `version`, `exbVersion`, `translatedLocales`

### Running the Development Environment

```bash
# Terminal 1: Server (port 3001)
cd ~/arcgis-experience-builder-1.19/server
npm ci  # first time only
npm start

# Terminal 2: Client (webpack)
cd ~/arcgis-experience-builder-1.19/client
npm ci  # first time only
npm start
```

---

## Issues Encountered & Solutions

### ❌ Issue 1: Widget Not Appearing in Widget Panel

**Symptom**: Widget compiled but didn't show up in Experience Builder's widget list.

**Cause**: Missing `label` property in `manifest.json`.

**Solution**: Add the `label` field:
```json
{
  "name": "search-widget",
  "label": "API Search Widget",  // ← This was missing!
  "type": "widget",
  ...
}
```

---

### ❌ Issue 2: "The widget could not be loaded due to an unexpected error"

**Symptom**: Widget appeared in the Custom section but showed error when dragged to canvas.

**Console Error**: `Error: Unknown dependency: jimu-ui`

**Cause**: Importing from `jimu-ui` in the widget code and declaring it in manifest's `dependency` array caused a runtime resolution failure.

**What Didn't Work**:
- Adding `"dependency": ["jimu-ui"]` to manifest.json
- Importing `{ TextInput, Button, Loading, Alert }` from `jimu-ui`

**Solution**: Remove all `jimu-ui` imports and use plain HTML elements instead:
```tsx
// ❌ DON'T DO THIS
import { TextInput, Button, Loading, Alert } from 'jimu-ui';

// ✅ DO THIS INSTEAD
// Use plain HTML elements
<input type="text" className="search-input" ... />
<button className="search-btn" ... />
<div className="loading-spinner"></div>
```

Also remove from manifest:
```json
// ❌ Remove this
"dependency": ["jimu-ui"]
```

---

### ❌ Issue 3: Config Import Path Errors

**Symptom**: Setting page failed to load due to import errors.

**Cause**: Separated `config.ts` file with imports that couldn't be resolved.

**Solution**: 
1. Inline the config interface and defaults directly in `widget.tsx`
2. Set `"hasConfig": false` and `"hasSettingPage": false` in manifest (or remove them entirely)
3. If settings needed, ensure proper relative import paths

---

### ❌ Issue 4: Only Server Running, Not Client

**Symptom**: Widget not compiling, not appearing in Experience Builder.

**Cause**: User only started the server (port 3001), not the client (webpack).

**Solution**: Run BOTH services in separate terminals:
- Server: Handles the builder UI
- Client: Compiles custom widgets via webpack

---

## Best Practices

1. **Start simple**: Begin with minimal widget code that just renders text
2. **Check client terminal**: Watch for webpack compilation errors
3. **Check browser console**: Look for runtime errors with F12/DevTools
4. **Restart client after structural changes**: New files, manifest edits, folder renames
5. **Use `exbVersion` matching your installation**: Check your Experience Builder version
6. **Test incrementally**: Add features one at a time to isolate issues

## API Configuration

The widget calls the FME search API:
```typescript
const config = {
  baseUrl: 'https://fme-docker.tensing.app:443/fmedatastreaming/embeddings/search.fmw',
  token: '067e63151ac94654d38a7c5d23832396073317cb',
  pageSize: 40
};
```

## Deployment Guide (Publishing to ArcGIS Online)

Since you are using Experience Builder **Developer Edition**, applications are self-hosted. You cannot "upload" the widget directly to the standard ArcGIS Online builder; instead, you host the compiled application on your own server and link it to ArcGIS Online.

### 1. Build and Publish Locally
1. In your local Experience Builder (`https://localhost:3001/builder/`), ensure your app is saved.
2. Click the **Publish** button in the top toolbar. This prepares the production-ready code.

### 2. Download the Application
1. Go back to the Experience Builder **Home Gallery**.
2. Find your application.
3. Click the **...** (More actions) menu on the app card and select **Download**.
4. This will give you a ZIP file containing the entire web application.

### 3. Host on a Web Server
1. Extract the ZIP file.
2. Upload the contents to a web server that supports **HTTPS** (e.g., Amazon S3, Azure Blob Storage, IIS, Apache, or GitHub Pages).
3. Ensure the server has a public URL (e.g., `https://yourserver.com/search-app/`).

### 4. Register in ArcGIS Online
1. Log in to your **ArcGIS Online** account.
2. Go to **Content** > **New Item**.
3. Select **Application** > **Web Mapping**.
4. Enter the **URL** where you hosted the app in Step 3.
5. Provide a Title and Tags, then click **Save**.

### 5. Finalize Authentication (If private)
If your app needs to access private layers or requires user login:
1. In the item details page in AGOL, go to **Settings**.
2. Find the **App Registration** section and click **Register**.
3. Keep the App Type as "Browser" and add your host URL to the **Redirect URIs**.
4. Copy the **AppID (Client ID)**.
5. In your hosted files, open `site/config.json` and update the `clientId` field with the copied AppID.

---

## Approach 2: ArcGIS Hub Integration

An alternative approach using JavaScript injection in Hub Text cards. See `hub-integration/README.md` for full details.

### Quick Setup
1. Edit your Hub site page
2. Add a **Text** card
3. Click **</>** (Edit in HTML)
4. Paste contents of `hub-integration/search-card.html`
5. Save and publish

### When to Use Hub vs Experience Builder

| Use Case | Recommended Approach |
|----------|---------------------|
| Quick prototype | Hub |
| Open data portal | Hub |
| Complex map interactions | Experience Builder |
| Production app | Experience Builder |
| No hosting available | Hub |

---

## Approach 3: Search Widget Lite (Output Data Source)

A minimal search widget (`search-widget-lite/`) that publishes results via **Output Data Source** for consumption by native Experience Builder widgets.

### Key Files

```
search-widget-lite/
├── manifest.json              # Widget metadata with publishMessages
├── config.ts                  # API configuration interface
├── src/
│   ├── runtime/
│   │   └── widget.tsx         # Minimal search UI (~100 lines)
│   └── setting/
│       └── setting.tsx        # Settings page + Output DS creation
└── translations/
    └── default.ts             # i18n strings
```

### How It Works

1. **Widget publishes to Output Data Source** after search:
```tsx
const outputDs = DataSourceManager.getInstance()
  .getDataSource(this.props.outputDataSources?.[0]);

outputDs.setSourceRecords(records);
outputDs.setStatus(DataSourceStatus.Unloaded);
```

2. **Native widgets connect** to the output data source in their settings
3. **Widget-to-widget actions** work automatically (List → Map zoom, etc.)

### Integration Steps

1. **Copy widget to Experience Builder**:
   ```bash
   cp -r search-widget-lite ~/arcgis-experience-builder-1.19/client/your-extensions/widgets/
   ```

2. **Restart client** (webpack needs to compile new widget)

3. **Add widget to experience**:
   - Drag "Search Widget Lite" from Custom widgets
   - Configure API settings in widget panel

4. **Add native List widget**:
   - In Data section, select "Search Widget Lite Output" as data source
   - Configure which fields to display (title, description, etc.)

5. **Configure actions** (optional):
   - List widget → Settings → Actions
   - "Record selection changes" → Map widget "Zoom to"

### Output Data Source Schema

| Field | Type | Description |
|-------|------|-------------|
| `objectid` | OID | Unique record ID |
| `title` | String | Result title |
| `description` | String | Result snippet |
| `type` | String | Layer/item type |
| `thumbnail` | String | Thumbnail URL |
| `rrf_score` | Double | Relevance score (0-1) |
| `prettyurl` | String | Detail page URL |
| `mapurl` | String | Map viewer URL |

### Comparison: Full Widget vs Lite Widget

| Aspect | search-widget (Full) | search-widget-lite |
|--------|---------------------|-------------------|
| Lines of code | 842 | ~220 |
| UI Components | Cards, pagination, sorting | Search bar only |
| Result display | Built-in | Native List/Table widget |
| Customization | Code changes required | Configure native widgets |
| Forward compatibility | Manual updates needed | Esri updates widgets |
| Widget-to-widget actions | Custom implementation | Native support |

---

## Useful Resources

- [Installation Guide](https://developers.arcgis.com/experience-builder/guide/install-guide/)
- [Widget Development Guide](https://developers.arcgis.com/experience-builder/guide/getting-started-widget/)
- [Widget Manifest Reference](https://developers.arcgis.com/experience-builder/guide/widget-manifest/)
- [Sample Widgets](https://github.com/esri/arcgis-experience-builder-sdk-resources)
- [Output Data Sources](https://developers.arcgis.com/experience-builder/guide/core-concepts/data-source/#widget-output-data-sources)
- [Message Actions](https://developers.arcgis.com/experience-builder/guide/core-concepts/message-action/)

