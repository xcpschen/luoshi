# 高耗能任务处理方案

## 1. 高耗能任务识别

### 1.1 任务分类

| 任务类型 | 能耗等级 | 耗时 | 资源占用 | 优先级 |
|---------|---------|------|---------|--------|
| **图像识别（单张）** | 🟡 中 | 100-500ms | CPU 20% | 高 |
| **批量图像识别** | 🔴 高 | 10-60s | CPU 80%+ | 中 |
| **模板匹配（多尺度）** | 🔴 高 | 1-5s | CPU 60% | 高 |
| **OCR 识别** | 🔴 高 | 500ms-2s | CPU 50% | 中 |
| **AI 推理（YOLO）** | 🔴 高 | 200ms-1s | GPU 80% | 低 |
| **屏幕录制编码** | 🟡 中 | 持续 | CPU 30% | 高 |
| **测试用例执行** | 🟡 中 | 1-10min | CPU 40% | 高 |
| **报告生成** | 🟢 低 | 100-500ms | CPU 10% | 低 |

### 1.2 性能瓶颈分析

```
┌─────────────────────────────────────────────────────────┐
│                  性能瓶颈分析                             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  CPU 密集型 (60%)                                        │
│  ├── 图像识别算法（模板匹配、特征提取）                   │
│  ├── 视频编码（H.264 编码）                              │
│  └── OCR 文字识别                                        │
│                                                         │
│  内存密集型 (25%)                                        │
│  ├── 大图像缓存（多设备投屏）                            │
│  ├── 测试数据临时存储                                    │
│  └── 并发任务状态                                        │
│                                                         │
│  I/O 密集型 (15%)                                        │
│  ├── 数据库读写                                          │
│  ├── 文件存储（截图、录像）                              │
│  └── 网络传输（投屏流）                                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 2. 异步任务架构

### 2.1 任务队列架构

```
┌─────────────────────────────────────────────────────────────┐
│                      任务提交层                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │  Web UI   │  │  API     │  │  CLI     │                  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                  │
│       │             │             │                         │
│       └─────────────┴─────────────┘                         │
│                     ↓                                       │
│              ┌─────────────┐                                │
│              │  API Gateway │                                │
│              └──────┬──────┘                                │
└─────────────────────┼───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│                      消息队列层 (Redis)                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  优先级队列                                           │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐              │   │
│  │  │  High   │  │ Medium  │  │  Low    │              │   │
│  │  │  (P0)   │  │  (P1)   │  │  (P2)   │              │   │
│  │  └─────────┘  └─────────┘  └─────────┘              │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│                      工作节点层                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Worker 1   │  │  Worker 2   │  │  Worker N   │         │
│  │  (CPU 优化)  │  │  (GPU 优化)  │  │  (IO 优化)   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│                      结果存储层                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Redis     │  │  Database   │  │   File      │         │
│  │  (缓存)     │  │  (SQLite)   │  │  Storage    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Bull 任务队列实现

