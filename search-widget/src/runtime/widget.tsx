/** @jsx jsx */
import { React, jsx, AllWidgetProps, css, ImmutableObject } from 'jimu-core';

// Config interface
interface Config {
    baseUrl: string;
    token: string;
    pageSize: number;
    descriptionLength: number;
}

type IMConfig = ImmutableObject<Config>;

const defaultConfig: Config = {
    baseUrl: 'https://fme-docker.tensing.app:443/fmedatastreaming/embeddings/search.fmw',
    token: '067e63151ac94654d38a7c5d23832396073317cb',
    pageSize: 40,
    descriptionLength: 100
};

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
    currentPage: number;
    allResults: SearchResult[];
    viewMode: 'grid' | 'list';
    sortBy: 'relevance' | 'title';
    isLoading: boolean;
    error: string | null;
    expandedDescriptions: Set<number>;
}

const getStyle = () => css`
  .search-widget {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 16px;
    background: #f5f5f5;
    font-family: 'Avenir Next', 'Helvetica Neue', sans-serif;
  }

  .search-container {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
  }

  .search-input {
    flex: 1;
    padding: 10px 14px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 14px;
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
  }

  .search-btn:hover {
    background: #005a8e;
  }

  .search-btn:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  .results-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    flex-wrap: wrap;
    gap: 12px;
  }

  .results-count {
    font-size: 14px;
    color: #333;
  }

  .results-count strong {
    color: #000;
  }

  .toolbar-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .view-toggle {
    display: flex;
    border: 1px solid #ccc;
    border-radius: 4px;
    overflow: hidden;
  }

  .view-btn {
    padding: 6px 10px;
    background: #fff;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .view-btn:hover {
    background: #f0f0f0;
  }

  .view-btn.active {
    background: #0079c1;
    color: white;
  }

  .sort-select {
    padding: 6px 12px;
    border: 1px solid #ccc;
    border-radius: 4px;
    background: #fff;
    font-size: 13px;
    cursor: pointer;
  }

  .results-container {
    flex: 1;
    overflow-y: auto;
  }

  .results-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
  }

  .results-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .result-card {
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    overflow: hidden;
    transition: transform 0.2s, box-shadow 0.2s;
    display: flex;
    flex-direction: column;
  }

  .result-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  }

  .results-list .result-card {
    flex-direction: row;
  }

  .card-thumbnail {
    position: relative;
    height: 140px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .results-list .card-thumbnail {
    width: 160px;
    height: auto;
    min-height: 120px;
    flex-shrink: 0;
  }

  .card-thumbnail img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .card-thumbnail-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.8);
    font-size: 32px;
  }

  .card-type-badge {
    position: absolute;
    top: 8px;
    left: 8px;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 500;
    text-transform: uppercase;
  }

  .card-score-badge {
    position: absolute;
    top: 8px;
    right: 8px;
    background: #10b981;
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
  }

  .card-content {
    padding: 16px;
    display: flex;
    flex-direction: column;
    flex: 1;
  }

  .card-title {
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 8px 0;
    color: #333;
    line-height: 1.3;
  }

  .card-title a {
    color: inherit;
    text-decoration: none;
  }

  .card-title a:hover {
    color: #0079c1;
  }

  .card-description {
    font-size: 13px;
    color: #666;
    line-height: 1.5;
    margin-bottom: 12px;
  }

  .card-description.collapsed {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .expand-btn {
    background: none;
    border: none;
    color: #0079c1;
    cursor: pointer;
    font-size: 12px;
    padding: 4px 0;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .expand-btn:hover {
    text-decoration: underline;
  }

  .card-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 12px;
  }

  .tag {
    background: #e0e0e0;
    color: #666;
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 11px;
  }

  .card-actions {
    display: flex;
    gap: 8px;
    margin-top: auto;
    padding-top: 12px;
    border-top: 1px solid #eee;
  }

  .card-action-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    border: 1px solid #ccc;
    border-radius: 4px;
    background: white;
    color: #333;
    text-decoration: none;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .card-action-btn:hover {
    background: #f5f5f5;
    border-color: #999;
  }

  .card-action-btn.primary {
    background: #0079c1;
    border-color: #0079c1;
    color: white;
  }

  .card-action-btn.primary:hover {
    background: #005a8e;
  }

  .pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 4px;
    margin-top: 24px;
    padding-top: 16px;
    border-top: 1px solid #ddd;
  }

  .pagination button {
    min-width: 36px;
    height: 36px;
    padding: 0 12px;
    border: 1px solid #ccc;
    border-radius: 4px;
    background: white;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
  }

  .pagination button:hover:not(:disabled) {
    background: #f0f0f0;
    border-color: #0079c1;
  }

  .pagination button.active {
    background: #0079c1;
    border-color: #0079c1;
    color: white;
  }

  .pagination button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .pagination-ellipsis {
    padding: 0 8px;
    color: #666;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
    text-align: center;
  }

  .empty-state .state-title {
    font-size: 18px;
    font-weight: 600;
    color: #333;
    margin: 16px 0 8px 0;
  }

  .empty-state .state-message {
    font-size: 14px;
    color: #666;
    margin: 0;
  }

  .loading-container {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 48px;
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #f0f0f0;
    border-top-color: #0079c1;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .error-message {
    padding: 12px 16px;
    background: #fee2e2;
    border: 1px solid #ef4444;
    border-radius: 4px;
    color: #dc2626;
    margin-bottom: 16px;
  }

  .icon {
    width: 16px;
    height: 16px;
  }

  .icon-large {
    width: 48px;
    height: 48px;
    color: #999;
  }
`;

