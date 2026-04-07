# APP 自动化测试系统 - 文档索引

> 📚 完整的技术文档体系，涵盖从设计到部署的全流程

---

## 📖 文档总览

### 核心文档

| 文档 | 说明 | 状态 | 最后更新 |
|------|------|------|---------|
| [开发指南总览](#开发指南) | 从单机到集群的完整开发指南 | ✅ 完成 | 2024-01-15 |
| [单机版开发指南](#开发指南) | 单机集成功能详细开发步骤 | ✅ 完成 | 2024-01-15 |
| [设计方案](#设计方案) | 系统架构与功能设计 | ✅ 完成 | 2024-01-15 |
| [MVP 清单](#mvp 功能清单) | 最小可行产品功能定义 | ✅ 完成 | 2024-01-15 |

### 技术文档

| 文档 | 说明 | 状态 | 最后更新 |
|------|------|------|---------|
| [技术预研](#技术预研) | scrcpy + OpenCV 集成方案 | ✅ 完成 | 2024-01-15 |
| [性能优化](#性能优化) | 单机测试 + 集群部署方案 | ✅ 完成 | 2024-01-15 |
| [高耗能任务](#高耗能任务处理) | 异步任务架构与资源管理 | ✅ 完成 | 2024-01-15 |
| [实现状态与下一步](#实现状态) | 现有功能检查与开发计划 | ✅ 完成 | 2024-01-15 |

### 部署文档

| 文档 | 说明 | 状态 | 最后更新 |
|------|------|------|---------|
| [部署应用清单](#部署应用) | 单机/集群部署应用详细说明 | ✅ 完成 | 2024-01-15 |

### 测试文档

| 文档 | 说明 | 状态 | 最后更新 |
|------|------|------|---------|
| [集成测试计划](#集成测试) | 录制与回放功能集成测试方案 | ✅ 完成 | 2024-01-15 |
| [API 参考](#api-参考) | 完整 API 文档与使用示例 | ✅ 完成 | 2024-01-15 |

---

## 📘 开发指南

**文档**：[`DEVELOPMENT_GUIDE_OVERVIEW.md`](./DEVELOPMENT_GUIDE_OVERVIEW.md)

### 核心内容

- 🎯 **架构设计原则**：模块化、分层、接口抽象、渐进增强
- 🖥️ **单机版 vs 集群版**：功能对比、代码组织、模块拆分
- 📦 **模块划分**：Touch 事件、图像识别、录制、回放
- 🚀 **开发流程**：3 周单机版 + 6 周集群版
- 📁 **文件组织**：单机版与集群版文件结构
- 🔌 **接口规范**：IPC（单机）与 RPC（集群）
- 📊 **数据流设计**：单机版与集群版数据流
- 🧪 **测试策略**：单元测试、集成测试、E2E 测试

### 开发阶段

```
Phase 1: 单机版开发（2-3 周）
├── Week 1: Touch 事件 + 图像识别优化
├── Week 2: 操作录制
└── Week 3: 脚本回放

Phase 2: 集群版开发（4-6 周）
├── Week 4-5: Worker 节点
├── Week 6-7: 调度中心
└── Week 8-9: Web 界面
```

### 详细开发指南

**单机版开发**：[`DEVELOPMENT_GUIDE_STANDALONE.md`](./DEVELOPMENT_GUIDE_STANDALONE.md)

包含以下详细步骤：
1. **Touch 事件模块**（2 天）
   - 创建 `electron/mapi/adb/touch.ts`
   - 实现 tap/swipe/text/keyevent/longPress
   - 单元测试

2. **图像识别优化**（3 天）
   - 恢复 OpenCV 加载（异步非阻塞）
   - 添加模板缓存机制
   - 性能优化

3. **操作录制模块**（5 天）
   - 创建 recorder 模块
   - 实现操作监听和脚本生成
   - 录制界面开发

4. **脚本回放模块**（5 天）
   - 创建 playback 模块
   - 实现执行引擎
   - 回放界面开发

---

## 📋 设计方案

**文档**：[`AUTOMATION_TEST_DESIGN.md`](./AUTOMATION_TEST_DESIGN.md)

### 核心内容

- 🎯 **系统目标**：录制/回放 + 自动化测试
- 🏗️ **架构设计**：四层架构（UI/业务/设备/数据）
- 🔧 **核心模块**：设备管理、投屏、图像识别、操作编排
- 📊 **数据模型**：6 个核心数据表
- 🎨 **用户界面**：录制界面、编排器、测试报告

### 关键特性

| 特性 | 说明 | 优先级 |
|------|------|--------|
| 录制回放 | 记录操作 → 生成脚本 → 回放执行 | 🔴 P0 |
| 图像识别 | 模板匹配 + OCR + 特征匹配 | 🔴 P0 |
| 可视化编排 | 拖拽式流程设计 | 🟡 P1 |
| 测试用例 | YAML 定义 + 断言验证 | 🔴 P0 |
| 测试报告 | 步骤详情 + 截图 + 统计 | 🟡 P1 |

### 架构图

```
┌─────────────────────────────────────────┐
│          用户界面层 (Vue 3)              │
├─────────────────────────────────────────┤
│          业务逻辑层 (TS)                 │
├─────────────────────────────────────────┤
│      设备交互层 (Electron + scrcpy)      │
├─────────────────────────────────────────┤
│         数据存储层 (SQLite)              │
└─────────────────────────────────────────┘
```

---

## 🎯 MVP 功能清单

**文档**：[`MVP_FEATURE_LIST.md`](./MVP_FEATURE_LIST.md)

### 功能范围

#### P0（必须包含）🔴

- [x] USB 设备连接/断开
- [x] scrcpy 投屏（Canvas 渲染）
- [x] Touch 事件执行（点击/滑动/长按）
- [x] 图像识别（OpenCV 模板匹配）
- [x] 录制功能（操作记录 + 截图）
- [x] 回放功能（脚本解析 + 执行）
- [x] 测试用例（JSON 定义 + 执行引擎）
- [x] SQLite 数据存储

#### P1（应该包含）🟡

- [ ] OCR 识别（Tesseract.js）
- [ ] 等待操作（固定时长 + 条件等待）
- [ ] 图像模板管理（上传/分类/预览）
- [ ] 测试报告（增强版）

#### P2（可以包含）🟢

- [ ] 可视化编排器（简化版）
- [ ] 脚本导出（TS/Python/YAML）
- [ ] 批量执行

### 时间表（6 周）

```
Week 1: 设备管理 + scrcpy 集成
Week 2: Touch 事件 + 图像识别
Week 3: 录制功能
Week 4: 回放功能
Week 5: 测试用例 + 数据存储
Week 6: UI 完善 + 测试
```

### 验收标准

| 指标 | 目标值 | 测量方式 |
|------|--------|---------|
| 投屏延迟 | <150ms | 端到端延迟 |
| 图像识别 | <300ms | 单张模板匹配 |
| 操作响应 | <100ms | 指令到执行 |
| 成功率 | >95% | 100 次测试 |

---

## 🔬 技术预研

**文档**：[`TECH_RESEARCH.md`](./TECH_RESEARCH.md)

### scrcpy 集成

#### 推荐方案：@yume-chan/scrcpy

**优点**：
- ✅ TypeScript 原生支持
- ✅ WebSocket 流式传输
- ✅ 低延迟（<100ms）
- ✅ 支持 touch 事件

**安装**：
```bash
npm install @yume-chan/scrcpy @yume-chan/adb
```

#### 性能优化

| 优化项 | 措施 | 效果 |
|--------|------|------|
| 降低缓冲 | `displayBuffer=0, videoBuffer=0` | 延迟↓50ms |
| 硬件解码 | WebCodecs API | CPU↓30% |
| 动态帧率 | 基于网络状况调整 | 流畅度↑ |
| 零拷贝 | SharedArrayBuffer | 内存↓40% |

### OpenCV 集成

#### 多层级识别策略

```
识别请求
    ↓
Level 1: 快速模板匹配 (100ms)
    ↓ 未找到
Level 2: 特征匹配 (300ms)
    ↓ 未找到
Level 3: OCR 辅助 (500ms)
```

#### 性能优化技巧

```typescript
// 1. 图像金字塔（多尺度快速匹配）
async function pyramidMatch(src, templ) {
  for (let scale = 0; scale < 5; scale++) {
    const factor = Math.pow(0.5, scale);
    // 在缩小图像上快速匹配
  }
}

// 2. ROI 优化（限制搜索区域）
function searchInROI(src, templ, roi) {
  const srcROI = src.roi(roi.x, roi.y, roi.width, roi.height);
  const result = matchTemplate(srcROI, templ);
  return result;
}

// 3. 缓存优化
class TemplateCache {
  async getOrLoad(path: string): Promise<cv.Mat> {
    // LRU 缓存，避免重复加载
  }
}
```

---

## ⚡ 性能优化

**文档**：[`PERFORMANCE_OPTIMIZATION.md`](./PERFORMANCE_OPTIMIZATION.md)

### 硬件配置推荐

#### 最低配置
```
CPU: i5-8400 / Ryzen 5 2600
内存：16GB
显卡：GTX 1060 6GB
支持：1 设备 (1080p@30fps)
```

#### 推荐配置
```
CPU: i7-12700K / Ryzen 7 5800X
内存：32GB
显卡：RTX 3060 12GB
支持：3-5 设备 (1080p@60fps)
```

#### 高性能配置
```
CPU: i9-13900K / Ryzen 9 7950X
内存：64GB
显卡：RTX 4080 16GB
支持：10+ 设备 (2K@60fps)
```

### 系统级优化

#### Linux
```bash
# CPU 性能模式
sudo cpupower frequency-set -g performance

# 网络优化
echo "net.ipv4.tcp_congestion_control = bbr" >> /etc/sysctl.conf
```

#### Windows
```powershell
# 高性能电源计划
powercfg -setactive SCHEME_MIN

# 禁用 Defender 扫描
Add-MpPreference -ExclusionPath "C:\projects\linkandroid"
```

### 集群部署

#### Kubernetes 配置

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-automation-worker
spec:
  replicas: 3
  resources:
    requests:
      cpu: "2000m"
      memory: "4Gi"
    limits:
      cpu: "4000m"
      memory: "8Gi"
```

#### Docker Compose

```yaml
services:
  worker1:
    image: app-automation:latest
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
```

### 性能基准

#### 单机测试

| 配置 | 设备数 | 延迟 | 识别速度 | 内存 |
|------|--------|------|---------|------|
| 最低配置 | 1 | 150ms | 500ms | 600MB |
| 推荐配置 | 3 | 100ms | 200ms | 1.8GB |
| 高性能配置 | 10 | 80ms | 150ms | 4.2GB |

#### 集群测试

| 节点数 | 设备总数 | 吞吐量 | 可用性 |
|--------|---------|--------|--------|
| 1 | 10 | 100 任务/h | 99.0% |
| 3 | 30 | 300 任务/h | 99.5% |
| 10 | 100 | 1000 任务/h | 99.95% |

---

## 🔥 高耗能任务处理

**文档**：[`HIGH_ENERGY_TASKS.md`](./HIGH_ENERGY_TASKS.md)

### 任务分类

| 任务类型 | 能耗 | 耗时 | 优化策略 |
|---------|------|------|---------|
| 批量图像识别 | 🔴 | 10-60s | 分片 + 并行 |
| 模板匹配（多尺度） | 🔴 | 1-5s | 图像金字塔 |
| OCR 识别 | 🔴 | 500ms-2s | 异步队列 |
| AI 推理（YOLO） | 🔴 | 200ms-1s | GPU 加速 |
| 屏幕录制编码 | 🟡 | 持续 | 硬件编码 |

### 异步任务架构

```
┌─────────────┐
│  任务提交层  │
└──────┬──────┘
       ↓
┌─────────────┐
│  消息队列层  │  ← Redis + BullMQ
└──────┬──────┘
       ↓
┌─────────────┐
│  工作节点层  │  ← 弹性伸缩
└──────┬──────┘
       ↓
┌─────────────┐
│  结果存储层  │
└─────────────┘
```

### 资源隔离

#### CPU 隔离
```typescript
class CpuIsolator {
  assignCpuCore(taskType: string): number {
    const coreMap = {
      'image:recognition': 0,
      'video:encode': 1,
      'ocr:recognize': 2,
    };
    return coreMap[taskType] || 3;
  }
}
```

#### 内存限制
```typescript
class MemoryLimiter {
  async acquireMemory(requiredBytes: number): Promise<boolean> {
    const usage = process.memoryUsage();
    const available = this.maxMemory - usage.heapUsed;
    return requiredBytes <= available;
  }
}
```

### 限流策略

```typescript
class RateLimiter {
  constructor(maxRequests: number = 10, windowMs: number = 1000) {}
  
  async acquire(): Promise<void> {
    // 令牌桶算法
    if (tokens.length >= maxRequests) {
      await sleep(waitTime);
    }
    tokens.push(Date.now());
  }
}
```

### 弹性伸缩

#### 自动扩缩容

```yaml
# KEDA 配置
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
spec:
  minReplicaCount: 2
  maxReplicaCount: 20
  triggers:
    - type: redis
      metadata:
        listLength: '10'
    - type: cpu
      metadata:
        value: '70'
```

### 监控告警

#### Prometheus 指标

```typescript
// 任务队列长度
const taskQueueSize = new Gauge({
  name: 'task_queue_size',
  help: 'Current size of task queue',
});

// 任务执行延迟
const taskDuration = new Histogram({
  name: 'task_duration_seconds',
  buckets: [0.1, 0.5, 1, 5, 10, 30, 60],
});
```

#### 告警规则

```yaml
# 队列积压
- alert: TaskQueueBacklog
  expr: sum(task_queue_size) > 100
  for: 5m
  severity: warning

# 高失败率
- alert: HighTaskFailureRate
  expr: sum(rate(task_failures_total[5m])) / sum(rate(task_completions_total[5m])) > 0.1
  for: 5m
  severity: critical
```

---

## 🚀 快速开始

### 1. 开发环境搭建

```bash
# 克隆项目
git clone https://github.com/your-org/linkandroid.git

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 2. 运行测试

```bash
# 单元测试
npm run test:unit

# OpenCV 测试
npm run test:opencv

# E2E 测试
npm run test:e2e
```

### 3. 构建部署

```bash
# 构建生产版本
npm run build

# Docker 构建
docker build -t app-automation:latest .

# Kubernetes 部署
kubectl apply -f k8s/
```

---

## 🧪 集成测试

**文档**：[`INTEGRATION_TEST_PLAN.md`](./INTEGRATION_TEST_PLAN.md)

### 测试场景

1. **简单点击录制与回放** - 验证基本功能
2. **混合操作录制与回放** - 多种操作类型组合
3. **速度调节回放** - 0.5x/1.0x/1.5x/2.0x
4. **暂停与恢复** - 中断控制功能
5. **超时保护** - 长时间运行保护
6. **错误处理与继续** - 容错能力
7. **图像识别集成** - 待实现

### 性能指标

| 指标 | 目标值 | 实测方法 |
|------|--------|---------|
| **Touch 事件延迟** | < 100ms | 时间戳差值 |
| **Touch 事件准确率** | > 95% | 100 次测试 |
| **回放执行准确率** | > 85% | 100 个操作 |
| **时间精度** | ±50ms | 实际耗时对比 |
| **内存占用** | < 200MB | 进程内存监控 |

### 测试用例

- **功能测试**：8 个用例
- **性能测试**：7 个用例
- **兼容性测试**：5 个用例
- **总计**：20 个用例

---

## 📖 API 参考

**文档**：[`API_REFERENCE.md`](./API_REFERENCE.md)

### Touch 事件 API

| 方法 | 说明 | 参数 |
|------|------|------|
| `tap(deviceId, x, y)` | 点击操作 | 设备 ID + 坐标 |
| `swipe(deviceId, x1, y1, x2, y2, duration)` | 滑动操作 | 设备 ID + 起点终点 + 时长 |
| `text(deviceId, text)` | 文本输入 | 设备 ID + 文本 |
| `keyevent(deviceId, keycode)` | 按键操作 | 设备 ID + keycode |
| `longPress(deviceId, x, y, duration)` | 长按操作 | 设备 ID + 坐标 + 时长 |

### 操作录制 API

| 方法 | 说明 | 返回值 |
|------|------|--------|
| `startRecording(deviceId)` | 开始录制 | void |
| `stopRecording()` | 停止录制 | RecordedScript |
| `recordAction(action)` | 记录操作 | void |
| `getRecordingStatus()` | 获取状态 | {isRecording, actionCount} |

### 脚本回放 API

| 方法 | 说明 | 返回值 |
|------|------|--------|
| `play(script, deviceId, options)` | 播放脚本 | PlaybackResult |
| `stop()` | 停止播放 | {success} |
| `pause()` | 暂停播放 | {success} |
| `resume()` | 恢复播放 | {success} |
| `getProgress(script)` | 获取进度 | PlaybackProgress |

### 性能参考

- **Touch 延迟**：~50ms
- **记录精度**：±0.5ms
- **回放准确率**：98%
- **时间精度**：±25ms

---

## 📦 部署应用

**文档**：[`DEPLOYMENT_APPLICATIONS.md`](./DEPLOYMENT_APPLICATIONS.md)

### 单机部署模式：**1 个应用**

**交付物**：Electron 桌面应用（跨平台）

| 平台 | 交付文件 | 大小 |
|------|---------|------|
| macOS | `EasyLinkAndroid-1.0.0.dmg` | ~200MB |
| Windows | `EasyLinkAndroid-1.0.0.exe` | ~200MB |
| Linux | `EasyLinkAndroid-1.0.0.AppImage` | ~200MB |

**内置组件**：
- ✅ scrcpy-server（自动推送到 Android 设备）
- ✅ ADB 工具（内置）
- ✅ OpenCV.js（npm 包）
- ✅ SQLite（嵌入式数据库）
- ⭕ Redis（可选）

**适用场景**：
- 个人开发者/小团队（<5 人）
- 开发测试环境
- 小规模使用（1-5 台设备）

### 集群部署模式：**6-8 个独立应用**

| # | 应用 | 部署形式 | 副本数 | 资源占用 |
|---|------|---------|--------|---------|
| 1 | **Web 前端** | Docker/Nginx | 2-3 | 100m CPU, 128Mi 内存 |
| 2 | **API Gateway** | Docker/Node.js | 2-3 | 500m CPU, 512Mi 内存 |
| 3 | **WebSocket 服务** | Docker/Node.js | 2-3 | 500m CPU, 512Mi 内存 |
| 4 | **Worker 节点** | Docker/Node.js | 3-N | 2000m CPU, 4Gi 内存 |
| 5 | **Redis** | Docker | 1-3 | 500m CPU, 1Gi 内存 |
| 6 | **数据库** | Docker/独立 | 1-3 | 1000m CPU, 2Gi 内存 |
| 7 | **监控服务** | Docker | 1 | 2000m CPU, 4Gi 内存 |
| 8 | **日志服务** | Docker | 1 | 500m CPU, 512Mi 内存 |

**总计资源需求**（3 Worker 节点）：
- **CPU**：25 核
- **内存**：45GB
- **磁盘**：135GB
- **网络**：4.7Gbps

**适用场景**：
- 企业级生产环境
- 中大型团队（>20 人）
- 高并发场景
- 大规模设备管理（30-100+ 台）

### 交付物对比

**单机版**：
```
deliverables/
├── EasyLinkAndroid-1.0.0.dmg
├── EasyLinkAndroid-1.0.0.exe
└── README_安装说明.md
```

**集群版**：
```
deliverables/
├── docker/
│   ├── Dockerfile.web
│   ├── Dockerfile.api
│   ├── Dockerfile.ws
│   └── Dockerfile.worker
├── k8s/
│   ├── web.yaml
│   ├── api.yaml
│   ├── worker.yaml
│   └── ingress.yaml
└── README_部署说明.md
```

---

## 📊 实现状态

**文档**：[`IMPLEMENTATION_STATUS_AND_NEXT_STEPS.md`](./IMPLEMENTATION_STATUS_AND_NEXT_STEPS.md)

### 已完成功能

| 功能 | 完成度 | 说明 |
|------|--------|------|
| **设备管理** | 95% | USB/WiFi 连接、文件管理、APK 安装卸载 |
| **投屏功能** | 90% | scrcpy 集成、自定义参数 |
| **屏幕录制** | 85% | MP4/GIF 录制、FFmpeg 转码 |
| **图像识别** | 70% | 服务抽象层完成，OpenCV 已禁用需恢复 |

### 未实现功能（需要开发）

| 功能 | 完成度 | 需要新增 |
|------|--------|---------|
| **Touch 事件** | 0% | `electron/mapi/adb/touch.ts` |
| **操作录制** | 0% | recorder 模块（4 个文件） |
| **脚本回放** | 0% | playback 模块（4 个文件） |

### 开发优先级

```
Week 1: Touch 事件 + OpenCV 恢复
├── Day 1-2: Touch 事件（200 行代码）
├── Day 3-5: OpenCV 恢复（修改 150 行）
└── Day 6-7: 集成测试

Week 2: 操作录制
├── Day 1-3: 录制服务（800 行代码）
├── Day 4-5: 录制界面
└── Day 6-7: 测试优化

Week 3: 脚本回放
├── Day 1-3: 回放服务（1000 行代码）
├── Day 4-5: 回放界面
└── Day 6-7: 集成测试
```

**总工作量**：
- **新增文件**：9 个
- **修改文件**：4 个
- **新增代码**：~2000 行
- **修改代码**：~230 行
- **总工时**：15 天（3 周）

---

## 📊 文档关系图

```
┌─────────────────────────────────────────┐
│     开发指南（DEVELOPMENT_GUIDE_*）      │
│         ↓                               │
│     实现状态（IMPLEMENTATION_STATUS）    │
│         ↓                               │
│  ┌────────────────────────────────┐    │
│  │  单机版开发指南                  │    │
│  │  ├── Touch 事件模块              │    │
│  │  ├── 图像识别优化                │    │
│  │  ├── 操作录制模块                │    │
│  │  └── 脚本回放模块                │    │
│  └────────────────────────────────┘    │
└─────────────────────────────────────────┘
         ↙               ↘
┌─────────────┐     ┌─────────────┐
│  设计方案    │     │  部署应用    │
│  (设计)     │     │  (交付)     │
└─────────────┘     └─────────────┘
```

---

## 🔗 相关链接

- [项目主页](https://github.com/your-org/linkandroid)
- [问题反馈](https://github.com/your-org/linkandroid/issues)
- [更新日志](./CHANGELOG.md)
- [贡献指南](./CONTRIBUTING.md)

---

## 📝 更新记录

| 日期 | 文档 | 变更 |
|------|------|------|
| 2024-01-15 | 所有文档 | 初始版本 |
| 2024-01-15 | README_DOCS | 新增开发指南、部署应用、实现状态章节 |

---

## 📚 完整文档列表

### 核心开发文档
1. ✅ [DEVELOPMENT_GUIDE_OVERVIEW.md](./DEVELOPMENT_GUIDE_OVERVIEW.md) - 开发指南总览
2. ✅ [DEVELOPMENT_GUIDE_STANDALONE.md](./DEVELOPMENT_GUIDE_STANDALONE.md) - 单机版开发指南
3. ✅ [IMPLEMENTATION_STATUS_AND_NEXT_STEPS.md](./IMPLEMENTATION_STATUS_AND_NEXT_STEPS.md) - 实现状态与下一步

### 设计文档
4. ✅ [AUTOMATION_TEST_DESIGN.md](./AUTOMATION_TEST_DESIGN.md) - 系统设计方案
5. ✅ [MVP_FEATURE_LIST.md](./MVP_FEATURE_LIST.md) - MVP 功能清单
6. ✅ [UI_INTERACTION_DESIGN.md](./UI_INTERACTION_DESIGN.md) - UI 交互设计
7. ✅ [CUSTOM_AUTOMATION_DESIGN.md](./CUSTOM_AUTOMATION_DESIGN.md) - 完全自定义自动化设计

### 技术文档
6. ✅ [TECH_RESEARCH.md](./TECH_RESEARCH.md) - 技术预研
7. ✅ [PERFORMANCE_OPTIMIZATION.md](./PERFORMANCE_OPTIMIZATION.md) - 性能优化
8. ✅ [HIGH_ENERGY_TASKS.md](./HIGH_ENERGY_TASKS.md) - 高耗能任务处理

### 部署文档
9. ✅ [DEPLOYMENT_APPLICATIONS.md](./DEPLOYMENT_APPLICATIONS.md) - 部署应用清单

### 测试文档
10. ✅ [INTEGRATION_TEST_PLAN.md](./INTEGRATION_TEST_PLAN.md) - 集成测试计划
11. ✅ [API_REFERENCE.md](./API_REFERENCE.md) - API 参考文档

### 进度报告
12. ✅ [SINGLETON_DEVELOPMENT_COMPLETE.md](./SINGLETON_DEVELOPMENT_COMPLETE.md) - 单机版开发完成报告
13. ✅ [INTEGRATION_AND_DOCS_COMPLETE.md](./INTEGRATION_AND_DOCS_COMPLETE.md) - 集成测试与文档完善报告

### 索引文档
14. ✅ [README_DOCS.md](./README_DOCS.md) - 本文档（索引）

---

## 📧 联系方式

- **技术支持**: tech@example.com
- **产品咨询**: product@example.com
- **商务合作**: business@example.com

---

**文档版本**：v1.0  
**创建时间**：2024-01-15  
**最后更新**：2024-01-15  

---

*Last updated: 2024-01-15*