```typescript
import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';

// 创建 Redis 连接
const connection = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
});

// 任务队列定义
export enum TaskType {
  IMAGE_RECOGNITION = 'image:recognition',
  BATCH_RECOGNITION = 'image:batch',
  OCR_RECOGNITION = 'ocr:recognize',
  VIDEO_ENCODING = 'video:encode',
  TEST_EXECUTION = 'test:execute',
  REPORT_GENERATION = 'report:generate',
}

// 优先级定义
export enum TaskPriority {
  CRITICAL = 1,   // 关键任务（实时操作）
  HIGH = 5,       // 高优先级（用户交互）
  MEDIUM = 10,    // 中优先级（批量处理）
  LOW = 20,       // 低优先级（后台任务）
}

// 创建队列
const recognitionQueue = new Queue(TaskType.IMAGE_RECOGNITION, { connection });
const batchQueue = new Queue(TaskType.BATCH_RECOGNITION, { connection });
const ocrQueue = new Queue(TaskType.OCR_RECOGNITION, { connection });
const testQueue = new Queue(TaskType.TEST_EXECUTION, { connection });

// 任务数据接口
interface TaskData {
  id: string;
  type: TaskType;
  priority: TaskPriority;
  data: any;
  createdAt: number;
  timeout?: number;
  maxAttempts?: number;
}

// 结果接口
interface TaskResult {
  success: boolean;
  data?: any;
  error?: string;
  duration: number;
}

// 创建 Worker
const recognitionWorker = new Worker(
  TaskType.IMAGE_RECOGNITION,
  async (job: Job) => {
    const { data } = job.data;
    
    // 进度回调
    const progressCallback = (progress: number) => {
      job.updateProgress(progress);
    };
    
    // 执行识别
    const startTime = Date.now();
    const result = await executeRecognition(data, progressCallback);
    const duration = Date.now() - startTime;
    
    return {
      success: true,
      data: result,
      duration,
    };
  },
  {
    connection,
    concurrency: 4,  // 并发处理 4 个任务
    limiter: {
      max: 10,        // 每 1 秒最多处理 10 个
      duration: 1000,
    },
  }
);

// 批量识别 Worker（高耗能）
const batchWorker = new Worker(
  TaskType.BATCH_RECOGNITION,
  async (job: Job) => {
    const { templates, screenshots } = job.data;
    const results = [];
    
    // 分批次处理，避免内存爆炸
    const batchSize = 10;
    for (let i = 0; i < screenshots.length; i += batchSize) {
      const batch = screenshots.slice(i, i + batchSize);
      
      // 检查是否被取消
      if (await job.isCancelled()) {
        throw new Error('Task cancelled by user');
      }
      
      // 更新进度
      await job.updateProgress((i / screenshots.length) * 100);
      
      // 处理批次
      const batchResults = await Promise.all(
        batch.map(screenshot =>
          executeRecognition(screenshot, templates)
        )
      );
      
      results.push(...batchResults);
      
      // 批次间短暂休息，避免 CPU 过载
      if (i + batchSize < screenshots.length) {
        await sleep(10);
      }
    }
    
    return {
      success: true,
      data: results,
      totalProcessed: results.length,
    };
  },
  {
    connection,
    concurrency: 2,  // 低并发，避免资源耗尽
    limiter: {
      max: 2,         // 每 1 秒最多 2 个
      duration: 1000,
    },
  }
);

// 任务提交 API
export async function submitTask(
  type: TaskType,
  data: any,
  priority: TaskPriority = TaskPriority.MEDIUM
): Promise<string> {
  const queue = getQueueForType(type);
  
  const job = await queue.add(
    type,
    { data },
    {
      priority,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: {
        age: 3600,  // 1 小时后删除
        count: 100, // 保留最近 100 个
      },
      removeOnFail: {
        age: 24 * 3600,  // 24 小时后删除
      },
    }
  );
  
  return job.id;
}

// 查询任务状态
export async function getTaskStatus(jobId: string): Promise<TaskStatus> {
  const job = await Job.fromId(recognitionQueue, jobId);
  
  if (!job) {
    throw new Error('Job not found');
  }
  
  return {
    id: job.id,
    type: job.name,
    status: await job.getState(),
    progress: job.progress,
    attemptsMade: job.attemptsMade,
    finishedOn: job.finishedOn,
    failedReason: job.failedReason,
  };
}

// 取消任务
export async function cancelTask(jobId: string): Promise<void> {
  const job = await Job.fromId(recognitionQueue, jobId);
  if (job) {
    await job.remove();
  }
}
```

### 2.3 任务监控

```typescript
// 监控指标
import { Counter, Gauge, Histogram } from 'prom-client';

const taskQueueSize = new Gauge({
  name: 'task_queue_size',
  help: 'Current size of task queue',
  labelNames: ['queue_type'],
});

const taskDuration = new Histogram({
  name: 'task_duration_seconds',
  help: 'Duration of task execution',
  buckets: [0.1, 0.5, 1, 5, 10, 30, 60],
  labelNames: ['task_type', 'status'],
});

const taskFailureRate = new Counter({
  name: 'task_failures_total',
  help: 'Total number of failed tasks',
  labelNames: ['task_type', 'error_type'],
});

// 定期收集指标
setInterval(async () => {
  const queues = [recognitionQueue, batchQueue, ocrQueue, testQueue];
  
  for (const queue of queues) {
    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
    ]);
    
    taskQueueSize.set({ queue_type: queue.name }, waiting);
  }
}, 5000);
```

