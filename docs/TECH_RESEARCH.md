# 技术预研文档：scrcpy + OpenCV 集成方案

## 1. scrcpy 技术预研

### 1.1 scrcpy 原理分析

#### 1.1.1 架构原理

```
┌─────────────────────────────────────────────────────────┐
│                      PC 端                               │
│  ┌─────────────┐     ┌─────────────┐     ┌───────────┐ │
│  │   Client    │ ←→  │   Server    │ ←→  │  Decoder  │ │
│  │  (控制端)    │     │  (中转服务)  │     │  (解码器)  │ │
│  └─────────────┘     └─────────────┘     └───────────┘ │
└─────────────────────────────────────────────────────────┘
         ↕ ADB (USB/TCP)           ↕ H.264 视频流
┌─────────────────────────────────────────────────────────┐
│                   Android 设备                            │
│  ┌─────────────┐     ┌─────────────┐     ┌───────────┐ │
│  │  Screen     │ →   │  Encoder    │ →   │  ADB      │ │
│  │  (屏幕)      │     │  (H.264)    │     │  服务      │ │
│  └─────────────┘     └─────────────┘     └───────────┘ │
└─────────────────────────────────────────────────────────┘
```

**工作流程**：
1. PC 端通过 ADB 在 Android 设备上启动 `scrcpy-server`
2. Android 端使用 `MediaCodec` 编码屏幕为 H.264 流
3. 通过 ADB 通道传输到 PC 端
4. PC 端解码并渲染到窗口
5. PC 端捕获键鼠操作，转换为 Android touch 事件，反向传输

#### 1.1.2 关键参数

```bash
# 推荐配置（低延迟优先）
scrcpy \
  --bit-rate=8M \              # 比特率：8Mbps（平衡画质和延迟）
  --max-size=1920 \            # 最大尺寸：1920px（全高清）
  --max-fps=60 \               # 最大帧率：60fps
  --display-buffer=0 \         # 显示缓冲：0ms（最低延迟）
  --video-buffer=0 \           # 视频缓冲：0ms
  --tcpip=192.168.1.100:5555 \ # TCP/IP 连接
  --no-audio \                 # 禁用音频（降低带宽）
  --stay-awake \               # 保持屏幕常亮
  --no-control                 # 禁用控制（仅观看模式，可选）
```

**参数影响**：

| 参数 | 默认值 | 推荐值 | 对延迟影响 | 对画质影响 |
|------|--------|--------|-----------|-----------|
| bit-rate | 8Mbps | 8Mbps | 低 → 高 | 差 → 好 |
| max-size | 0 (无限制) | 1920 | 高 → 低 | 好 → 差 |
| max-fps | 0 (无限制) | 60 | 高 → 低 | 流畅 → 卡顿 |
| display-buffer | 0ms | 0ms | 无影响 | 无影响 |
| video-buffer | 0ms | 0ms | 无影响 | 可能花屏 |

### 1.2 scrcpy-node 集成方案

#### 1.2.1 方案对比

| 方案 | 优点 | 缺点 | 推荐度 |
|------|------|------|--------|
| **方案 1: 调用 scrcpy CLI** | 简单，稳定 | 性能损耗，难定制 | ⭐⭐⭐ |
| **方案 2: scrcpy-server 定制** | 灵活，可控 | 开发成本高 | ⭐⭐⭐⭐ |
| **方案 3: 使用现有库** | 快速集成 | 依赖第三方 | ⭐⭐⭐⭐⭐ |

#### 1.2.2 推荐方案：使用 @yume-chan/scrcpy

**npm 包**：`@yume-chan/scrcpy`

**优点**：
- ✅ TypeScript 原生支持
- ✅ WebSocket 流式传输
- ✅ 低延迟（<100ms）
- ✅ 主动维护
- ✅ 支持 touch 事件

**安装**：
```bash
npm install @yume-chan/scrcpy @yume-chan/adb
```

