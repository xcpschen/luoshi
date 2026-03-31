/**
 * 批量操作服务
 * 提供多设备并发操作能力
 */

import {
    EnumBatchOperationType,
    EnumBatchOperationStatus,
    BatchOperationRecord,
    BatchOperationTask,
    BatchOperationResult,
    BatchOperationProgressEvent,
    BatchFileUploadParams,
    BatchFileDeleteParams,
    BatchAppInstallParams,
    BatchAppUninstallParams,
    BatchOperationConfig,
    DEFAULT_BATCH_OPERATION_CONFIG,
} from '../types/BatchOperation';
import type { DeviceUnifiedRecord } from '../types/DeviceUnified';

/**
 * 批量操作服务类
 */
export class BatchOperationService {
    private static runningOperations: Map<string, BatchOperationRecord> = new Map();
    private static operationListeners: Map<string, Array<(event: BatchOperationProgressEvent) => void>> = new Map();
    private static abortControllers: Map<string, AbortController> = new Map();

    /**
     * 创建批量操作记录
     */
    static createOperation(
        operationType: EnumBatchOperationType,
        operationName: string,
        devices: DeviceUnifiedRecord[],
        config: BatchOperationConfig = DEFAULT_BATCH_OPERATION_CONFIG
    ): BatchOperationRecord {
        const operationId = crypto.randomUUID();
        const now = new Date();

        const tasks: BatchOperationTask[] = devices.map(device => ({
            taskId: crypto.randomUUID(),
            deviceId: device.unifiedId,
            device,
            operationType,
            status: EnumBatchOperationStatus.PENDING,
            progress: 0,
        }));

        const operation: BatchOperationRecord = {
            operationId,
            operationType,
            operationName,
            tasks,
            status: EnumBatchOperationStatus.PENDING,
            progress: 0,
            successCount: 0,
            failureCount: 0,
            cancelledCount: 0,
            totalCount: devices.length,
            createdAt: now,
        };

        this.runningOperations.set(operationId, operation);
        this.abortControllers.set(operationId, new AbortController());

        return operation;
    }

    /**
     * 执行批量文件上传
     */
    static async executeFileUpload(
        params: BatchFileUploadParams,
        config: BatchOperationConfig = DEFAULT_BATCH_OPERATION_CONFIG
    ): Promise<BatchOperationResult> {
        const operation = this.createOperation(
            EnumBatchOperationType.FILE_UPLOAD,
            '批量文件上传',
            params.devices,
            config
        );

        this.emitProgress(operation.operationId, {
            operationId: operation.operationId,
            progress: 0,
            status: EnumBatchOperationStatus.RUNNING,
            message: '开始批量上传文件...',
        });

        operation.startedAt = new Date();
        operation.status = EnumBatchOperationStatus.RUNNING;

        try {
            // 并发执行上传任务
            await this.executeTasks(operation, async (task) => {
                // 检查是否取消
                if (this.abortControllers.get(operation.operationId)?.signal.aborted) {
                    task.status = EnumBatchOperationStatus.CANCELLED;
                    operation.cancelledCount++;
                    return;
                }

                task.status = EnumBatchOperationStatus.RUNNING;
                task.startedAt = new Date();

                try {
                    // 逐个上传文件
                    for (let i = 0; i < params.filePaths.length; i++) {
                        const filePath = params.filePaths[i];
                        
                        // 调用 ADB 推送文件
                        await window.$mapi.adb.push(
                            task.deviceId,
                            filePath,
                            params.targetPath
                        );

                        // 更新进度
                        task.progress = Math.round(((i + 1) / params.filePaths.length) * 100);
                        this.emitProgress(operation.operationId, {
                            operationId: operation.operationId,
                            taskId: task.taskId,
                            progress: task.progress,
                            status: EnumBatchOperationStatus.RUNNING,
                            message: `上传文件 ${i + 1}/${params.filePaths.length}: ${filePath}`,
                        });
                    }

                    task.status = EnumBatchOperationStatus.SUCCESS;
                    task.result = { uploadedCount: params.filePaths.length };
                } catch (error: any) {
                    task.status = EnumBatchOperationStatus.FAILED;
                    task.error = error.message || '上传失败';
                    throw error;
                }

                task.completedAt = new Date();
            }, config);

            // 更新总体状态
            this.updateOperationStatus(operation);

            this.emitProgress(operation.operationId, {
                operationId: operation.operationId,
                progress: operation.progress,
                status: operation.status,
                message: `批量上传完成：成功 ${operation.successCount}/${operation.totalCount}`,
            });
        } catch (error: any) {
            operation.status = EnumBatchOperationStatus.FAILED;
            this.emitProgress(operation.operationId, {
                operationId: operation.operationId,
                progress: operation.progress,
                status: EnumBatchOperationStatus.FAILED,
                message: `批量上传失败：${error.message}`,
            });
        }

        operation.completedAt = new Date();
        return this.getOperationResult(operation.operationId);
    }

