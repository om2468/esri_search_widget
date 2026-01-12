/** @jsx jsx */
import { React, jsx, DataSourceTypes, DataSourceJson } from 'jimu-core';
import { AllWidgetSettingProps } from 'jimu-for-builder';
import { TextInput } from 'jimu-ui';
import { SettingSection, SettingRow } from 'jimu-ui/advanced/setting-components';
import { IMConfig } from '../../config';

// Schema for the output data source - using object format with jimuName for proper field mapping
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
        id: {
            jimuName: 'id',
            name: 'id',
            alias: 'id',
            type: 'STRING',
            esriType: 'esriFieldTypeString'
        },
        title: {
            jimuName: 'title',
            name: 'title',
            alias: 'title',
            type: 'STRING',
            esriType: 'esriFieldTypeString'
        },
        name: {
            jimuName: 'name',
            name: 'name',
            alias: 'name',
            type: 'STRING',
            esriType: 'esriFieldTypeString'
        },
        description: {
            jimuName: 'description',
            name: 'description',
            alias: 'description',
            type: 'STRING',
            esriType: 'esriFieldTypeString'
        },
        type: {
            jimuName: 'type',
            name: 'type',
            alias: 'type',
            type: 'STRING',
            esriType: 'esriFieldTypeString'
        },
        tags: {
            jimuName: 'tags',
            name: 'tags',
            alias: 'tags',
            type: 'STRING',
            esriType: 'esriFieldTypeString'
        },
        thumbnail: {
            jimuName: 'thumbnail',
            name: 'thumbnail',
            alias: 'thumbnail',
            type: 'STRING',
            esriType: 'esriFieldTypeString'
        },
        rrf_score: {
            jimuName: 'rrf_score',
            name: 'rrf_score',
            alias: 'rrf_score',
            type: 'NUMBER',
            esriType: 'esriFieldTypeDouble'
        },
        score: {
            jimuName: 'score',
            name: 'score',
            alias: 'score',
            type: 'NUMBER',
            esriType: 'esriFieldTypeDouble'
        },
        prettyurl: {
            jimuName: 'prettyurl',
            name: 'prettyurl',
            alias: 'prettyurl',
            type: 'STRING',
            esriType: 'esriFieldTypeString'
        },
        mapurl: {
            jimuName: 'mapurl',
            name: 'mapurl',
            alias: 'mapurl',
            type: 'STRING',
            esriType: 'esriFieldTypeString'
        },
        url: {
            jimuName: 'url',
            name: 'url',
            alias: 'url',
            type: 'STRING',
            esriType: 'esriFieldTypeString'
        }
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
