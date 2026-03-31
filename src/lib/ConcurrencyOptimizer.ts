/**
 * 并发执行优化器
 * 优化多设备并发执行性能
 */

import { EventEmitter } from 'events';

/**
 * 任务优先级
 */
export enum TaskPriority {
    LOW = 0,
    NORMAL = 1,
    HIGH = 2,
    URGENT = 3,
}

/**
 * 任务状态
 */
export enum TaskStatus {
    PENDING = 'pending',
    RUNNING = 'running',
    COMPLETED = 'completed',
    FAILED = 'failed',
    CANCELLED = 'cancelled',
}

/**
 * 任务接口
 */
export interface Task<T = any> {
    /** 任务 ID */
    id: string;
    /** 任务名称 */
    name: string;
    /** 任务优先级 */
    priority: TaskPriority;
    /** 任务状态 */
    status: TaskStatus;
    /** 执行函数 */
    executor: () => Promise<T>;
    /** 重试次数 */
    retryCount: number;
    /** 最大重试次数 */
    maxRetries: number;
    /** 超时时间 */
    timeout: number;
    /** 创建时间 */
    createdAt: number;
    /** 开始时间 */
    startedAt?: number;
    /** 完成时间 */
    completedAt?: number;
    /** 错误信息 */
    error?: string;
    /** 结果 */
    result?: T;
}

/**
 * 并发配置
 */
export interface ConcurrencyConfig {
    /** 最大并发数 */
    maxConcurrency: number;
    /** 任务超时时间 */
    taskTimeout: number;
    /** 是否启用优先级队列 */
    enablePriorityQueue: boolean;
    /** 是否启用任务重试 */
    enableRetry: boolean;
    /** 重试间隔 */
    retryInterval: number;
}

/**
 * 并发执行优化器
 */
export class ConcurrencyOptimizer extends EventEmitter {
    private runningTasks: Map<string, Task> = new Map();
    private pendingQueue: Task[] = [];
    private config: ConcurrencyConfig;
    private activeCount: number = 0;
    private totalCompleted: number = 0;
    private totalFailed: number = 0;

    constructor(config: Partial<ConcurrencyConfig> = {}) {
        super();
        this.config = {
            maxConcurrency: config.maxConcurrency || 10,
            taskTimeout: config.taskTimeout || 30000, // 30 秒
            enablePriorityQueue: config.enablePriorityQueue !== false,
            enableRetry: config.enableRetry !== false,
            retryInterval: config.retryInterval || 1000,
        };
    }

    /**
     * 添加任务
     */
    addTask<T>(
        name: string,
        executor: () => Promise<T>,
        priority: TaskPriority = TaskPriority.NORMAL,
        maxRetries: number = 1,
        timeout: number = this.config.taskTimeout
    ): string {
        const taskId = this.generateTaskId();
        const task: Task<T> = {
            id: taskId,
            name,
            priority,
            status: TaskStatus.PENDING,
            executor,
            retryCount: 0,
            maxRetries,
            timeout,
            createdAt: Date.now(),
        };

        if (this.config.enablePriorityQueue) {
            // 按优先级插入队列
            this.insertByPriority(task);
        } else {
            this.pendingQueue.push(task);
        }

        // 尝试启动任务
        this.processQueue();

        return taskId;
    }

    /**
     * 取消任务
     */
    cancelTask(taskId: string): boolean {
        // 取消等待中的任务
        const pendingIndex = this.pendingQueue.findIndex(t => t.id === taskId);
        if (pendingIndex > -1) {
            this.pendingQueue[pendingIndex].status = TaskStatus.CANCELLED;
            this.pendingQueue.splice(pendingIndex, 1);
            this.emit('taskCancelled', taskId);
            return true;
        }

        // 取消运行中的任务
        const runningTask = this.runningTasks.get(taskId);
        if (runningTask) {
            runningTask.status = TaskStatus.CANCELLED;
            this.emit('taskCancelled', taskId);
            return true;
        }

        return false;
    }

    /**
     * 获取任务状态
     */
    getTaskStatus(taskId: string): TaskStatus | undefined {
        const pendingTask = this.pendingQueue.find(t => t.id === taskId);
        if (pendingTask) {
            return pendingTask.status;
        }

        const runningTask = this.runningTasks.get(taskId);
        if (runningTask) {
            return runningTask.status;
        }

        return undefined;
    }

    /**
     * 获取统计信息
     */
    getStats(): {
        running: number;
        pending: number;
        completed: number;
        failed: number;
        cancelled: number;
        activeCount: number;
    } {
        return {
            running: this.runningTasks.size,
            pending: this.pendingQueue.length,
            completed: this.totalCompleted,
            failed: this.totalFailed,
            cancelled: this.pendingQueue.filter(t => t.status === TaskStatus.CANCELLED).length,
            activeCount: this.activeCount,
        };
    }

    /**
     * 清空所有任务
     */
    clear(): void {
        // 取消所有等待中的任务
        this.pendingQueue.forEach(task => {
            task.status = TaskStatus.CANCELLED;
        });
        this.pendingQueue = [];

        // 取消所有运行中的任务
        this.runningTasks.forEach(task => {
            task.status = TaskStatus.CANCELLED;
        });
        this.runningTasks.clear();

        this.activeCount = 0;
    }