    /**
     * 执行批量文件删除
     */
    static async executeFileDelete(
        params: BatchFileDeleteParams,
        config: BatchOperationConfig = DEFAULT_BATCH_OPERATION_CONFIG
    ): Promise<BatchOperationResult> {
        const operation = this.createOperation(
            EnumBatchOperationType.FILE_DELETE,
            '批量删除文件',
            params.devices,
            config
        );

        this.emitProgress(operation.operationId, {
            operationId: operation.operationId,
            progress: 0,
            status: EnumBatchOperationStatus.RUNNING,
            message: '开始批量删除文件...',
        });

        operation.startedAt = new Date();
        operation.status = EnumBatchOperationStatus.RUNNING;

        try {
            await this.executeTasks(operation, async (task) => {
                if (this.abortControllers.get(operation.operationId)?.signal.aborted) {
                    task.status = EnumBatchOperationStatus.CANCELLED;
                    operation.cancelledCount++;
                    return;
                }

                task.status = EnumBatchOperationStatus.RUNNING;
                task.startedAt = new Date();

                try {
                    for (let i = 0; i < params.filePaths.length; i++) {
                        const filePath = params.filePaths[i];
                        
                        await window.$mapi.adb.shell(
                            task.deviceId,
                            `rm ${params.force ? '-f' : ''} "${filePath}"`
                        );

                        task.progress = Math.round(((i + 1) / params.filePaths.length) * 100);
                        this.emitProgress(operation.operationId, {
                            operationId: operation.operationId,
                            taskId: task.taskId,
                            progress: task.progress,
                            status: EnumBatchOperationStatus.RUNNING,
                            message: `删除文件 ${i + 1}/${params.filePaths.length}: ${filePath}`,
                        });
                    }

                    task.status = EnumBatchOperationStatus.SUCCESS;
                    task.result = { deletedCount: params.filePaths.length };
                } catch (error: any) {
                    task.status = EnumBatchOperationStatus.FAILED;
                    task.error = error.message || '删除失败';
                    throw error;
                }

                task.completedAt = new Date();
            }, config);

            this.updateOperationStatus(operation);

            this.emitProgress(operation.operationId, {
                operationId: operation.operationId,
                progress: operation.progress,
                status: operation.status,
                message: `批量删除完成：成功 ${operation.successCount}/${operation.totalCount}`,
            });
        } catch (error: any) {
            operation.status = EnumBatchOperationStatus.FAILED;
            this.emitProgress(operation.operationId, {
                operationId: operation.operationId,
                progress: operation.progress,
                status: EnumBatchOperationStatus.FAILED,
                message: `批量删除失败：${error.message}`,
            });
        }

        operation.completedAt = new Date();
        return this.getOperationResult(operation.operationId);
    }

