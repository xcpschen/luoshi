# 部署应用清单

> 📦 详细说明单机和集群部署模式下的应用交付清单

---

## 📊 总览

| 部署模式 | 应用数量 | 适用场景 | 运维复杂度 |
|---------|---------|---------|-----------|
| **单机版** | 1 个 | 开发测试、小规模使用 | ⭐ 低 |
| **集群版** | 6-8 个 | 生产环境、高并发场景 | ⭐⭐⭐⭐ 高 |

---

## 🖥️ 单机部署模式

### 应用架构

```
┌─────────────────────────────────────┐
│       Electron 桌面应用              │
│  ┌──────────────────────────────┐   │
│  │  主进程 (Main Process)        │   │
│  │  - 设备管理                   │   │
│  │  - scrcpy 服务                │   │
│  │  - 图像识别                   │   │
│  │  - 任务调度                   │   │
│  └──────────────────────────────┘   │
│  ┌──────────────────────────────┐   │
│  │  渲染进程 (Renderer)          │   │
│  │  - Vue 3 界面                 │   │
│  │  - 投屏显示                   │   │
│  │  - 操作编排                   │   │
│  └──────────────────────────────┘   │
│  ┌──────────────────────────────┐   │
│  │  内置服务                     │   │
│  │  - SQLite 数据库              │   │
│  │  - Redis (可选)               │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

### 交付应用清单

| # | 应用/组件 | 形式 | 说明 | 必选 |
|---|----------|------|------|------|
| 1 | **Electron 主应用** | `.dmg` / `.exe` / `.AppImage` | 桌面客户端，包含所有功能 | ✅ |
| 2 | **scrcpy-server** | `.jar` (内置) | Android 端投屏服务 | ✅ |
| 3 | **ADB 工具** | 二进制文件 (内置) | Android 设备管理 | ✅ |
| 4 | **OpenCV.js** | npm 包 (内置) | 图像识别引擎 | ✅ |
| 5 | **SQLite** | 原生模块 (内置) | 本地数据库 | ✅ |
| 6 | **Redis** | 可选安装 | 任务队列（可禁用） | ⭕ |

### 应用详情

#### 1. Electron 主应用

**交付物**：
```
dist/
├── EasyLinkAndroid-1.0.0.dmg           # macOS
├── EasyLinkAndroid-1.0.0.exe           # Windows
├── EasyLinkAndroid-1.0.0.AppImage      # Linux
└── EasyLinkAndroid-1.0.0.deb           # Debian/Ubuntu
```

**大小**：约 150-200MB

**包含内容**：
- Electron 运行时 (~100MB)
- Node.js 运行时 (~30MB)
- 应用代码 (~10MB)
- scrcpy-server (~5MB)
- ADB 工具 (~3MB)
- OpenCV.js (~7.5MB)
- 其他依赖 (~15MB)

**安装方式**：
```bash
# macOS
open EasyLinkAndroid-1.0.0.dmg

# Windows
EasyLinkAndroid-1.0.0.exe

# Linux
sudo dpkg -i EasyLinkAndroid-1.0.0.deb
```

**启动方式**：
```bash
# 图形界面启动
# 双击应用图标

