---
name: canvas-design
description: |
  Canvas 设计工具 - 使用 HTML Canvas API 创建视觉设计和艺术作品。
  生成 PNG/PDF 格式的设计作品。当用户需要：创建设计、生成艺术、视觉创作时触发此技能。
---

# Canvas 设计工具

## 概述

使用 HTML5 Canvas API 创建高质量的设计和艺术作品。

**核心功能**：
- 2D 图形绘制
- 图像处理
- 文字排版
- 导出 PNG/PDF

## 基础设置

### 创建 Canvas

```javascript
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');

// 设置画布大小
canvas.width = 1920;
canvas.height = 1080;

// 设置背景
ctx.fillStyle = '#ffffff';
ctx.fillRect(0, 0, canvas.width, canvas.height);
```

## 绘图操作

### 基本形状

```javascript
// 矩形
ctx.fillStyle = '#3498db';
ctx.fillRect(x, y, width, height);

// 圆形
ctx.beginPath();
ctx.arc(x, y, radius, 0, Math.PI * 2);
ctx.fillStyle = '#e74c3c';
ctx.fill();

// 线条
ctx.beginPath();
ctx.moveTo(x1, y1);
ctx.lineTo(x2, y2);
ctx.strokeStyle = '#2ecc71';
ctx.lineWidth = 2;
ctx.stroke();
```

### 文字渲染

```javascript
// 设置字体
ctx.font = 'bold 48px Arial';
ctx.fillStyle = '#333333';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';

// 绘制文字
ctx.fillText('Hello Canvas', x, y);

// 文字描边
ctx.strokeText('Outlined Text', x, y);
```

### 渐变

```javascript
// 线性渐变
const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
gradient.addColorStop(0, '#3498db');
gradient.addColorStop(1, '#9b59b6');
ctx.fillStyle = gradient;
ctx.fillRect(x, y, width, height);

// 径向渐变
const radialGradient = ctx.createRadialGradient(x, y, r1, x, y, r2);
radialGradient.addColorStop(0, '#ffffff');
radialGradient.addColorStop(1, '#000000');
ctx.fillStyle = radialGradient;
ctx.beginPath();
ctx.arc(x, y, radius, 0, Math.PI * 2);
ctx.fill();
```

## 高级效果

### 阴影

```javascript
ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
ctx.shadowBlur = 10;
ctx.shadowOffsetX = 5;
ctx.shadowOffsetY = 5;
ctx.fillRect(x, y, width, height);
```

### 透明度

```javascript
ctx.globalAlpha = 0.5;
ctx.fillRect(x, y, width, height);
ctx.globalAlpha = 1.0; // 重置
```

### 组合操作

```javascript
// 源图像在目标图像之上
ctx.globalCompositeOperation = 'source-over';

// 目标图像在源图像之上
ctx.globalCompositeOperation = 'destination-over';

// 交集
ctx.globalCompositeOperation = 'source-in';
```

## 图像处理

### 加载图像

```javascript
const img = new Image();
img.onload = () => {
  ctx.drawImage(img, x, y, width, height);
};
img.src = 'image.png';
```

### 图像滤镜

```javascript
// 像素级操作
const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
const data = imageData.data;

for (let i = 0; i < data.length; i += 4) {
  // 灰度效果
  const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
  data[i] = avg;     // R
  data[i + 1] = avg; // G
  data[i + 2] = avg; // B
}

ctx.putImageData(imageData, 0, 0);
```

## 导出

### PNG 导出

```javascript
// 导出为 PNG
const dataURL = canvas.toDataURL('image/png');

// 下载
const link = document.createElement('a');
link.download = 'design.png';
link.href = dataURL;
link.click();
```

### PDF 导出（使用 jsPDF）

```javascript
import jsPDF from 'jspdf';

const pdf = new jsPDF({
  orientation: 'landscape',
  unit: 'px',
  format: [canvas.width, canvas.height]
});

const imgData = canvas.toDataURL('image/png');
pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
pdf.save('design.pdf');
```

## 设计模式

### 几何图案

```javascript
function drawGeometricPattern() {
  const colors = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12'];

  for (let i = 0; i < 50; i++) {
    ctx.beginPath();
    ctx.arc(
      Math.random() * canvas.width,
      Math.random() * canvas.height,
      Math.random() * 50 + 10,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
    ctx.globalAlpha = 0.7;
    ctx.fill();
  }
}
```

### 网格布局

```javascript
function drawGrid(cols, rows) {
  const cellWidth = canvas.width / cols;
  const cellHeight = canvas.height / rows;

  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const x = i * cellWidth;
      const y = j * cellHeight;

      ctx.strokeStyle = '#dddddd';
      ctx.strokeRect(x, y, cellWidth, cellHeight);
    }
  }
}
```

## 最佳实践

### 1. 使用 Save/Restore

```javascript
ctx.save(); // 保存状态
ctx.translate(100, 100);
ctx.rotate(Math.PI / 4);
ctx.fillRect(0, 0, 50, 50);
ctx.restore(); // 恢复状态
```

### 2. 优化性能

```javascript
// 批量绘制
requestAnimationFrame(() => {
  draw();
});

// 离屏 Canvas
const offscreenCanvas = document.createElement('canvas');
const offscreenCtx = offscreenCanvas.getContext('2d');
// 在离屏 canvas 上绘制
```

### 3. 响应式设计

```javascript
function resizeCanvas() {
  const container = canvas.parentElement;
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
  redraw();
}
```

## 依赖要求

- 浏览器环境或 Node.js canvas 库
- jsPDF（可选，用于 PDF 导出）

## 代码风格指南

- 使用常量定义颜色和尺寸
- 封装绘制函数
- 添加注释说明复杂逻辑
- 使用模块化代码结构

## 常见陷阱

**避免**：
- ❌ 在循环中重复创建对象
- ❌ 忘记重置状态（globalAlpha, shadow 等）
- ❌ 硬编码坐标（使用相对定位）

**推荐**：
- ✅ 使用 save/restore 保护状态
- ✅ 缓存常用对象
- ✅ 使用变量控制布局参数
