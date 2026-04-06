import { imageRecognitionFacade } from './facade';
import { ServiceType } from './factory';
import { RecognitionRequest, RecognitionResult, ServiceStatus } from './types';
import type { ImageRecognitionConfig } from '../../../src/types/ImageRecognition';

/**
 * 配置并初始化图像识别服务
 * @param config 可选的自定义配置，如果不传则使用默认配置
 */
export const setupImageRecognition = async (config?: ImageRecognitionConfig) => {
    if (!config) {
        // 使用默认配置
        config = {
            enabled: true,
            serviceType: 'local',
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
            fallbackServices: ['local', 'cloud'],
        } as ImageRecognitionConfig;
    }
    
    // 如果未启用，则不初始化
    if (!config.enabled) {
        console.log('[ImageRecognition] Service is disabled');
        return;
    }
    
    // 类型转换函数
    const toServiceType = (type: string): ServiceType => {
        return ServiceType[type.toUpperCase() as keyof typeof ServiceType];
    };
    
    // 设置主服务
    const primaryServiceConfig = (config.services as any)[config.serviceType];
    imageRecognitionFacade.setPrimaryService(toServiceType(config.serviceType), {
        name: config.serviceType,
        enabled: true,
        defaultThreshold: primaryServiceConfig.defaultThreshold,
        defaultTimeout: primaryServiceConfig.defaultTimeout,
        maxRetries: primaryServiceConfig.maxRetries,
        fallback: config.fallbackServices[0],
        options: {
            ...(config.serviceType === 'remote' && { serverUrl: primaryServiceConfig.serverUrl }),
            ...(config.serviceType === 'cloud' && {
                apiKey: primaryServiceConfig.apiKey,
                apiSecret: primaryServiceConfig.apiSecret,
                endpoint: primaryServiceConfig.endpoint,
            }),
        },
    });
    
    // 添加降级服务
    for (const fallbackType of config.fallbackServices) {
        if (fallbackType !== config.serviceType) {
            const fallbackConfig = (config.services as any)[fallbackType];
            imageRecognitionFacade.addFallbackService(toServiceType(fallbackType), {
                name: fallbackType,
                enabled: true,
                defaultThreshold: fallbackConfig.defaultThreshold,
                defaultTimeout: fallbackConfig.defaultTimeout,
                maxRetries: fallbackConfig.maxRetries,
                options: {
                    ...(fallbackType === 'remote' && { serverUrl: fallbackConfig.serverUrl }),
                    ...(fallbackType === 'cloud' && {
                        apiKey: fallbackConfig.apiKey,
                        apiSecret: fallbackConfig.apiSecret,
                        endpoint: fallbackConfig.endpoint,
                    }),
                },
            });
        }
    }
    
    // 初始化所有服务
    await imageRecognitionFacade.initialize();
    
    console.log(`[ImageRecognition] Services initialized with ${config.serviceType} as primary`);
};

/**
 * 导出统一接口
 */
export const imageRecognition = {
    /**
     * 查找单个图像
     */
    async findImage(options: {
        deviceId: string;
        templatePath: string;
        threshold?: number;
        timeout?: number;
    }): Promise<RecognitionResult> {
        // 获取设备截图
        const screenshot = await window.$mapi.adb.screencap(options.deviceId);
        
        // 创建识别请求
        const request: RecognitionRequest = {
            deviceId: options.deviceId,
            screenshot,
            template: options.templatePath,
            threshold: options.threshold || 0.8,
            timeout: options.timeout || 30000,
            priority: 5,
        };
        
        // 执行识别
        const result = await imageRecognitionFacade.recognize(request);
        
        return result;
    },
    
    /**
     * 批量查找图像
     */
    async findImages(options: Array<{
        deviceId: string;
        templatePath: string;
        threshold?: number;
    }>): Promise<RecognitionResult[]> {
        const requests: RecognitionRequest[] = options.map(opt => ({
            deviceId: opt.deviceId,
            screenshot: Buffer.from([]), // 待填充
            template: opt.templatePath,
            threshold: opt.threshold || 0.8,
            timeout: 30000,
            priority: 5,
        }));
        
        // 获取所有截图
        for (let i = 0; i < requests.length; i++) {
            const screenshot = await window.$mapi.adb.screencap(requests[i].deviceId);
            requests[i].screenshot = screenshot;
        }
        
        // 批量识别
        const results = await imageRecognitionFacade.recognizeBatch(requests);
        
        return results.map((result, index) => ({
            deviceId: options[index].deviceId,
            ...result,
        }));
    },
    
    /**
     * 获取服务状态
     */
    async getServiceStatus(): Promise<ServiceStatus[]> {
        return await imageRecognitionFacade.getAllServiceStatus();
    },
    
    /**
     * 获取推荐服务
     */
    async getRecommendedService(): Promise<string | null> {
        return imageRecognitionFacade.getRecommendedService();
    },
    
    /**
     * 动态切换主服务
     */
    async switchService(serviceType: ServiceType, config?: Partial<typeof ServiceType>): Promise<void> {
        const defaultConfig = {
            name: serviceType,
            enabled: true,
            defaultThreshold: 0.8,
            defaultTimeout: 30000,
            maxRetries: 3,
        };
        
        imageRecognitionFacade.setPrimaryService(serviceType, { ...defaultConfig, ...config });
        await imageRecognitionFacade.initialize();
        
        console.log(`[ImageRecognition] Switched to ${serviceType} service`);
    },
    
    /**
     * 销毁服务
     */
    async destroy(): Promise<void> {
        await imageRecognitionFacade.destroy();
    },
};

export { ServiceType };
export type { RecognitionRequest, RecognitionResult, ServiceStatus };