export default class Widget extends React.PureComponent<AllWidgetProps<IMConfig>, State> {
    constructor(props: AllWidgetProps<IMConfig>) {
        super(props);
        this.state = {
            query: '',
            currentPage: 1,
            allResults: [],
            viewMode: 'grid',
            sortBy: 'relevance',
            isLoading: false,
            error: null,
            expandedDescriptions: new Set()
        };
    }

    getConfig = (): Config => {
        return (this.props.config as unknown as Config) || defaultConfig;
    };

    parseTags = (tags: string | string[] | undefined): string[] => {
        if (!tags) return [];
        if (Array.isArray(tags)) return tags;
        return tags.split(',').map(t => t.trim()).filter(t => t);
    };

    performSearch = async (page: number = 1): Promise<void> => {
        const { query } = this.state;
        const config = this.getConfig();

        if (!query.trim()) {
            this.setState({ error: 'Please enter a search term' });
            return;
        }

        this.setState({ isLoading: true, error: null, currentPage: page });

        try {
            const params = new URLSearchParams({
                search_term: query.trim(),
                token: config.token
            });
            const url = `${config.baseUrl}?${params.toString()}`;

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
                const lines = text.trim().split('\n').filter(line => line.trim());
                data = lines.map(line => JSON.parse(line));
            }

            this.setState({
                allResults: Array.isArray(data) ? data : [data],
                isLoading: false
            });

            if (data.length > 0) {
                console.log('Sample item fields:', Object.keys(data[0]));
                console.log('Sample item:', data[0]);
            }
        } catch (error: any) {
            console.error('Search error:', error);
            this.setState({
                error: `Search failed: ${error.message}`,
                isLoading: false
            });
        }
    };

    applySorting = (results: SearchResult[]): SearchResult[] => {
        const { sortBy } = this.state;
        const sorted = [...results];

        if (sortBy === 'title') {
            sorted.sort((a, b) => {
                const titleA = (a.title || a.name || '').toLowerCase();
                const titleB = (b.title || b.name || '').toLowerCase();
                return titleA.localeCompare(titleB);
            });
        }

        return sorted;
    };

    setViewMode = (mode: 'grid' | 'list'): void => {
        this.setState({ viewMode: mode });
    };

    setSortBy = (sortBy: 'relevance' | 'title'): void => {
        this.setState({ sortBy });
    };

    toggleDescription = (index: number): void => {
        this.setState(prevState => {
            const expanded = new Set(prevState.expandedDescriptions);
            if (expanded.has(index)) {
                expanded.delete(index);
            } else {
                expanded.add(index);
            }
            return { expandedDescriptions: expanded };
        });
    };

    handleKeyPress = (e: React.KeyboardEvent): void => {
        if (e.key === 'Enter') {
            this.performSearch(1);
        }
    };

    renderResultCard = (item: SearchResult, index: number): JSX.Element => {
        const { expandedDescriptions } = this.state;
        const title = item.title || item.name || 'Untitled';
        const description = item.description || item.snippet || '';
        const type = item.type || 'Layer';
        const tags = this.parseTags(item.tags);
        const thumbnail = item.thumbnail;
        const score = item.rrf_score || item.similarity || item.score;
        const prettyUrl = item.prettyurl || item.url;
        const mapUrl = item.mapurl;
        const isExpanded = expandedDescriptions.has(index);

        return (
            <article className="result-card" key={index}>
                <div className="card-thumbnail">
                    {thumbnail ? (
                        <img
                            src={thumbnail}
                            alt={title}
                            onError={(e: any) => {
                                e.target.style.display = 'none';
                                if (e.target.nextElementSibling) {
                                    e.target.nextElementSibling.style.display = 'flex';
                                }
                            }}
                        />
                    ) : null}
                    <div className="card-thumbnail-placeholder" style={{ display: thumbnail ? 'none' : 'flex' }}>
                        <svg className="icon-large" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                        </svg>
                    </div>
                    <span className="card-type-badge">{type}</span>
                    {score && (
                        <span className="card-score-badge">
                            {(parseFloat(String(score)) * 100).toFixed(1)}% match
                        </span>
                    )}
                </div>
                <div className="card-content">
                    <h3 className="card-title">
                        {prettyUrl ? (
                            <a href={prettyUrl} target="_blank" rel="noopener noreferrer">
                                {title}
                            </a>
                        ) : (
                            title
                        )}
                    </h3>
                    {description && (
                        <div className={`card-description ${!isExpanded ? 'collapsed' : ''}`}>
                            {description}
                        </div>
                    )}
                    {description && description.length > 80 && (
                        <button className="expand-btn" onClick={() => this.toggleDescription(index)}>
                            {isExpanded ? 'Show less' : 'Show more'}
                            <svg className="icon" viewBox="0 0 24 24" fill="currentColor" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none' }}>
                                <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
                            </svg>
                        </button>
                    )}
                    {tags.length > 0 && (
                        <div className="card-tags">
                            {tags.slice(0, 4).map((tag, i) => (
                                <span className="tag" key={i}>{tag}</span>
                            ))}
                            {tags.length > 4 && <span className="tag">+{tags.length - 4}</span>}
                        </div>
                    )}
                    <div className="card-actions">
                        {prettyUrl && (
                            <a href={prettyUrl} target="_blank" rel="noopener noreferrer" className="card-action-btn">
                                <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                                </svg>
                                Details
                            </a>
                        )}
                        {mapUrl && (
                            <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="card-action-btn primary">
                                <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z" />
                                </svg>
                                Open Map
                            </a>
                        )}
                    </div>
                </div>
            </article>
        );
    };

    renderPagination = (totalPages: number): JSX.Element => {
        const { currentPage } = this.state;
        const pages: (number | string)[] = [];
        const start = Math.max(1, currentPage - 2);
        const end = Math.min(totalPages, currentPage + 2);

        if (start > 1) {
            pages.push(1);
            if (start > 2) pages.push('...');
        }

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }

        if (end < totalPages) {
            if (end < totalPages - 1) pages.push('...');
            pages.push(totalPages);
        }

        return (
            <div className="pagination">
                <button
                    disabled={currentPage === 1}
                    onClick={() => this.performSearch(currentPage - 1)}
                >
                    ◀
                </button>
                {pages.map((page, i) => (
                    typeof page === 'string' ? (
                        <span key={i} className="pagination-ellipsis">{page}</span>
                    ) : (
                        <button
                            key={i}
                            className={page === currentPage ? 'active' : ''}
                            onClick={() => this.performSearch(page)}
                        >
                            {page}
                        </button>
                    )
                ))}
                <button
                    disabled={currentPage === totalPages}
                    onClick={() => this.performSearch(currentPage + 1)}
                >
                    ▶
                </button>
            </div>
        );
    };

    renderResults = (): JSX.Element | null => {
        const { query, allResults, currentPage, viewMode, isLoading, error } = this.state;
        const config = this.getConfig();

        if (isLoading) {
            return (
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                </div>
            );
        }

        if (error) {
            return (
                <div className="error-message">
                    {error}
                    <button onClick={() => this.setState({ error: null })} style={{ marginLeft: 10, cursor: 'pointer' }}>×</button>
                </div>
            );
        }

        if (allResults.length === 0) {
            if (query) {
                return (
                    <div className="empty-state">
                        <svg className="icon-large" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                        </svg>
                        <h2 className="state-title">No Results Found</h2>
                        <p className="state-message">Try adjusting your search terms</p>
                    </div>
                );
            }
            return null;
        }

        const results = this.applySorting(allResults);
        const totalResults = results.length;
        const pageSize = config.pageSize || 40;
        const totalPages = Math.ceil(totalResults / pageSize);
        const startIdx = (currentPage - 1) * pageSize;
        const endIdx = Math.min(startIdx + pageSize, totalResults);
        const pageResults = results.slice(startIdx, endIdx);

        return (
            <div className="results-container">
                <div className="results-header">
                    <div className="results-count">
                        Showing <strong>{startIdx + 1}-{endIdx}</strong> of <strong>{totalResults}</strong> results for "<strong>{query}</strong>"
                    </div>
                    <div className="toolbar-actions">
                        <div className="view-toggle">
                            <button
                                className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                                onClick={() => this.setViewMode('grid')}
                                title="Grid view"
                            >
                                ▦
                            </button>
                            <button
                                className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                                onClick={() => this.setViewMode('list')}
                                title="List view"
                            >
                                ☰
                            </button>
                        </div>
                        <select
                            className="sort-select"
                            value={this.state.sortBy}
                            onChange={(e: any) => this.setSortBy(e.target.value as 'relevance' | 'title')}
                        >
                            <option value="relevance">Sort by Relevance</option>
                            <option value="title">Sort by Title</option>
                        </select>
                    </div>
                </div>
                <div className={viewMode === 'grid' ? 'results-grid' : 'results-list'}>
                    {pageResults.map((item, index) => this.renderResultCard(item, startIdx + index))}
                </div>
                {totalPages > 1 && this.renderPagination(totalPages)}
            </div>
        );
    };

    render(): JSX.Element {
        const { query, isLoading } = this.state;

        return (
            <div className="widget-search jimu-widget" css={getStyle()}>
                <div className="search-widget">
                    <div className="search-container">
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Enter search term..."
                            value={query}
                            onChange={(e: any) => this.setState({ query: e.target.value })}
                            onKeyPress={this.handleKeyPress}
                        />
                        <button
                            className="search-btn"
                            onClick={() => this.performSearch(1)}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Searching...' : 'Search'}
                        </button>
                    </div>
                    {this.renderResults()}
                </div>
            </div>
        );
    }
}