---

## 3. 资源隔离与限流

### 3.1 CPU 隔离

```typescript
import { cpus } from 'os';
import { Worker } from 'worker_threads';

class CpuIsolator {
  private readonly cpuCores = cpus().length;
  private readonly taskWorkers = new Map<string, Worker>();
  
  /**
   * 根据任务类型分配 CPU 核心
   */
  assignCpuCore(taskType: string): number {
    const coreMap: Record<string, number> = {
      'image:recognition': 0,  // 图像识别使用核心 0
      'video:encode': 1,        // 视频编码使用核心 1
      'ocr:recognize': 2,       // OCR 使用核心 2
      'default': (this.cpuCores - 1), // 其他使用最后一个核心
    };
    
    return coreMap[taskType] || coreMap['default'];
  }
  
  /**
   * 创建隔离的 Worker
   */
  createIsolatedWorker(taskType: string, scriptPath: string): Worker {
    const coreId = this.assignCpuCore(taskType);
    
    const worker = new Worker(scriptPath, {
      env: {
        UV_THREADPOOL_SIZE: '1',  // 限制线程池大小
        TASK_CPU_AFFINITY: coreId.toString(),
      },
    });
    
    this.taskWorkers.set(`${taskType}-${Date.now()}`, worker);
    
    return worker;
  }
}
```

### 3.2 内存限制

```typescript
class MemoryLimiter {
  private readonly maxMemory: number;
  private currentMemory: number = 0;
  
  constructor(maxMemoryMB: number = 2048) {
    this.maxMemory = maxMemoryMB * 1024 * 1024;
  }
  
  /**
   * 检查是否有足够内存
   */
  async acquireMemory(requiredBytes: number): Promise<boolean> {
    const usage = process.memoryUsage();
    const available = this.maxMemory - usage.heapUsed;
    
    if (requiredBytes > available) {
      console.warn('Memory limit reached, triggering GC');
      
      // 触发 GC（如果可用）
      if (global.gc) {
        global.gc();
        await sleep(100);
      }
      
      // 再次检查
      const newUsage = process.memoryUsage();
      if (requiredBytes > (this.maxMemory - newUsage.heapUsed)) {
        return false; // 仍然不足
      }
    }
    
    return true;
  }
  
  /**
   * 批量任务的内存控制
   */
  async processWithMemoryControl<T>(
    items: any[],
    processor: (item: any) => Promise<T>,
    chunkSize: number = 10
  ): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      
      // 检查内存
      const canProceed = await this.acquireMemory(chunk.length * 1024 * 1024);
      if (!canProceed) {
        throw new Error('Memory limit exceeded');
      }
      
      // 处理批次
      const chunkResults = await Promise.all(
        chunk.map(item => processor(item))
      );
      
      results.push(...chunkResults);
      
      // 释放内存（通过 GC）
      if (i + chunkSize < items.length && global.gc) {
        global.gc();
      }
    }
    
    return results;
  }
}
```

### 3.3 限流器实现

```typescript
class RateLimiter {
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly tokens: Array<number> = [];
  
  constructor(maxRequests: number = 10, windowMs: number = 1000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }
  
  /**
   * 获取执行许可
   */
  async acquire(): Promise<void> {
    const now = Date.now();
    
    // 移除过期的 token
    while (this.tokens.length > 0 && this.tokens[0] < now - this.windowMs) {
      this.tokens.shift();
    }
    
    // 检查是否超限
    if (this.tokens.length >= this.maxRequests) {
      const waitTime = this.tokens[0] + this.windowMs - now;
      console.log(`Rate limit reached, waiting ${waitTime}ms`);
      await sleep(waitTime);
      return this.acquire(); // 递归重试
    }
    
    // 添加 token
    this.tokens.push(now);
  }
  
  /**
   * 装饰器：限流
   */
  rateLimit() {
    return (
      target: any,
      propertyKey: string,
      descriptor: PropertyDescriptor
    ) => {
      const originalMethod = descriptor.value;
      
      descriptor.value = async function (...args: any[]) {
        await this.limiter.acquire();
        return originalMethod.apply(this, args);
      };
      
      return descriptor;
    };
  }
}

// 使用示例
class RecognitionService {
  private limiter = new RateLimiter(5, 1000); // 每秒最多 5 次
  
  @limiter.rateLimit()
  async recognize(image: Buffer): Promise<RecognitionResult> {
    // 识别逻辑
  }
}
```

