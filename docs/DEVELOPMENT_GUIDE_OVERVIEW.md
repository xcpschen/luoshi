# APP 自动化测试系统 - 开发指南

> 📘 从单机开发到分布式集群部署的完整开发指南

**版本**：v1.0  
**创建时间**：2024-01-15  
**最后更新**：2024-01-15

---

## 📖 文档导航

本开发指南包含以下文档：

### 核心文档
1. **[开发指南总览](./DEVELOPMENT_GUIDE_OVERVIEW.md)** - 本文档
2. **[单机版开发文档](./DEVELOPMENT_GUIDE_STANDALONE.md)** - 单机集成功能开发
3. **[集群版 Worker 节点文档](./DEVELOPMENT_GUIDE_CLUSTER_WORKER.md)** - Worker 节点模块开发
4. **[集群版调度中心文档](./DEVELOPMENT_GUIDE_CLUSTER_SCHEDULER.md)** - 调度中心模块开发

### 功能模块文档
5. **[Touch 事件模块](./MODULE_TOUCH_EVENTS.md)** - Touch 事件实现
6. **[操作录制模块](./MODULE_ACTION_RECORDER.md)** - 操作录制实现
7. **[脚本回放模块](./MODULE_SCRIPT_PLAYBACK.md)** - 脚本回放实现
8. **[图像识别模块](./MODULE_IMAGE_RECOGNITION.md)** - 图像识别优化

### 部署文档
9. **[单机部署指南](./DEPLOYMENT_STANDALONE.md)** - 单机部署
10. **[集群部署指南](./DEPLOYMENT_CLUSTER.md)** - 集群部署

---

## 🎯 架构设计原则

### 核心设计理念

```
┌─────────────────────────────────────────────────────────┐
│                    设计原则                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. 模块化：功能独立，可插拔                            │
│  2. 分层架构：清晰边界，职责单一                        │
│  3. 接口抽象：统一接口，多实现                          │
│  4. 渐进增强：单机 → 集群，平滑升级                     │
│  5. 向后兼容：新功能不影响旧功能                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 架构分层

```
┌─────────────────────────────────────────────────────────┐
│                  用户界面层 (UI)                          │
│  - Vue 3 组件                                           │
│  - 状态管理 (Pinia)                                     │
│  - 路由管理                                             │
└─────────────────────────────────────────────────────────┘
                          ↓ IPC
┌─────────────────────────────────────────────────────────┐
│                  业务逻辑层 (Service)                     │
│  - 设备管理服务                                         │
│  - 录制服务                                             │
│  - 回放服务                                             │
│  - 图像识别服务                                         │
└─────────────────────────────────────────────────────────┘
                          ↓ API
