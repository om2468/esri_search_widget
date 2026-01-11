# ArcGIS Hub Search Integration

This folder contains code for integrating the FME search API with ArcGIS Hub.

## ⚠️ Important: Hub Strips Script Tags

**ArcGIS Hub removes `<script>` tags from Text cards for security.** The direct injection approach (`search-card.html`) won't work because Hub strips the JavaScript.

## ✅ Recommended Solution: Iframe Embed

Host the search page externally and embed it in Hub using an iframe.

### Option A: GitHub Pages (Recommended - Free)

1. **Create a GitHub repo** or use your existing one
2. **Push `search-standalone.html`** to the repo
3. **Enable GitHub Pages** in repo Settings → Pages → Source: main branch
4. **Get the URL** (e.g., `https://yourusername.github.io/repo-name/hub-integration/search-standalone.html`)
5. **Embed in Hub** (see below)

### Option B: Other Hosting

Upload `search-standalone.html` to any web server (S3, Azure, Netlify, etc.) and use that URL.

### Embed in Hub

1. Edit your Hub site page
2. Add an **Embed** card (not Text card)
3. Choose "Embed a website"
4. Paste your hosted URL
5. Set height (recommended: 600-800px)
6. Save and publish

---

## Files

| File | Description | Use Case |
|------|-------------|----------|
| `search-standalone.html` | **Complete standalone page** | Host externally, embed via iframe ✅ |
| `search-card.html` | Direct injection (reference only) | Doesn't work due to Hub security ❌ |

## Customization

### API Configuration
Edit `search-standalone.html` and update the CONFIG object:
```javascript
const CONFIG = {
  API_URL: 'https://your-api-url.com/endpoint',
  TOKEN: 'your-token-here'
};
```

### Styling
The CSS can be modified to match your branding - colors, fonts, card styles, etc.

## Comparison with Experience Builder

| Feature | Hub (Iframe) | Experience Builder |
|---------|--------------|-------------------|
| Setup Time | ~30 minutes | ~1 hour |
| Hosting | Requires external hosting | Requires self-hosting |
| Hub Security | Works with iframe ✅ | N/A |
| Map Integration | None | Full widget actions |
| Best For | Simple portals | Production apps |

