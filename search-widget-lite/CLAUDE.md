# Development Notes: Search Widget Lite

This document chronicles the development journey of the Search Widget Lite, including the challenges faced and solutions discovered.

## Objective

Create a minimal search widget that publishes results via an **Output Data Source**, allowing native Experience Builder widgets (List, Table) to consume and display the search results.

## The Challenge: Field Mapping Issue

### Problem

When the List widget consumed data from the Output Data Source:
- Selecting `{title}` field displayed **URL values** instead of titles
- Console debugging showed: `attributes: {undefined: 'https://...'}`
- The field names were being lost during record creation

### Initial Attempts (Failed)

#### Attempt 1: Using `setSourceFeatures`
```typescript
outputDs.setSourceFeatures(features);
```
**Result**: Data was published but List still showed wrong values.

#### Attempt 2: Using `buildRecord` with plain objects
```typescript
const records = features.map(f => outputDs.buildRecord(f));
outputDs.setSourceRecords(records);
```
**Result**: `getFieldValue('title')` returned `undefined`

#### Attempt 3: Wrapping in Graphic-like objects
```typescript
const graphicFeatures = features.map(f => ({
    attributes: f.attributes,
    feature: { attributes: f.attributes }
}));
```
**Result**: Same issue - fields stored under `undefined` key

#### Attempt 4: Importing Esri Graphic class
```typescript
import Graphic from 'esri/Graphic';
const graphics = features.map(f => new Graphic({ attributes: f.attributes }));
```
**Result**: Widget crashed - import syntax not compatible with Experience Builder

#### Attempt 5: Schema as array format
```typescript
fields: [
    { name: 'title', alias: 'title', type: 'esriFieldTypeString' },
    // ...
]
```
**Result**: Error `a.without is not a function` - Experience Builder expects object format

### Key Debugging Insights

Console logging revealed critical information:

```javascript
// Input data was CORRECT:
Title field value: "Cefas Water Quality Survey_form"
URL field value: "https://services.arcgis.com/..."

// But buildRecord produced BROKEN output:
First record getFieldValue title: undefined
First record getFieldValue url: undefined

// The attributes were stored with undefined keys:
Record.feature.attributes: {undefined: 'https://...'}
```

This showed that:
1. Our input data was correct
2. The schema existed with correct field names
3. But `buildRecord` was NOT mapping our attribute keys to the schema fields

### The Solution: `jimuName` Property

**Root Cause**: Experience Builder's internal data framework uses `jimuName` for field resolution, not just `name`.

**Fix**: Add `jimuName` property to each field in the schema:

```typescript
const OUTPUT_DS_SCHEMA = {
    idField: 'objectid',
    fields: {
        title: {
            jimuName: 'title',  // ← This was the missing piece!
            name: 'title',
            alias: 'title',
            type: 'STRING',          // JimuFieldType, not esriFieldType
            esriType: 'esriFieldTypeString'
        },
        // ... other fields
    }
};
```

### Key Learnings

1. **Schema format**: Experience Builder expects `fields` as an **object** keyed by field name, not an array

2. **jimuName is required**: Each field must have a `jimuName` property that matches the key and the attribute name

3. **Use JimuFieldType**: The `type` property should use JimuFieldType values (`STRING`, `NUMBER`) not esriFieldType values

4. **esriType is separate**: Use `esriType` for the Esri-specific type

5. **Cache invalidation**: After changing the schema, you must create a **new experience** - the old one caches the broken schema

## Final Working Implementation

### Schema (setting.tsx)
```typescript
const OUTPUT_DS_SCHEMA = {
    idField: 'objectid',
    fields: {
        objectid: {
            jimuName: 'objectid',
            name: 'objectid',
            alias: 'objectid',
            type: 'NUMBER',
            esriType: 'esriFieldTypeOID'
        },
        title: {
            jimuName: 'title',
            name: 'title',
            alias: 'title',
            type: 'STRING',
            esriType: 'esriFieldTypeString'
        },
        // ... etc
    }
};
```

### Publishing Data (widget.tsx)
```typescript
// Create features with attributes matching schema field names
const features = results.map((item, index) => ({
    attributes: {
        objectid: index + 1,
        title: item.title || 'Untitled',
        // ... other fields
    }
}));

// Build records and publish
const records = features.map(f => outputDs.buildRecord(f));
outputDs.setSourceRecords(records);
outputDs.setStatus(DataSourceStatus.Unloaded);
```

## Resources

- [Experience Builder Data Sources Guide](https://developers.arcgis.com/experience-builder/guide/core-concepts/data-source/)
- [Output Data Sources Documentation](https://developers.arcgis.com/experience-builder/guide/core-concepts/data-source/#widget-output-data-sources)

## Conclusion

The Output Data Source pattern in Experience Builder is powerful but requires precise schema configuration. The `jimuName` property is the critical piece that enables proper field mapping between your widget's data and the consuming widgets.
