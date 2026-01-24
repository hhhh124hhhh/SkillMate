/**
 * Python 错误翻译器
 * 将技术性的 Python 错误转换为小白友好的提示
 */

export interface FriendlyError {
  title: string;          // 友好的标题
  message: string;        // 友好的错误说明
  solution: string;       // 解决方案
  canAutoFix: boolean;    // 是否可以一键修复
  errorType: 'dependency' | 'permission' | 'runtime' | 'syntax' | 'unknown';
}

export class PythonErrorTranslator {
  /**
   * 解析 Python 错误并返回友好提示
   * @param errorOutput Python 标准错误输出
   * @param errorCode Python 退出码
   * @returns 友好的错误信息
   */
  translate(errorOutput: string, errorCode: number | null): FriendlyError {
    const error = errorOutput.toLowerCase();
    const output = errorOutput;

    // 1. 依赖缺失错误
    if (this.isDependencyError(output, error)) {
      const missingPackage = this.extractMissingPackage(output);
      return {
        title: '😊 需要安装一个小工具',
        message: missingPackage
          ? `「${this.getPackageFriendlyName(missingPackage)}」功能需要额外的组件支持。`
          : '这个功能需要额外的组件才能运行。',
        solution: missingPackage
          ? `点击下方按钮自动安装 ${this.getPackageFriendlyName(missingPackage)}`
          : '点击下方按钮自动安装所需组件',
        canAutoFix: true,
        errorType: 'dependency'
      };
    }

    // 2. 权限错误
    if (error.includes('permission denied') || error.includes('access denied')) {
      return {
        title: '🔐 需要文件访问权限',
        message: 'AI 需要访问这个文件才能帮你完成任务。',
        solution: '请在设置中授权访问这个文件夹，然后重试。',
        canAutoFix: false,
        errorType: 'permission'
      };
    }

    // 3. 文件不存在错误
    if (error.includes('filenotfounderror') || error.includes('no such file')) {
      return {
        title: '📁 找不到文件',
        message: 'AI 找不到你提到的文件，可能文件路径不正确。',
        solution: '请检查文件路径是否正确，或者重新上传文件。',
        canAutoFix: false,
        errorType: 'runtime'
      };
    }

    // 4. 语法错误
    if (error.includes('syntaxerror') || error.includes('syntax error')) {
      return {
        title: '⚠️ 代码格式错误',
        message: 'AI 生成的代码格式有问题，需要重新生成。',
        solution: '请重新尝试，或者换个说法告诉 AI 你的需求。',
        canAutoFix: false,
        errorType: 'syntax'
      };
    }

    // 5. 内存错误
    if (error.includes('memoryerror') || error.includes('out of memory')) {
      return {
        title: '💾 内存不足',
        message: '处理这个任务需要更多内存，请关闭其他应用后重试。',
        solution: '尝试关闭一些不需要的应用，或者减小文件大小。',
        canAutoFix: false,
        errorType: 'runtime'
      };
    }

    // 6. 网络错误
    if (error.includes('timeout') || error.includes('connection') || error.includes('network')) {
      return {
        title: '🌐 网络连接问题',
        message: '无法连接到服务器，请检查你的网络连接。',
        solution: '请检查网络设置，确保能正常访问互联网。',
        canAutoFix: false,
        errorType: 'runtime'
      };
    }

    // 7. API密钥错误
    if (error.includes('api key') || error.includes('authentication') || error.includes('unauthorized')) {
      return {
        title: '🔑 API密钥配置错误',
        message: '请在设置中配置正确的 API 密钥。',
        solution: '打开设置 → API配置，填入你的密钥。',
        canAutoFix: false,
        errorType: 'runtime'
      };
    }

    // 8. 默认错误
    return {
      title: '😅 遇到了一点问题',
      message: 'AI 在执行任务时遇到了错误，请重试或换个说法试试。',
      solution: '如果问题持续出现，请联系技术支持。',
      canAutoFix: false,
      errorType: 'unknown'
    };
  }

  /**
   * 检查是否是依赖缺失错误
   */
  private isDependencyError(output: string, error: string): boolean {
    const patterns = [
      'modulenotfounderror',
      'importerror',
      'no module named',
      'missing required dependencies'
    ];

    return patterns.some(pattern => error.includes(pattern));
  }

  /**
   * 从错误信息中提取缺失的包名
   */
  private extractMissingPackage(error: string): string | null {
    // 匹配 "No module named 'xxx'" 或 "ModuleNotFoundError: No module named 'xxx'"
    const moduleMatch = error.match(/no module named ['"]([^'"]+)['"]/i);
    if (moduleMatch) {
      return moduleMatch[1];
    }

    // 匹配 "ImportError: cannot import name 'xxx' from 'yyy'"
    const importMatch = error.match(/importerror:? cannot import name ['"]([^'"]+)['"]/i);
    if (importMatch) {
      return importMatch[1];
    }

    return null;
  }

  /**
   * 获取包的友好名称
   */
  private getPackageFriendlyName(packageName: string): string {
    const friendlyNames: Record<string, string> = {
      'openai': 'OpenAI API',
      'anthropic': 'Anthropic API',
      'requests': '网络请求库',
      'pillow': '图像处理库',
      'pil': '图像处理库',
      'numpy': '数值计算库',
      'pandas': '数据分析库',
      'matplotlib': '图表绘制库',
      'yaml': '配置文件解析',
      'pyyaml': '配置文件解析',
      'jinja2': '模板引擎',
      'beautifulsoup4': '网页解析库',
      'bs4': '网页解析库',
      'scipy': '科学计算库',
      'scikit-learn': '机器学习库',
      'torch': 'PyTorch深度学习框架',
      'tensorflow': 'TensorFlow深度学习框架'
    };

    return friendlyNames[packageName.toLowerCase()] || packageName;
  }

  /**
   * 获取安装命令
   */
  getInstallCommand(packageName: string): string {
    return `pip install ${packageName}`;
  }
}

// 导出单例
export const pythonErrorTranslator = new PythonErrorTranslator();