---

## 4. 任务调度策略

### 4.1 优先级调度

```typescript
interface TaskSchedule {
  id: string;
  type: TaskType;
  priority: TaskPriority;
  estimatedDuration: number;
  resourceRequirement: {
    cpu: number;      // CPU 核心数
    memory: number;   // 内存 MB
    gpu?: boolean;    // 是否需要 GPU
  };
  deadline?: number;  // 截止时间戳
}

class TaskScheduler {
  private readonly readyQueue: TaskSchedule[] = [];
  private readonly runningTasks = new Map<string, TaskSchedule>();
  private readonly resourcePool = {
    cpu: cpus().length,
    memory: 8192, // 8GB
    gpu: true,
  };
  
  /**
   * 添加任务到调度队列
   */
  addTask(task: TaskSchedule): void {
    this.readyQueue.push(task);
    this.readyQueue.sort((a, b) => {
      // 首先按优先级
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      // 其次按截止时间
      if (a.deadline && b.deadline) {
        return a.deadline - b.deadline;
      }
      // 最后按估计时长（短任务优先）
      return a.estimatedDuration - b.estimatedDuration;
    });
    
    this.trySchedule();
  }
  
  /**
   * 尝试调度任务
   */
  private trySchedule(): void {
    while (this.readyQueue.length > 0) {
      const task = this.readyQueue[0];
      
      // 检查资源是否足够
      if (!this.hasEnoughResources(task.resourceRequirement)) {
        break; // 资源不足，等待
      }
      
      // 分配资源
      this.allocateResources(task.resourceRequirement);
      
      // 移动任务到运行队列
      this.readyQueue.shift();
      this.runningTasks.set(task.id, task);
      
      // 启动任务
      this.executeTask(task);
    }
  }
  
  /**
   * 检查资源
   */
  private hasEnoughResources(req: TaskSchedule['resourceRequirement']): boolean {
    const available = {
      cpu: this.resourcePool.cpu - Array.from(this.runningTasks.values())
        .reduce((sum, t) => sum + t.resourceRequirement.cpu, 0),
      memory: this.resourcePool.memory - Array.from(this.runningTasks.values())
        .reduce((sum, t) => sum + t.resourceRequirement.memory, 0),
    };
    
    return available.cpu >= req.cpu && available.memory >= req.memory;
  }
  
  /**
   * 分配资源
   */
  private allocateResources(req: TaskSchedule['resourceRequirement']): void {
    // 资源分配逻辑
  }
  
  /**
   * 执行任务
   */
  private async executeTask(task: TaskSchedule): Promise<void> {
    try {
      await this.runTask(task);
    } finally {
      // 释放资源
      this.runningTasks.delete(task.id);
      this.trySchedule(); // 尝试调度下一个
    }
  }
}
```

### 4.2 时间片轮转

```typescript
class TimeSliceScheduler {
  private readonly timeSliceMs = 100; // 100ms 时间片
  private readonly taskQueue: Array<{
    task: () => Promise<void>;
    resolve: () => void;
    reject: (error: Error) => void;
  }> = [];
  
  private processing = false;
  
  /**
   * 提交长任务（分片执行）
   */
  submitLongTask(task: () => Promise<void>): Promise<void> {
    return new Promise((resolve, reject) => {
      this.taskQueue.push({ task, resolve, reject });
      this.processQueue();
    });
  }
  
  private async processQueue(): Promise<void> {
    if (this.processing || this.taskQueue.length === 0) {
      return;
    }
    
    this.processing = true;
    
    while (this.taskQueue.length > 0) {
      const { task, resolve, reject } = this.taskQueue.shift()!;
      
      try {
        // 使用时间片执行
        await this.executeWithTimeSlice(task);
        resolve();
      } catch (error) {
        reject(error);
      }
      
      // 让出主线程，避免阻塞
      await sleep(0);
    }
    
    this.processing = false;
  }
  
  private async executeWithTimeSlice(task: () => Promise<void>): Promise<void> {
    const startTime = Date.now();
    
    // 包装任务，定期检查时间片
    const wrappedTask = async () => {
      const originalSetTimeout = global.setTimeout;
      const originalClearTimeout = global.clearTimeout;
      
      let timeSliceExpired = false;
      const timeoutId = originalSetTimeout(() => {
        timeSliceExpired = true;
      }, this.timeSliceMs);
      
      try {
        await task();
        originalClearTimeout(timeoutId);
      } catch (error) {
        originalClearTimeout(timeoutId);
        throw error;
      }
      
      if (timeSliceExpired) {
        // 时间片用完，让出执行权
        await sleep(0);
      }
    };
    
    await wrappedTask();
  }
}
```

