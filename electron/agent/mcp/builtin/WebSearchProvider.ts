import { BrowserWindow } from 'electron';

interface SearchResult {
    title: string;
    link: string;
    snippet: string;
}

export class WebSearchProvider {
    private isSearching = false;

    getTools() {
        return [
            {
                name: 'internet__web_search',
                description: 'Search the internet for information using Bing. Use this when you need up-to-date information, news, or facts.',
                input_schema: {
                    type: 'object',
                    properties: {
                        query: {
                            type: 'string',
                            description: 'The search query keywords'
                        },
                        limit: {
                            type: 'number',
                            description: 'Number of results to return (default: 5, max: 10)',
                            default: 5
                        }
                    },
                    required: ['query']
                }
            }
        ];
    }

    async callTool(name: string, args: any): Promise<string> {
        if (name === 'internet__web_search') {
            return JSON.stringify(await this.performSearch(args.query, args.limit || 5));
        }
        throw new Error(`Unknown tool: ${name}`);
    }

    private async performSearch(query: string, limit: number): Promise<SearchResult[]> {
        if (this.isSearching) {
            // Simple concurrency lock to prevent creating too many windows
            // In a real app, might want a queue, but for single-user desktop, this is fine
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        this.isSearching = true;
        let win: BrowserWindow | null = null;

        try {
            win = new BrowserWindow({
                show: false,
                width: 1024,
                height: 768,
                webPreferences: {
                    offscreen: true, // Use offscreen rendering for better performance if possible
                    nodeIntegration: false,
                    contextIsolation: true
                }
            });

            const searchUrl = `https://cn.bing.com/search?q=${encodeURIComponent(query)}`;
            console.log(`[WebSearch] Navigating to: ${searchUrl}`);
            
            await win.loadURL(searchUrl, { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' });

            // Wait a bit for JS execution
            // Bing results are usually static HTML, but some parts might load dynamically
            // await new Promise(resolve => setTimeout(resolve, 500));

            const results = await win.webContents.executeJavaScript(`
                (function() {
                    const items = document.querySelectorAll('#b_results .b_algo');
                    const results = [];
                    
                    for (let i = 0; i < items.length; i++) {
                        const item = items[i];
                        const titleEl = item.querySelector('h2 a');
                        const snippetEl = item.querySelector('.b_caption p') || item.querySelector('.b_snippet') || item.querySelector('.b_algoSlug');
                        
                        if (titleEl && snippetEl) {
                            results.push({
                                title: titleEl.innerText,
                                link: titleEl.href,
                                snippet: snippetEl.innerText
                            });
                        }
                    }
                    return results;
                })()
            `);

            console.log(`[WebSearch] Found ${results.length} results`);
            return results.slice(0, limit);

        } catch (e) {
            console.error('[WebSearch] Error:', e);
            return [];
        } finally {
            if (win) {
                win.close();
            }
            this.isSearching = false;
        }
    }
}
