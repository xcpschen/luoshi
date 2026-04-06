/**
 * 图像识别结果
 */
export interface RecognitionResult {
    /** 是否找到匹配 */
    found: boolean;
    /** 匹配度 (0-1) */
    confidence: number;
    /** X 坐标 */
    x?: number;
    /** Y 坐标 */
    y?: number;
    /** 匹配区域宽度 */
    width?: number;
    /** 匹配区域高度 */
    height?: number;
    /** 识别耗时 (ms) */
    responseTime?: number;
    /** 使用的识别引擎 */
    engine?: string;
    /** 错误信息 */
    error?: string;
}

/**
 * 图像识别请求
 */
export interface RecognitionRequest {
    /** 设备 ID */
    deviceId: string;
    /** 截图数据（Base64 或 Buffer） */
    screenshot: string | Buffer;
    /** 模板图像路径或数据 */
    template: string | Buffer;
    /** 匹配阈值 (0-1) */
    threshold: number;
    /** 超时时间 (ms) */
    timeout: number;
    /** 优先级 (1-10) */
    priority: number;
    /** 额外参数 */
    extra?: Record<string, any>;
}

/**
 * 图像识别服务配置
 */
export interface RecognitionServiceConfig {
    /** 服务名称 */
    name: string;
    /** 是否启用 */
    enabled: boolean;
    /** 默认阈值 */
    defaultThreshold: number;
    /** 默认超时 */
    defaultTimeout: number;
    /** 最大重试次数 */
    maxRetries: number;
    /** 降级策略 */
    fallback?: string;
    /** 服务特定配置 */
    options?: Record<string, any>;
}

/**
 * 服务状态
 */
export interface ServiceStatus {
    /** 服务名称 */
    name: string;
    /** 是否可用 */
    available: boolean;
    /** 当前负载 (0-100) */
    load: number;
    /** 平均响应时间 (ms) */
    avgResponseTime: number;
    /** 成功率 (0-100) */
    successRate: number;
    /** 总请求数 */
    totalRequests: number;
    /** 失败请求数 */
    failedRequests: number;
    /** 额外信息 */
    extra?: Record<string, any>;
}

/**
 * 图像识别服务接口（抽象）
 */
export interface IImageRecognitionService {
    /**
     * 服务名称
     */
    readonly name: string;
    
    /**
     * 服务是否可用
     */
    isAvailable(): Promise<boolean>;
    
    /**
     * 执行图像识别
     * @param request 识别请求
     * @returns 识别结果
     */
    recognize(request: RecognitionRequest): Promise<RecognitionResult>;
    
    /**
     * 批量图像识别
     * @param requests 识别请求列表
     * @returns 识别结果列表
     */
    recognizeBatch(requests: RecognitionRequest[]): Promise<RecognitionResult[]>;
    
    /**
     * 初始化服务
     */
    initialize(): Promise<void>;
    
    /**
     * 销毁服务
     */
    destroy(): Promise<void>;
    
    /**
     * 获取服务状态
     */
    getStatus(): Promise<ServiceStatus>;
}
