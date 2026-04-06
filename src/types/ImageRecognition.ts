/**
 * 图像识别服务类型
 */
export enum ImageRecognitionServiceType {
    /** 本地 OpenCV 服务 */
    LOCAL = 'local',
    /** 远程 Worker 集群服务 */
    REMOTE = 'remote',
    /** 云服务 API */
    CLOUD = 'cloud',
}

/**
 * 图像识别服务配置
 */
export interface ImageRecognitionServiceConfig {
    /** 远程服务配置 */
    remote: {
        /** 服务器地址 */
        serverUrl: string;
        /** 默认阈值 */
        defaultThreshold: number;
        /** 默认超时（毫秒） */
        defaultTimeout: number;
        /** 最大重试次数 */
        maxRetries: number;
    };
    /** 本地服务配置 */
    local: {
        /** 默认阈值 */
        defaultThreshold: number;
        /** 默认超时（毫秒） */
        defaultTimeout: number;
        /** 最大重试次数 */
        maxRetries: number;
    };
    /** 云服务配置 */
    cloud: {
        /** API 密钥 */
        apiKey: string;
        /** API 密钥 */
        apiSecret: string;
        /** API 端点 */
        endpoint: string;
        /** 默认阈值 */
        defaultThreshold: number;
        /** 默认超时（毫秒） */
        defaultTimeout: number;
        /** 最大重试次数 */
        maxRetries: number;
    };
}

/**
 * 图像识别总体配置
 */
export interface ImageRecognitionConfig {
    /** 是否启用图像识别功能 */
    enabled: boolean;
    /** 使用的服务类型 */
    serviceType: ImageRecognitionServiceType;
    /** 各服务的具体配置 */
    services: ImageRecognitionServiceConfig;
    /** 降级服务列表（按优先级排序） */
    fallbackServices: ImageRecognitionServiceType[];
}

/**
 * 默认配置
 */
export const DEFAULT_IMAGE_RECOGNITION_CONFIG: ImageRecognitionConfig = {
    enabled: true,
    serviceType: ImageRecognitionServiceType.LOCAL,
    services: {
        remote: {
            serverUrl: 'ws://localhost:8765',
            defaultThreshold: 0.8,
            defaultTimeout: 30000,
            maxRetries: 3,
        },
        local: {
            defaultThreshold: 0.8,
            defaultTimeout: 30000,
            maxRetries: 0,
        },
        cloud: {
            apiKey: '',
            apiSecret: '',
            endpoint: '',
            defaultThreshold: 0.8,
            defaultTimeout: 10000,
            maxRetries: 1,
        },
    },
    fallbackServices: [
        ImageRecognitionServiceType.LOCAL,
        ImageRecognitionServiceType.CLOUD,
    ],
};