┌─────────────────────────────────────────────────────────┐
│                  设备交互层 (MAPI)                        │
│  - ADB 服务（单机/集群通用）                              │
│  - scrcpy 服务（单机/集群通用）                           │
│  - Touch 服务（单机/集群通用）                            │
│  - 图像识别服务（单机/集群通用）                          │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                  部署适配层 (Adapter)                     │
│  ┌─────────────────┐   ┌─────────────────┐             │
│  │  单机适配器     │   │  集群适配器     │             │
│  │  (本地调用)     │   │  (RPC 调用)       │             │
│  └─────────────────┘   └─────────────────┘             │
└─────────────────────────────────────────────────────────┘
```

---

## 🖥️ 单机版 vs 集群版

### 功能对比

| 功能模块 | 单机版 | 集群版 | 说明 |
|---------|--------|--------|------|
| **设备管理** | ✅ 本地 ADB | ✅ 远程 ADB | 接口统一 |
| **投屏服务** | ✅ 本地 scrcpy | ✅ 远程 scrcpy | 视频流 WebSocket |
| **Touch 事件** | ✅ 本地执行 | ✅ 远程执行 | 命令转发 |
| **图像识别** | ✅ 本地 OpenCV | ✅ 分布式识别 | 任务队列 |
| **操作录制** | ✅ 本地录制 | ⚠️ 不支持 | 仅单机 |
| **脚本回放** | ✅ 本地回放 | ✅ 分布式回放 | 任务调度 |
| **任务调度** | ⚠️ 简单队列 | ✅ 复杂调度 | 集群特有 |
| **负载均衡** | ❌ 不支持 | ✅ 支持 | 集群特有 |
| **弹性伸缩** | ❌ 不支持 | ✅ 支持 | 集群特有 |

### 代码组织

#### 单机版（当前项目）

```
linkandroid/
├── electron/
│   └── mapi/              # 本地服务实现
│       ├── adb/
│       ├── scrcpy/
│       ├── imageRecognition/
│       └── ...
├── src/
│   ├── pages/             # UI 界面
│   ├── store/             # 状态管理
│   └── ...
└── package.json
```

#### 集群版（独立模块）

```
app-automation-cluster/
├── packages/
│   ├── worker/            # Worker 节点
│   │   ├── src/
│   │   │   ├── services/  # 服务实现（复用 MAPI）
│   │   │   └── index.ts
│   │   └── package.json
│   ├── scheduler/         # 调度中心
│   │   ├── src/
│   │   │   ├── queue/     # 任务队列
│   │   │   ├── balancer/  # 负载均衡
│   │   │   └── index.ts
│   │   └── package.json
│   ├── web/               # Web 界面
│   │   ├── src/
│   │   └── package.json
│   └── shared/            # 共享代码
│       ├── types/         # 类型定义
│       ├── utils/         # 工具函数
│       └── package.json
└── package.json           # Monorepo 根
```

---

## 📦 模块拆分策略

### 拆分原则

1. **高内聚**：相关功能放在同一模块
2. **低耦合**：模块间通过接口通信
3. **可复用**：核心逻辑可被多端复用
4. **可测试**：模块独立可测试

### 模块划分

```
┌─────────────────────────────────────────────────────────┐
│                    模块依赖关系                          │
│                                                         │
│  ┌──────────────┐                                      │
│  │   Web 界面    │                                      │
│  └──────┬───────┘                                      │
│         ↓                                               │
│  ┌──────────────┐   ┌──────────────┐                  │
│  │  录制模块    │   │  回放模块    │                  │
│  └──────┬───────┘   └──────┬───────┘                  │
│         ↓                   ↓                          │
│  ┌──────────────────────────────────┐                 │
│  │        图像识别模块               │                 │
│  └──────────────┬───────────────────┘                 │
│                 ↓                                      │
│  ┌──────────────────────────────────┐                 │
│  │        Touch 事件模块             │                 │
│  └──────────────┬───────────────────┘                 │
│                 ↓                                      │
│  ┌──────────────────────────────────┐                 │
│  │        设备管理模块               │                 │
│  └──────────────────────────────────┘                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 模块接口定义

```typescript
// shared/types/index.ts

// Touch 事件接口
export interface ITouchService {
    tap(deviceId: string, x: number, y: number): Promise<void>;
    swipe(deviceId: string, x1: number, y1: number, x2: number, y2: number, duration?: number): Promise<void>;
    text(deviceId: string, text: string): Promise<void>;
    keyevent(deviceId: string, keycode: number): Promise<void>;
}

// 图像识别接口
export interface IImageRecognitionService {
    findImage(options: FindImageOptions): Promise<RecognitionResult>;
    findImages(options: FindImageOptions[]): Promise<RecognitionResult[]>;
}

// 录制服务接口
export interface IRecorderService {
    startRecording(deviceId: string): Promise<void>;
    stopRecording(): Promise<RecordedScript>;
    recordAction(action: RecordedAction): void;
}

// 回放服务接口
export interface IPlaybackService {
    play(script: RecordedScript, deviceId: string): Promise<void>;
    stop(): Promise<void>;
    getProgress(): number;
}
```

---

## 🚀 开发流程

### 阶段 1：单机版开发（2-3 周）

