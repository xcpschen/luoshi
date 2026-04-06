# 图像识别服务使用指南

## 概述

图像识别服务提供了一个统一的接口来执行图像模板匹配，支持多种识别引擎（本地 OpenCV、远程 Worker 集群、云服务 API），并具备自动降级能力。

## 架构设计

### 服务层次

```
┌─────────────────────────────────────────┐
│         Application Layer               │
│  (Device Manager / Automation Editor)   │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│      Image Recognition Facade           │
│  (统一入口，路由分发)                    │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│     IImageRecognitionService            │
│  (抽象接口定义)                          │
└─────────────────┬───────────────────────┘
                  │
    ┌─────────────┼─────────────┐
    │             │             │
    ▼             ▼             ▼
┌─────────┐ ┌─────────┐ ┌─────────┐
│ Local   │ │ Remote  │ │ Cloud   │
│ Service │ │ Service │ │ Service │
│ (OpenCV)│ │ (Worker)│ │ (API)   │
└─────────┘ └─────────┘ └─────────┘
```

### 服务类型

1. **Local Service (本地服务)**
   - 使用 OpenCV 进行本地图像识别
   - 无需网络连接
   - 适合开发和测试
   - 响应时间：~350ms

2. **Remote Service (远程服务)**
   - 通过 WebSocket 连接到 Worker 集群
   - 支持 GPU 加速
   - 适合生产环境
   - 响应时间：~120ms

3. **Cloud Service (云服务)**
   - 调用第三方 AI 平台 API（如百度 AI、阿里云）
   - 最高准确率
   - 按使用次数计费
   - 响应时间：~500ms

## 使用方式

### 1. 渲染进程中使用（推荐）

```typescript
// 在主进程中自动初始化后，渲染进程可直接使用

// 查找单个图像
const result = await window.$mapi.imageRecognition.findImage({
    deviceId: 'device-123',
    templatePath: '/path/to/template.png',
    threshold: 0.8,  // 可选，默认 0.8
    timeout: 30000   // 可选，默认 30000ms
});

if (result.success && result.result?.found) {
    console.log('找到匹配:', {
        x: result.result.x,
        y: result.result.y,
        confidence: result.result.confidence
    });
} else {
    console.log('未找到匹配:', result.error);
}

// 批量查找图像
const results = await window.$mapi.imageRecognition.findImages([
    {
        deviceId: 'device-123',
        templatePath: '/path/to/template1.png',
        threshold: 0.8
    },
    {
        deviceId: 'device-456',
        templatePath: '/path/to/template2.png',
        threshold: 0.8
    }
]);

// 获取服务状态
const statusResult = await window.$mapi.imageRecognition.getServiceStatus();
console.log('服务状态:', statusResult.statuses);

// 获取推荐服务
const recommended = await window.$mapi.imageRecognition.getRecommendedService();
console.log('推荐服务:', recommended.service);

// 动态切换服务
await window.$mapi.imageRecognition.switchService('local');  // 切换到本地
await window.$mapi.imageRecognition.switchService('remote'); // 切换到远程
await window.$mapi.imageRecognition.switchService('cloud');  // 切换到云端
```

### 2. 主进程中使用

```typescript
import { imageRecognition, ServiceType } from './mapi/imageRecognition';

// 查找单个图像
const result = await imageRecognition.findImage({
    deviceId: 'device-123',
    templatePath: '/path/to/template.png',
    threshold: 0.8
});

// 批量查找
const results = await imageRecognition.findImages([
    { deviceId: 'device-123', templatePath: '/path/to/template1.png' },
    { deviceId: 'device-456', templatePath: '/path/to/template2.png' }
]);

// 获取服务状态
const statuses = await imageRecognition.getServiceStatus();

// 切换服务
await imageRecognition.switchService(ServiceType.LOCAL);
```

## 识别结果格式

