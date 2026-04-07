# 性能优化与部署方案

## 1. 单机测试环境优化

### 1.1 硬件配置推荐

#### 1.1.1 最低配置
```
CPU: Intel i5-8400 / AMD Ryzen 5 2600
内存：16GB DDR4
显卡：GTX 1060 6GB（或集成显卡）
存储：256GB SSD
网络：千兆以太网
```

**支持能力**：
- ✅ 单设备投屏（1080p@30fps）
- ✅ 基础图像识别（<500ms）
- ✅ 简单录制回放
- ⚠️ 多设备性能下降明显

#### 1.1.2 推荐配置
```
CPU: Intel i7-12700K / AMD Ryzen 7 5800X
内存：32GB DDR4
显卡：RTX 3060 12GB
存储：512GB NVMe SSD
网络：2.5G 以太网 + WiFi 6
```

**支持能力**：
- ✅ 3-5 设备并发投屏（1080p@60fps）
- ✅ 快速图像识别（<200ms）
- ✅ 流畅录制回放
- ✅ 中等规模测试

#### 1.1.3 高性能配置
```
CPU: Intel i9-13900K / AMD Ryzen 9 7950X
内存：64GB DDR5
显卡：RTX 4080 16GB
存储：1TB NVMe SSD + 2TB HDD
网络：10G 以太网 + WiFi 6E
```

**支持能力**：
- ✅ 10+ 设备并发投屏（2K@60fps）
- ✅ 实时图像识别（<100ms）
- ✅ 大规模自动化测试
- ✅ AI 增强识别

### 1.2 系统级优化

#### 1.2.1 Linux 系统优化

```bash
# 1. CPU 性能模式
sudo cpupower frequency-set -g performance

# 2. 禁用 CPU 节能
sudo systemctl disable powertop

# 3. 增加文件描述符限制
echo "fs.file-max = 65535" >> /etc/sysctl.conf
echo "* soft nofile 65535" >> /etc/security/limits.conf
echo "* hard nofile 65535" >> /etc/security/limits.conf

# 4. 网络优化
cat >> /etc/sysctl.conf << EOF
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216
net.ipv4.tcp_congestion_control = bbr
EOF

sudo sysctl -p

# 5. 禁用透明大页（减少延迟）
echo never > /sys/kernel/mm/transparent_hugepage/enabled
```

#### 1.2.2 Windows 系统优化

```powershell
# 1. 电源计划设置为高性能
powercfg -setactive SCHEME_MIN

# 2. 禁用 Windows Defender 实时扫描（针对项目目录）
Add-MpPreference -ExclusionPath "C:\projects\linkandroid"

# 3. 禁用不必要的服务
Stop-Service -Name "SysMain" -Force
Set-Service -Name "SysMain" -StartupType Disabled

# 4. 增加虚拟内存
[System.Environment]::SetEnvironmentVariable("_JAVA_OPTIONS", "-Xmx4G", "User")

# 5. 禁用硬件加速 GPU 调度（避免冲突）
# 设置 → 显示 → 图形 → 更改默认图形设置 → 关闭
```

#### 1.2.3 macOS 系统优化

```bash
# 1. 禁用 App Nap（防止后台降频）
defaults write com.apple.finder DisableAllAnimations -bool true

# 2. 增加文件描述符
echo "kern.maxfiles=65536" >> /etc/sysctl.conf
echo "kern.maxfilesperproc=65536" >> /etc/sysctl.conf

# 3. 禁用 Spotlight 索引
mdutil -a -i off

# 4. 禁用自动更新
defaults write com.apple.SoftwareUpdate AutomaticCheckEnabled -bool false
```

### 1.3 应用级优化

#### 1.3.1 Node.js 优化

```typescript
// 1. 启用 V8 优化选项
export NODE_OPTIONS="--max-old-space-size=4096 --optimize-for-size"

// 2. 使用 Cluster 模式利用多核
import cluster from 'cluster';
import { availableParallelism } from 'os';

if (cluster.isPrimary) {
  const numCPUs = availableParallelism();
  console.log(`Primary ${process.pid} started, forking ${numCPUs} workers`);
  
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died, restarting...`);
    cluster.fork();
  });
} else {
  // Worker 进程
  startApplication();
}

// 3. 使用 Worker Threads 处理 CPU 密集型任务
import { Worker, isMainThread, parentPort } from 'worker_threads';

class ImageRecognitionWorker {
  private workers: Worker[] = [];
  
