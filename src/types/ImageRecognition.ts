/**
 * 图像识别服务相关类型定义
 * 采用解耦设计，方便替换不同的图像识别服务
 */

/**
 * 图像识别服务类型
 */
export enum EnumImageRecognitionServiceType {
    /** Airtest 服务 */
    AIRTEST = "airtest",
    /** OpenCV 服务 */
    OPENCV = "opencv",
    /** 自定义服务 */
    CUSTOM = "custom",
}

/**
 * 图像识别结果
 */
export interface ImageRecognitionResult {
    /** 是否找到匹配 */
    found: boolean;
    /** 匹配位置（左上角坐标） */
    position?: {
        x: number;
        y: number;
    };
    /** 匹配区域大小 */
    size?: {
        width: number;
        height: number;
    };
    /** 匹配置信度 (0-1) */
    confidence?: number;
    /** 识别耗时（毫秒） */
    duration?: number;
}

/**
 * 图像识别参数
 */
export interface ImageRecognitionParams {
    /** 目标图像路径或数据 */
    targetImage: string | Buffer;
    /** 识别区域（可选，默认全图） */
    region?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    /** 置信度阈值 (0-1，默认 0.8) */
    threshold?: number;
    /** 是否使用多尺度匹配 */
    multiScale?: boolean;
    /** 超时时间（毫秒） */
    timeout?: number;
}

/**
 * 触控操作类型
 */
export enum EnumTouchActionType {
    /** 点击 */
    TAP = "tap",
    /** 长按 */
    LONG_PRESS = "long_press",
    /** 滑动 */
    SWIPE = "swipe",
    /** 双击 */
    DOUBLE_TAP = "double_tap",
    /** 拖拽 */
    DRAG = "drag",
}

/**
 * 触控操作参数
 */
export interface TouchActionParams {
    /** 操作类型 */
    actionType: EnumTouchActionType;
    /** 坐标 */
    x?: number;
    y?: number;
    /** 持续时间（毫秒，用于长按） */
    duration?: number;
    /** 结束坐标（用于滑动/拖拽） */
    endX?: number;
    endY?: number;
    /** 步骤数（用于滑动，默认 10） */
    steps?: number;
}

/**
 * 文本输入参数
 */
export interface TextInputParams {
    /** 要输入的文本 */
    text: string;
    /** 是否清空现有内容 */
    clear?: boolean;
}

/**
 * 关键操作记录
 */
export interface AutomationAction {
    /** 操作 ID */
    id: string;
    /** 操作类型 */
    type: 'touch' | 'text' | 'wait' | 'assert';
    /** 操作参数 */
    params: TouchActionParams | TextInputParams | any;
    /** 关联的图像（可选） */
    image?: string;
    /** 操作描述 */
    description?: string;
    /** 延迟时间（毫秒） */
    delay?: number;
    /** 超时时间（毫秒） */
    timeout?: number;
    /** 重试次数 */
    retryCount?: number;
}

/**
 * 自动化脚本
 */
export interface AutomationScript {
    /** 脚本 ID */
    id: string;
    /** 脚本名称 */
    name: string;
    /** 脚本描述 */
    description?: string;
    /** 操作列表 */
    actions: AutomationAction[];
    /** 创建时间 */
    createdAt: Date;
    /** 更新时间 */
    updatedAt: Date;
    /** 标签 */
    tags?: string[];
    /** 版本 */
    version: string;
}

/**
 * 定时任务配置
 */
export interface ScheduledTask {
    /** 任务 ID */
    id: string;
    /** 任务名称 */
    name: string;
    /** 关联的脚本 ID */
    scriptId: string;
    /** 设备 ID 列表 */
    deviceIds: string[];
    /** Cron 表达式 */
    cronExpression: string;
    /** 是否启用 */
    enabled: boolean;
    /** 创建时间 */
    createdAt: Date;
    /** 上次执行时间 */
    lastExecutedAt?: Date;
    /** 下次执行时间 */
    nextExecutionAt?: Date;
    /** 执行次数 */
    executionCount: number;
}

/**
 * 操作频率限制配置
 */
export interface OperationRateLimit {
    /** 是否启用 */
    enabled: boolean;
    /** 每分钟最大操作次数 */
    maxOperationsPerMinute: number;
    /** 每小时最大操作次数 */
    maxOperationsPerHour: number;
    /** 每天最大操作次数 */
    maxOperationsPerDay: number;
}

/**
 * 图像识别服务接口
 */
export interface IImageRecognitionService {
    /**
     * 初始化服务
     */
    initialize(): Promise<void>;

    /**
     * 销毁服务
     */
    destroy(): Promise<void>;

    /**
     * 图像识别
     */
    recognize(params: ImageRecognitionParams): Promise<ImageRecognitionResult>;

    /**
     * 触控操作
     */
    touch(params: TouchActionParams): Promise<void>;

    /**
     * 文本输入
     */
    inputText(params: TextInputParams): Promise<void>;

    /**
     * 截图
     */
    screenshot(): Promise<Buffer>;

    /**
     * 获取服务类型
     */
    getServiceType(): EnumImageRecognitionServiceType;
}

/**
 * 图像识别服务配置
 */
export interface ImageRecognitionServiceConfig {
    /** 服务类型 */
    serviceType: EnumImageRecognitionServiceType;
    /** Airtest 配置 */
    airtest?: {
        /** Airtest 服务器地址 */
        serverUrl?: string;
        /** Airtest 端口 */
        port?: number;
        /** 是否使用本地服务 */
        useLocal?: boolean;
    };
    /** OpenCV 配置 */
    opencv?: {
        /** 是否使用 GPU 加速 */
        useCuda?: boolean;
        /** 匹配算法 */
        algorithm?: 'template' | 'feature' | 'orb';
    };
    /** 性能优化配置 */
    optimization?: {
        /** 是否启用缓存 */
        enableCache?: boolean;
        /** 缓存过期时间（毫秒） */
        cacheTTL?: number;
        /** 是否启用并发优化 */
        enableConcurrency?: boolean;
        /** 最大并发数 */
        maxConcurrency?: number;
    };
}

/**
 * 自动化任务执行结果
 */
export interface AutomationTaskResult {
    /** 任务 ID */
    taskId: string;
    /** 脚本 ID */
    scriptId: string;
    /** 设备 ID */
    deviceId: string;
    /** 是否成功 */
    success: boolean;
    /** 错误信息 */
    error?: string;
    /** 开始时间 */
    startedAt: Date;
    /** 完成时间 */
    completedAt: Date;
    /** 执行的操作数量 */
    actionCount: number;
    /** 成功的操作数量 */
    successActionCount: number;
    /** 日志 */
    logs?: string[];
}

/**
 * 默认配置
 */
export const DEFAULT_IMAGE_RECOGNITION_CONFIG: ImageRecognitionServiceConfig = {
    serviceType: EnumImageRecognitionServiceType.AIRTEST,
    airtest: {
        serverUrl: 'http://localhost',
        port: 12345,
        useLocal: true,
    },
    opencv: {
        useCuda: false,
        algorithm: 'template',
    },
    optimization: {
        enableCache: true,
        cacheTTL: 5 * 60 * 1000, // 5 分钟
        enableConcurrency: true,
        maxConcurrency: 5,
    },
};

export const DEFAULT_RATE_LIMIT: OperationRateLimit = {
    enabled: true,
    maxOperationsPerMinute: 60,
    maxOperationsPerHour: 1000,
    maxOperationsPerDay: 10000,
};