```typescript
interface RecognitionResult {
    found: boolean;          // 是否找到匹配
    confidence: number;      // 匹配度 (0-1)
    x?: number;             // X 坐标
    y?: number;             // Y 坐标
    width?: number;         // 匹配区域宽度
    height?: number;        // 匹配区域高度
    responseTime?: number;  // 识别耗时 (ms)
    engine?: string;        // 使用的识别引擎
    error?: string;         // 错误信息
}
```

## 服务配置

### 默认配置

```typescript
{
    // 远程服务（主服务）
    remote: {
        serverUrl: 'ws://localhost:8765',
        defaultThreshold: 0.8,
        defaultTimeout: 30000,
        maxRetries: 3
    },
    
    // 本地服务（降级）
    local: {
        defaultThreshold: 0.8,
        defaultTimeout: 30000,
        maxRetries: 0
    },
    
    // 云服务（可选降级）
    cloud: {
        apiKey: '',  // 需要配置
        apiSecret: '',
        endpoint: '',
        defaultThreshold: 0.8,
        defaultTimeout: 10000,
        maxRetries: 1
    }
}
```

### 自定义配置

在主进程初始化时自定义配置：

```typescript
import { imageRecognitionFacade, ServiceType } from './mapi/imageRecognition';

// 设置主服务
imageRecognitionFacade.setPrimaryService(ServiceType.REMOTE, {
    name: 'remote-worker-cluster',
    enabled: true,
    defaultThreshold: 0.85,  // 自定义阈值
    defaultTimeout: 20000,   // 自定义超时
    maxRetries: 2,
    fallback: 'local-opencv',
    options: {
        serverUrl: 'ws://192.168.1.100:8765',  // 自定义服务器地址
    },
});

// 添加降级服务
imageRecognitionFacade.addFallbackService(ServiceType.LOCAL, {
    name: 'local-opencv',
    enabled: true,
    defaultThreshold: 0.75,  // 本地服务使用更低阈值
    defaultTimeout: 30000,
    maxRetries: 0,
    options: {},
});

// 初始化
await imageRecognitionFacade.initialize();
```

## 自动降级机制

当主服务不可用时，系统会自动尝试降级服务：

1. **主服务失败** → 尝试第一个降级服务
2. **第一个降级服务失败** → 尝试第二个降级服务
3. **所有服务都失败** → 返回错误

降级流程示例：

```
Remote Service (失败)
    ↓
Local Service (成功)
    ↓
返回结果
```

## 服务监控

### 获取服务状态

```typescript
const statuses = await window.$mapi.imageRecognition.getServiceStatus();

statuses.statuses?.forEach(status => {
    console.log(`服务：${status.name}`);
    console.log(`  可用性：${status.available ? '可用' : '不可用'}`);
    console.log(`  平均响应时间：${status.avgResponseTime}ms`);
    console.log(`  成功率：${status.successRate}%`);
    console.log(`  总请求数：${status.totalRequests}`);
    console.log(`  失败请求数：${status.failedRequests}`);
});
```

### 性能指标

- **avgResponseTime**: 平均响应时间（毫秒）
- **successRate**: 成功率（百分比）
- **totalRequests**: 总请求数
- **failedRequests**: 失败请求数
- **load**: 当前负载（0-100，仅远程服务）

## 最佳实践

### 1. 阈值选择

- **高阈值 (0.9+)**: 需要精确匹配的场景
- **中阈值 (0.7-0.9)**: 常规使用（推荐 0.8）
- **低阈值 (0.5-0.7)**: 容忍一定差异的场景

### 2. 超时设置

- **本地服务**: 建议 30-60 秒
- **远程服务**: 建议 20-30 秒
- **云服务**: 建议 10-15 秒

### 3. 批量识别

```typescript
// 推荐：批量识别（并行执行）
const results = await window.$mapi.imageRecognition.findImages([
    { deviceId: 'device-1', templatePath: '/path/to/img1.png' },
    { deviceId: 'device-2', templatePath: '/path/to/img2.png' },
    { deviceId: 'device-3', templatePath: '/path/to/img3.png' },
]);

// 不推荐：逐个识别（串行执行）
for (const option of options) {
    const result = await window.$mapi.imageRecognition.findImage(option);
}
```