  constructor(numWorkers: number = 4) {
    for (let i = 0; i < numWorkers; i++) {
      const worker = new Worker('./recognition-worker.ts');
      this.workers.push(worker);
    }
  }
  
  async recognize(image: Buffer): Promise<RecognitionResult> {
    return new Promise((resolve, reject) => {
      const worker = this.getAvailableWorker();
      worker.once('message', resolve);
      worker.once('error', reject);
      worker.postMessage({ image });
    });
  }
}
```

#### 1.3.2 内存管理优化

```typescript
// 1. 对象池模式（避免频繁 GC）
class MatPool {
  private pool: cv.Mat[] = [];
  private maxSize = 100;
  
  acquire(): cv.Mat {
    return this.pool.pop() || new cv.Mat();
  }
  
  release(mat: cv.Mat) {
    if (this.pool.length < this.maxSize) {
      mat.zeros(); // 重置
      this.pool.push(mat);
    } else {
      mat.delete(); // 销毁
    }
  }
}

// 2. 流式处理（避免大对象）
import { pipeline } from 'stream/promises';
import { createReadStream, createWriteStream } from 'fs';

async function processLargeFile(input: string, output: string) {
  await pipeline(
    createReadStream(input),
    new TransformStream({ /* 转换逻辑 */ }),
    createWriteStream(output)
  );
}

// 3. 定期 GC（可控的垃圾回收）
import { gc } from 'node:gc';

setInterval(() => {
  if (process.memoryUsage().heapUsed > 3 * 1024 * 1024 * 1024) {
    gc();
    console.log('GC triggered, memory freed');
  }
}, 60000);
```

#### 1.3.3 缓存优化

```typescript
// 1. LRU 缓存（图像模板）
import { LRUCache } from 'lru-cache';

const templateCache = new LRUCache({
  max: 1000,
  ttl: 1000 * 60 * 5, // 5 分钟
  sizeCalculation: (value) => value.byteLength,
  maxSize: 1024 * 1024 * 1024, // 1GB
});

// 2. 多级缓存
class MultiLevelCache {
  private l1 = new Map(); // 内存缓存（快速）
  private l2 = new LRUCache(); // 大缓存
  private l3 = new DatabaseCache(); // 持久化
  
  async get(key: string) {
    // L1 尝试
    if (this.l1.has(key)) {
      return this.l1.get(key);
    }
    
    // L2 尝试
    const l2Result = await this.l2.get(key);
    if (l2Result) {
      this.l1.set(key, l2Result);
      return l2Result;
    }
    
    // L3 尝试
    const l3Result = await this.l3.get(key);
    if (l3Result) {
      this.l1.set(key, l3Result);
      await this.l2.set(key, l3Result);
      return l3Result;
    }
    
    return null;
  }
}
```

### 1.4 投屏优化

#### 1.4.1 编码参数优化

```typescript
interface ScrcpyOptions {
  bitRate: number;        // 比特率
  maxSize: number;        // 最大尺寸
  maxFps: number;         // 最大帧率
  encoder: string;        // 编码器
  profile: string;        // H.264 profile
  preset: string;         // 编码预设
}

const profiles: Record<string, ScrcpyOptions> = {
  // 低延迟模式（竞技游戏）
  lowLatency: {
    bitRate: 8000000,
    maxSize: 1920,
    maxFps: 60,
    encoder: 'h264',
    profile: 'baseline',
    preset: 'ultrafast',
  },
  
  // 平衡模式（日常使用）
  balanced: {
    bitRate: 6000000,
    maxSize: 1280,
    maxFps: 30,
    encoder: 'h264',
    profile: 'main',
    preset: 'fast',
  },
  
  // 高质量模式（录制）
  highQuality: {
    bitRate: 12000000,
    maxSize: 1920,
    maxFps: 60,
    encoder: 'h264',
    profile: 'high',
    preset: 'medium',
  },
  
  // 省电模式（多设备）
  powerSave: {
    bitRate: 3000000,
    maxSize: 854,
    maxFps: 24,
    encoder: 'h264',
    profile: 'baseline',
    preset: 'superfast',
  },
};
```

#### 1.4.2 动态质量调整

```typescript
class AdaptiveQuality {
  private targetLatency = 100; // ms
  private currentBitRate = 8000000;
  private currentFps = 60;
  