# 命令行启动（可选）
/Applications/EasyLinkAndroid.app/Contents/MacOS/EasyLinkAndroid
```

#### 2. scrcpy-server

**位置**：内置在 Electron 应用中
**路径**：`/Resources/scrcpy/scrcpy-server.jar`
**大小**：~5MB
**版本**：v2.4

**自动部署**：
```typescript
// Electron 主进程自动推送到 Android 设备
await adb.push('/path/to/scrcpy-server.jar', '/data/local/tmp/scrcpy-server.jar');
await adb.shell(['CLASSPATH=/data/local/tmp/scrcpy-server.jar', 'app_process', '/', 'com.genymobile.scrcpy.ScrcpyServer']);
```

#### 3. ADB 工具

**位置**：内置在 Electron 应用中
**路径**：`/Resources/adb/`
**包含**：
- `adb` / `adb.exe` - ADB 主程序
- `AdbWinApi.dll` (Windows)
- `usb_driver/` - USB 驱动

**自动配置**：
```typescript
// 应用启动时自动配置 ADB 路径
const adbPath = path.join(process.resourcesPath, 'adb', 'adb');
await Adb.setAdbPath(adbPath);
```

#### 4. OpenCV.js

**安装方式**：npm 包
**路径**：`node_modules/@techstark/opencv-js/`
**大小**：~7.5MB
**加载方式**：
```typescript
// 应用启动时预加载
import * as cv from '@techstark/opencv-js';
await cv.ready();
```

#### 5. SQLite 数据库

**位置**：用户数据目录
**路径**：
```
macOS: ~/Library/Application Support/EasyLinkAndroid/main.db
Windows: %APPDATA%/EasyLinkAndroid/main.db
Linux: ~/.config/EasyLinkAndroid/main.db
```

**自动初始化**：
```typescript
// 应用首次启动时创建数据库
const dbPath = path.join(app.getPath('userData'), 'main.db');
const db = new Database(dbPath);
await db.execute(migrationScript);
```

### 单机版资源占用

| 资源 | 空闲时 | 单设备运行时 | 多设备运行时 |
|------|--------|------------|------------|
| CPU | 2-5% | 15-25% | 40-60% |
| 内存 | 300-500MB | 600-900MB | 1.5-2.5GB |
| 磁盘 | 200MB | 50MB/h (录制) | 100MB/h (录制) |
| 网络 | - | 5-10Mbps | 20-50Mbps |

### 单机版部署检查清单

- [ ] 下载对应系统的安装包
- [ ] 安装 Electron 应用
- [ ] 连接 Android 设备（USB/WiFi）
- [ ] 授权 ADB 调试
- [ ] 启动应用
- [ ] 验证投屏功能
- [ ] 验证图像识别功能
- [ ] （可选）安装 Redis 服务

---

## 🌐 集群部署模式

### 应用架构

```
┌─────────────────────────────────────────────────────────┐
│                    用户访问层                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  Web 界面    │  │  桌面客户端  │  │  API 调用     │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                    负载均衡层                             │
│                    (Nginx / ALB)                         │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                    应用服务层                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  API Gateway│  │  Web Server │  │  WebSocket  │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                    任务调度层                             │
│              (Redis + BullMQ / RabbitMQ)                │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                   工作节点层                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  Worker 1   │  │  Worker 2   │  │  Worker N   │     │
│  │  (scrcpy)   │  │  (scrcpy)   │  │  (scrcpy)   │     │
│  │  10 设备     │  │  10 设备     │  │  10 设备     │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                    数据存储层                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Master    │  │  Replica 1  │  │  Replica 2  │     │
│  │  (SQLite/PG)│  │  (只读)     │  │  (只读)     │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
```

### 交付应用清单（6-8 个独立应用）

| # | 应用/服务 | 部署形式 | 说明 | 必选 | 副本数 |
|---|----------|---------|------|------|--------|
| 1 | **Web 前端** | Docker / Nginx | Vue 3 界面 | ✅ | 2-3 |
| 2 | **API Gateway** | Docker / Node.js | API 网关 | ✅ | 2-3 |
| 3 | **WebSocket 服务** | Docker / Node.js | 实时投屏推送 | ✅ | 2-3 |
| 4 | **Worker 节点** | Docker / Node.js | scrcpy + 图像识别 | ✅ | 3-N |
| 5 | **Redis** | Docker / 独立 | 消息队列 + 缓存 | ✅ | 1-3 |
| 6 | **数据库** | Docker / 独立 | SQLite/PostgreSQL | ✅ | 1-3 |
| 7 | **监控服务** | Docker | Prometheus + Grafana | ⭕ | 1 |
| 8 | **日志服务** | Docker | ELK / Loki | ⭕ | 1 |

### 应用详情

#### 1. Web 前端

**镜像名**：`registry.example.com/app-automation-web:latest`

**基础镜像**：`nginx:alpine`

**大小**：~50MB

**端口**：80

**部署配置**：
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-automation-web
spec:
  replicas: 2
  template:
    spec:
      containers:
      - name: web
        image: registry.example.com/app-automation-web:latest
        ports:
        - containerPort: 80
        resources:
          requests:
            cpu: "100m"
            memory: "128Mi"
          limits:
            cpu: "500m"
            memory: "512Mi"
```

**功能**：
- 设备管理界面
- 操作编排器
- 测试用例编辑
- 测试报告查看

#### 2. API Gateway

**镜像名**：`registry.example.com/app-automation-api:latest`

**基础镜像**：`node:20-alpine`

**大小**：~200MB

**端口**：3000

**部署配置**：
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-automation-api
spec:
  replicas: 2
  template:
    spec:
      containers:
      - name: api
        image: registry.example.com/app-automation-api:latest
        ports:
        - containerPort: 3000
        env:
        - name: REDIS_URL
          value: "redis://redis:6379"
        - name: DATABASE_URL
          value: "sqlite:/app/data/main.db"
        resources:
          requests:
            cpu: "500m"
            memory: "512Mi"
          limits:
            cpu: "2000m"
            memory: "2Gi"
