import { useState, useEffect } from 'react';
import {
    Upload,
    FileText,
    Sparkles,
    TrendingUp,
    BookOpen,
    Heart,
    Sliders,
    RefreshCw,
    Trash2,
    Check,
    AlertCircle,
    Download,
    Eye
} from 'lucide-react';
import { showConfirm } from '../utils/dialog.js';

// 类型断言辅助函数
function assertNumber(value: unknown): number {
    if (typeof value !== 'number' || isNaN(value)) {
        console.warn('Expected number, got:', value);
        return 0;
    }
    return value;
}

function assertString(value: unknown): string {
    if (typeof value !== 'string') {
        console.warn('Expected string, got:', value);
        return '';
    }
    return value;
}

interface UserStyleConfig {
    articles: string[];
    styleGuide: {
        openingHabits: string[];
        wordChoice: {
            technicalLevel: number;
            colloquialLevel: number;
            humorLevel: number;
        };
        structureHabits: string[];
        emotionalTone: string;
        fullAnalysis?: any;  // 完整分析结果（来自 style-learner）
    };
    lastUpdated: string;
    learningCount: number;
}

interface AnalysisResult {
    openingHabits: {
        patterns: string[];
        distribution: Record<string, number>;
        examples: string[];
    };
    wordChoice: {
        technicalLevel: number;
        colloquialLevel: number;
        humorLevel: number;
        frequentWords: {
            colloquial: string[];
            emotional: string[];
            technical: string[];
        };
    };
    structureHabits: {
        mainPattern: string;
        distribution: Record<string, number>;
        paragraphLength: Record<string, number>;
        sentenceLength: Record<string, number>;
        useSubheadings: boolean;
    };
    emotionalExpression: {
        dominantTone: string;
        wordDensity: number;
        changePattern: string;
    };
}

interface PersonalStyleTabProps {
    onConfigChange?: () => void;
}