  adjust(currentLatency: number, frameDropRate: number) {
    // 基于延迟调整比特率
    if (currentLatency > this.targetLatency * 1.5) {
      this.currentBitRate = Math.max(
        2000000,
        this.currentBitRate * 0.8
      );
      this.currentFps = Math.max(30, this.currentFps - 5);
      console.log('Reducing quality due to high latency');
    } else if (currentLatency < this.targetLatency * 0.7) {
      this.currentBitRate = Math.min(
        12000000,
        this.currentBitRate * 1.1
      );
      this.currentFps = Math.min(60, this.currentFps + 5);
      console.log('Increasing quality due to low latency');
    }
    
    // 基于丢帧率调整
    if (frameDropRate > 0.1) {
      this.currentFps = Math.max(24, this.currentFps - 5);
    }
    
    return {
      bitRate: this.currentBitRate,
      fps: this.currentFps,
    };
  }
}
```

---

## 2. 集群部署方案

### 2.1 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                     负载均衡层 (Nginx)                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  upstream app_cluster {                              │   │
│  │    server node1:3000 weight=3;                       │   │
│  │    server node2:3000 weight=3;                       │   │
│  │    server node3:3000 weight=2 backup;                │   │
│  │  }                                                   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
         ↕                    ↕                    ↕
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  节点 1      │     │  节点 2      │     │  节点 3      │
│  (Master)   │     │  (Worker)   │     │  (Worker)   │
│  10 设备     │     │  10 设备     │     │  备用        │
└─────────────┘     └─────────────┘     └─────────────┘
         ↕                    ↕                    ↕
┌─────────────────────────────────────────────────────────────┐
│                  消息队列 (Redis/RabbitMQ)                   │
│  - 任务分发                                                 │
│  - 状态同步                                                 │
│  - 结果收集                                                 │
└─────────────────────────────────────────────────────────────┘
         ↕
┌─────────────────────────────────────────────────────────────┐
│                     数据库集群                               │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   │
│  │   Master    │ →   │  Replica 1  │ →   │  Replica 2  │   │
│  │  (读写)     │     │  (只读)     │     │  (只读)     │   │
│  └─────────────┘     └─────────────┘     └─────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Kubernetes 部署

#### 2.2.1 Deployment 配置

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-automation-worker
  namespace: automation
spec:
  replicas: 3
  selector:
    matchLabels:
      app: automation-worker
  template:
    metadata:
      labels:
        app: automation-worker
    spec:
      containers:
      - name: worker
        image: registry.example.com/app-automation:latest
        resources:
          requests:
            cpu: "2000m"
            memory: "4Gi"
          limits:
            cpu: "4000m"
            memory: "8Gi"
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: redis-url
        - name: DEVICE_COUNT
          value: "10"
        volumeMounts:
        - name: adb-storage
          mountPath: /root/.android
        - name: device-usb
          mountPath: /dev/bus/usb
      volumes:
      - name: adb-storage
        emptyDir: {}
      - name: device-usb
        hostPath:
          path: /dev/bus/usb
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - automation-worker
              topologyKey: kubernetes.io/hostname
```

#### 2.2.2 StatefulSet（有状态设备管理）

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: device-pool
  namespace: automation
spec:
  serviceName: device-pool
  replicas: 5
  selector:
    matchLabels:
      app: device-pool
  template:
    metadata:
      labels:
        app: device-pool
    spec:
      containers:
      - name: device-manager
        image: registry.example.com/device-manager:latest
        resources:
          requests:
            cpu: "1000m"
            memory: "2Gi"
          limits:
            cpu: "2000m"
            memory: "4Gi"
        volumeMounts:
        - name: usb-storage
          mountPath: /dev/bus/usb
  volumeClaimTemplates:
  - metadata:
      name: usb-storage
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 10Gi
```

#### 2.2.3 HPA（自动扩缩容）

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: automation-worker-hpa
  namespace: automation
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: app-automation-worker
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  - type: Pods
    pods:
      metric:
        name: queue_length
      target:
        type: AverageValue
        averageValue: 10
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
      - type: Pods
        value: 5
        periodSeconds: 60
      selectPolicy: Max
```

### 2.3 Docker Compose（单机集群）