```
Week 1: 基础功能
├── Day 1-2: Touch 事件模块
│   ├── 创建 electron/mapi/adb/touch.ts
│   ├── 实现 tap/swipe/text/keyevent
│   └── 单元测试
├── Day 3-5: 图像识别优化
│   ├── 恢复 OpenCV 加载
│   ├── 性能优化
│   └── 集成测试
└── Day 6-7: 缓冲 + 测试

Week 2: 操作录制
├── Day 1-3: 录制服务
│   ├── 创建 recorder 模块
│   ├── 实现操作监听
│   └── 脚本生成
├── Day 4-5: 录制界面
│   ├── RecorderPanel.vue
│   └── UI 交互
└── Day 6-7: 测试优化

Week 3: 脚本回放
├── Day 1-3: 回放服务
│   ├── 创建 playback 模块
│   ├── 实现执行引擎
│   └── 错误处理
├── Day 4-5: 回放界面
│   ├── PlaybackPanel.vue
│   └── UI 交互
└── Day 6-7: 集成测试
```

### 阶段 2：集群版开发（4-6 周）

```
Week 4-5: Worker 节点
├── 创建 monorepo 项目结构
├── 迁移 MAPI 服务到 Worker
├── 实现设备管理
└── WebSocket 投屏

Week 6-7: 调度中心
├── 任务队列（Redis + BullMQ）
├── 负载均衡
├── 弹性伸缩
└── 监控告警

Week 8-9: Web 界面
├── Vue 3 Web 前端
├── API Gateway
└── 集成测试
```

---

## 📁 文件组织规范

### 单机版文件结构

```
linkandroid/
├── electron/
│   └── mapi/
│       ├── adb/
│       │   ├── main.ts           # 主进程
│       │   ├── render.ts         # 渲染进程
│       │   └── touch.ts          # Touch 事件 ✨新增
│       ├── scrcpy/
│       │   ├── main.ts
│       │   └── render.ts
│       ├── imageRecognition/
│       │   ├── services/
│       │   │   └── local.service.ts
│       │   └── types.ts
│       ├── recorder/             # ✨新增
│       │   ├── main.ts
│       │   └── render.ts
│       └── playback/             # ✨新增
│           ├── main.ts
│           └── render.ts
├── src/
│   ├── pages/
│   │   ├── Device/
│   │   ├── Recorder/            # ✨新增
│   │   │   └── RecorderPanel.vue
│   │   └── Playback/            # ✨新增
│   │       └── PlaybackPanel.vue
│   ├── types/
│   │   ├── Recorder.ts          # ✨新增
│   │   └── Playback.ts          # ✨新增
│   └── store/modules/
│       ├── device.ts
│       ├── recorder.ts          # ✨新增
│       └── playback.ts          # ✨新增
└── docs/
    └── ...
```

### 集群版文件结构（独立仓库）

```
app-automation-cluster/
├── packages/
│   ├── worker/
│   │   ├── src/
│   │   │   ├── services/
│   │   │   │   ├── adb.service.ts
│   │   │   │   ├── scrcpy.service.ts
│   │   │   │   ├── touch.service.ts
│   │   │   │   └── recognition.service.ts
│   │   │   └── index.ts
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── scheduler/
│   │   ├── src/
│   │   │   ├── queue/
│   │   │   │   ├── task.queue.ts
│   │   │   │   └── priority.queue.ts
│   │   │   ├── balancer/
│   │   │   │   └── load.balancer.ts
│   │   │   └── index.ts
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── web/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── views/
│   │   │   └── App.vue
│   │   ├── Dockerfile
│   │   └── package.json
│   └── shared/
│       ├── types/
│       │   └── index.ts
│       ├── utils/
│       │   └── helpers.ts
│       └── package.json
├── docker-compose.yml
├── k8s/
│   ├── worker.yaml
│   ├── scheduler.yaml
│   └── web.yaml
└── package.json
```

---

## 🔌 接口设计规范

### IPC 接口（单机版）

```typescript
// electron/mapi/ipc.handlers.ts

// Touch 事件
ipcMain.handle('adb:touch:tap', async (event, deviceId: string, x: number, y: number) => {
    return await touch.tap(deviceId, x, y);
});

ipcMain.handle('adb:touch:swipe', async (event, deviceId: string, x1: number, y1: number, x2: number, y2: number, duration?: number) => {
    return await touch.swipe(deviceId, x1, y1, x2, y2, duration);
});

// 录制
ipcMain.handle('recorder:start', async (event, deviceId: string) => {
    return await recorder.start(deviceId);
});

ipcMain.handle('recorder:stop', async (event) => {
    return await recorder.stop();
});

// 回放
ipcMain.handle('playback:play', async (event, script: RecordedScript, deviceId: string) => {
    return await playback.play(script, deviceId);
});

ipcMain.handle('playback:stop', async (event) => {
    return await playback.stop();
});
```