**基础使用**：
```typescript
import { ScrcpyClient } from '@yume-chan/scrcpy';
import { Adb } from '@yume-chan/adb';

// 连接设备
const adb = await Adb.create();
await adb.connect('192.168.1.100:5555');

// 启动 scrcpy
const client = new ScrcpyClient(adb, {
  bitRate: 8000000,
  maxSize: 1920,
  maxFps: 60,
});

// 获取视频流
const stream = await client.getStream();

// 渲染到 Canvas
const canvas = document.getElementById('screen') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

stream.on('frame', (frame) => {
  const img = new Image();
  img.src = URL.createObjectURL(frame);
  img.onload = () => {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  };
});

// 发送 touch 事件
await client.touch('tap', { x: 100, y: 200 });
```

#### 1.2.3 自定义 scrcpy-server

如果需要深度定制，可以修改 scrcpy-server：

```java
// 修改 Android 端 scrcpy-server
public class CustomScrcpyServer extends ScrcpyServer {
    @Override
    protected void handleConnection(Socket clientSocket) {
        // 自定义逻辑
        // 1. 添加屏幕捕获回调
        // 2. 添加 touch 事件拦截
        // 3. 添加性能监控
    }
}
```

**编译**：
```bash
./gradlew assembleRelease
# 输出：scrcpy-server-custom.jar
```

### 1.3 性能优化

#### 1.3.1 延迟优化

```
优化前：200-300ms
优化后：60-100ms
```

**优化措施**：

1. **降低编码延迟**
```bash
# 使用更快的编码预设
scrcpy --encoder-opts 'profile=baseline,preset=ultrafast'
```

2. **减少缓冲**
```typescript
// 禁用所有缓冲
const options = {
  displayBuffer: 0,
  videoBuffer: 0,
  tcpNoDelay: true,  // TCP_NODELAY
};
```

3. **硬件解码**
```typescript
// 使用 WebCodecs API（Chrome 94+）
import { VideoDecoder } from 'web-codecs';

const decoder = new VideoDecoder({
  output: (frame) => {
    // 渲染帧
  },
  error: (e) => console.error(e),
});
```

4. **共享内存传输**
```typescript
// 使用 SharedArrayBuffer 避免拷贝
const sharedBuffer = new SharedArrayBuffer(width * height * 4);
const view = new Uint8ClampedArray(sharedBuffer);

// 零拷贝渲染
const imageData = new ImageData(view, width, height);
ctx.putImageData(imageData, 0, 0);
```

#### 1.3.2 帧率优化

```typescript
// 动态帧率调整
class AdaptiveFrameRate {
  private targetFps = 60;
  private currentFps = 60;
  
  adjust(networkLatency: number) {
    if (networkLatency > 100) {
      this.currentFps = Math.max(30, this.currentFps - 5);
    } else if (networkLatency < 50) {
      this.currentFps = Math.min(60, this.currentFps + 5);
    }
    return this.currentFps;
  }
}
```

#### 1.3.3 带宽优化

| 分辨率 | 比特率 | 带宽占用 | 适用场景 |
|--------|--------|---------|---------|
| 1920x1080 | 8Mbps | 1MB/s | 高质量录制 |
| 1280x720 | 4Mbps | 500KB/s | 日常使用 |
| 854x480 | 2Mbps | 250KB/s | 网络不佳 |
| 640x360 | 1Mbps | 125KB/s | 极限模式 |

---

## 2. OpenCV 技术预研

### 2.1 OpenCV.js 方案对比

#### 2.1.1 方案对比

| 方案 | 包名 | 大小 | 性能 | 推荐度 |
|------|------|------|------|--------|
| **@techstark/opencv-js** | 7.5MB | ⭐⭐⭐⭐ | ✅ 推荐 |
| opencv.js | 7.5MB | ⭐⭐⭐ | 官方 |
| opencv4nodejs | - | ⭐⭐⭐⭐⭐ | ❌ 已过时 |

#### 2.1.2 @techstark/opencv-js 使用

**安装**：
```bash
npm install @techstark/opencv-js
```

