/** @jsx jsx */
import {
    React,
    jsx,
    css,
    AllWidgetProps,
    DataSourceManager,
    DataSourceStatus,
    FeatureDataRecord
} from 'jimu-core';
import { IMConfig, defaultConfig } from '../../config';

interface SearchResult {
    title?: string;
    name?: string;
    description?: string;
    snippet?: string;
    type?: string;
    tags?: string | string[];
    thumbnail?: string;
    rrf_score?: number;
    similarity?: number;
    score?: number;
    prettyurl?: string;
    url?: string;
    mapurl?: string;
}

interface State {
    query: string;
    isLoading: boolean;
    error: string | null;
    resultCount: number;
}

const getStyle = () => css`
  .search-widget-lite {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    font-family: 'Avenir Next', 'Helvetica Neue', sans-serif;
  }

  .search-input {
    flex: 1;
    padding: 10px 14px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 14px;
    min-width: 0;
  }

  .search-input:focus {
    outline: none;
    border-color: #0079c1;
    box-shadow: 0 0 0 2px rgba(0, 121, 193, 0.2);
  }

  .search-btn {
    padding: 10px 20px;
    background: #0079c1;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    white-space: nowrap;
  }

  .search-btn:hover {
    background: #005a8e;
  }

  .search-btn:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  .status-text {
    font-size: 12px;
    color: #666;
    white-space: nowrap;
  }

  .status-text.error {
    color: #dc2626;
  }

  .status-text.success {
    color: #10b981;
  }
`;

export default class Widget extends React.PureComponent<AllWidgetProps<IMConfig>, State> {
    constructor(props: AllWidgetProps<IMConfig>) {
        super(props);
        this.state = {
            query: '',
            isLoading: false,
            error: null,
            resultCount: 0
        };
    }

    getConfig = () => {
        return this.props.config || defaultConfig;
    };

    performSearch = async (): Promise<void> => {
        const { query } = this.state;
        const config = this.getConfig();

        if (!query.trim()) {
            this.setState({ error: 'Please enter a search term' });
            return;
        }

        this.setState({ isLoading: true, error: null });

        try {
            const params = new URLSearchParams({
                search_term: query.trim(),
                token: config.apiToken
            });
            const url = `${config.apiUrl}?${params.toString()}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const text = await response.text();
            let data: SearchResult[];

            try {
                data = JSON.parse(text);
            } catch {
                // Handle NDJSON format
                const lines = text.trim().split('\n').filter(line => line.trim());
                data = lines.map(line => JSON.parse(line));
            }

            const results = Array.isArray(data) ? data : [data];

            // Publish results to Output Data Source
            this.publishResults(results);

            this.setState({
                isLoading: false,
                resultCount: results.length
            });

        } catch (error: any) {
            console.error('Search error:', error);
            this.setState({
                error: error.message || 'Search failed',
                isLoading: false
            });
        }
    };

    publishResults = (results: SearchResult[]): void => {
        const outputDsId = this.props.outputDataSources?.[0];
        console.log('publishResults called, outputDsId:', outputDsId);

        if (!outputDsId) {
            console.warn('No output data source configured');
            return;
        }

        const outputDs = DataSourceManager.getInstance().getDataSource(outputDsId) as any;
        console.log('outputDs:', outputDs);
        console.log('outputDs type:', outputDs?.type);
        console.log('outputDs methods:', Object.keys(outputDs || {}).filter(k => typeof outputDs[k] === 'function'));

        if (!outputDs) {
            console.warn('Output data source not found:', outputDsId);
            return;
        }

        // Convert search results to features with attributes
        const features = results.map((item: any, index) => ({
            attributes: {
                objectid: index + 1,
                id: item.id || '',
                title: item.title || item.name || 'Untitled',
                name: item.name || '',
                description: item.description || item.snippet || '',
                type: item.type || 'Layer',
                tags: typeof item.tags === 'string' ? item.tags : JSON.stringify(item.tags || ''),
                thumbnail: item.thumbnail || '',
                rrf_score: parseFloat(item.rrf_score) || item.similarity || 0,
                score: typeof item.score === 'number' ? item.score : parseFloat(item.score) || 0,
                prettyurl: item.prettyurl || item.url || '',
                mapurl: item.mapurl || '',
                url: item.url || item.service_url || ''
            }
        }));

        console.log('Prepared features:', features.length);
        console.log('First feature:', features[0]);

        try {
            // Try setSourceRecords with built records first
            if (typeof outputDs.buildRecord === 'function') {
                const records = features.map(f => outputDs.buildRecord(f));
                console.log('Built records:', records.length);
                console.log('First record:', records[0]);

                if (typeof outputDs.setSourceRecords === 'function') {
                    outputDs.setSourceRecords(records);
                    console.log('Called setSourceRecords');
                }
            }

            // Set status to Unloaded so consuming widgets know data is ready
            if (typeof outputDs.setStatus === 'function') {
                outputDs.setStatus(DataSourceStatus.Unloaded);
                console.log('Set status to Unloaded');
            }

            if (typeof outputDs.setCountStatus === 'function') {
                outputDs.setCountStatus(DataSourceStatus.Unloaded);
                console.log('Set count status to Unloaded');
            }

            console.log(`Successfully published ${results.length} results to output data source`);
        } catch (error) {
            console.error('Error publishing results:', error);
        }
    };

    handleKeyPress = (e: React.KeyboardEvent): void => {
        if (e.key === 'Enter') {
            this.performSearch();
        }
    };

    render() {
        const { query, isLoading, error, resultCount } = this.state;

        return (
            <div className="search-widget-lite" css={getStyle()}>
                <input
                    type="text"
                    className="search-input"
                    placeholder="Search for maps and layers..."
                    value={query}
                    onChange={(e) => this.setState({ query: e.target.value, error: null })}
                    onKeyPress={this.handleKeyPress}
                    disabled={isLoading}
                />
                <button
                    className="search-btn"
                    onClick={this.performSearch}
                    disabled={isLoading || !query.trim()}
                >
                    {isLoading ? 'Searching...' : 'Search'}
                </button>
                {error && <span className="status-text error">{error}</span>}
                {!error && resultCount > 0 && (
                    <span className="status-text success">{resultCount} results</span>
                )}
            </div>
        );
    }
}
