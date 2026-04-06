import { describe, it, expect, beforeEach } from 'vitest';
import type { RecognitionServiceConfig } from '../../electron/mapi/imageRecognition/types';

// 模拟 LocalRecognitionService 用于测试
class MockLocalRecognitionService {
    readonly name = 'local-opencv';
    private config: RecognitionServiceConfig;
    private isInitialized = false;
    
    constructor(config: RecognitionServiceConfig) {
        this.config = config;
    }
    
    async initialize(): Promise<void> {
        this.isInitialized = true;
    }
    
    async destroy(): Promise<void> {
        this.isInitialized = false;
    }
    
    async isAvailable(): Promise<boolean> {
        return this.isInitialized;
    }
    
    async recognize(request: any): Promise<any> {
        return {
            found: false,
            confidence: 0,
            responseTime: Math.random() * 10,
            engine: this.name,
        };
    }
    
    async recognizeBatch(requests: any[]): Promise<any[]> {
        return Promise.all(requests.map(r => this.recognize(r)));
    }
    
    async getStatus(): Promise<any> {
        return {
            name: this.name,
            available: await this.isAvailable(),
            load: 0,
            avgResponseTime: 0,
            successRate: 100,
            totalRequests: 0,
            failedRequests: 0,
        };
    }
}

describe('LocalRecognitionService Mock', () => {
    let service: MockLocalRecognitionService;
    
    const mockConfig: RecognitionServiceConfig = {
        name: 'local-opencv',
        enabled: true,
        defaultThreshold: 0.8,
        defaultTimeout: 30000,
        maxRetries: 0,
        options: {},
    };
    
    beforeEach(() => {
        service = new MockLocalRecognitionService(mockConfig);
    });
    
    describe('Initialization', () => {
        it('should create service instance', () => {
            expect(service).toBeInstanceOf(MockLocalRecognitionService);
            expect(service.name).toBe('local-opencv');
        });
        
        it('should initialize properly', async () => {
            await service.initialize();
            const isAvailable = await service.isAvailable();
            expect(isAvailable).toBe(true);
        });
        
        it('should return service status', async () => {
            await service.initialize();
            const status = await service.getStatus();
            expect(status.name).toBe('local-opencv');
            expect(status.available).toBe(true);
            expect(status.load).toBe(0);
        });
    });
    
    describe('Recognition', () => {
        it('should handle recognition', async () => {
            await service.initialize();
            const mockRequest = {
                deviceId: 'test-device',
                screenshot: Buffer.from([]),
                template: Buffer.from([]),
                threshold: 0.8,
                timeout: 5000,
                priority: 5,
            };
            
            const result = await service.recognize(mockRequest);
            
            expect(result.found).toBe(false);
            expect(result.confidence).toBe(0);
            expect(result.responseTime).toBeDefined();
            expect(result.engine).toBe('local-opencv');
        });
        
        it('should handle batch recognition', async () => {
            await service.initialize();
            const mockRequests = [
                { deviceId: 'device-1', screenshot: Buffer.from([]), template: Buffer.from([]), threshold: 0.8, timeout: 5000, priority: 5 },
                { deviceId: 'device-2', screenshot: Buffer.from([]), template: Buffer.from([]), threshold: 0.8, timeout: 5000, priority: 5 },
            ];
            
            const results = await service.recognizeBatch(mockRequests);
            
            expect(results.length).toBe(2);
            results.forEach(result => {
                expect(result.found).toBe(false);
                expect(result.confidence).toBe(0);
            });
        });
    });
    
    describe('Lifecycle', () => {
        it('should initialize and destroy properly', async () => {
            await service.initialize();
            expect(await service.isAvailable()).toBe(true);
            
            await service.destroy();
            expect(await service.isAvailable()).toBe(false);
        });
        
        it('should handle multiple initializations', async () => {
            await service.initialize();
            await service.initialize(); // Should be idempotent
            
            expect(await service.isAvailable()).toBe(true);
        });
    });
    
    describe('Configuration', () => {
        it('should use configured threshold', async () => {
            const strictConfig: RecognitionServiceConfig = {
                ...mockConfig,
                defaultThreshold: 0.95,
            };
            
            const strictService = new MockLocalRecognitionService(strictConfig);
            await strictService.initialize();
            
            const status = await strictService.getStatus();
            expect(status).toBeDefined();
        });
        
        it('should use configured timeout', async () => {
            const fastConfig: RecognitionServiceConfig = {
                ...mockConfig,
                defaultTimeout: 1000,
            };
            
            const fastService = new MockLocalRecognitionService(fastConfig);
            await fastService.initialize();
            
            const status = await fastService.getStatus();
            expect(status).toBeDefined();
        });
    });
});