export function PersonalStyleTab({ onConfigChange }: PersonalStyleTabProps) {
    const [config, setConfig] = useState<UserStyleConfig | null>(null);
    const [uploadMode, setUploadMode] = useState<'upload' | 'paste'>('upload');
    const [pastedText, setPastedText] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [showAnalysisResult, setShowAnalysisResult] = useState(false);
    const [showStyleGuide, setShowStyleGuide] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedStyleGuide, setEditedStyleGuide] = useState<UserStyleConfig['styleGuide'] | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 加载配置
    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            const result = await window.ipcRenderer.invoke('config:get-style-config');
            setConfig(result as UserStyleConfig);
        } catch (err) {
            console.error('加载风格配置失败:', err);
            setError('加载配置失败');
        }
    };

    // 文件上传处理
    const handleFileUpload = async (files: FileList | null) => {
        if (!files || files.length === 0) return;

        setError(null);

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            // 检查文件类型
            if (!file.name.endsWith('.md') && !file.name.endsWith('.txt')) {
                setError(`仅支持 .md 和 .txt 文件，跳过：${file.name}`);
                continue;
            }

            try {
                const content = await file.text();
                const filename = `article-${Date.now()}-${i}.${file.name.split('.').pop()}`;

                await window.ipcRenderer.invoke('config:save-article', {
                    content,
                    filename
                });

                setUploadSuccess(true);
                setTimeout(() => setUploadSuccess(false), 3000);

                // 重新加载配置
                await loadConfig();

                if (onConfigChange) onConfigChange();
            } catch (err) {
                console.error('保存文章失败:', err);
                setError(`保存文章失败：${file.name}`);
            }
        }
    };

    // 拖拽处理
    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileUpload(e.dataTransfer.files);
        }
    };

    // 粘贴文本处理
    const handlePasteSubmit = async () => {
        if (!pastedText.trim()) return;

        setError(null);

        try {
            const filename = `article-${Date.now()}.md`;
            await window.ipcRenderer.invoke('config:save-article', {
                content: pastedText,
                filename
            });

            setPastedText('');
            setUploadSuccess(true);
            setTimeout(() => setUploadSuccess(false), 3000);

            await loadConfig();

            if (onConfigChange) onConfigChange();
        } catch (err) {
            console.error('保存文章失败:', err);
            setError('保存文章失败');
        }
    };

    // 分析风格
    const handleAnalyze = async () => {
        if (!config || config.articles.length === 0) {
            setError('请先上传文章');
            return;
        }

        setIsAnalyzing(true);
        setError(null);

        try {
            // 调用风格分析（传递文章路径，主进程会读取文件内容）
            const result = await window.ipcRenderer.invoke('config:analyze-style', {
                articlePaths: config.articles
            }) as { success: boolean; result?: AnalysisResult };

            if (result.success && result.result) {
                setAnalysisResult(result.result as AnalysisResult);
                setShowAnalysisResult(true);
                await loadConfig();
            } else {
                setError('分析失败');
            }
        } catch (err) {
            console.error('分析失败:', err);
            setError('分析失败，请重试');
        } finally {
            setIsAnalyzing(false);
        }
    };

    // 保存手动修改
    const handleSaveEdit = async () => {
        if (!editedStyleGuide) return;

        try {
            await window.ipcRenderer.invoke('config:update-style-guide', {
                styleGuide: editedStyleGuide
            });

            setIsEditing(false);
            await loadConfig();

            if (onConfigChange) onConfigChange();
        } catch (err) {
            console.error('保存失败:', err);
            setError('保存失败');
        }
    };

    // 清除配置
    const handleClear = async () => {
        const confirmed = await showConfirm({
            title: '确认清除',
            message: '确定要清除个人风格配置吗？这将删除所有已上传的文章和分析结果。',
            confirmText: '确认清除',
            cancelText: '取消'
        });

        if (!confirmed) {
            return;
        }

        try {
            await window.ipcRenderer.invoke('config:clear-style-config');
            setConfig(null);
            setAnalysisResult(null);
            setShowAnalysisResult(false);

            if (onConfigChange) onConfigChange();
        } catch (err) {
            console.error('清除失败:', err);
            setError('清除失败');
        }
    };

    // 导出风格指南
    const handleExport = () => {
        if (!config) return;

        const guide = generateStyleGuideMarkdown(config);
        const blob = new Blob([guide], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'user-style-guide.md';
        a.click();
        URL.revokeObjectURL(url);
    };

    // 生成 Markdown 格式的风格指南
    const generateStyleGuideMarkdown = (cfg: UserStyleConfig): string => {
        const analysis = cfg.styleGuide.fullAnalysis;
        let markdown = `# 个人写作风格指南

生成时间：${cfg.lastUpdated || '未知'}
分析文章数：${cfg.articles.length}
学习次数：${cfg.learningCount}

---

`;

        // 如果有完整分析数据，使用详细模式
        if (analysis) {
            // 1. 标题风格
            markdown += `## 1. 标题风格

`;
            if (analysis.title_style?.patterns) {
                const titlePatterns = Object.entries(analysis.title_style.patterns)
                    .filter(([_, count]) => assertNumber(count) > 0)
                    .sort((a, b) => assertNumber(b[1]) - assertNumber(a[1]));

                if (titlePatterns.length > 0) {
                    markdown += `### 常用模式

`;
                    titlePatterns.forEach(([pattern, count]) => {
                        const countNum = assertNumber(count);
                        const patternStr = assertString(pattern);
                        const percent = Math.round(countNum / cfg.articles.length * 100);
                        markdown += `- **${patternStr}**：${countNum}篇文章使用（${percent}%）\n`;
                    });

                    markdown += `\n平均长度：${analysis.title_style.length?.avg || 0}字\n`;
                    if (analysis.title_style.keywords?.length > 0) {
                        markdown += `\n高频关键词：${analysis.title_style.keywords.join('、')}\n`;
                    }
                } else {
                    markdown += `暂无明显模式\n`;
                }
            }

            // 2. 开头风格
            markdown += `\n---\n\n## 2. 开头习惯

`;
            if (analysis.opening_style?.patterns) {
                const openingPatterns = Object.entries(analysis.opening_style.patterns)
                    .filter(([_, count]) => assertNumber(count) > 0)
                    .sort((a, b) => assertNumber(b[1]) - assertNumber(a[1]));

                if (openingPatterns.length > 0) {
                    markdown += `### 常用模式

`;
                    openingPatterns.forEach(([pattern, count]) => {
                        const patternStr = assertString(pattern);
                        const countNum = assertNumber(count);
                        const percent = Math.round(countNum / cfg.articles.length * 100);
                        markdown += `- **${patternStr}**：${countNum}篇文章（${percent}%）\n`;
                    });
                    markdown += `\n基调风格：${analysis.opening_style.tone || '未知'}\n`;
                    markdown += `平均长度：${assertNumber(analysis.opening_style.length?.avg) || 0}字\n`;
                } else {
                    markdown += `暂无明显模式\n`;
                }
            }

            // 3. 用词习惯
            markdown += `\n---\n\n## 3. 用词习惯

`;
            if (analysis.language_style) {
                markdown += `### 专业程度：${analysis.language_style.tone || '未知'}\n`;
                markdown += `- 词汇选择：${analysis.language_style.vocabulary || '未知'}\n`;
                markdown += `- 平均句长：${analysis.language_style.sentence_length?.avg || 0}字\n`;
                if (analysis.language_style.vocabulary_diversity !== undefined) {
                    markdown += `- 词汇多样性：${Math.round(analysis.language_style.vocabulary_diversity * 100)}%\n`;
                }

                if (analysis.common_phrases_style?.colloquial?.length > 0 ||
                    analysis.common_phrases_style?.technical?.length > 0) {
                    markdown += `\n### 高频词汇\n\n`;
                    if (analysis.common_phrases_style.technical?.length > 0) {
                        markdown += `- **专业术语**：${analysis.common_phrases_style.technical.join('、')}\n`;
                    }
                    if (analysis.common_phrases_style.colloquial?.length > 0) {
                        markdown += `- **常用表达**：${analysis.common_phrases_style.colloquial.join('、')}\n`;
                    }
                }
            }

            // 4. 结构习惯
            markdown += `\n---\n\n## 4. 结构习惯

`;
            if (analysis.content_structure) {
                markdown += `### 整体结构：${analysis.content_structure.structure || '未知'}\n\n`;
                markdown += `### 段落统计\n`;
                markdown += `- 平均段落数：${analysis.content_structure.paragraph_count?.avg || 0}\n`;
                markdown += `- 平均段落长度：${analysis.content_structure.paragraph_length?.avg || 0}字\n`;
            }

            // 5. 结尾习惯
            markdown += `\n---\n\n## 5. 结尾习惯

`;
            if (analysis.ending_style?.patterns) {
                const endingPatterns = Object.entries(analysis.ending_style.patterns)
                    .filter(([_, count]) => assertNumber(count) > 0)
                    .sort((a, b) => assertNumber(b[1]) - assertNumber(a[1]));

                if (endingPatterns.length > 0) {
                    markdown += `### 常用模式\n\n`;
                    endingPatterns.forEach(([pattern, count]) => {
                        const patternStr = assertString(pattern);
                        const countNum = assertNumber(count);
                        const percent = Math.round(countNum / cfg.articles.length * 100);
                        markdown += `- **${patternStr}**：${countNum}篇文章（${percent}%）\n`;
                    });
                    markdown += `\n平均长度：${assertNumber(analysis.ending_style.length?.avg) || 0}字\n`;
                } else {
                    markdown += `暂无明显模式\n`;
                }
            }

            // 6. 语气风格
            if (analysis.tone_style) {
                markdown += `\n---\n\n## 6. 语气风格

`;
                markdown += `主导语气：**${analysis.tone_style.dominant_tone || '未知'}**\n`;
                markdown += `语气强度：${analysis.tone_style.tone_intensity || '未知'}\n`;

                if (analysis.tone_style.tone_scores) {
                    const topTones = Object.entries(analysis.tone_style.tone_scores)
                        .filter(([_, score]) => assertNumber(score) > 0)
                        .sort((a, b) => assertNumber(b[1]) - assertNumber(a[1]))
                        .slice(0, 5);

                    if (topTones.length > 0) {
                        markdown += `\n### 语气分布\n\n`;
                        topTones.forEach(([tone, score]) => {
                            const toneStr = assertString(tone);
                            const scoreNum = assertNumber(score);
                            markdown += `- ${toneStr}：${scoreNum}次\n`;
                        });
                    }
                }
            }

            // 7. 情感色彩
            if (analysis.emotion_style) {
                markdown += `\n---\n\n## 7. 情感色彩

`;
                markdown += `主导情感：**${analysis.emotion_style.dominant_emotion || '未知'}**\n`;
                markdown += `情感倾向：${analysis.emotion_style.sentiment_trend || '未知'}\n`;
                markdown += `情感强度：${analysis.emotion_style.emotion_intensity || '未知'}\n`;
            }

            // 8. 修辞手法
            if (analysis.rhetorical_devices_style) {
                markdown += `\n---\n\n## 8. 修辞手法

`;
                const devices = Object.entries(analysis.rhetorical_devices_style.devices || {})
                    .filter(([_, count]) => assertNumber(count) > 0)
                    .sort((a, b) => assertNumber(b[1]) - assertNumber(a[1]));

                if (devices.length > 0) {
                    markdown += `常用修辞：\n\n`;
                    devices.forEach(([device, count]) => {
                        const deviceStr = assertString(device);
                        const countNum = assertNumber(count);
                        markdown += `- **${deviceStr}**：${countNum}次\n`;
                    });
                    const density = analysis.rhetorical_devices_style.density;
                    markdown += `\n修辞密度：${typeof density === 'number' ? density.toFixed(2) : 0}个/千字\n`;
                } else {
                    markdown += `暂无明显修辞手法\n`;
                }
            }

            // 9. 使用建议
            markdown += `\n---\n\n## 9. 使用建议

`;
            markdown += `### AI写作时应用此风格：

`;
            const topTitlePattern = analysis.title_style?.patterns ?
                assertString(Object.entries(analysis.title_style.patterns).sort((a, b) => assertNumber(b[1]) - assertNumber(a[1]))[0]?.[0]) : null;
            const topOpeningPattern = analysis.opening_style?.patterns ?
                assertString(Object.entries(analysis.opening_style.patterns).sort((a, b) => assertNumber(b[1]) - assertNumber(a[1]))[0]?.[0]) : null;
            const topEndingPattern = analysis.ending_style?.patterns ?
                assertString(Object.entries(analysis.ending_style.patterns).sort((a, b) => assertNumber(b[1]) - assertNumber(a[1]))[0]?.[0]) : null;

            markdown += `1. **标题**：优先使用${topTitlePattern || '吸引人'}的方式\n`;
            markdown += `2. **开头**：使用${topOpeningPattern || '引人入胜'}的方式开头\n`;
            markdown += `3. **用词**：保持${analysis.language_style?.vocabulary || '原有'}风格\n`;
            markdown += `4. **结构**：采用${analysis.content_structure?.structure || '原有'}结构\n`;
            markdown += `5. **语气**：保持${analysis.tone_style?.dominant_tone || '原有'}的语气\n`;
            markdown += `6. **情感**：保持${analysis.emotion_style?.dominant_emotion || '原有'}的情感基调\n`;
            markdown += `7. **结尾**：使用${topEndingPattern || '有力'}的方式结尾\n`;

        } else {
            // 简化模式（没有完整分析数据）
            markdown += `## 1. 开头习惯

${cfg.styleGuide.openingHabits.length > 0
    ? cfg.styleGuide.openingHabits.map(h => `- ${h}`).join('\n')
    : '- 暂无数据'
}

---

## 2. 用词习惯

### 专业术语密度：${cfg.styleGuide.wordChoice.technicalLevel}/10
${cfg.styleGuide.wordChoice.technicalLevel <= 3 ? '很少用术语，通俗易懂' :
  cfg.styleGuide.wordChoice.technicalLevel <= 6 ? '适当用术语，会解释' :
  '术语密集，面向专业人士'}

### 口语化程度：${cfg.styleGuide.wordChoice.colloquialLevel}/10
${cfg.styleGuide.wordChoice.colloquialLevel <= 3 ? '正式书面语' :
  cfg.styleGuide.wordChoice.colloquialLevel <= 6 ? '半正式半口语' :
  '完全口语化，像聊天'}

### 幽默感指数：${cfg.styleGuide.wordChoice.humorLevel}/10
${cfg.styleGuide.wordChoice.humorLevel <= 3 ? '严肃认真' :
  cfg.styleGuide.wordChoice.humorLevel <= 6 ? '偶尔幽默' :
  '风趣幽默，经常调侃'}

---

## 3. 结构习惯

${cfg.styleGuide.structureHabits.length > 0
    ? cfg.styleGuide.structureHabits.map(h => `- ${h}`).join('\n')
    : '- 暂无数据'
}

---

## 4. 情感表达

主导情感基调：${cfg.styleGuide.emotionalTone || '未知'}

---

## 使用建议

### 写作时应用此风格指南：

1. **开头**：使用${cfg.styleGuide.openingHabits[0] || '用户喜欢的方式'}的方式开头
2. **用词**：保持口语化程度${cfg.styleGuide.wordChoice.colloquialLevel}/10
3. **结构**：采用${cfg.styleGuide.structureHabits[0] || '用户习惯的结构'}结构
4. **情感**：保持${cfg.styleGuide.emotionalTone || '用户的情感基调'}的情感基调
`;
        }

        // 通用注意事项
        markdown += `\n---\n\n## 注意事项

- 此风格指南基于你的${cfg.articles.length}篇历史文章生成
- AI写作时会自动应用此风格
- 你可以根据实际情况手动调整
- 每写10篇新文章后，建议重新分析风格
`;

        return markdown;
    };

    return (
        <div className="space-y-6">
            {/* 顶部说明 */}
            <div className="bg-gradient-to-r from-orange-50 to-indigo-50 border border-orange-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-orange-600 mt-0.5 shrink-0" />
                    <div>
                        <h3 className="text-sm font-semibold text-orange-900 mb-1">个人风格学习器</h3>
                        <p className="text-xs text-orange-700 leading-relaxed">
                            上传 10-20 篇你的文章，AI 会分析你的写作风格，让以后的文章写得像你亲手写的。
                            <span className="block mt-1 text-orange-600">🔒 所有文章仅保存在本地，不会上传到云端。</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* 文章上传区域 */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-stone-700 flex items-center gap-2">
                        <Upload className="w-4 h-4" />
                        上传我的文章
                        {config && config.articles.length > 0 && (
                            <span className="text-xs font-normal text-stone-500">
                                （已上传 {config.articles.length} 篇）
                            </span>
                        )}
                    </h4>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setUploadMode('upload')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                                uploadMode === 'upload'
                                    ? 'bg-orange-600 text-white'
                                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                            }`}
                        >
                            文件上传
                        </button>
                        <button
                            onClick={() => setUploadMode('paste')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                                uploadMode === 'paste'
                                    ? 'bg-orange-600 text-white'
                                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                            }`}
                        >
                            粘贴文本
                        </button>
                    </div>
                </div>

                {uploadMode === 'upload' ? (
                    <div
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => document.getElementById('file-upload')?.click()}
                        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                            dragActive
                                ? 'border-orange-500 bg-orange-50'
                                : 'border-stone-300 hover:border-stone-400'
                        }`}
                    >
                        <input
                            ref={(input) => {
                                if (input && !input.hasAttribute('data-initialized')) {
                                    input.setAttribute('data-initialized', 'true');
                                }
                            }}
                            type="file"
                            multiple
                            accept=".md,.txt"
                            onChange={(e) => {
                                handleFileUpload(e.target.files);
                                e.target.value = ''; // 重置 input 以允许重复选择同一文件
                            }}
                            className="hidden"
                            id="file-upload"
                        />
                        <FileText className="w-10 h-10 text-stone-400 mx-auto mb-3" />
                        <p className="text-sm text-stone-700 mb-1">
                            拖拽文件到此处，或点击选择文件
                        </p>
                        <p className="text-xs text-stone-500">
                            支持 .md 和 .txt 文件，可多选
                        </p>
                    </div>
                ) : (
                    <div className="border border-stone-200 rounded-xl p-4">
                        <textarea
                            value={pastedText}
                            onChange={(e) => setPastedText(e.target.value)}
                            placeholder="粘贴你的文章内容..."
                            className="w-full h-40 p-3 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none"
                        />
                        <div className="flex justify-end mt-2">
                            <button
                                onClick={handlePasteSubmit}
                                disabled={!pastedText.trim()}
                                className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:bg-stone-300 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                            >
                                <Upload className="w-4 h-4" />
                                提交文章
                            </button>
                        </div>
                    </div>
                )}

                {uploadSuccess && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700 text-xs">
                        <Check className="w-4 h-4" />
                        文章上传成功！
                    </div>
                )}
            </div>

            {/* 分析按钮和统计信息 */}
            {config && config.articles.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-xs text-stone-600">
                            <span>已上传：{config.articles.length} 篇</span>
                            {config.learningCount > 0 && (
                                <span>学习次数：{config.learningCount}</span>
                            )}
                            {config.lastUpdated && (
                                <span>最后更新：{new Date(config.lastUpdated).toLocaleDateString()}</span>
                            )}
                        </div>
                        <button
                            onClick={handleAnalyze}
                            disabled={isAnalyzing}
                            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-orange-600 to-indigo-600 rounded-lg hover:from-orange-700 hover:to-indigo-700 disabled:from-stone-400 disabled:to-stone-500 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-lg shadow-orange-200"
                        >
                            {isAnalyzing ? (
                                <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    分析中...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4" />
                                    开始分析
                                </>
                            )}
                        </button>
                    </div>

                    {/* 建议提示 */}
                    {config.articles.length < 10 && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                            <p className="text-xs text-amber-800">
                                建议上传 10-20 篇文章以获得更准确的分析结果。当前已上传 {config.articles.length} 篇。
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* 分析结果展示 */}
            {showAnalysisResult && analysisResult && config && (
                <div className="border border-stone-200 rounded-xl overflow-hidden">
                    <div className="bg-stone-50 px-4 py-3 border-b border-stone-200 flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-stone-700 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-orange-600" />
                            风格分析结果
                        </h4>
                        <button
                            onClick={() => setShowAnalysisResult(false)}
                            className="text-stone-400 hover:text-stone-600"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="p-4 space-y-4">
                        {/* 开头习惯 */}
                        <div>
                            <h5 className="text-xs font-semibold text-stone-600 mb-2 flex items-center gap-2">
                                <BookOpen className="w-3.5 h-3.5" />
                                开头习惯
                            </h5>
                            <div className="flex flex-wrap gap-2">
                                {analysisResult.openingHabits.patterns.map((pattern, idx) => (
                                    <span
                                        key={idx}
                                        className="px-2.5 py-1 text-xs bg-orange-50 text-orange-700 rounded-full"
                                    >
                                        {pattern}
                                    </span>
                                ))}
                            </div>
                            {analysisResult.openingHabits.examples.length > 0 && (
                                <div className="mt-2 p-2 bg-stone-50 rounded-lg">
                                    <p className="text-xs text-stone-500 mb-1">典型示例：</p>
                                    {analysisResult.openingHabits.examples.map((example, idx) => (
                                        <p key={idx} className="text-xs text-stone-700 italic pl-2 border-l-2 border-stone-300">
                                            "{example}"
                                        </p>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 用词习惯 */}
                        <div>
                            <h5 className="text-xs font-semibold text-stone-600 mb-2">用词习惯</h5>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="p-2 bg-stone-50 rounded-lg">
                                    <p className="text-xs text-stone-500 mb-1">专业术语</p>
                                    <p className="text-lg font-bold text-stone-700">
                                        {analysisResult.wordChoice.technicalLevel}<span className="text-sm font-normal text-stone-500">/10</span>
                                    </p>
                                </div>
                                <div className="p-2 bg-stone-50 rounded-lg">
                                    <p className="text-xs text-stone-500 mb-1">口语化</p>
                                    <p className="text-lg font-bold text-stone-700">
                                        {analysisResult.wordChoice.colloquialLevel}<span className="text-sm font-normal text-stone-500">/10</span>
                                    </p>
                                </div>
                                <div className="p-2 bg-stone-50 rounded-lg">
                                    <p className="text-xs text-stone-500 mb-1">幽默感</p>
                                    <p className="text-lg font-bold text-stone-700">
                                        {analysisResult.wordChoice.humorLevel}<span className="text-sm font-normal text-stone-500">/10</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* 结构习惯 */}
                        <div>
                            <h5 className="text-xs font-semibold text-stone-600 mb-2">结构习惯</h5>
                            <p className="text-sm text-stone-700 mb-2">
                                最常用的结构：<span className="font-semibold text-orange-600">{analysisResult.structureHabits.mainPattern}</span>
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(analysisResult.structureHabits.distribution).map(([key, value]) => (
                                    <div key={key} className="text-xs">
                                        <span className="text-stone-600">{key}:</span>
                                        <span className="font-semibold text-stone-700 ml-1">{Math.round(value * 100)}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 情感表达 */}
                        <div>
                            <h5 className="text-xs font-semibold text-stone-600 mb-2 flex items-center gap-2">
                                <Heart className="w-3.5 h-3.5" />
                                情感表达
                            </h5>
                            <p className="text-sm text-stone-700">
                                主导基调：<span className="font-semibold text-rose-600">{analysisResult.emotionalExpression.dominantTone}</span>
                            </p>
                            <p className="text-xs text-stone-500 mt-1">
                                情感词密度：约 {analysisResult.emotionalExpression.wordDensity} 个/1000字
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* 手动调整区域 */}
            {config && config.styleGuide && (
                <div className="border border-stone-200 rounded-xl overflow-hidden">
                    <div className="bg-stone-50 px-4 py-3 border-b border-stone-200 flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-stone-700 flex items-center gap-2">
                            <Sliders className="w-4 h-4 text-orange-600" />
                            手动调整风格
                        </h4>
                        {!isEditing && (
                            <button
                                onClick={() => {
                                    setIsEditing(true);
                                    setEditedStyleGuide(config.styleGuide);
                                }}
                                className="px-3 py-1.5 text-xs font-medium text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100 transition-all"
                            >
                                编辑
                            </button>
                        )}
                    </div>

                    <div className="p-4 space-y-4">
                        {isEditing && editedStyleGuide ? (
                            <>
                                {/* 用词调整滑块 */}
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-xs font-medium text-stone-700">专业术语密度</label>
                                            <span className="text-xs font-bold text-orange-600">{editedStyleGuide.wordChoice.technicalLevel}/10</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="10"
                                            value={editedStyleGuide.wordChoice.technicalLevel}
                                            onChange={(e) => setEditedStyleGuide({
                                                ...editedStyleGuide,
                                                wordChoice: {
                                                    ...editedStyleGuide.wordChoice,
                                                    technicalLevel: parseInt(e.target.value)
                                                }
                                            })}
                                            className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                                        />
                                        <div className="flex justify-between text-xs text-stone-500 mt-1">
                                            <span>通俗易懂</span>
                                            <span>术语密集</span>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-xs font-medium text-stone-700">口语化程度</label>
                                            <span className="text-xs font-bold text-orange-600">{editedStyleGuide.wordChoice.colloquialLevel}/10</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="10"
                                            value={editedStyleGuide.wordChoice.colloquialLevel}
                                            onChange={(e) => setEditedStyleGuide({
                                                ...editedStyleGuide,
                                                wordChoice: {
                                                    ...editedStyleGuide.wordChoice,
                                                    colloquialLevel: parseInt(e.target.value)
                                                }
                                            })}
                                            className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                                        />
                                        <div className="flex justify-between text-xs text-stone-500 mt-1">
                                            <span>正式书面</span>
                                            <span>完全口语</span>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-xs font-medium text-stone-700">幽默感指数</label>
                                            <span className="text-xs font-bold text-orange-600">{editedStyleGuide.wordChoice.humorLevel}/10</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="10"
                                            value={editedStyleGuide.wordChoice.humorLevel}
                                            onChange={(e) => setEditedStyleGuide({
                                                ...editedStyleGuide,
                                                wordChoice: {
                                                    ...editedStyleGuide.wordChoice,
                                                    humorLevel: parseInt(e.target.value)
                                                }
                                            })}
                                            className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                                        />
                                        <div className="flex justify-between text-xs text-stone-500 mt-1">
                                            <span>严肃认真</span>
                                            <span>风趣幽默</span>
                                        </div>
                                    </div>
                                </div>

                                {/* 按钮组 */}
                                <div className="flex gap-2 pt-2">
                                    <button
                                        onClick={handleSaveEdit}
                                        className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-all flex items-center gap-2"
                                    >
                                        <Check className="w-4 h-4" />
                                        保存修改
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsEditing(false);
                                            setEditedStyleGuide(null);
                                        }}
                                        className="px-4 py-2 text-sm font-medium text-stone-600 bg-stone-100 rounded-lg hover:bg-stone-200 transition-all"
                                    >
                                        取消
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-3">
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="p-3 bg-orange-50 rounded-lg">
                                        <p className="text-xs text-orange-600 mb-1">专业术语</p>
                                        <p className="text-xl font-bold text-orange-700">
                                            {config.styleGuide.wordChoice.technicalLevel}<span className="text-sm font-normal">/10</span>
                                        </p>
                                    </div>
                                    <div className="p-3 bg-green-50 rounded-lg">
                                        <p className="text-xs text-green-600 mb-1">口语化</p>
                                        <p className="text-xl font-bold text-green-700">
                                            {config.styleGuide.wordChoice.colloquialLevel}<span className="text-sm font-normal">/10</span>
                                        </p>
                                    </div>
                                    <div className="p-3 bg-purple-50 rounded-lg">
                                        <p className="text-xs text-purple-600 mb-1">幽默感</p>
                                        <p className="text-xl font-bold text-purple-700">
                                            {config.styleGuide.wordChoice.humorLevel}<span className="text-sm font-normal">/10</span>
                                        </p>
                                    </div>
                                </div>

                                {/* 其他风格信息 */}
                                {config.styleGuide.openingHabits.length > 0 && (
                                    <div>
                                        <p className="text-xs text-stone-500 mb-1">开头习惯</p>
                                        <div className="flex flex-wrap gap-2">
                                            {config.styleGuide.openingHabits.map((habit, idx) => (
                                                <span key={idx} className="px-2.5 py-1 text-xs bg-stone-100 text-stone-700 rounded-full">
                                                    {habit}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {config.styleGuide.emotionalTone && (
                                    <div>
                                        <p className="text-xs text-stone-500 mb-1">情感基调</p>
                                        <p className="text-sm font-semibold text-stone-700">{config.styleGuide.emotionalTone}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 风格指南预览 */}
            {config && (
                <div className="border border-stone-200 rounded-xl overflow-hidden">
                    <div className="bg-stone-50 px-4 py-3 border-b border-stone-200 flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-stone-700 flex items-center gap-2">
                            <Eye className="w-4 h-4 text-orange-600" />
                            风格指南预览
                        </h4>
                        <button
                            onClick={() => setShowStyleGuide(!showStyleGuide)}
                            className="text-xs text-orange-600 hover:text-orange-700"
                        >
                            {showStyleGuide ? '隐藏' : '显示'}
                        </button>
                    </div>

                    {showStyleGuide && (
                        <div className="p-4 bg-stone-50">
                            <pre className="text-xs text-stone-700 whitespace-pre-wrap font-mono leading-relaxed">
                                {generateStyleGuideMarkdown(config)}
                            </pre>
                        </div>
                    )}
                </div>
            )}

            {/* 操作按钮组 */}
            {config && (
                <div className="flex gap-2 pt-2">
                    <button
                        onClick={handleExport}
                        className="flex-1 px-4 py-2.5 text-sm font-medium text-stone-700 bg-stone-100 rounded-xl hover:bg-stone-200 transition-all flex items-center justify-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        导出风格指南
                    </button>
                    <button
                        onClick={handleClear}
                        className="px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                    >
                        <Trash2 className="w-4 h-4" />
                        清除配置
                    </button>
                </div>
            )}

            {/* 错误提示 */}
            {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700 text-sm">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    {error}
                </div>
            )}

            {/* 使用说明 */}
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
                <h4 className="text-xs font-semibold text-stone-700 mb-2">💡 使用建议</h4>
                <ul className="text-xs text-stone-600 space-y-1 list-disc list-inside">
                    <li>选择你自己满意的文章、阅读量高的文章</li>
                    <li>最好覆盖不同类型（教程、观点、故事）</li>
                    <li>建议上传 10-20 篇文章以获得更准确的分析</li>
                    <li>每写 10 篇新文章后，建议重新分析一次</li>
                    <li>AI 分析可能不准确，你可以手动调整</li>
                </ul>
            </div>
        </div>
    );
}
