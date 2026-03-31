/**
 * 图像识别服务工厂
 * 使用工厂模式创建不同的图像识别服务实例
 */

import {
    IImageRecognitionService,
    ImageRecognitionServiceConfig,
    EnumImageRecognitionServiceType,
    DEFAULT_IMAGE_RECOGNITION_CONFIG,
} from '../types/ImageRecognition';

/**
 * 服务注册表
 */
const serviceRegistry: Map<EnumImageRecognitionServiceType, new (config: any) => IImageRecognitionService> = new Map();

/**
 * 图像识别服务工厂类
 */
export class ImageRecognitionServiceFactory {
    private static instance: ImageRecognitionServiceFactory;
    private services: Map<string, IImageRecognitionService> = new Map();

    private constructor() {}

    /**
     * 获取单例实例
     */
    static getInstance(): ImageRecognitionServiceFactory {
        if (!this.instance) {
            this.instance = new ImageRecognitionServiceFactory();
        }
        return this.instance;
    }

    /**
     * 注册服务类型
     */
    static registerService(
        type: EnumImageRecognitionServiceType,
        serviceClass: new (config: any) => IImageRecognitionService
    ): void {
        serviceRegistry.set(type, serviceClass);
    }

    /**
     * 创建服务实例
     */
    async createService(
        config: ImageRecognitionServiceConfig = DEFAULT_IMAGE_RECOGNITION_CONFIG
    ): Promise<IImageRecognitionService> {
        const serviceId = `service_${config.serviceType}_${Date.now()}`;

        const ServiceClass = serviceRegistry.get(config.serviceType);
        if (!ServiceClass) {
            throw new Error(`未找到服务类型：${config.serviceType}`);
        }

        const service = new ServiceClass(config);
        await service.initialize();

        this.services.set(serviceId, service);
        return service;
    }

    /**
     * 获取服务实例
     */
    getService(serviceId: string): IImageRecognitionService | undefined {
        return this.services.get(serviceId);
    }

    /**
     * 销毁服务实例
     */
    async destroyService(serviceId: string): Promise<void> {
        const service = this.services.get(serviceId);
        if (service) {
            await service.destroy();
            this.services.delete(serviceId);
        }
    }

    /**
     * 销毁所有服务实例
     */
    async destroyAllServices(): Promise<void> {
        for (const [serviceId, service] of this.services.entries()) {
            try {
                await service.destroy();
            } catch (error) {
                console.error(`销毁服务 ${serviceId} 失败:`, error);
            }
        }
        this.services.clear();
    }
}

/**
 * 图像识别服务管理器
 * 使用 Facade 模式提供统一的 API 入口
 */
import {
    ImageRecognitionParams,
    ImageRecognitionResult,
    TouchActionParams,
    TextInputParams,
    IImageRecognitionService,
} from '../types/ImageRecognition';

export class ImageRecognitionServiceManager {
    private service: IImageRecognitionService | null = null;
    private readonly deviceId: string;

    constructor(deviceId: string) {
        this.deviceId = deviceId;
    }

    /**
     * 初始化服务
     */
    async initialize(config: ImageRecognitionServiceConfig): Promise<void> {
        const factory = ImageRecognitionServiceFactory.getInstance();
        this.service = await factory.createService(config);
    }

    /**
     * 图像识别
     */
    async recognize(params: ImageRecognitionParams): Promise<ImageRecognitionResult> {
        if (!this.service) {
            throw new Error('服务未初始化');
        }

        const startTime = Date.now();
        try {
            const result = await this.service.recognize(params);
            result.duration = Date.now() - startTime;
            return result;
        } catch (error: any) {
            throw new Error(`图像识别失败：${error.message}`);
        }
    }

    /**
     * 点击操作
     */
    async tap(x: number, y: number): Promise<void> {
        return this.touch({
            actionType: 'tap' as any,
            x,
            y,
        });
    }

    /**
     * 长按操作
     */
    async longPress(x: number, y: number, duration: number = 1000): Promise<void> {
        return this.touch({
            actionType: 'long_press' as any,
            x,
            y,
            duration,
        });
    }

    /**
     * 滑动操作
     */
    async swipe(
        fromX: number,
        fromY: number,
        toX: number,
        toY: number,
        duration: number = 500
    ): Promise<void> {
        return this.touch({
            actionType: 'swipe' as any,
            x: fromX,
            y: fromY,
            endX: toX,
            endY: toY,
            duration,
        });
    }

    /**
     * 触控操作
     */
    async touch(params: TouchActionParams): Promise<void> {
        if (!this.service) {
            throw new Error('服务未初始化');
        }

        try {
            await this.service.touch(params);
        } catch (error: any) {
            throw new Error(`触控操作失败：${error.message}`);
        }
    }

    /**
     * 文本输入
     */
    async inputText(text: string, clear: boolean = false): Promise<void> {
        if (!this.service) {
            throw new Error('服务未初始化');
        }

        try {
            await this.service.inputText({ text, clear });
        } catch (error: any) {
            throw new Error(`文本输入失败：${error.message}`);
        }
    }

    /**
     * 截图
     */
    async screenshot(): Promise<Buffer> {
        if (!this.service) {
            throw new Error('服务未初始化');
        }

        try {
            return await this.service.screenshot();
        } catch (error: any) {
            throw new Error(`截图失败：${error.message}`);
        }
    }

    /**
     * 基于图像识别的点击
     */
    async tapByImage(imagePath: string, threshold: number = 0.8): Promise<{ x: number; y: number }> {
        const result = await this.recognize({
            targetImage: imagePath,
            threshold,
        });

        if (!result.found || !result.position) {
            throw new Error('未找到匹配的图像');
        }

        const centerX = result.position.x + (result.size?.width || 0) / 2;
        const centerY = result.position.y + (result.size?.height || 0) / 2;

        await this.tap(centerX, centerY);

        return { x: centerX, y: centerY };
    }

    /**
     * 销毁服务
     */
    async destroy(): Promise<void> {
        if (this.service) {
            const factory = ImageRecognitionServiceFactory.getInstance();
            // 查找并销毁服务
            for (const [serviceId, service] of factory['services'].entries()) {
                if (service === this.service) {
                    await factory.destroyService(serviceId);
                    break;
                }
            }
            this.service = null;
        }
    }
}