**基础使用**：
```typescript
import * as cv from '@techstark/opencv-js';

async function matchTemplate(
  screenshot: Buffer,
  template: Buffer,
  threshold: number = 0.8
): Promise<{ found: boolean; x: number; y: number; confidence: number }> {
  // 读取图像
  const src = cv.imdecode(screenshot);
  const templ = cv.imdecode(template);
  
  // 创建结果矩阵
  const result = new cv.Mat();
  
  // 模板匹配
  cv.matchTemplate(src, templ, result, cv.TM_CCOEFF_NORMED);
  
  // 查找最佳匹配
  const minMax = cv.minMaxLoc(result);
  const { maxVal, maxLoc } = minMax;
  
  // 清理
  result.delete();
  src.delete();
  templ.delete();
  
  if (maxVal >= threshold) {
    return {
      found: true,
      x: maxLoc.x,
      y: maxLoc.y,
      confidence: maxVal,
    };
  }
  
  return { found: false, x: 0, y: 0, confidence: maxVal };
}
```

### 2.2 多层级识别策略

#### 2.2.1 架构图

```
识别请求
    ↓
┌─────────────────────┐
│ Level 1: 快速模板匹配 │
│ - 精确匹配           │ 100ms
│ - 多尺度 [0.9, 1.0, 1.1] │
└──────┬──────────────┘
       ↓ 未找到
┌─────────────────────┐
│ Level 2: 特征匹配    │
│ - ORB 特征点         │ 300ms
│ - FLANN 匹配         │
└──────┬──────────────┘
       ↓ 未找到
┌─────────────────────┐
│ Level 3: OCR 辅助    │
│ - 文字区域检测       │ 500ms
│ - Tesseract 识别     │
└─────────────────────┘
```

#### 2.2.2 实现代码

```typescript
class MultiLevelRecognizer {
  async recognize(
    screenshot: Buffer,
    template: Buffer,
    options: RecognitionOptions
  ): Promise<RecognitionResult> {
    // Level 1: 快速模板匹配
    let result = await this.fastTemplateMatch(screenshot, template, options);
    if (result.found) {
      return result;
    }
    
    // Level 2: 特征匹配
    result = await this.featureMatch(screenshot, template, options);
    if (result.found) {
      return result;
    }
    
    // Level 3: OCR 辅助
    if (options.useOcr) {
      result = await this.ocrAssist(screenshot, template, options);
    }
    
    return result;
  }
  
  private async fastTemplateMatch(
    screenshot: Buffer,
    template: Buffer,
    options: RecognitionOptions
  ): Promise<RecognitionResult> {
    const src = cv.imdecode(screenshot);
    const templ = cv.imdecode(template);
    const result = new cv.Mat();
    
    // 多尺度匹配
    const scales = [0.9, 0.95, 1.0, 1.05, 1.1];
    let bestMatch: RecognitionResult = { found: false, confidence: 0 };
    
    for (const scale of scales) {
      const scaled = new cv.Mat();
      cv.resize(templ, scaled, new cv.Size(), scale, scale);
      
      cv.matchTemplate(src, scaled, result, cv.TM_CCOEFF_NORMED);
      const minMax = cv.minMaxLoc(result);
      
      if (minMax.maxVal >= options.threshold && minMax.maxVal > bestMatch.confidence) {
        bestMatch = {
          found: true,
          x: minMax.maxLoc.x,
          y: minMax.maxLoc.y,
          confidence: minMax.maxVal,
          scale,
        };
      }
      
      scaled.delete();
    }
    
    result.delete();
    src.delete();
    templ.delete();
    
    return bestMatch;
  }
  
  private async featureMatch(
    screenshot: Buffer,
    template: Buffer,
    options: RecognitionOptions
  ): Promise<RecognitionResult> {
    const src = cv.imdecode(screenshot);
    const templ = cv.imdecode(template);
    
    // ORB 特征检测
    const orb = new cv.ORB();
    const srcKeypoints = new cv.KeyPointVector();
    const srcDescriptors = new cv.Mat();
    const templKeypoints = new cv.KeyPointVector();
    const templDescriptors = new cv.Mat();
    
    orb.detectAndCompute(src, new cv.Mat(), srcKeypoints, srcDescriptors);
    orb.detectAndCompute(templ, new cv.Mat(), templKeypoints, templDescriptors);
    
    // FLANN 匹配
    const matcher = new cv.FlannBasedMatcher();
    const matches = new cv.DMatchVector();
    matcher.match(templDescriptors, srcDescriptors, matches);
    
    // 评估匹配质量
    const goodMatches = [];
    for (let i = 0; i < matches.size(); i++) {
      const match = matches.get(i);
      if (match.distance < 0.7) {
        goodMatches.push(match);
      }
    }
    
    const found = goodMatches.length >= 4;
    
    // 清理
    orb.delete();
    matcher.delete();
    src.delete();
    templ.delete();
    
    if (found) {
      return {
        found: true,
        confidence: goodMatches.length / matches.size(),
        method: 'feature',
      };
    }
    
    return { found: false, confidence: 0 };
  }
}
```