---

## 5. 弹性伸缩

### 5.1 自动扩缩容

```typescript
interface ScalingConfig {
  minWorkers: number;
  maxWorkers: number;
  targetCpuUtilization: number;
  targetMemoryUtilization: number;
  scaleUpCooldown: number;  // 扩容冷却时间 (ms)
  scaleDownCooldown: number; // 缩容冷却时间 (ms)
}

class AutoScaler {
  private workers: WorkerInfo[] = [];
  private config: ScalingConfig;
  private lastScaleTime = 0;
  
  constructor(config: ScalingConfig) {
    this.config = config;
  }
  
  /**
   * 定期检查并调整
   */
  async checkAndScale(): Promise<void> {
    const now = Date.now();
    const cooldown = this.workers.length > this.config.minWorkers
      ? this.config.scaleDownCooldown
      : this.config.scaleUpCooldown;
    
    if (now - this.lastScaleTime < cooldown) {
      return; // 冷却期
    }
    
    const metrics = await this.collectMetrics();
    const desiredWorkers = this.calculateDesiredWorkers(metrics);
    
    if (desiredWorkers !== this.workers.length) {
      await this.scaleTo(desiredWorkers);
      this.lastScaleTime = now;
    }
  }
  
  /**
   * 计算期望 worker 数量
   */
  private calculateDesiredWorkers(metrics: Metrics): number {
    const { cpuUtilization, queueLength } = metrics;
    
    // 基于 CPU 利用率计算
    const cpuBased = Math.round(
      this.workers.length * (cpuUtilization / this.config.targetCpuUtilization)
    );
    
    // 基于队列长度计算
    const queueBased = Math.ceil(queueLength / 10); // 每个 worker 处理 10 个任务
    
    // 取较大值
    const desired = Math.max(cpuBased, queueBased);
    
    // 限制在 min-max 范围内
    return Math.max(
      this.config.minWorkers,
      Math.min(desired, this.config.maxWorkers)
    );
  }
  
  /**
   * 执行扩缩容
   */
  private async scaleTo(count: number): Promise<void> {
    const delta = count - this.workers.length;
    
    if (delta > 0) {
      console.log(`Scaling up: ${this.workers.length} → ${count}`);
      for (let i = 0; i < delta; i++) {
        await this.addWorker();
      }
    } else if (delta < 0) {
      console.log(`Scaling down: ${this.workers.length} → ${count}`);
      for (let i = 0; i < Math.abs(delta); i++) {
        await this.removeWorker();
      }
    }
  }
}
```

### 5.2 云端弹性

```yaml
# Kubernetes HPA + KEDA 配置
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: worker-autoscaler
  namespace: automation
spec:
  scaleTargetRef:
    name: app-automation-worker
  minReplicaCount: 2
  maxReplicaCount: 20
  cooldownPeriod: 300
  pollingInterval: 10
  triggers:
    # 基于 Redis 队列长度
    - type: redis
      metadata:
        address: redis:6379
        listName: task:queue
        listLength: '10'
    
    # 基于 CPU 使用率
    - type: cpu
      metadata:
        value: '70'
    
    # 基于内存使用率
    - type: memory
      metadata:
        value: '80'
    
    # 基于 Prometheus 指标
    - type: prometheus
      metadata:
        serverAddress: http://prometheus:9090
        metricName: task_queue_size
        threshold: '50'
        query: sum(task_queue_size)
  
  advanced:
    restoreToOriginalReplicaCount: true
    horizontalPodAutoscalerConfig:
      behavior:
        scaleDown:
          stabilizationWindowSeconds: 300
          policies:
            - type: Percent
              value: 50
              periodSeconds: 60
        scaleUp:
          stabilizationWindowSeconds: 60
          policies:
            - type: Percent
              value: 100
              periodSeconds: 60
```

