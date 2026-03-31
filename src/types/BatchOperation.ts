/**
 * 批量操作相关类型定义
 */

import type { DeviceUnifiedRecord } from './DeviceUnified';

/**
 * 批量操作类型
 */
export enum EnumBatchOperationType {
    /** 文件上传 */
    FILE_UPLOAD = "file_upload",
    /** 文件删除 */
    FILE_DELETE = "file_delete",
    /** 应用安装 */
    APP_INSTALL = "app_install",
    /** 应用卸载 */
    APP_UNINSTALL = "app_uninstall",
}

/**
 * 批量操作状态
 */
export enum EnumBatchOperationStatus {
    /** 等待中 */
    PENDING = "pending",
    /** 进行中 */
    RUNNING = "running",
    /** 成功 */
    SUCCESS = "success",
    /** 失败 */
    FAILED = "failed",
    /** 已取消 */
    CANCELLED = "cancelled",
}

/**
 * 单个设备的操作任务
 */
export interface BatchOperationTask {
    /** 任务 ID */
    taskId: string;
    /** 设备 ID */
    deviceId: string;
    /** 设备信息 */
    device?: DeviceUnifiedRecord;
    /** 操作类型 */
    operationType: EnumBatchOperationType;
    /** 任务状态 */
    status: EnumBatchOperationStatus;
    /** 进度 (0-100) */
    progress: number;
    /** 错误信息 */
    error?: string;
    /** 结果数据 */
    result?: any;
    /** 开始时间 */
    startedAt?: Date;
    /** 完成时间 */
    completedAt?: Date;
}

/**
 * 批量操作记录
 */
export interface BatchOperationRecord {
    /** 操作 ID */
    operationId: string;
    /** 操作类型 */
    operationType: EnumBatchOperationType;
    /** 操作名称 */
    operationName: string;
    /** 操作描述 */
    description?: string;
    /** 任务列表 */
    tasks: BatchOperationTask[];
    /** 总体状态 */
    status: EnumBatchOperationStatus;
    /** 总体进度 (0-100) */
    progress: number;
    /** 成功数量 */
    successCount: number;
    /** 失败数量 */
    failureCount: number;
    /** 取消数量 */
    cancelledCount: number;
    /** 总数量 */
    totalCount: number;
    /** 创建时间 */
    createdAt: Date;
    /** 开始时间 */
    startedAt?: Date;
    /** 完成时间 */
    completedAt?: Date;
    /** 创建者 */
    createdBy?: string;
}

/**
 * 文件上传参数
 */
export interface BatchFileUploadParams {
    /** 设备列表 */
    devices: DeviceUnifiedRecord[];
    /** 文件路径列表 */
    filePaths: string[];
    /** 目标路径 */
    targetPath: string;
    /** 是否覆盖已存在文件 */
    overwrite?: boolean;
}

/**
 * 文件删除参数
 */
export interface BatchFileDeleteParams {
    /** 设备列表 */
    devices: DeviceUnifiedRecord[];
    /** 文件路径列表 */
    filePaths: string[];
    /** 是否强制删除 */
    force?: boolean;
}

/**
 * 应用安装参数
 */
export interface BatchAppInstallParams {
    /** 设备列表 */
    devices: DeviceUnifiedRecord[];
    /** APK 文件路径列表 */
    apkPaths: string[];
    /** 是否替换已安装应用 */
    replace?: boolean;
    /** 是否允许降级安装 */
    allowDowngrade?: boolean;
}

/**
 * 应用卸载参数
 */
export interface BatchAppUninstallParams {
    /** 设备列表 */
    devices: DeviceUnifiedRecord[];
    /** 应用包名列表 */
    packageNames: string[];
    /** 是否保留数据 */
    keepData?: boolean;
}

/**
 * 批量操作结果
 */
export interface BatchOperationResult {
    /** 操作 ID */
    operationId: string;
    /** 是否成功 */
    success: boolean;
    /** 成功数量 */
    successCount: number;
    /** 失败数量 */
    failureCount: number;
    /** 取消数量 */
    cancelledCount: number;
    /** 总数量 */
    totalCount: number;
    /** 成功率 */
    successRate: number;
    /** 任务详情 */
    tasks: BatchOperationTask[];
    /** 错误信息 */
    errors?: string[];
}

/**
 * 批量操作进度事件
 */
export interface BatchOperationProgressEvent {
    /** 操作 ID */
    operationId: string;
    /** 任务 ID */
    taskId?: string;
    /** 总体进度 */
    progress: number;
    /** 任务进度 */
    taskProgress?: number;
    /** 状态 */
    status: EnumBatchOperationStatus;
    /** 消息 */
    message?: string;
}

/**
 * 批量操作配置
 */
export interface BatchOperationConfig {
    /** 最大并发数 */
    maxConcurrency: number;
    /** 超时时间（毫秒） */
    timeout: number;
    /** 失败后是否继续 */
    continueOnError: boolean;
    /** 自动重试次数 */
    retryCount: number;
    /** 重试间隔（毫秒） */
    retryInterval: number;
}

/**
 * 默认配置
 */
export const DEFAULT_BATCH_OPERATION_CONFIG: BatchOperationConfig = {
    maxConcurrency: 5, // 最多同时操作 5 个设备
    timeout: 5 * 60 * 1000, // 5 分钟超时
    continueOnError: true, // 失败后继续
    retryCount: 1, // 失败后重试 1 次
    retryInterval: 1000, // 重试间隔 1 秒
};
