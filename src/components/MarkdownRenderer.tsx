import { useState, useEffect, useRef, lazy, Suspense, startTransition } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, Copy } from 'lucide-react';

/**
 * Dynamic import for SyntaxHighlighter
 * Reduces initial bundle size by ~200KB gzipped
 * Based on Vercel React Best Practices - bundle-dynamic-imports
 */
const SyntaxHighlighter = lazy(() =>
    import('react-syntax-highlighter/dist/esm/prism').then(module => ({
        default: module.default
    }))
);

const loadSyntaxStyles = () =>
    import('react-syntax-highlighter/dist/esm/styles/prism');

/**
 * Mermaid diagram loader (on-demand)
 * Only loaded when user actually has mermaid code blocks
 * Reduces initial bundle size by ~500KB gzipped
 */
const loadMermaid = async () => {
    if (!(window as any).mermaid) {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
            startOnLoad: false,
            theme: 'neutral',
            securityLevel: 'loose',
            fontFamily: 'Inter, sans-serif',
        });
        (window as any).mermaid = mermaid;
    }
    return (window as any).mermaid;
};

interface MarkdownRendererProps {
    content: string;
    className?: string;
    isDark?: boolean;
}

export function MarkdownRenderer({ content, className = '', isDark = false }: MarkdownRendererProps) {
    return (
        <div className={`prose ${isDark ? 'prose-invert' : 'prose-stone'} max-w-none ${className}`}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    code({ node: _node, inline, className, children, ...props }: { node?: unknown; inline?: boolean; className?: string; children?: React.ReactNode }) {
                        const match = /language-(\w+)/.exec(className || '');
                        const codeContent = String(children).replace(/\n$/, '');

                        if (!inline && match) {
                            // Mermaid handling (on-demand load)
                            if (match[1] === 'mermaid') {
                                return <MermaidDiagram code={codeContent} isDark={isDark} />;
                            }

                            // Standard Syntax Highlighting (lazy-loaded)
                            return (
                                <Suspense fallback={<CodeBlockFallback code={codeContent} />}>
                                    <LazySyntaxHighlighter
                                        code={codeContent}
                                        language={match[1]}
                                        isDark={isDark}
                                        CopyButton={<CopyButton text={codeContent} />}
                                        {...props}
                                    />
                                </Suspense>
                            );
                        }

                        // Inline code - check for file paths
                        const codeText = String(children);
                        // Detect Windows paths (E:\...) or Unix paths (/.../...)
                        const isFilePath = /^[A-Za-z]:[/\\]|^\/\w+/.test(codeText);

                        if (isFilePath) {
                            return (
                                <code
                                    className={`${className} px-1.5 py-0.5 rounded-md bg-orange-50 text-orange-700 font-mono text-sm border border-orange-200 cursor-pointer hover:bg-orange-100 transition-colors`}
                                    onClick={() => window.ipcRenderer.invoke('shell:open-path', codeText)}
                                    title="点击在文件管理器中打开"
                                    {...props}
                                >
                                    📁 {children}
                                </code>
                            );
                        }

                        return (
                            <code
                                className={`${className} px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-800 font-mono text-sm border border-stone-200`}
                                {...props}
                            >
                                {children}
                            </code>
                        );
                    },
                    // Improved Table Styling
                    table({ children }) {
                        return (
                            <div className="overflow-x-auto my-6 border border-stone-200 rounded-xl shadow-sm">
                                <table className="w-full text-left border-collapse text-sm">
                                    {children}
                                </table>
                            </div>
                        );
                    },
                    thead({ children }) {
                        return <thead className="bg-stone-50 text-stone-700">{children}</thead>;
                    },
                    th({ children }) {
                        return <th className="px-4 py-3 font-semibold border-b border-stone-200">{children}</th>;
                    },
                    td({ children }) {
                        return <td className="px-4 py-3 border-b border-stone-100 text-stone-600">{children}</td>;
                    },
                    // Improved Spacing for Typography
                    p({ children }) {
                        return <p className="mb-4 leading-7 text-stone-700 last:mb-0">{children}</p>;
                    },
                    ul({ children }) {
                        return <ul className="list-disc pl-6 mb-4 space-y-1 text-stone-700 marker:text-stone-400">{children}</ul>;
                    },
                    ol({ children }) {
                        return <ol className="list-decimal pl-6 mb-4 space-y-1 text-stone-700 marker:text-stone-400">{children}</ol>;
                    },
                    li({ children }) {
                        return <li className="pl-1">{children}</li>;
                    },
                    h1({ children }) {
                        return <h1 className="text-2xl font-bold mt-8 mb-4 text-stone-900 pb-2 border-b border-stone-100">{children}</h1>;
                    },
                    h2({ children }) {
                        return <h2 className="text-lg font-bold mt-6 mb-3 text-stone-900 flex items-center gap-2">
                            <span className="w-1 h-5 bg-orange-500 rounded-full inline-block"></span>
                            {children}
                        </h2>;
                    },
                    h3({ children }) {
                        return <h3 className="text-base font-semibold mt-4 mb-2 text-stone-800">{children}</h3>;
                    },
                    blockquote({ children }) {
                        return <blockquote className="border-l-4 border-orange-200 pl-4 py-1 my-4 text-stone-600 italic bg-orange-50/30 rounded-r-lg">{children}</blockquote>;
                    },
                    a({ href, children }) {
                        return <a href={href} className="text-orange-600 hover:text-orange-700 underline decoration-orange-300 hover:decoration-orange-600 underline-offset-2 transition-all font-medium" target="_blank" rel="noopener noreferrer">{children}</a>
                    }
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}

/**
 * Mermaid Diagram Component with On-Demand Loading
 * Only loads mermaid library when diagram is actually rendered
 */
function MermaidDiagram({ code, isDark }: { code: string, isDark: boolean }) {
    const [svg, setSvg] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const renderId = useRef(`mermaid-${Math.random().toString(36).substr(2, 9)}`);

    useEffect(() => {
        let mounted = true;

        const loadAndRender = async () => {
            try {
                setLoading(true);
                const mermaid = await loadMermaid();
                if (!mounted) return;

                const result = await mermaid.render(renderId.current, code);
                if (!mounted) return;

                startTransition(() => {
                    setSvg(result.svg);
                    setLoading(false);
                });
            } catch (err) {
                console.error('Mermaid render error:', err);
                if (mounted) {
                    setSvg(`<div class="text-red-500 bg-red-50 p-2 rounded text-xs font-mono">Failed to render diagram</div>`);
                    setLoading(false);
                }
            }
        };

        loadAndRender();

        return () => {
            mounted = false;
        };
    }, [code, isDark]);

    if (loading) {
        return (
            <div className="my-6 p-4 bg-stone-50 border border-stone-200 rounded-xl flex items-center justify-center">
                <div className="text-stone-400 text-sm">Loading diagram...</div>
            </div>
        );
    }

    return (
        <div
            className="my-6 p-4 bg-white border border-stone-200 rounded-xl flex justify-center overflow-x-auto shadow-sm"
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    );
}

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg bg-white/90 shadow-sm border border-stone-200 hover:bg-white text-stone-500 hover:text-stone-800 transition-all"
            title="Copy code"
        >
            {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
        </button>
    );
}

