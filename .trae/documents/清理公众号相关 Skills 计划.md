**操作目标**: 清理项目中与公众号业务强相关的 Skills，仅保留通用核心能力。

**执行步骤**:

1. **创建归档目录**

   * 在 `resources/skills/` 下创建一个 `archive` 目录（或者直接删除，取决于您的偏好，默认为删除以保持项目清爽，若需保留请指示）。

   * *本计划默认执行：直接删除相关文件夹。*

2. **执行清理**

   * 删除以下目录：

     * `resources/skills/wechat-workflow`

     * `resources/skills/topic-selector`

     * `resources/skills/title-generator`

     * `resources/skills/wechat-writing`

     * `resources/skills/style-learner`

     * `resources/skills/cover-generator`

     * `resources/skills/smart-layout`

     * `resources/skills/wechat-article-fetcher`

     * `resources/skills/data-writer`

     * `resources/skills/data-analyzer`

3. **验证环境**

   * 检查剩余 Skills (`skill-creator`, `web-artifacts-builder`, `ai-writer` 等) 是否完整。

   * 列出清理后的 Skills 列表供最终核对。

