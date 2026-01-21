---
name: algorithmic-art
description: |
  算法艺术工具 - 使用 p5.js 创建生成艺术作品。
  支持随机种子、参数探索和交互式创作。当用户需要：创作艺术、生成艺术、算法艺术时触发此技能。
---

# 算法艺术创作

## 概述

使用 p5.js 创建基于算法的生成艺术作品。

**核心功能**：
- 种子随机数（可重现）
- 交互式参数调整
- 导出高质量图像
- Web 交互查看器

## 基础模板

### 标准结构

```javascript
let params = {
  seed: 12345,
  param1: 0.5,
  param2: 100,
  color1: '#3498db',
  color2: '#e74c3c'
};

function setup() {
  createCanvas(1200, 1200);
  randomSeed(params.seed);
  noiseSeed(params.seed);
  noLoop(); // 静态图像
}

function draw() {
  background(255);
  // 生成艺术
  generateArt();
}

function generateArt() {
  // 艺术生成逻辑
}
```

### 基础元素

#### 粒子系统

```javascript
let particles = [];

function setup() {
  createCanvas(1200, 1200);
  randomSeed(params.seed);

  for (let i = 0; i < params.particleCount; i++) {
    particles.push(new Particle());
  }
}

class Particle {
  constructor() {
    this.x = random(width);
    this.y = random(height);
    this.vx = random(-1, 1);
    this.vy = random(-1, 1);
    this.size = random(2, 5);
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;

    // 边界处理
    if (this.x < 0 || this.x > width) this.vx *= -1;
    if (this.y < 0 || this.y > height) this.vy *= -1;
  }

  display() {
    noStroke();
    fill(params.color1);
    circle(this.x, this.y, this.size);
  }
}
```

#### 流场（Flow Field）

```javascript
function draw() {
  background(255, 10); // 拖尾效果

  const scale = params.noiseScale;
  const stepSize = params.stepSize;

  for (let i = 0; i < params.particlesPerFrame; i++) {
    const x = random(width);
    const y = random(height);

    const angle = noise(x * scale, y * scale) * TWO_PI * 2;

    push();
    translate(x, y);
    rotate(angle);
    stroke(params.color1);
    line(0, 0, stepSize, 0);
    pop();
  }
}
```

#### Perlin 噪声

```javascript
function draw() {
  for (let x = 0; x < width; x += 10) {
    for (let y = 0; y < height; y += 10) {
      const n = noise(x * 0.01, y * 0.01, frameCount * 0.01);
      const size = n * 20;

      noStroke();
      fill(n * 255);
      circle(x, y, size);
    }
  }
}
```

## 高级技巧

### 递归模式

```javascript
function drawBranch(len, angle) {
  line(0, 0, 0, -len);
  translate(0, -len);

  if (len > 4) {
    push();
    rotate(angle);
    drawBranch(len * 0.67, angle);
    pop();

    push();
    rotate(-angle);
    drawBranch(len * 0.67, angle);
    pop();
  }
}
```

### L-System

```javascript
let sentence = "F";
let rules = [];
let len = 100;

function setup() {
  createCanvas(600, 600);
  rules[0] = {
    a: "F",
    b: "FF+[+F-F-F]-[-F+F+F]"
  };

  for (let i = 0; i < 4; i++) {
    generate();
  }
}

function generate() {
  let nextSentence = "";
  for (let i = 0; i < sentence.length; i++) {
    let current = sentence.charAt(i);
    if (current === "F") {
      nextSentence += rules[0].b;
    } else {
      nextSentence += current;
    }
  }
  sentence = nextSentence;
}
```

## 艺术风格

### 有机形态

```javascript
// 使用噪声创建有机形状
function drawOrganicShape() {
  beginShape();
  for (let angle = 0; angle < TWO_PI; angle += 0.1) {
    const r = 100 + noise(angle, frameCount * 0.01) * 50;
    const x = width/2 + r * cos(angle);
    const y = height/2 + r * sin(angle);
    vertex(x, y);
  }
  endShape(CLOSE);
}
```

### 几何抽象

```javascript
function drawGeometric() {
  rectMode(CENTER);
  for (let i = 0; i < 50; i++) {
    push();
    translate(random(width), random(height));
    rotate(random(TWO_PI));
    fill(random(colors));
    rect(0, 0, random(20, 100), random(20, 100));
    pop();
  }
}
```

## 交互式参数

### 创建 UI

```javascript
function setup() {
  createCanvas(1200, 1200);

  // 创建滑块
  createSlider(0, 100, 50).position(10, 10).input(() => {
    params.density = this.value();
    redraw();
  });
}
```

### 种子控制

```javascript
function keyPressed() {
  if (key === 'n') {
    params.seed++;
    randomSeed(params.seed);
    noiseSeed(params.seed);
    redraw();
  }
}
```

## 导出

### 保存图像

```javascript
function saveArt() {
  saveCanvas('artwork', 'png');
}

function mousePressed() {
  saveArt();
}
```

### 批量生成

```javascript
function generateBatch() {
  for (let s = 1; s <= 100; s++) {
    params.seed = s;
    randomSeed(params.seed);
    noiseSeed(params.seed);
    redraw();
    saveCanvas(`artwork-${s}`, 'png');
  }
}
```

## 最佳实践

### 1. 使用种子

```javascript
// 总是使用种子确保可重现
randomSeed(params.seed);
noiseSeed(params.seed);
```

### 2. 参数化设计

```javascript
// 使用参数对象
let params = {
  count: 100,
  size: 50,
  speed: 2,
  colors: ['#fff', '#000']
};
```

### 3. 性能优化

```javascript
// 使用 noLoop() 静态图像
// 使用限制循环次数
// 避免复杂计算
```

## 依赖要求

- **p5.js**: `npm install p5` 或从 CDN 加载
- 浏览器或 Node.js 环境

## 艺术原则

**关键原则**：
- **过程重于产品**：美在于算法的执行
- **参数化表达**：思想通过数学关系传递
- **可重现性**：相同种子产生相同结果
- **探索性**：交互式参数调整
- **工艺精湛**：精心调整每个参数

## 代码风格指南

- 使用描述性变量名
- 封装复杂逻辑到函数
- 添加注释解释算法
- 测试不同种子值
- 优化性能