### 2.3 性能优化

#### 2.3.1 图像预处理优化

```typescript
// 优化前：直接匹配（慢）
const result = matchTemplate(screenshot, template);

// 优化后：预处理加速
async function optimizedMatch(screenshot: Buffer, template: Buffer) {
  // 1. 转换为灰度图（减少计算量）
  const srcGray = cv.cvtColor(src, cv.COLOR_RGBA2GRAY);
  const templGray = cv.cvtColor(templ, cv.COLOR_RGBA2GRAY);
  
  // 2. 高斯模糊（降噪）
  cv.GaussianBlur(srcGray, srcGray, [5, 5], 0);
  cv.GaussianBlur(templGray, templGray, [5, 5], 0);
  
  // 3. 直方图均衡化（增强对比度）
  cv.equalizeHist(srcGray, srcGray);
  cv.equalizeHist(templGray, templGray);
  
  // 4. 模板匹配
  const result = matchTemplate(srcGray, templGray);
  
  // 清理
  srcGray.delete();
  templGray.delete();
  
  return result;
}
```

#### 2.3.2 ROI（感兴趣区域）优化

```typescript
// 限制搜索区域，提升速度
function searchInROI(
  screenshot: Buffer,
  template: Buffer,
  roi: { x: number; y: number; width: number; height: number }
) {
  const src = cv.imdecode(screenshot);
  const srcROI = src.roi(roi.x, roi.y, roi.width, roi.height);
  
  const result = matchTemplate(srcROI, template);
  
  // 坐标转换
  if (result.found) {
    result.x += roi.x;
    result.y += roi.y;
  }
  
  srcROI.delete();
  src.delete();
  
  return result;
}
```

#### 2.3.3 缓存优化

```typescript
class TemplateCache {
  private cache = new Map<string, {
    template: cv.Mat;
    pyramid: cv.Mat[];
    lastUsed: number;
  }>();
  
  async getOrLoad(templatePath: string): Promise<cv.Mat> {
    const cached = this.cache.get(templatePath);
    if (cached && Date.now() - cached.lastUsed < 60000) {
      cached.lastUsed = Date.now();
      return cached.template;
    }
    
    // 加载并预处理
    const template = await loadTemplate(templatePath);
    const pyramid = this.buildPyramid(template);
    
    this.cache.set(templatePath, {
      template,
      pyramid,
      lastUsed: Date.now(),
    });
    
    // 清理旧缓存
    if (this.cache.size > 100) {
      this.evictOldest();
    }
    
    return template;
  }
}
```

---

## 3. 集成测试方案

### 3.1 测试环境

```yaml
硬件配置:
  CPU: Intel i7 / AMD Ryzen 7
  内存：16GB+
  显卡：GTX 1060+（可选，用于硬件加速）
  
测试设备:
  - Pixel 6 (Android 14)
  - Samsung S21 (Android 13)
  - Xiaomi 13 (Android 13)
  - Huawei P50 (Android 12)
  
网络环境:
  - USB 直连
  - WiFi 5GHz
  - WiFi 2.4GHz
```