/**
 * Fallback component while SyntaxHighlighter is loading
 */
function CodeBlockFallback({ code }: { code: string }) {
    return (
        <div className="relative group my-4 rounded-lg overflow-hidden border border-stone-200 shadow-sm bg-stone-50">
            <pre className="p-4 text-sm overflow-x-auto">
                <code className="font-mono text-stone-700">{code}</code>
            </pre>
        </div>
    );
}

/**
 * Lazy-loaded SyntaxHighlighter wrapper
 * Dynamically imports and loads syntax highlighting styles
 */
function LazySyntaxHighlighter({
    code,
    language,
    isDark,
    CopyButton,
    ...props
}: {
    code: string;
    language: string;
    isDark: boolean;
    CopyButton: React.ReactNode;
}) {
    const [styles, setStyles] = useState<{ oneLight: any; vscDarkPlus: any } | null>(null);

    useEffect(() => {
        loadSyntaxStyles().then(module => {
            setStyles({
                oneLight: module.oneLight,
                vscDarkPlus: module.vscDarkPlus
            });
        });
    }, []);

    if (!styles) {
        return <CodeBlockFallback code={code} />;
    }

    return (
        <div className="relative group my-4 rounded-lg overflow-hidden border border-stone-200 shadow-sm">
            <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                {CopyButton}
            </div>
            <SyntaxHighlighter
                style={isDark ? styles.vscDarkPlus : styles.oneLight}
                language={language}
                PreTag="div"
                customStyle={{
                    margin: 0,
                    padding: '1.5rem 1rem',
                    fontSize: '0.9rem',
                    lineHeight: '1.5',
                    background: isDark ? '#1e1e1e' : '#fafafa',
                }}
                {...props}
            >
                {code}
            </SyntaxHighlighter>
        </div>
    );
}