### RPC 接口（集群版）

```typescript
// packages/shared/rpc.interface.ts

export interface IWorkerRPC {
    // 设备管理
    'device:list': () => Promise<DeviceInfo[]>;
    'device:connect': (deviceId: string) => Promise<void>;
    'device:disconnect': (deviceId: string) => Promise<void>;
    
    // Touch 事件
    'touch:tap': (deviceId: string, x: number, y: number) => Promise<void>;
    'touch:swipe': (deviceId: string, x1: number, y1: number, x2: number, y2: number, duration?: number) => Promise<void>;
    
    // 图像识别
    'recognition:find': (deviceId: string, template: string, threshold?: number) => Promise<RecognitionResult>;
    
    // 录制（仅 Worker 1 支持）
    'recorder:start': (deviceId: string) => Promise<void>;
    'recorder:stop': () => Promise<RecordedScript>;
    
    // 回放
    'playback:play': (script: RecordedScript, deviceId: string) => Promise<void>;
    'playback:stop': () => Promise<void>;
}
```

---

## 📊 数据流设计

### 单机版数据流

```
用户操作 → Vue 组件 → Store → IPC → MAPI → ADB/scrcpy → 设备
   ↓                                              ↓
   └─────────────── 状态更新 ◄────────────────────┘
```

### 集群版数据流

```
用户操作 → Web 前端 → API Gateway → 调度中心 → 消息队列 → Worker → 设备
   ↓                                                              ↓
   └───────────────────── 状态更新 ◄──────────────────────────────┘
```

---

## 🧪 测试策略

### 单元测试

```typescript
// tests/unit/touch.test.ts
describe('TouchService', () => {
    it('should execute tap command', async () => {
        const mockShell = jest.fn().mockResolvedValue('success');
        const touchService = new TouchService(mockShell);
        
        await touchService.tap('device1', 100, 200);
        
        expect(mockShell).toHaveBeenCalledWith(
            expect.arrayContaining(['input', 'tap', '100', '200'])
        );
    });
});
```

### 集成测试

```typescript
// tests/integration/playback.test.ts
describe('Playback Integration', () => {
    it('should play recorded script successfully', async () => {
        const script: RecordedScript = {
            id: 'test-1',
            actions: [
                { type: 'tap', position: { x: 100, y: 200 }, timestamp: 0 }
            ]
        };
        
        const result = await playbackService.play(script, 'test-device');
        
        expect(result.success).toBe(true);
        expect(result.executedSteps).toBe(1);
    });
});
```

### E2E 测试

```typescript
// tests/e2e/recorder.test.ts
describe('Recorder E2E', () => {
    it('should record and playback successfully', async () => {
        // 1. 开始录制
        await recorder.start('device1');
        
        // 2. 模拟用户操作
        await touch.tap('device1', 100, 200);
        await sleep(1000);
        
        // 3. 停止录制
        const script = await recorder.stop();
        
        // 4. 回放
        const result = await playback.play(script, 'device1');
        
        expect(result.success).toBe(true);
    });
});
```

---

## 📈 性能指标

### 单机版指标

| 指标 | 目标值 | 测量方式 |
|------|--------|---------|
| Touch 延迟 | < 100ms | 命令到执行 |
| 图像识别 | < 300ms | 单张模板 |
| 录制精度 | ±1 像素 | 坐标误差 |
| 回放成功率 | > 85% | 100 次测试 |
| 内存占用 | < 800MB | 峰值内存 |

### 集群版指标