### 4. 错误处理

```typescript
try {
    const result = await window.$mapi.imageRecognition.findImage({
        deviceId: 'device-123',
        templatePath: '/path/to/template.png',
    });
    
    if (!result.success) {
        console.error('识别失败:', result.error);
        return;
    }
    
    if (result.result?.found) {
        console.log('识别成功:', result.result);
    } else {
        console.log('未找到匹配');
    }
} catch (error) {
    console.error('异常:', error);
}
```

## 服务扩展

### 添加新的识别服务

1. 实现 `IImageRecognitionService` 接口
2. 在 Factory 中注册新服务
3. 配置并使用

```typescript
// 1. 实现接口
export class CustomRecognitionService implements IImageRecognitionService {
    readonly name = 'custom-service';
    
    async initialize(): Promise<void> { /* ... */ }
    async destroy(): Promise<void> { /* ... */ }
    async isAvailable(): Promise<boolean> { /* ... */ }
    async recognize(request: RecognitionRequest): Promise<RecognitionResult> { /* ... */ }
    async recognizeBatch(requests: RecognitionRequest[]): Promise<RecognitionResult[]> { /* ... */ }
    async getStatus(): Promise<ServiceStatus> { /* ... */ }
}

// 2. 在 Factory 中注册
// electron/mapi/imageRecognition/factory.ts
static createService(type: ServiceType, config: RecognitionServiceConfig): IImageRecognitionService {
    switch (type) {
        case ServiceType.CUSTOM:  // 添加新类型
            return new CustomRecognitionService(config);
        // ...
    }
}

// 3. 配置使用
imageRecognitionFacade.setPrimaryService(ServiceType.CUSTOM, {
    name: 'custom-service',
    enabled: true,
    defaultThreshold: 0.8,
    defaultTimeout: 30000,
    maxRetries: 3,
    options: { /* 自定义配置 */ }
});
```

## 故障排查

### 1. 本地服务不可用

**问题**: OpenCV 加载失败

**解决方案**:
- 检查 `@techstark/opencv-js` 是否正确安装
- 查看日志确认 OpenCV 初始化状态
- 确保有足够的内存

### 2. 远程服务连接失败

**问题**: WebSocket 连接被拒绝

**解决方案**:
- 确认 Worker 服务已启动
- 检查服务器地址和端口
- 确认防火墙设置

### 3. 识别准确率低

**问题**: 匹配度低或找不到匹配

**解决方案**:
- 降低阈值（如从 0.8 降到 0.7）
- 使用更清晰的模板图像
- 尝试多尺度匹配（已默认启用）
- 考虑使用云服务（更高准确率）

### 4. 响应时间过长

**问题**: 识别耗时超过预期

**解决方案**:
- 切换到远程服务（GPU 加速）
- 减小截图分辨率
- 使用更小的模板图像
- 调整超时时间

## 相关文件

- 类型定义：`electron/mapi/imageRecognition/types.ts`
- 服务工厂：`electron/mapi/imageRecognition/factory.ts`
- 本地服务：`electron/mapi/imageRecognition/services/local.service.ts`
- 远程服务：`electron/mapi/imageRecognition/services/remote.service.ts`
- 云服务：`electron/mapi/imageRecognition/services/cloud.service.ts`
- 统一外观：`electron/mapi/imageRecognition/facade.ts`
- 主入口：`electron/mapi/imageRecognition/index.ts`
- IPC 处理：`electron/mapi/imageRecognition/main.ts`

## 更新日志

### v1.0.0 (2024-01-XX)
- 初始版本
- 支持本地、远程、云三种识别服务
- 实现自动降级机制
- 提供统一 IPC 接口
- 集成到 Electron 主进程