    /**
     * 执行批量应用安装
     */
    static async executeAppInstall(
        params: BatchAppInstallParams,
        config: BatchOperationConfig = DEFAULT_BATCH_OPERATION_CONFIG
    ): Promise<BatchOperationResult> {
        const operation = this.createOperation(
            EnumBatchOperationType.APP_INSTALL,
            '批量安装应用',
            params.devices,
            config
        );

        this.emitProgress(operation.operationId, {
            operationId: operation.operationId,
            progress: 0,
            status: EnumBatchOperationStatus.RUNNING,
            message: '开始批量安装应用...',
        });

        operation.startedAt = new Date();
        operation.status = EnumBatchOperationStatus.RUNNING;

        try {
            await this.executeTasks(operation, async (task) => {
                if (this.abortControllers.get(operation.operationId)?.signal.aborted) {
                    task.status = EnumBatchOperationStatus.CANCELLED;
                    operation.cancelledCount++;
                    return;
                }

                task.status = EnumBatchOperationStatus.RUNNING;
                task.startedAt = new Date();

                try {
                    for (let i = 0; i < params.apkPaths.length; i++) {
                        const apkPath = params.apkPaths[i];
                        
                        const args = ['install'];
                        if (params.replace) args.push('-r');
                        if (params.allowDowngrade) args.push('-d');
                        args.push(apkPath);

                        await window.$mapi.adb.install(task.deviceId, apkPath);

                        task.progress = Math.round(((i + 1) / params.apkPaths.length) * 100);
                        this.emitProgress(operation.operationId, {
                            operationId: operation.operationId,
                            taskId: task.taskId,
                            progress: task.progress,
                            status: EnumBatchOperationStatus.RUNNING,
                            message: `安装应用 ${i + 1}/${params.apkPaths.length}: ${apkPath}`,
                        });
                    }

                    task.status = EnumBatchOperationStatus.SUCCESS;
                    task.result = { installedCount: params.apkPaths.length };
                } catch (error: any) {
                    task.status = EnumBatchOperationStatus.FAILED;
                    task.error = error.message || '安装失败';
                    throw error;
                }

                task.completedAt = new Date();
            }, config);

            this.updateOperationStatus(operation);

            this.emitProgress(operation.operationId, {
                operationId: operation.operationId,
                progress: operation.progress,
                status: operation.status,
                message: `批量安装完成：成功 ${operation.successCount}/${operation.totalCount}`,
            });
        } catch (error: any) {
            operation.status = EnumBatchOperationStatus.FAILED;
            this.emitProgress(operation.operationId, {
                operationId: operation.operationId,
                progress: operation.progress,
                status: EnumBatchOperationStatus.FAILED,
                message: `批量安装失败：${error.message}`,
            });
        }

        operation.completedAt = new Date();
        return this.getOperationResult(operation.operationId);
    }