```

**功能**：
- RESTful API
- 认证授权
- 请求限流
- 日志记录

#### 3. WebSocket 服务

**镜像名**：`registry.example.com/app-automation-ws:latest`

**基础镜像**：`node:20-alpine`

**大小**：~200MB

**端口**：3001

**部署配置**：
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-automation-ws
spec:
  replicas: 2
  template:
    spec:
      containers:
      - name: ws
        image: registry.example.com/app-automation-ws:latest
        ports:
        - containerPort: 3001
        env:
        - name: REDIS_URL
          value: "redis://redis:6379"
        resources:
          requests:
            cpu: "500m"
            memory: "512Mi"
          limits:
            cpu: "2000m"
            memory: "2Gi"
```

**功能**：
- 投屏视频流推送
- 实时状态同步
- 操作指令下发

#### 4. Worker 节点（核心）

**镜像名**：`registry.example.com/app-automation-worker:latest`

**基础镜像**：`node:20`

**大小**：~500MB

**端口**：3002

**部署配置**：
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-automation-worker
spec:
  replicas: 3  # 至少 3 个
  template:
    spec:
      containers:
      - name: worker
        image: registry.example.com/app-automation-worker:latest
        ports:
        - containerPort: 3002
        env:
        - name: REDIS_URL
          value: "redis://redis:6379"
        - name: DEVICE_COUNT
          value: "10"
        - name: WORKER_ID
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        volumeMounts:
        - name: usb-storage
          mountPath: /dev/bus/usb
        resources:
          requests:
            cpu: "2000m"
            memory: "4Gi"
          limits:
            cpu: "4000m"
            memory: "8Gi"
      volumes:
      - name: usb-storage
        hostPath:
          path: /dev/bus/usb
```

**功能**：
- scrcpy 投屏服务
- 图像识别（OpenCV）
- touch 事件执行
- 测试用例执行

**特殊要求**：
- 需要 USB 设备直通（`/dev/bus/usb`）
- 需要特权模式（`privileged: true`）
- 每个 Worker 管理 10 台 Android 设备

#### 5. Redis（消息队列）

**镜像名**：`redis:7-alpine`

**大小**：~30MB

**端口**：6379

**部署配置**：
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
spec:
  serviceName: redis
  replicas: 1
  template:
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        volumeMounts:
        - name: redis-data
          mountPath: /data
        resources:
          requests:
            cpu: "500m"
            memory: "1Gi"
          limits:
            cpu: "2000m"
            memory: "4Gi"
        command:
        - redis-server
        - --appendonly yes
        - --maxmemory 2gb
        - --maxmemory-policy allkeys-lru
  volumeClaimTemplates:
  - metadata:
      name: redis-data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
```

**功能**：
- 任务队列（BullMQ）
- 缓存（图像模板、会话）
- 发布订阅（状态同步）

#### 6. 数据库

**方案 A：SQLite（单机/小规模）**

**位置**：Worker 本地
**大小**：~100MB
**部署**：无需独立部署，Worker 内置

**方案 B：PostgreSQL（生产环境）**

**镜像名**：`postgres:15-alpine`

**大小**：~100MB

**端口**：5432

**部署配置**：
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres
  replicas: 1
  template:
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_DB
          value: "app_automation"
        - name: POSTGRES_USER
          value: "automation"
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: password
        volumeMounts:
        - name: postgres-data
          mountPath: /var/lib/postgresql/data
        resources:
          requests:
            cpu: "1000m"
            memory: "2Gi"
          limits:
            cpu: "4000m"
            memory: "8Gi"
  volumeClaimTemplates:
  - metadata:
      name: postgres-data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 50Gi