---

## 6. 任务优化技巧

### 6.1 图像识别优化

```typescript
// 1. 图像金字塔（多尺度快速匹配）
async function pyramidMatch(
  src: cv.Mat,
  templ: cv.Mat,
  maxScales: number = 5
): Promise<MatchResult> {
  const results: MatchResult[] = [];
  
  // 构建图像金字塔
  for (let scale = 0; scale < maxScales; scale++) {
    const factor = Math.pow(0.5, scale);
    
    const srcScaled = new cv.Mat();
    const templScaled = new cv.Mat();
    
    cv.resize(src, srcScaled, new cv.Size(), factor, factor);
    cv.resize(templ, templScaled, new cv.Size(), factor, factor);
    
    // 在缩小图像上快速匹配
    const result = await fastMatch(srcScaled, templScaled);
    results.push(result);
    
    // 如果找到高置信度匹配，提前结束
    if (result.confidence > 0.9) {
      srcScaled.delete();
      templScaled.delete();
      break;
    }
    
    srcScaled.delete();
    templScaled.delete();
  }
  
  // 返回最佳结果
  return results.sort((a, b) => b.confidence - a.confidence)[0];
}

// 2. ROI 优化（限制搜索区域）
function searchInROI(
  src: cv.Mat,
  templ: cv.Mat,
  roi: Rect
): MatchResult {
  const srcROI = src.roi(roi.x, roi.y, roi.width, roi.height);
  const result = matchTemplate(srcROI, templ);
  srcROI.delete();
  return result;
}

// 3. 缓存优化
class TemplateCache {
  private cache = new LRUCache<string, cv.Mat>({
    max: 500,
    ttl: 1000 * 60 * 10, // 10 分钟
  });
  
  async getOrLoad(path: string): Promise<cv.Mat> {
    let templ = this.cache.get(path);
    
    if (!templ) {
      templ = await loadTemplate(path);
      // 预处理：转灰度、归一化
      const gray = new cv.Mat();
      cv.cvtColor(templ, gray, cv.COLOR_RGBA2GRAY);
      templ.delete();
      this.cache.set(path, gray);
    }
    
    return templ.clone(); // 返回副本
  }
}
```

### 6.2 批量任务优化

```typescript
// 1. 并行处理
async function processBatchParallel<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  concurrency: number = 4
): Promise<R[]> {
  const results: R[] = [];
  
  // 分割为多个批次
  const chunks = chunkArray(items, concurrency);
  
  for (const chunk of chunks) {
    const chunkResults = await Promise.all(
      chunk.map(item => processor(item))
    );
    results.push(...chunkResults);
  }
  
  return results;
}

// 2. 流式处理
async function* processStream<T, R>(
  stream: AsyncIterable<T>,
  processor: (item: T) => Promise<R>
): AsyncGenerator<R> {
  for await (const item of stream) {
    const result = await processor(item);
    yield result;
    
    // 定期让出执行权
    if (Math.random() < 0.1) {
      await sleep(0);
    }
  }
}

// 3. 结果聚合
class ResultAggregator<T> {
  private results: T[] = [];
  private errors: Error[] = [];
  private resolvedCount = 0;
  
  addResult(result: T): void {
    this.results.push(result);
    this.resolvedCount++;
  }
  
  addError(error: Error): void {
    this.errors.push(error);
    this.resolvedCount++;
  }
  
  isComplete(total: number): boolean {
    return this.resolvedCount >= total;
  }
  
  getSummary(): AggregationSummary {
    return {
      total: this.results.length + this.errors.length,
      success: this.results.length,
      failed: this.errors.length,
      errors: this.errors,
    };
  }
}
```

---

## 7. 监控与告警

### 7.1 实时监控面板