    /**
     * 执行批量应用卸载
     */
    static async executeAppUninstall(
        params: BatchAppUninstallParams,
        config: BatchOperationConfig = DEFAULT_BATCH_OPERATION_CONFIG
    ): Promise<BatchOperationResult> {
        const operation = this.createOperation(
            EnumBatchOperationType.APP_UNINSTALL,
            '批量卸载应用',
            params.devices,
            config
        );

        this.emitProgress(operation.operationId, {
            operationId: operation.operationId,
            progress: 0,
            status: EnumBatchOperationStatus.RUNNING,
            message: '开始批量卸载应用...',
        });

        operation.startedAt = new Date();
        operation.status = EnumBatchOperationStatus.RUNNING;

        try {
            await this.executeTasks(operation, async (task) => {
                if (this.abortControllers.get(operation.operationId)?.signal.aborted) {
                    task.status = EnumBatchOperationStatus.CANCELLED;
                    operation.cancelledCount++;
                    return;
                }

                task.status = EnumBatchOperationStatus.RUNNING;
                task.startedAt = new Date();

                try {
                    for (let i = 0; i < params.packageNames.length; i++) {
                        const packageName = params.packageNames[i];
                        
                        await window.$mapi.adb.uninstall(
                            task.deviceId,
                            packageName,
                            params.keepData
                        );

                        task.progress = Math.round(((i + 1) / params.packageNames.length) * 100);
                        this.emitProgress(operation.operationId, {
                            operationId: operation.operationId,
                            taskId: task.taskId,
                            progress: task.progress,
                            status: EnumBatchOperationStatus.RUNNING,
                            message: `卸载应用 ${i + 1}/${params.packageNames.length}: ${packageName}`,
                        });
                    }

                    task.status = EnumBatchOperationStatus.SUCCESS;
                    task.result = { uninstalledCount: params.packageNames.length };
                } catch (error: any) {
                    task.status = EnumBatchOperationStatus.FAILED;
                    task.error = error.message || '卸载失败';
                    throw error;
                }

                task.completedAt = new Date();
            }, config);

            this.updateOperationStatus(operation);

            this.emitProgress(operation.operationId, {
                operationId: operation.operationId,
                progress: operation.progress,
                status: operation.status,
                message: `批量卸载完成：成功 ${operation.successCount}/${operation.totalCount}`,
            });
        } catch (error: any) {
            operation.status = EnumBatchOperationStatus.FAILED;
            this.emitProgress(operation.operationId, {
                operationId: operation.operationId,
                progress: operation.progress,
                status: EnumBatchOperationStatus.FAILED,
                message: `批量卸载失败：${error.message}`,
            });
        }

        operation.completedAt = new Date();
        return this.getOperationResult(operation.operationId);
    }

    /**
     * 执行任务队列（支持并发控制）
     */
    private static async executeTasks(
        operation: BatchOperationRecord,
        taskExecutor: (task: BatchOperationTask) => Promise<void>,
        config: BatchOperationConfig
    ): Promise<void> {
        const queue = [...operation.tasks];
        const running = new Set<BatchOperationTask>();
        const errors: string[] = [];

        return new Promise((resolve, reject) => {
            const processNext = async () => {
                if (queue.length === 0 && running.size === 0) {
                    if (errors.length > 0 && !config.continueOnError) {
                        reject(new Error(errors[0]));
                    } else {
                        resolve();
                    }
                    return;
                }

                while (running.size < config.maxConcurrency && queue.length > 0) {
                    const task = queue.shift()!;
                    running.add(task);

                    this.executeWithRetry(task, taskExecutor, config)
                        .catch(error => {
                            errors.push(`设备 ${task.deviceId}: ${error.message}`);
                            if (!config.continueOnError) {
                                reject(error);
                            }
                        })
                        .finally(() => {
                            running.delete(task);
                            this.updateOperationProgress(operation);
                            processNext();
                        });
                }
            };

            processNext();
        });
    }

    /**
     * 执行任务（支持重试）
     */
    private static async executeWithRetry(
        task: BatchOperationTask,
        executor: (task: BatchOperationTask) => Promise<void>,
        config: BatchOperationConfig
    ): Promise<void> {
        let lastError: Error;

        for (let i = 0; i <= config.retryCount; i++) {
            try {
                await executor(task);
                return;
            } catch (error: any) {
                lastError = error;
                
                if (i < config.retryCount) {
                    await this.sleep(config.retryInterval);
                }
            }
        }

        throw lastError!;
    }

    /**
     * 更新操作状态
     */
    private static updateOperationStatus(operation: BatchOperationRecord): void {
        const successCount = operation.tasks.filter(t => t.status === EnumBatchOperationStatus.SUCCESS).length;
        const failedCount = operation.tasks.filter(t => t.status === EnumBatchOperationStatus.FAILED).length;
        const cancelledCount = operation.tasks.filter(t => t.status === EnumBatchOperationStatus.CANCELLED).length;

        operation.successCount = successCount;
        operation.failureCount = failedCount;
        operation.cancelledCount = cancelledCount;

        if (failedCount === 0 && cancelledCount === 0) {
            operation.status = EnumBatchOperationStatus.SUCCESS;
        } else if (successCount === 0 && cancelledCount === 0) {
            operation.status = EnumBatchOperationStatus.FAILED;
        } else {
            operation.status = EnumBatchOperationStatus.SUCCESS; // 部分成功
        }
    }