    /**
     * 设置最大并发数
     */
    setMaxConcurrency(count: number): void {
        this.config.maxConcurrency = count;
        this.processQueue();
    }

    /**
     * 获取最大并发数
     */
    getMaxConcurrency(): number {
        return this.config.maxConcurrency;
    }

    /**
     * 处理任务队列
     */
    private async processQueue(): Promise<void> {
        while (this.activeCount < this.config.maxConcurrency && this.pendingQueue.length > 0) {
            const task = this.pendingQueue.shift();
            if (task && task.status !== TaskStatus.CANCELLED) {
                this.executeTask(task);
            }
        }
    }

    /**
     * 执行任务
     */
    private async executeTask<T>(task: Task<T>): Promise<void> {
        this.runningTasks.set(task.id, task);
        this.activeCount++;
        task.status = TaskStatus.RUNNING;
        task.startedAt = Date.now();

        this.emit('taskStarted', task.id);

        try {
            // 设置超时
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error(`任务超时 (${task.timeout}ms)`)), task.timeout);
            });

            // 执行任务
            const result = await Promise.race([task.executor(), timeoutPromise]);

            task.status = TaskStatus.COMPLETED;
            task.result = result;
            task.completedAt = Date.now();
            this.totalCompleted++;

            this.emit('taskCompleted', task.id, result);
        } catch (error: any) {
            task.error = error.message;

            // 重试逻辑
            if (this.config.enableRetry && task.retryCount < task.maxRetries) {
                task.retryCount++;
                task.status = TaskStatus.PENDING;
                
                this.emit('taskRetry', task.id, task.retryCount);
                
                // 延迟后重新加入队列
                setTimeout(() => {
                    this.pendingQueue.unshift(task);
                    this.processQueue();
                }, this.config.retryInterval);
            } else {
                task.status = TaskStatus.FAILED;
                task.completedAt = Date.now();
                this.totalFailed++;

                this.emit('taskFailed', task.id, error);
            }
        } finally {
            this.runningTasks.delete(task.id);
            this.activeCount--;

            // 继续处理队列
            this.processQueue();
        }
    }

    /**
     * 按优先级插入任务
     */
    private insertByPriority(task: Task): void {
        let inserted = false;
        for (let i = 0; i < this.pendingQueue.length; i++) {
            if (task.priority > this.pendingQueue[i].priority) {
                this.pendingQueue.splice(i, 0, task);
                inserted = true;
                break;
            }
        }
        if (!inserted) {
            this.pendingQueue.push(task);
        }
    }

    /**
     * 生成任务 ID
     */
    private generateTaskId(): string {
        return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

/**
 * 设备并发管理器
 * 专门用于管理多设备并发操作
 */
export class DeviceConcurrencyManager {
    private optimizer: ConcurrencyOptimizer;
    private deviceTasks: Map<string, string[]> = new Map(); // deviceId -> taskIds

    constructor(maxConcurrency: number = 10) {
        this.optimizer = new ConcurrencyOptimizer({
            maxConcurrency,
            taskTimeout: 60000, // 设备操作默认 60 秒超时
            enablePriorityQueue: true,
            enableRetry: true,
        });
    }

    /**
     * 添加设备任务
     */
    addDeviceTask<T>(
        deviceId: string,
        name: string,
        executor: () => Promise<T>,
        priority: TaskPriority = TaskPriority.NORMAL
    ): string {
        const taskId = this.optimizer.addTask(name, executor, priority);

        // 记录设备任务关联
        if (!this.deviceTasks.has(deviceId)) {
            this.deviceTasks.set(deviceId, []);
        }
        this.deviceTasks.get(deviceId)!.push(taskId);

        return taskId;
    }

    /**
     * 取消设备的所有任务
     */
    cancelDeviceTasks(deviceId: string): void {
        const taskIds = this.deviceTasks.get(deviceId) || [];
        taskIds.forEach(taskId => {
            this.optimizer.cancelTask(taskId);
        });
        this.deviceTasks.delete(deviceId);
    }

    /**
     * 获取设备任务状态
     */
    getDeviceTaskStats(deviceId: string): {
        total: number;
        running: number;
        pending: number;
        completed: number;
    } {
        const taskIds = this.deviceTasks.get(deviceId) || [];
        const stats = {
            total: taskIds.length,
            running: 0,
            pending: 0,
            completed: 0,
        };

        taskIds.forEach(taskId => {
            const status = this.optimizer.getTaskStatus(taskId);
            if (status === TaskStatus.RUNNING) stats.running++;
            else if (status === TaskStatus.PENDING) stats.pending++;
            else if (status === TaskStatus.COMPLETED) stats.completed++;
        });

        return stats;
    }

    /**
     * 获取优化器统计
     */
    getStats() {
        return this.optimizer.getStats();
    }

    /**
     * 设置最大并发数
     */
    setMaxConcurrency(count: number): void {
        this.optimizer.setMaxConcurrency(count);
    }
}

/**
 * 单例并发优化器
 */
export const defaultConcurrencyOptimizer = new ConcurrencyOptimizer({
    maxConcurrency: 10,
    taskTimeout: 30000,
    enablePriorityQueue: true,
    enableRetry: true,
});
