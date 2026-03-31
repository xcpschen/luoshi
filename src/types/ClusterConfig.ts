// src/types/ClusterConfig.ts

/**
 * 部署模式
 */
export enum EnumDeployMode {
    STANDALONE = 'standalone',      // 单机部署
    DISTRIBUTED = 'distributed',    // 分布式部署
    CLUSTER = 'cluster',            // 集群部署
}

/**
 * 服务器角色
 */
export enum EnumServerRole {
    COORDINATOR = 'coordinator',    // 协调器
    WORKER = 'worker',              // 工作节点
    LOAD_BALANCER = 'load_balancer', // 负载均衡器
    REDIS = 'redis',                // Redis 中间件
}

/**
 * 服务器状态
 */
export enum EnumServerStatus {
    ONLINE = 'online',
    OFFLINE = 'offline',
    ERROR = 'error',
}

/**
 * 工作节点配置
 */
export interface WorkerNodeConfig {
    id: string;
    name: string;
    host: string;
    port: number;
    role: EnumServerRole.WORKER;
    gpuCount: number;
    enabled: boolean;
    weight?: number;  // 负载均衡权重
}

/**
 * 协调器配置
 */
export interface CoordinatorConfig {
    id: string;
    name: string;
    host: string;
    port: number;
    role: EnumServerRole.COORDINATOR;
    enabled: boolean;
    isPrimary: boolean;  // 是否为主协调器
}

/**
 * 负载均衡器配置
 */
export interface LoadBalancerConfig {
    id: string;
    name: string;
    host: string;
    port: number;
    role: EnumServerRole.LOAD_BALANCER;
    enabled: boolean;
    algorithm: 'round_robin' | 'least_connections' | 'ip_hash' | 'weighted';
    healthCheckInterval?: number;  // 健康检查间隔（秒）
    healthCheckTimeout?: number;   // 健康检查超时（毫秒）
}

/**
 * Redis 中间件配置
 */
export interface RedisConfig {
    id: string;
    name: string;
    host: string;
    port: number;
    role: EnumServerRole.REDIS;
    enabled: boolean;
    password?: string;
    database?: number;
    clusterMode?: boolean;
    nodes?: Array<{ host: string; port: number }>;
}

/**
 * 服务器配置联合类型
 */
export type ServerConfig = WorkerNodeConfig | CoordinatorConfig | LoadBalancerConfig | RedisConfig;

/**
 * 服务器状态信息
 */
export interface ServerStatusInfo {
    id: string;
    status: EnumServerStatus;
    lastSeen?: Date;
    responseTime?: number;
    activeConnections?: number;
    cpuUsage?: number;
    memoryUsage?: number;
    gpuUsage?: number;
    error?: string;
}

/**
 * 集群配置
 */
export interface ClusterConfig {
    deployMode: EnumDeployMode;
    deployModeName: string;
    
    // 协调器配置列表
    coordinators: CoordinatorConfig[];
    
    // 工作节点配置列表
    workers: WorkerNodeConfig[];
    
    // 负载均衡器配置（集群模式使用）
    loadBalancers: LoadBalancerConfig[];
    
    // Redis 中间件配置（集群模式使用）
    redis?: RedisConfig;
    
    // 高级配置
    advanced: {
        // 任务队列配置
        taskQueue: {
            maxSize: number;
            retryTimes: number;
            timeout: number;
        };
        
        // 并发控制
        concurrency: {
            maxConcurrentTasks: number;
            maxTasksPerWorker: number;
        };
        
        // 故障转移
        failover: {
            enabled: boolean;
            maxRetries: number;
            retryDelay: number;
        };
        
        // 日志配置
        logging: {
            level: 'debug' | 'info' | 'warn' | 'error';
            enableAudit: boolean;
        };
    };
    
    // 更新时间
    updatedAt?: Date;
}

/**
 * 集群状态
 */
export interface ClusterStatus {
    deployMode: EnumDeployMode;
    totalNodes: number;
    onlineNodes: number;
    offlineNodes: number;
    
    // 各角色状态
    coordinators: ServerStatusInfo[];
    workers: ServerStatusInfo[];
    loadBalancers: ServerStatusInfo[];
    redis?: ServerStatusInfo;
    
    // 整体统计
    statistics: {
        totalTasks: number;
        activeTasks: number;
        queuedTasks: number;
        failedTasks: number;
        avgResponseTime: number;
        totalGpuCount: number;
        availableGpuCount: number;
    };
    
    // 健康状态
    health: {
        status: 'healthy' | 'degraded' | 'unhealthy';
        message?: string;
    };
}