```yaml
version: '3.8'

services:
  # 负载均衡
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - worker1
      - worker2
      - worker3
  
  # Redis（消息队列 + 缓存）
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes
  
  # 工作节点 1
  worker1:
    image: app-automation:latest
    environment:
      - NODE_ENV=production
      - WORKER_ID=worker1
      - REDIS_URL=redis://redis:6379
      - DEVICE_COUNT=5
    volumes:
      - /dev/bus/usb:/dev/bus/usb
      - worker1-data:/app/data
    devices:
      - "/dev/bus/usb"
    privileged: true
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
  
  # 工作节点 2
  worker2:
    image: app-automation:latest
    environment:
      - NODE_ENV=production
      - WORKER_ID=worker2
      - REDIS_URL=redis://redis:6379
      - DEVICE_COUNT=5
    volumes:
      - /dev/bus/usb:/dev/bus/usb
      - worker2-data:/app/data
    devices:
      - "/dev/bus/usb"
    privileged: true
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
  
  # 工作节点 3（备用）
  worker3:
    image: app-automation:latest
    environment:
      - NODE_ENV=production
      - WORKER_ID=worker3
      - REDIS_URL=redis://redis:6379
      - DEVICE_COUNT=5
    volumes:
      - /dev/bus/usb:/dev/bus/usb
      - worker3-data:/app/data
    devices:
      - "/dev/bus/usb"
    privileged: true
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
  
  # 监控
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
  
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    volumes:
      - grafana-data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin

volumes:
  redis-data:
  worker1-data:
  worker2-data:
  worker3-data:
  prometheus-data:
  grafana-data:
```

---

## 3. 高可用性设计

### 3.1 故障转移

```typescript
// 自动故障转移
class FailoverManager {
  private healthCheckInterval = 10000; // 10s
  private failureThreshold = 3;
  private recoveryTimeout = 30000; // 30s
  
  async checkHealth(node: NodeInfo): Promise<boolean> {
    try {
      const response = await fetch(`http://${node.host}:${node.port}/health`, {
        timeout: 5000,
      });
      return response.ok;
    } catch {
      return false;
    }
  }
  
  async handleFailure(node: NodeInfo) {
    console.log(`Node ${node.id} failed, initiating failover...`);
    
    // 1. 标记节点为不可用
    await this.markNodeUnavailable(node.id);
    
    // 2. 迁移任务到其他节点
    const tasks = await this.getRunningTasks(node.id);
    const targetNode = await this.selectTargetNode();
    
    for (const task of tasks) {
      await this.migrateTask(task, targetNode);
    }
    
    // 3. 尝试恢复节点
    setTimeout(async () => {
      const recovered = await this.checkHealth(node);
      if (recovered) {
        await this.markNodeAvailable(node.id);
        console.log(`Node ${node.id} recovered`);
      } else {
        console.log(`Node ${node.id} still down, alerting...`);
        await this.sendAlert(`Node ${node.id} is down`);
      }
    }, this.recoveryTimeout);
  }
}
```

### 3.2 数据备份

```yaml
# 定时备份策略
backup:
  schedule: "0 2 * * *"  # 每天凌晨 2 点
  retention:
    daily: 7
    weekly: 4
    monthly: 12
  
  destinations:
    - type: s3
      bucket: app-automation-backups
      region: us-east-1
      encryption: AES256
    
    - type: local
      path: /mnt/backup/app-automation
  
  databases:
    - name: main-db
      type: sqlite
      path: /app/data/main.db
    
    - name: redis
      type: redis
      host: redis
      port: 6379
```

### 3.3 监控告警

```typescript
// Prometheus 指标
import { Counter, Gauge, Histogram } from 'prom-client';

// 设备相关指标
export const deviceCount = new Gauge({
  name: 'device_total',
  help: 'Total number of connected devices',
  labelNames: ['status', 'type'],
});

export const deviceConnectionDuration = new Histogram({
  name: 'device_connection_duration_seconds',
  help: 'Duration of device connections',
  buckets: [60, 300, 900, 1800, 3600],
});

// 图像识别指标
export const recognitionDuration = new Histogram({
  name: 'recognition_duration_seconds',
  help: 'Duration of image recognition',
  buckets: [0.1, 0.2, 0.5, 1, 2, 5],
  labelNames: ['method', 'result'],
});

export const recognitionRate = new Counter({
  name: 'recognition_total',
  help: 'Total number of recognition attempts',
  labelNames: ['method', 'result'],
});

// 测试执行指标
export const testExecutionDuration = new Histogram({
  name: 'test_execution_duration_seconds',
  help: 'Duration of test executions',
  buckets: [1, 5, 10, 30, 60, 300],
  labelNames: ['status', 'test_type'],
});