```typescript
// Grafana 面板配置
const dashboardConfig = {
  panels: [
    {
      title: '任务队列长度',
      type: 'graph',
      targets: [
        {
          expr: 'sum(task_queue_size)',
          legendFormat: '待处理任务',
        },
      ],
      thresholds: [
        { value: 50, color: 'yellow' },
        { value: 100, color: 'red' },
      ],
    },
    {
      title: '任务执行延迟',
      type: 'heatmap',
      targets: [
        {
          expr: 'histogram_quantile(0.95, rate(task_duration_seconds_bucket[5m]))',
          legendFormat: 'P95 延迟',
        },
      ],
    },
    {
      title: 'Worker 资源使用率',
      type: 'gauge',
      targets: [
        {
          expr: 'avg(rate(process_cpu_seconds_total[1m])) * 100',
          legendFormat: 'CPU 使用率',
        },
        {
          expr: 'avg(process_resident_memory_bytes) / 1024 / 1024 / 1024 * 100',
          legendFormat: '内存使用率',
        },
      ],
    },
    {
      title: '任务成功率',
      type: 'stat',
      targets: [
        {
          expr: 'sum(rate(task_completions_total{status="success"}[5m])) / sum(rate(task_completions_total[5m])) * 100',
          legendFormat: '成功率',
        },
      ],
      thresholds: [
        { value: 95, color: 'green' },
        { value: 90, color: 'yellow' },
        { value: 0, color: 'red' },
      ],
    },
  ],
};
```

### 7.2 告警规则

```yaml
# Prometheus 告警规则
groups:
  - name: high-energy-tasks
    interval: 30s
    rules:
      # 队列积压
      - alert: TaskQueueBacklog
        expr: sum(task_queue_size) > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "任务队列积压严重"
          description: "当前队列长度：{{ $value }}"
      
      # 任务执行缓慢
      - alert: SlowTaskExecution
        expr: histogram_quantile(0.95, rate(task_duration_seconds_bucket[5m])) > 5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "任务执行延迟过高"
          description: "P95 延迟：{{ $value }}s"
      
      # Worker 资源耗尽
      - alert: WorkerResourceExhausted
        expr: avg(rate(process_cpu_seconds_total[1m])) * 100 > 90
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Worker CPU 资源耗尽"
          description: "CPU 使用率：{{ $value }}%"
      
      # 任务失败率高
      - alert: HighTaskFailureRate
        expr: sum(rate(task_failures_total[5m])) / sum(rate(task_completions_total[5m])) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "任务失败率过高"
          description: "失败率：{{ $value | humanizePercentage }}"
      
      # 内存泄漏
      - alert: MemoryLeak
        expr: increase(process_resident_memory_bytes[1h]) > 1073741824  # 1GB
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "检测到内存泄漏"
          description: "1 小时内内存增长：{{ $value | humanize }}"
```

---

## 8. 最佳实践总结

### 8.1 设计原则

1. **异步优先**：所有高耗能任务必须异步执行
2. **队列缓冲**：使用消息队列削峰填谷
3. **资源隔离**：CPU/内存/GPU 隔离避免相互影响
4. **限流降级**：超过阈值自动限流或降级
5. **监控告警**：实时监控，及时告警

### 8.2 性能优化清单

- [ ] 使用图像金字塔加速匹配
- [ ] 实现 ROI 限制搜索区域
- [ ] 添加模板缓存机制
- [ ] 批量任务分片处理
- [ ] 并行处理利用多核
- [ ] 定期触发 GC 释放内存
- [ ] 使用 Worker Threads 隔离
- [ ] 实现弹性伸缩

### 8.3 成本控制

| 优化项 | 措施 | 预期效果 |
|--------|------|---------|
| **计算资源** | 弹性伸缩 + Spot 实例 | 节省 50-70% |
| **存储成本** | 数据压缩 + 冷热分离 | 节省 40-50% |
| **网络成本** | CDN + 本地缓存 | 节省 30-40% |
| **人力成本** | 自动化运维 + 智能告警 | 节省 60-70% |

---

**文档版本**：v1.0  
**创建时间**：2024-01-15  
**最后更新**：2024-01-15  

**审批**：
- [ ] 架构师
- [ ] 技术负责人
- [ ] 运维负责人
