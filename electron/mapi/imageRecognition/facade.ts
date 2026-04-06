import {
    IImageRecognitionService,
    RecognitionRequest,
    RecognitionResult,
    RecognitionServiceConfig,
    ServiceStatus,
} from './types';
import { ImageRecognitionServiceFactory, ServiceType } from './factory';

/**
 * 图像识别外观类（统一入口）
 */
export class ImageRecognitionFacade {
    private primaryService: IImageRecognitionService | null = null;
    private fallbackServices: IImageRecognitionService[] = [];
    private serviceStats: Map<string, ServiceStatus> = new Map();
    
    /**
     * 设置主服务
     */
    setPrimaryService(type: ServiceType, config: RecognitionServiceConfig): void {
        const service = ImageRecognitionServiceFactory.createService(type, config);
        this.primaryService = service;
    }
    
    /**
     * 添加降级服务
     */
    addFallbackService(type: ServiceType, config: RecognitionServiceConfig): void {
        const service = ImageRecognitionServiceFactory.createService(type, config);
        this.fallbackServices.push(service);
    }
    
    /**
     * 初始化所有服务
     */
    async initialize(): Promise<void> {
        const services: IImageRecognitionService[] = [];
        
        if (this.primaryService) {
            services.push(this.primaryService);
        }
        
        services.push(...this.fallbackServices);
        
        for (const service of services) {
            try {
                await service.initialize();
            } catch (error) {
                console.error(`[ImageRecognitionFacade] Failed to initialize service ${service.name}:`, error);
            }
        }
    }
    
    /**
     * 执行图像识别（带降级）
     */
    async recognize(request: RecognitionRequest): Promise<RecognitionResult> {
        const servicesToTry = [
            this.primaryService,
            ...this.fallbackServices,
        ].filter((s): s is IImageRecognitionService => s !== null);
        
        let lastError: Error | null = null;
        
        for (const service of servicesToTry) {
            try {
                // 检查服务可用性
                const isAvailable = await service.isAvailable();
                if (!isAvailable) {
                    console.log(`[ImageRecognitionFacade] Service ${service.name} not available, trying next...`);
                    continue;
                }
                
                const result = await service.recognize(request);
                
                // 如果成功，返回结果
                if (result.found || !result.error) {
                    return result;
                }
                
                // 如果失败但有错误，尝试下一个服务
                if (result.error) {
                    lastError = new Error(result.error);
                    continue;
                }
                
                return result;
                
            } catch (error: any) {
                console.error(`[ImageRecognitionFacade] Service ${service.name} failed:`, error);
                lastError = error;
                continue;
            }
        }
        
        // 所有服务都失败
        return {
            found: false,
            confidence: 0,
            error: `All services failed. Last error: ${lastError?.message}`,
            responseTime: 0,
        };
    }
    
    /**
     * 批量识别
     */
    async recognizeBatch(requests: RecognitionRequest[]): Promise<RecognitionResult[]> {
        // 使用主服务执行批量识别
        if (this.primaryService) {
            try {
                return await this.primaryService.recognizeBatch(requests);
            } catch (error) {
                console.error('[ImageRecognitionFacade] Primary service batch recognition failed:', error);
                // 降级到单个识别
            }
        }
        
        // 降级：逐个识别
        const results: RecognitionResult[] = [];
        for (const request of requests) {
            const result = await this.recognize(request);
            results.push(result);
        }
        return results;
    }
    
    /**
     * 获取所有服务状态
     */
    async getAllServiceStatus(): Promise<ServiceStatus[]> {
        const services = [
            this.primaryService,
            ...this.fallbackServices,
        ].filter((s): s is IImageRecognitionService => s !== null);
        
        const statuses: ServiceStatus[] = [];
        
        for (const service of services) {
            try {
                const status = await service.getStatus();
                statuses.push(status);
                this.serviceStats.set(service.name, status);
            } catch (error) {
                console.error(`[ImageRecognitionFacade] Failed to get status for ${service.name}:`, error);
            }
        }
        
        return statuses;
    }
    
    /**
     * 获取推荐服务（基于负载和响应时间）
     */
    getRecommendedService(): string | null {
        const services = Array.from(this.serviceStats.values())
            .filter(s => s.available && s.successRate > 90)
            .sort((a, b) => {
                // 优先选择响应时间短的
                return a.avgResponseTime - b.avgResponseTime;
            });
        
        return services[0]?.name || null;
    }
    
    /**
     * 销毁所有服务
     */
    async destroy(): Promise<void> {
        const services = [
            this.primaryService,
            ...this.fallbackServices,
        ].filter((s): s is IImageRecognitionService => s !== null);
        
        for (const service of services) {
            try {
                await service.destroy();
            } catch (error) {
                console.error(`[ImageRecognitionFacade] Failed to destroy service ${service.name}:`, error);
            }
        }
    }
}

// 单例实例
export const imageRecognitionFacade = new ImageRecognitionFacade();