    /**
     * 更新操作进度
     */
    private static updateOperationProgress(operation: BatchOperationRecord): void {
        const totalProgress = operation.tasks.reduce((sum, task) => sum + task.progress, 0);
        operation.progress = Math.round(totalProgress / operation.tasks.length);
    }

    /**
     * 获取操作结果
     */
    static getOperationResult(operationId: string): BatchOperationResult {
        const operation = this.runningOperations.get(operationId);
        if (!operation) {
            throw new Error(`操作 ${operationId} 不存在`);
        }

        const errors = operation.tasks
            .filter(t => t.status === EnumBatchOperationStatus.FAILED)
            .map(t => `${t.deviceId}: ${t.error}`);

        return {
            operationId,
            success: operation.status === EnumBatchOperationStatus.SUCCESS,
            successCount: operation.successCount,
            failureCount: operation.failureCount,
            cancelledCount: operation.cancelledCount,
            totalCount: operation.totalCount,
            successRate: Math.round((operation.successCount / operation.totalCount) * 100),
            tasks: operation.tasks,
            errors: errors.length > 0 ? errors : undefined,
        };
    }

    /**
     * 取消操作
     */
    static cancelOperation(operationId: string): void {
        const controller = this.abortControllers.get(operationId);
        if (controller) {
            controller.abort();
            
            const operation = this.runningOperations.get(operationId);
            if (operation) {
                operation.status = EnumBatchOperationStatus.CANCELLED;
                operation.tasks.forEach(task => {
                    if (task.status === EnumBatchOperationStatus.PENDING) {
                        task.status = EnumBatchOperationStatus.CANCELLED;
                        operation.cancelledCount++;
                    }
                });
            }

            this.emitProgress(operationId, {
                operationId,
                progress: 0,
                status: EnumBatchOperationStatus.CANCELLED,
                message: '操作已取消',
            });
        }
    }

    /**
     * 注册进度监听器
     */
    static onProgress(
        operationId: string,
        listener: (event: BatchOperationProgressEvent) => void
    ): void {
        if (!this.operationListeners.has(operationId)) {
            this.operationListeners.set(operationId, []);
        }
        this.operationListeners.get(operationId)!.push(listener);
    }

    /**
     * 移除进度监听器
     */
    static offProgress(
        operationId: string,
        listener: (event: BatchOperationProgressEvent) => void
    ): void {
        const listeners = this.operationListeners.get(operationId);
        if (listeners) {
            const index = listeners.indexOf(listener);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    /**
     * 发送进度事件
     */
    private static emitProgress(operationId: string, event: BatchOperationProgressEvent): void {
        const listeners = this.operationListeners.get(operationId) || [];
        listeners.forEach(listener => {
            try {
                listener(event);
            } catch (error) {
                console.error('发送进度事件失败:', error);
            }
        });
    }

    /**
     * 延迟函数
     */
    private static sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 获取所有运行中的操作
     */
    static getRunningOperations(): BatchOperationRecord[] {
        return Array.from(this.runningOperations.values());
    }

    /**
     * 清理已完成的操作
     */
    static cleanupFinishedOperations(): void {
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24 小时

        for (const [operationId, operation] of this.runningOperations.entries()) {
            if (operation.completedAt) {
                const age = now - operation.completedAt.getTime();
                if (age > maxAge) {
                    this.runningOperations.delete(operationId);
                    this.operationListeners.delete(operationId);
                    this.abortControllers.delete(operationId);
                }
            }
        }
    }
}
