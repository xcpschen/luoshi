import { IImageRecognitionService, RecognitionServiceConfig } from './types';
import { LocalRecognitionService } from './services/local.service';
import { RemoteRecognitionService } from './services/remote.service';
import { CloudRecognitionService } from './services/cloud.service';

/**
 * 服务类型枚举
 */
export enum ServiceType {
    LOCAL = 'local',
    REMOTE = 'remote',
    CLOUD = 'cloud',
}

/**
 * 图像识别服务工厂
 */
export class ImageRecognitionServiceFactory {
    private static services: Map<ServiceType, IImageRecognitionService> = new Map();
    
    /**
     * 注册服务实现
     */
    static register(type: ServiceType, service: IImageRecognitionService): void {
        this.services.set(type, service);
    }
    
    /**
     * 获取服务实例
     */
    static getService(type: ServiceType): IImageRecognitionService | null {
        return this.services.get(type) || null;
    }
    
    /**
     * 创建服务实例
     */
    static createService(type: ServiceType, config: RecognitionServiceConfig): IImageRecognitionService {
        switch (type) {
            case ServiceType.LOCAL:
                return new LocalRecognitionService(config);
            
            case ServiceType.REMOTE:
                return new RemoteRecognitionService(config);
            
            case ServiceType.CLOUD:
                return new CloudRecognitionService(config);
            
            default:
                throw new Error(`Unknown service type: ${type}`);
        }
    }
    
    /**
     * 初始化所有服务
     */
    static async initializeAll(): Promise<void> {
        const promises: Promise<void>[] = [];
        
        for (const service of this.services.values()) {
            promises.push(service.initialize());
        }
        
        await Promise.all(promises);
    }
    
    /**
     * 销毁所有服务
     */
    static async destroyAll(): Promise<void> {
        const promises: Promise<void>[] = [];
        
        for (const service of this.services.values()) {
            promises.push(service.destroy());
        }
        
        await Promise.all(promises);
    }
}