| 指标 | 目标值 | 测量方式 |
|------|--------|---------|
| 任务调度延迟 | < 50ms | 提交到执行 |
| Worker 利用率 | > 70% | 平均负载 |
| 消息队列吞吐 | > 1000/s | 任务/秒 |
| 系统可用性 | > 99.9% | 月度统计 |
| 弹性伸缩时间 | < 2min | 冷启动到就绪 |

---

## 🔒 安全考虑

### 单机版安全

- ✅ 本地存储加密（SQLite）
- ✅ ADB 授权管理
- ✅ 文件访问权限控制

### 集群版安全

- ✅ API 认证（JWT）
- ✅ 通信加密（TLS）
- ✅ 设备访问授权
- ✅ 敏感数据加密存储
- ✅ 网络隔离（VPC）

---

## 📝 开发检查清单

### 单机版开发检查清单

#### Touch 事件模块
- [ ] 创建 `electron/mapi/adb/touch.ts`
- [ ] 实现 `tap()` 方法
- [ ] 实现 `swipe()` 方法
- [ ] 实现 `text()` 方法
- [ ] 实现 `keyevent()` 方法
- [ ] 集成到 `render.ts`
- [ ] 编写单元测试
- [ ] 编写集成测试
- [ ] 更新类型定义

#### 图像识别优化
- [ ] 修改 `loadOpenCV()` 方法
- [ ] 使用 Web Worker 异步加载
- [ ] 添加图像预处理
- [ ] 实现模板缓存
- [ ] 性能测试
- [ ] 准确率测试

#### 操作录制模块
- [ ] 创建 `recorder` 目录
- [ ] 实现 `main.ts` 主进程服务
- [ ] 实现 `render.ts` 渲染进程 API
- [ ] 创建 `RecorderPanel.vue`
- [ ] 实现操作监听
- [ ] 实现自动截图
- [ ] 实现脚本生成
- [ ] 编写测试

#### 脚本回放模块
- [ ] 创建 `playback` 目录
- [ ] 实现 `main.ts` 主进程服务
- [ ] 实现 `render.ts` 渲染进程 API
- [ ] 创建 `PlaybackPanel.vue`
- [ ] 实现脚本解析
- [ ] 实现执行引擎
- [ ] 实现错误处理
- [ ] 编写测试

### 集群版开发检查清单

#### Worker 节点
- [ ] 创建 monorepo 项目
- [ ] 迁移 MAPI 服务
- [ ] 实现 WebSocket 投屏
- [ ] 实现设备管理
- [ ] 编写 Dockerfile
- [ ] Kubernetes 配置
- [ ] 健康检查端点
- [ ] 监控指标

#### 调度中心
- [ ] 实现任务队列
- [ ] 实现负载均衡
- [ ] 实现弹性伸缩
- [ ] 实现故障转移
- [ ] 实现监控告警
- [ ] 编写 API 文档
- [ ] 性能测试
- [ ] 压力测试

#### Web 界面
- [ ] 创建 Vue 3 项目
- [ ] 实现设备管理界面
- [ ] 实现录制界面
- [ ] 实现回放界面
- [ ] 实现测试报告
- [ ] 实现监控面板
- [ ] 响应式设计
- [ ] 国际化

---

## 🎓 学习资源

### 技术栈
- [Electron 官方文档](https://www.electronjs.org/docs)
- [Vue 3 官方文档](https://vuejs.org/guide)
- [ADB 官方文档](https://developer.android.com/studio/command-line/adb)
- [scrcpy 官方文档](https://github.com/Genymobile/scrcpy)
- [OpenCV 文档](https://docs.opencv.org/4.x/)

### 分布式系统
- [Redis 文档](https://redis.io/documentation)
- [BullMQ 文档](https://docs.bullmq.io)
- [Kubernetes 文档](https://kubernetes.io/docs/home)
- [Docker 文档](https://docs.docker.com)

---

## 📞 支持与反馈

如有问题或建议，请：
1. 查看 [FAQ](./FAQ.md)
2. 提交 [Issue](https://github.com/your-org/linkandroid/issues)
3. 联系技术支持

---

**文档版本**：v1.0  
**创建时间**：2024-01-15  
**最后更新**：2024-01-15

**审批**：
- [ ] 架构师
- [ ] 技术负责人
- [ ] 产品经理