```

**功能**：
- 设备配置存储
- 测试用例存储
- 执行记录存储
- 图像模板元数据

#### 7. 监控服务（可选）

**Prometheus**

**镜像名**：`prom/prometheus:latest`

**大小**：~200MB

**端口**：9090

**功能**：指标收集、告警

**Grafana**

**镜像名**：`grafana/grafana:latest`

**大小**：~300MB

**端口**：3001

**功能**：可视化面板

#### 8. 日志服务（可选）

**方案 A：ELK Stack**
- Elasticsearch (~500MB)
- Logstash (~300MB)
- Kibana (~400MB)

**方案 B：Loki + Promtail**
- Loki (~200MB)
- Promtail (~50MB)

### 集群版资源需求（3 Worker 节点）

| 组件 | CPU | 内存 | 磁盘 | 网络 |
|------|-----|------|------|------|
| Web 前端 (x2) | 1 核 | 1GB | 1GB | 100Mbps |
| API Gateway (x2) | 2 核 | 2GB | 2GB | 500Mbps |
| WebSocket (x2) | 2 核 | 2GB | 2GB | 1Gbps |
| Worker (x3) | 12 核 | 24GB | 50GB | 2Gbps |
| Redis | 2 核 | 4GB | 10GB | 500Mbps |
| PostgreSQL | 4 核 | 8GB | 50GB | 500Mbps |
| 监控 | 2 核 | 4GB | 20GB | 100Mbps |
| **总计** | **25 核** | **45GB** | **135GB** | **4.7Gbps** |

### 集群版部署检查清单

- [ ] 准备 Kubernetes 集群（或 Docker Swarm）
- [ ] 构建所有 Docker 镜像
- [ ] 推送镜像到镜像仓库
- [ ] 配置存储卷（StorageClass）
- [ ] 配置 Secrets（数据库密码等）
- [ ] 部署 Redis
- [ ] 部署数据库
- [ ] 部署 Web 前端
- [ ] 部署 API Gateway
- [ ] 部署 WebSocket 服务
- [ ] 部署 Worker 节点（配置 USB 直通）
- [ ] （可选）部署监控服务
- [ ] （可选）部署日志服务
- [ ] 配置负载均衡（Ingress）
- [ ] 验证所有服务健康
- [ ] 连接 Android 设备到 Worker 节点
- [ ] 验证端到端功能

---

## 📊 对比总结

### 单机版 vs 集群版

| 维度 | 单机版 | 集群版 |
|------|--------|--------|
| **应用数量** | 1 个（Electron） | 6-8 个（微服务） |
| **部署复杂度** | ⭐ 简单 | ⭐⭐⭐⭐ 复杂 |
| **运维成本** | 低 | 高 |
| **设备支持** | 1-5 台 | 30-100+ 台 |
| **并发能力** | 低（单用户） | 高（多用户） |
| **可用性** | 单点故障 | 高可用（99.9%+） |
| **扩展性** | 差 | 优秀（弹性伸缩） |
| **资源利用率** | 低 | 高 |
| **适用场景** | 开发/测试/小团队 | 生产/企业级 |

### 交付物清单

#### 单机版交付物

```
deliverables/
├── EasyLinkAndroid-1.0.0.dmg           # macOS 安装包
├── EasyLinkAndroid-1.0.0.exe           # Windows 安装包
├── EasyLinkAndroid-1.0.0.AppImage      # Linux 安装包
├── EasyLinkAndroid-1.0.0.deb           # Debian/Ubuntu 安装包
└── README_安装说明.md
```

#### 集群版交付物

```
deliverables/
├── docker/
│   ├── Dockerfile.web                  # Web 前端镜像
│   ├── Dockerfile.api                  # API Gateway 镜像
│   ├── Dockerfile.ws                   # WebSocket 镜像
│   └── Dockerfile.worker               # Worker 节点镜像
├── k8s/
│   ├── namespace.yaml                  # 命名空间
│   ├── redis.yaml                      # Redis 部署
│   ├── postgres.yaml                   # 数据库部署
│   ├── web.yaml                        # Web 前端部署
│   ├── api.yaml                        # API Gateway 部署
│   ├── ws.yaml                         # WebSocket 部署
│   ├── worker.yaml                     # Worker 节点部署
│   ├── ingress.yaml                    # 负载均衡配置
│   ├── configmap.yaml                  # 配置文件
│   └── secrets.yaml                    # 密钥配置
├── docker-compose.yaml                 # 单机集群版（可选）
├── helm/
│   └── app-automation/                 # Helm Chart（可选）
│       ├── Chart.yaml
│       ├── values.yaml
│       └── templates/
└── README_部署说明.md
```

---

## 🎯 推荐方案

### 场景 1：个人开发者 / 小团队（<5 人）

**推荐**：单机版

**理由**：
- 部署简单，一键安装
- 无需运维成本
- 资源占用低
- 功能完整

### 场景 2：中型团队（5-20 人）

**推荐**：单机版 + Redis

**理由**：
- 支持并发访问
- 任务队列异步处理
- 仍保持较低复杂度

### 场景 3：企业级生产环境（>20 人）

**推荐**：集群版（3 Worker 起步）

**理由**：
- 高可用性
- 弹性伸缩
- 支持多设备并发
- 完善的监控告警

---

## 📝 版本命名规则

### 单机版

```
格式：v{主版本}.{次版本}.{修订版}-{平台}

示例：
- v1.0.0-macos
- v1.0.0-windows
- v1.0.0-linux
```

### 集群版

```
格式：v{主版本}.{次版本}.{修订版}

Docker 镜像标签：
- latest          # 最新稳定版
- 1.0.0           # 特定版本
- 1.0.x           # 最新补丁版

示例：
- registry.example.com/app-automation-worker:latest
- registry.example.com/app-automation-worker:1.0.0
```

---

**文档版本**：v1.0  
**创建时间**：2024-01-15  
**最后更新**：2024-01-15  

**审批**：
- [ ] 架构师
- [ ] 技术负责人
- [ ] 运维负责人
