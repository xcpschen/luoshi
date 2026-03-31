// electron/mapi/clusterConfig/main.ts

import { ipcMain } from 'electron';
import Database from 'better-sqlite3';
import type {
    ClusterConfig,
    ClusterStatus,
    EnumDeployMode,
    ServerConfig,
    ServerStatusInfo,
    EnumServerStatus,
    WorkerNodeConfig,
    CoordinatorConfig,
    LoadBalancerConfig,
    RedisConfig,
} from '../../src/types/ClusterConfig';
import { WebSocket } from 'ws';

let db: Database.Database | null = null;

// 立即注册 IPC 处理器（不需要等待初始化）
function ensureDbInitialized() {
    if (!db) {
        console.error('[ClusterConfig] Database not initialized - please call init() first');
    }
    return !!db;
}

// 默认集群配置
const defaultClusterConfig: ClusterConfig = {
    deployMode: 'standalone',
    deployModeName: '单机部署',
    coordinators: [],
    workers: [],
    loadBalancers: [],
    advanced: {
        taskQueue: {
            maxSize: 1000,
            retryTimes: 3,
            timeout: 30000,
        },
        concurrency: {
            maxConcurrentTasks: 10,
            maxTasksPerWorker: 5,
        },
        failover: {
            enabled: true,
            maxRetries: 3,
            retryDelay: 1000,
        },
        logging: {
            level: 'info',
            enableAudit: true,
        },
    },
};

// 注册 IPC 处理器
function registerIpcHandlers() {
    console.log('[ClusterConfig] Registering IPC handlers');
    
    // 获取集群配置
    ipcMain.handle('cluster-config:get', async (): Promise<ClusterConfig> => {
        ensureDbInitialized();
        return getClusterConfig();
    });

    // 保存集群配置
    ipcMain.handle('cluster-config:save', async (_, config: ClusterConfig) => {
        ensureDbInitialized();
        return saveClusterConfig(config);
    });

    // 获取集群状态
    ipcMain.handle('cluster-status:get', async (): Promise<ClusterStatus> => {
        ensureDbInitialized();
        return getClusterStatus();
    });

    // 添加服务器节点
    ipcMain.handle('cluster-node:add', async (_, node: ServerConfig) => {
        ensureDbInitialized();
        return addServerNode(node);
    });

    // 更新服务器节点
    ipcMain.handle('cluster-node:update', async (_, node: ServerConfig) => {
        ensureDbInitialized();
        return updateServerNode(node);
    });

    // 删除服务器节点
    ipcMain.handle('cluster-node:delete', async (_, nodeId: string) => {
        ensureDbInitialized();
        return deleteServerNode(nodeId);
    });

    // 获取所有服务器节点
    ipcMain.handle('cluster-node:list', async () => {
        ensureDbInitialized();
        return getAllServerNodes();
    });

    // 测试服务器连接
    ipcMain.handle('cluster-node:test', async (_, node: ServerConfig) => {
        ensureDbInitialized();
        return testServerConnection(node);
    });
    
    console.log('[ClusterConfig] IPC handlers registered');
}

// 获取集群配置
function getClusterConfig(): ClusterConfig {
    if (!db) return defaultClusterConfig;

    try {
        // 从数据库读取配置
        const stmt = db.prepare('SELECT config_key, config_value FROM cluster_config');
        const rows = stmt.all() as Array<{ config_key: string; config_value: string }>;

        if (rows.length === 0) {
            return defaultClusterConfig;
        }

        // 解析配置
        const configMap: Record<string, any> = {};
        rows.forEach(row => {
            configMap[row.config_key] = JSON.parse(row.config_value);
        });

        // 获取服务器节点
        const workers = getAllServerNodesByRole('worker') as WorkerNodeConfig[];
        const coordinators = getAllServerNodesByRole('coordinator') as CoordinatorConfig[];
        const loadBalancers = getAllServerNodesByRole('load_balancer') as LoadBalancerConfig[];
        const redis = getAllServerNodesByRole('redis')[0] as RedisConfig | undefined;

        return {
            deployMode: configMap.deployMode || 'standalone',
            deployModeName: configMap.deployModeName || '单机部署',
            coordinators,
            workers,
            loadBalancers,
            redis,
            advanced: configMap.advanced || defaultClusterConfig.advanced,
            updatedAt: configMap.updatedAt ? new Date(configMap.updatedAt) : undefined,
        };
    } catch (error) {
        console.error('Failed to get cluster config:', error);
        return defaultClusterConfig;
    }
}

// 保存集群配置
function saveClusterConfig(config: ClusterConfig): boolean {
    if (!db) return false;

    try {
        const insert = db.prepare(`
            INSERT OR REPLACE INTO cluster_config (config_key, config_value, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
        `);

        // 保存基本配置
        insert.run('deployMode', JSON.stringify(config.deployMode));
        insert.run('deployModeName', JSON.stringify(config.deployModeName));
        insert.run('advanced', JSON.stringify(config.advanced));

        // 保存服务器节点
        config.workers.forEach(worker => addServerNode(worker));
        config.coordinators.forEach(coordinator => addServerNode(coordinator));
        config.loadBalancers.forEach(lb => addServerNode(lb));
        if (config.redis) {
            addServerNode(config.redis);
        }

        console.log('Cluster config saved successfully');
        return true;
    } catch (error) {
        console.error('Failed to save cluster config:', error);
        return false;
    }
}

