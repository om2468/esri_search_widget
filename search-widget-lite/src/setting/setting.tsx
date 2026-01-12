/** @jsx jsx */
import { React, jsx, DataSourceTypes, DataSourceJson } from 'jimu-core';
import { AllWidgetSettingProps } from 'jimu-for-builder';
import { TextInput } from 'jimu-ui';
import { SettingSection, SettingRow } from 'jimu-ui/advanced/setting-components';
import { IMConfig } from '../../config';

// Schema for the output data source - matches FME API response fields
const OUTPUT_DS_SCHEMA = {
    fields: {
        objectid: { name: 'objectid', alias: 'objectid', type: 'esriFieldTypeOID' },
        id: { name: 'id', alias: 'id', type: 'esriFieldTypeString', length: 50 },
        title: { name: 'title', alias: 'title', type: 'esriFieldTypeString', length: 255 },
        name: { name: 'name', alias: 'name', type: 'esriFieldTypeString', length: 255 },
        description: { name: 'description', alias: 'description', type: 'esriFieldTypeString', length: 2000 },
        type: { name: 'type', alias: 'type', type: 'esriFieldTypeString', length: 100 },
        tags: { name: 'tags', alias: 'tags', type: 'esriFieldTypeString', length: 500 },
        thumbnail: { name: 'thumbnail', alias: 'thumbnail', type: 'esriFieldTypeString', length: 500 },
        rrf_score: { name: 'rrf_score', alias: 'rrf_score', type: 'esriFieldTypeDouble' },
        score: { name: 'score', alias: 'score', type: 'esriFieldTypeDouble' },
        prettyurl: { name: 'prettyurl', alias: 'prettyurl', type: 'esriFieldTypeString', length: 500 },
        mapurl: { name: 'mapurl', alias: 'mapurl', type: 'esriFieldTypeString', length: 500 },
        url: { name: 'url', alias: 'url', type: 'esriFieldTypeString', length: 500 }
    }
};

export default function Setting(props: AllWidgetSettingProps<IMConfig>) {
    const { config, onSettingChange, id, outputDataSources } = props;

    // Check if output data source exists
    const hasOutputDs = outputDataSources && outputDataSources.length > 0;

    // Create output data source on mount if it doesn't exist
    React.useEffect(() => {
        if (!hasOutputDs) {
            createOutputDataSource();
        }
    }, []);

    const createOutputDataSource = () => {
        const outputDsId = `${id}-output`;

        const outputDsJson: DataSourceJson = {
            id: outputDsId,
            type: DataSourceTypes.FeatureLayer as any,
            label: 'Search Results',
            sourceLabel: 'Search Widget Lite Output',
            isOutputFromWidget: true,
            isDataInDataSourceInstance: true,
            geometryType: null as any,
            schema: OUTPUT_DS_SCHEMA as any
        };

        // Save the output data source configuration
        onSettingChange(
            { id: id },
            [outputDsJson]
        );

        console.log('Created output data source:', outputDsId);
    };

    const updateConfig = (key: string, value: string) => {
        onSettingChange({
            id: id,
            config: config ? config.set(key, value) : { [key]: value }
        });
    };

    return (
        <div className="widget-setting">
            <SettingSection title="API Configuration">
                <SettingRow label="API Endpoint URL">
                    <TextInput
                        size="sm"
                        value={config?.apiUrl || 'https://fme-docker.tensing.app:443/fmedatastreaming/embeddings/search.fmw'}
                        onChange={(e: any) => updateConfig('apiUrl', e.target.value)}
                    />
                </SettingRow>
                <SettingRow label="API Token">
                    <TextInput
                        size="sm"
                        type="password"
                        value={config?.apiToken || ''}
                        onChange={(e: any) => updateConfig('apiToken', e.target.value)}
                        placeholder="Enter API token"
                    />
                </SettingRow>
            </SettingSection>

            <SettingSection title="Output Data Source">
                <SettingRow>
                    <div style={{ fontSize: '12px', padding: '8px 0' }}>
                        {hasOutputDs ? (
                            <div style={{ color: '#166534', background: '#dcfce7', padding: '8px', borderRadius: '4px' }}>
                                <strong>✓ Output Data Source Ready</strong><br />
                                Native List/Table widgets can now connect to search results.<br />
                                <em style={{ fontSize: '11px' }}>ID: {id}-output</em>
                            </div>
                        ) : (
                            <div style={{ color: '#0369a1', background: '#e0f2fe', padding: '8px', borderRadius: '4px' }}>
                                <strong>Creating Output Data Source...</strong><br />
                                This allows native widgets to consume search results.
                            </div>
                        )}
                    </div>
                </SettingRow>
            </SettingSection>

            <SettingSection title="Available Fields">
                <SettingRow>
                    <ul style={{ fontSize: '11px', color: '#666', paddingLeft: '16px', margin: 0 }}>
                        <li><code>title</code> - Result title</li>
                        <li><code>description</code> - Result description</li>
                        <li><code>type</code> - Layer/item type</li>
                        <li><code>thumbnail</code> - Thumbnail URL</li>
                        <li><code>rrf_score</code> - Relevance score</li>
                        <li><code>prettyurl</code> - Detail page URL</li>
                        <li><code>mapurl</code> - Map viewer URL</li>
                    </ul>
                </SettingRow>
            </SettingSection>
        </div>
    );
}
