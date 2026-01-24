## 实现权限请求通知功能

### 目标

当牛马（应用）请求权限确认时，发送桌面通知提醒用户，确保用户不会错过权限确认请求。

### 实现步骤

1. **修改AgentRuntime.ts中的requestConfirmation方法**

   * 在发送权限确认请求时，同时发送通知

   * 通知内容包含权限类型和操作描述

   * 保持与现有通知系统风格一致

2. **通知内容设计**

   * 标题：牛马需要权限

   * 内容：根据不同的权限类型生成相应的描述

   * 例如："牛马需要写入文件权限才能继续工作"

   * 使用现有的info类型通知

3. **代码修改**

   * 在AgentRuntime.ts的requestConfirmation方法中添加通知调用

   * 确保通知只在需要用户确认时发送（已保存权限的情况不发送）

### 技术实现

修改`electron/agent/AgentRuntime.ts`文件中的`requestConfirmation`方法，在发送确认请求前添加通知调用：

```typescript
private async requestConfirmation(tool: string, description: string, args: Record<string, unknown>): Promise<boolean> {
    // Extract path from args if available
    const path = (args?.path || args?.cwd) as string | undefined;

    // Check if permission is already granted
    if (configStore.hasPermission(tool, path)) {
        console.log(`[AgentRuntime] Auto-approved ${tool} (saved permission)`);
        return true;
    }

    // Send notification about permission request
    notificationService.sendInfoNotification(
        '牛马需要权限',
        `需要您确认${this.getPermissionDescription(tool)}权限才能继续工作`
    );

    const id = `confirm-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    return new Promise((resolve) => {
        this.pendingConfirmations.set(id, { resolve });
        this.broadcast('agent:confirm-request', { id, tool, description, args });
    });
}

// Helper method to get permission description
private getPermissionDescription(tool: string): string {
    const descriptions: Record<string, string> = {
        'write_file': '写入文件',
        'run_command': '执行命令',
        'read_file': '读取文件',
        'list_dir': '查看目录'
    };
    return descriptions[tool] || tool;
}
```

### 预期效果

1. 当牛马需要权限确认时，用户会收到桌面通知
2. 通知内容清晰明了，告知用户需要什么权限
3. 用户点击通知可以快速切换到应用进行确认
4. 已保存权限的操作不会发送通知，避免打扰

### 测试要点

1. 测试不同类型的权限请求（写入文件、执行命令等）
2. 测试已保存权限的情况（不应发送通知）
3. 测试通知内容是否准确
4. 测试通知与确认对话框的配合使用