// 获取集群状态
async function getClusterStatus(): Promise<ClusterStatus> {
    const config = getClusterConfig();
    
    // 测试所有节点的连接状态
    const coordinatorStatuses = await Promise.all(
        config.coordinators.map(c => testNodeStatus(c))
    );
    
    const workerStatuses = await Promise.all(
        config.workers.map(w => testNodeStatus(w))
    );
    
    const lbStatuses = await Promise.all(
        config.loadBalancers.map(lb => testNodeStatus(lb))
    );

    const onlineCount = [
        ...coordinatorStatuses,
        ...workerStatuses,
        ...lbStatuses,
    ].filter(s => s.status === EnumServerStatus.ONLINE).length;

    const totalGpu = config.workers.reduce((sum, w) => sum + w.gpuCount, 0);
    
    return {
        deployMode: config.deployMode,
        totalNodes: config.coordinators.length + config.workers.length + config.loadBalancers.length + (config.redis ? 1 : 0),
        onlineNodes: onlineCount,
        offlineNodes: onlineCount - ([...coordinatorStatuses, ...workerStatuses, ...lbStatuses].length),
        coordinators: coordinatorStatuses,
        workers: workerStatuses,
        loadBalancers: lbStatuses,
        redis: config.redis ? await testNodeStatus(config.redis) : undefined,
        statistics: {
            totalTasks: 0,
            activeTasks: 0,
            queuedTasks: 0,
            failedTasks: 0,
            avgResponseTime: 0,
            totalGpuCount: totalGpu,
            availableGpuCount: totalGpu,
        },
        health: {
            status: onlineCount > 0 ? 'healthy' : 'unhealthy',
            message: onlineCount > 0 ? undefined : 'No online nodes',
        },
    };
}

// 测试节点状态
async function testNodeStatus(node: ServerConfig): Promise<ServerStatusInfo> {
    const startTime = Date.now();
    
    try {
        // 简单的 HTTP 健康检查（假设服务器提供健康检查端点）
        const response = await fetch(`http://${node.host}:${node.port}/health`, {
            method: 'GET',
            timeout: 3000,
        });

        if (response.ok) {
            return {
                id: node.id,
                status: EnumServerStatus.ONLINE,
                lastSeen: new Date(),
                responseTime: Date.now() - startTime,
            };
        } else {
            return {
                id: node.id,
                status: EnumServerStatus.ERROR,
                lastSeen: new Date(),
                responseTime: Date.now() - startTime,
                error: `HTTP ${response.status}`,
            };
        }
    } catch (error) {
        return {
            id: node.id,
            status: EnumServerStatus.OFFLINE,
            lastSeen: new Date(),
            error: (error as Error).message,
        };
    }
}

// 添加服务器节点
function addServerNode(node: ServerConfig): boolean {
    if (!db) {
        console.error('Database not initialized');
        return false;
    }

    try {
        console.log('Adding server node:', node);
        
        // 验证必填字段
        if (!node.id || !node.name || !node.role || !node.host || !node.port) {
            console.error('Missing required fields:', { 
                id: !!node.id, 
                name: !!node.name, 
                role: !!node.role, 
                host: !!node.host, 
                port: !!node.port 
            });
            return false;
        }

        const insert = db.prepare(`
            INSERT OR REPLACE INTO server_node (id, name, role, host, port, enabled, config_json, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `);

        const configJson = JSON.stringify(node);
        console.log('Config JSON:', configJson);

        insert.run(
            node.id,
            node.name,
            node.role,
            node.host,
            node.port,
            node.enabled ? 1 : 0,
            configJson
        );

        console.log('Server node added successfully:', node.id);
        return true;
    } catch (error) {
        console.error('Failed to add server node:', error);
        console.error('Error details:', {
            message: (error as Error).message,
            stack: (error as Error).stack,
            node: node
        });
        return false;
    }
}

// 更新服务器节点
function updateServerNode(node: ServerConfig): boolean {
    return addServerNode(node);
}

// 删除服务器节点
function deleteServerNode(nodeId: string): boolean {
    if (!db) return false;

    try {
        const del = db.prepare('DELETE FROM server_node WHERE id = ?');
        del.run(nodeId);
        return true;
    } catch (error) {
        console.error('Failed to delete server node:', error);
        return false;
    }
}

// 获取所有服务器节点
function getAllServerNodes(): ServerConfig[] {
    if (!db) return [];

    try {
        const stmt = db.prepare('SELECT * FROM server_node ORDER BY role, name');
        const rows = stmt.all() as any[];
        return rows.map(row => JSON.parse(row.config_json) as ServerConfig);
    } catch (error) {
        console.error('Failed to get server nodes:', error);
        return [];
    }
}

// 按角色获取服务器节点
function getAllServerNodesByRole(role: string): ServerConfig[] {
    if (!db) return [];

    try {
        const stmt = db.prepare('SELECT * FROM server_node WHERE role = ? ORDER BY name');
        const rows = stmt.all(role) as any[];
        return rows.map(row => JSON.parse(row.config_json) as ServerConfig);
    } catch (error) {
        console.error('Failed to get server nodes by role:', error);
        return [];
    }
}

// 测试服务器连接
async function testServerConnection(node: ServerConfig): Promise<{ success: boolean; message: string }> {
    try {
        const startTime = Date.now();
        const response = await fetch(`http://${node.host}:${node.port}/health`, {
            method: 'GET',
            timeout: 5000,
        });

        const responseTime = Date.now() - startTime;

        if (response.ok) {
            return {
                success: true,
                message: `连接成功，响应时间：${responseTime}ms`,
            };
        } else {
            return {
                success: false,
                message: `HTTP 错误：${response.status}`,
            };
        }
    } catch (error) {
        return {
            success: false,
            message: `连接失败：${(error as Error).message}`,
        };
    }
}

// 初始化函数，接收数据库实例
export default {
    init: (database: Database.Database) => {
        console.log('[ClusterConfig] init called with database:', !!database);
        db = database;
        if (db) {
            registerIpcHandlers();
        } else {
            console.error('[ClusterConfig] No database provided');
        }
    },
};
