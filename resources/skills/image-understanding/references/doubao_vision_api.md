# 豆包视觉 API 参考文档

## 模型列表

- **doubao-1.5-vision-pro-32k**: 支持图片理解，32K 上下文
- **doubao-seed-1.6-vision**: 支持图像处理和思维链
- **doubao-embedding-vision**: 支持图片向量化

## API 端点

```
Base URL: https://ark.cn-beijing.volces.com/api/v3
```

## 请求格式

```python
from openai import OpenAI

client = OpenAI(
    api_key="your-doubao-api-key",
    base_url="https://ark.cn-beijing.volces.com/api/v3"
)

response = client.chat.completions.create(
    model="doubao-1.5-vision-pro-32k",
    messages=[{
        "role": "user",
        "content": [
            {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64,..."}},
            {"type": "text", "text": "你的问题或提示词"}
        ]
    }],
    max_tokens=2000
)

result = response.choices[0].message.content
```

## 支持的图片格式

- JPEG
- PNG
- WEBP
- GIF

## 图片格式说明

### Base64 格式
```
data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBD...
data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...
```

### 文件路径
脚本支持直接传入图片文件路径，会自动转换为 base64 格式：
```bash
python image_understanding.py describe /path/to/image.jpg
```

## 最佳实践

1. **图片大小**：建议 < 5MB
2. **分辨率**：建议 1024x1024 以上
3. **提示词**：清晰明确，描述需要关注的内容
4. **多图片**：目前建议一次处理一张图片

## 错误处理

### 常见错误

1. **API Key 未配置**
   - 错误：`ValueError: 豆包 API Key 未配置`
   - 解决：设置环境变量 `DOUBAO_API_KEY` 或在应用设置面板配置

2. **图片格式不支持**
   - 错误：Invalid image format
   - 解决：确保图片是 JPEG、PNG、WEBP 或 GIF 格式

3. **API 调用失败**
   - 错误：Connection error / Timeout
   - 解决：检查网络连接和 API 端点可访问性

## 使用示例

### 描述图片
```bash
python image_understanding.py describe "data:image/jpeg;base64,..."
python image_understanding.py describe "data:image/jpeg;base64,..." --language en-US
```

### 分析图片
```bash
python image_understanding.py analyze "data:image/jpeg;base64,..."
python image_understanding.py analyze "data:image/jpeg;base64,..." --aspect colors
```

### 提取文字
```bash
python image_understanding.py ocr "data:image/jpeg;base64,..."
python image_understanding.py ocr "data:image/jpeg;base64,..." --language zh-CN
```

### 回答问题
```bash
python image_understanding.py question "data:image/jpeg;base64,..." "这是什么？"
```

## 返回格式

成功时：
```json
{
  "success": true,
  "result": "分析结果内容..."
}
```

失败时：
```json
{
  "success": false,
  "error": "错误信息"
}
```

## 性能指标

- 响应时间：通常 1-3 秒
- OCR 准确率：> 95%
- 支持的最大图片大小：5MB