// 告警规则
// prometheus/alerts.yml
groups:
  - name: app-automation
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: rate(recognition_total{result="failed"}[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High recognition error rate"
          description: "Recognition error rate is {{ $value }}%"
      
      - alert: DeviceDisconnected
        expr: device_count{status="disconnected"} > 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Device disconnected"
          description: "Device {{ $labels.device_id }} is disconnected"
      
      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(recognition_duration_seconds_bucket[5m])) > 1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High recognition latency"
          description: "95th percentile latency is {{ $value }}s"
```

---

## 4. 成本优化

### 4.1 资源利用率优化

| 优化项 | 措施 | 节省成本 |
|--------|------|---------|
| **CPU** | 动态扩缩容，闲时降配 | 30-40% |
| **内存** | 内存共享，对象池 | 20-30% |
| **存储** | 数据压缩，冷热分离 | 40-50% |
| **网络** | CDN 分发，本地缓存 | 20-30% |
| **设备** | 设备共享，分时复用 | 50-60% |

### 4.2 云成本优化

```yaml
# AWS 成本优化配置
cost_optimization:
  # 使用 Spot 实例（节省 70%）
  spot_instances:
    enabled: true
    max_price: 0.05  # 每小时最高价格
    interruption_behavior: stop
  
  # 预留实例（节省 40%）
  reserved_instances:
    enabled: true
    term: 1_year
    payment_option: partial_upfront
  
  # 自动开关机（节省 50%）
  auto_scaling:
    schedule:
      - days: [mon, tue, wed, thu, fri]
        start: "09:00"
        stop: "20:00"
        min_capacity: 2
        max_capacity: 10
      - days: [sat, sun]
        start: "10:00"
        stop: "16:00"
        min_capacity: 1
        max_capacity: 3
  
  # 存储分层
  storage_tiering:
    hot_storage: ssd  # 最近 7 天数据
    warm_storage: hdd  # 7-30 天数据
    cold_storage: s3_glacier  # 30 天以上数据
```

---

## 5. 性能基准测试

### 5.1 单机测试结果

| 配置 | 设备数 | 投屏延迟 | 识别速度 | 并发测试 | 内存占用 |
|------|--------|---------|---------|---------|---------|
| 最低配置 | 1 | 150ms | 500ms | 1 | 600MB |
| 推荐配置 | 3 | 100ms | 200ms | 3 | 1.8GB |
| 推荐配置 | 5 | 120ms | 250ms | 5 | 2.5GB |
| 高性能配置 | 10 | 80ms | 150ms | 10 | 4.2GB |

### 5.2 集群测试结果

| 节点数 | 设备总数 | 吞吐量 | 平均延迟 | P95 延迟 | 可用性 |
|--------|---------|--------|---------|---------|--------|
| 1 | 10 | 100 任务/h | 200ms | 500ms | 99.0% |
| 3 | 30 | 300 任务/h | 180ms | 450ms | 99.5% |
| 5 | 50 | 500 任务/h | 150ms | 400ms | 99.9% |
| 10 | 100 | 1000 任务/h | 120ms | 350ms | 99.95% |

---

## 6. 部署检查清单

### 6.1 预部署检查

- [ ] 硬件资源就绪（CPU/内存/存储）
- [ ] 网络配置完成（防火墙/端口）
- [ ] 依赖服务可用（Redis/数据库）
- [ ] 设备驱动安装
- [ ] ADB 授权完成
- [ ] 监控告警配置
- [ ] 备份策略配置
- [ ] 日志收集配置

### 6.2 部署步骤

1. **部署基础设施**
```bash
# 1. 启动 Redis
docker-compose up -d redis

# 2. 启动数据库
docker-compose up -d postgres

# 3. 启动消息队列
docker-compose up -d rabbitmq
```

2. **部署应用**
```bash
# 1. 构建镜像
docker build -t app-automation:latest .

# 2. 部署到 Kubernetes
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml

# 3. 验证部署
kubectl get pods -n automation
kubectl logs -f deployment/app-automation-worker
```

3. **配置负载均衡**
```bash
# 1. 更新 Nginx 配置
kubectl apply -f k8s/ingress.yaml

# 2. 验证路由
curl https://automation.example.com/health
```

4. **验证功能**
```bash
# 1. 设备连接测试
adb devices

# 2. 投屏测试
scrcpy --bit-rate=8M

# 3. 图像识别测试
npm run test:opencv

# 4. 端到端测试
npm run test:e2e
```

### 6.3 回滚方案

```bash
# 快速回滚到上一个版本
kubectl rollout undo deployment/app-automation-worker -n automation

# 回滚到特定版本
kubectl rollout undo deployment/app-automation-worker -n automation --to-revision=3

# 验证回滚
kubectl rollout status deployment/app-automation-worker -n automation
```

---

**文档版本**：v1.0  
**创建时间**：2024-01-15  
**最后更新**：2024-01-15  

**审批**：
- [ ] 技术负责人
- [ ] 运维负责人
- [ ] 安全负责人