### 3.2 性能测试

```typescript
describe('Performance Tests', () => {
  it('should achieve <100ms latency', async () => {
    const start = Date.now();
    await scrcpyClient.startMirror();
    const latency = Date.now() - start;
    expect(latency).toBeLessThan(100);
  });
  
  it('should achieve >30fps', async () => {
    const frames: number[] = [];
    scrcpyClient.on('frame', () => frames.push(Date.now()));
    
    await sleep(1000); // 收集 1 秒数据
    
    const fps = frames.length;
    expect(fps).toBeGreaterThan(30);
  });
  
  it('should recognize template in <200ms', async () => {
    const start = Date.now();
    const result = await recognizer.recognize(screenshot, template);
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(200);
    expect(result.found).toBe(true);
  });
});
```

### 3.3 兼容性测试

```typescript
const testDevices = [
  { brand: 'Google', model: 'Pixel 6', android: '14' },
  { brand: 'Samsung', model: 'S21', android: '13' },
  { brand: 'Xiaomi', model: '13', android: '13' },
  { brand: 'Huawei', model: 'P50', android: '12' },
];

for (const device of testDevices) {
  describe(`Compatibility: ${device.brand} ${device.model}`, () => {
    it('should connect successfully', async () => {
      const connected = await adb.connect(device.serial);
      expect(connected).toBe(true);
    });
    
    it('should start mirror', async () => {
      await scrcpyClient.startMirror();
      expect(scrcpyClient.isMirroring()).toBe(true);
    });
    
    it('should execute touch event', async () => {
      const result = await scrcpyClient.touch('tap', { x: 100, y: 200 });
      expect(result.success).toBe(true);
    });
  });
}
```

---

## 4. 风险与问题

### 4.1 已知风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|---------|
| scrcpy 版本兼容性 | 🔴 高 | 🟡 中 | 锁定版本，多版本测试 |
| OpenCV 内存泄漏 | 🔴 高 | 🟡 中 | 严格内存管理，定期 GC |
| 设备驱动问题 | 🟡 中 | 🟡 中 | 提供驱动安装指南 |
| WiFi 连接不稳定 | 🟡 中 | 🔴 高 | 优先 USB，WiFi 重连机制 |

### 4.2 待解决问题

1. **OpenCV 加载阻塞**
   - 现状：动态加载阻塞主界面
   - 方案：Web Worker 异步加载

2. **多设备并发**
   - 现状：单 scrcpy 实例单设备
   - 方案：多实例 + 资源隔离

3. **高分辨率优化**
   - 现状：2K+ 分辨率性能下降
   - 方案：动态降采样 + ROI

---

## 5. 结论

### 5.1 技术选型

| 组件 | 选型 | 理由 |
|------|------|------|
| scrcpy 库 | @yume-chan/scrcpy | TypeScript 原生，低延迟 |
| OpenCV | @techstark/opencv-js | 维护活跃，易用 |
| OCR | Tesseract.js | 纯 JS，多语言 |
| 数据库 | better-sqlite3 | 高性能，嵌入式 |

### 5.2 性能目标

| 指标 | 目标值 | 可行性 |
|------|--------|--------|
| 投屏延迟 | <100ms | ✅ 可达 |
| 图像识别 | <200ms | ✅ 可达 |
| 帧率 | >30fps | ✅ 可达 |
| 内存占用 | <800MB | ✅ 可达 |

### 5.3 下一步

1. ✅ 搭建开发环境
2. ✅ 实现 scrcpy 基础集成
3. ✅ 实现 OpenCV 基础识别
4. ✅ 性能测试和优化
5. ✅ 兼容性测试

---

**文档版本**：v1.0  
**创建时间**：2024-01-15  
**最后更新**：2024-01-15  

**参考文献**：
- [scrcpy 官方文档](https://github.com/Genymobile/scrcpy)
- [OpenCV.js 文档](https://docs.opencv.org/4.x/df/d53/tutorial_js_table_of_contents.html)
- [@yume-chan/scrcpy](https://github.com/yume-chan/scrcpy)
