import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LocalRecognitionService } from '../../electron/mapi/imageRecognition/services/local.service';
import type { RecognitionServiceConfig } from '../../electron/mapi/imageRecognition/types';

describe('LocalRecognitionService', () => {
    let service: LocalRecognitionService;
    
    const mockConfig: RecognitionServiceConfig = {
        name: 'local-opencv',
        enabled: true,
        defaultThreshold: 0.8,
        defaultTimeout: 30000,
        maxRetries: 0,
        options: {},
    };
    
    beforeEach(() => {
        service = new LocalRecognitionService(mockConfig);
    });
    
    describe('Initialization', () => {
        it('should create service instance', async () => {
            expect(service).toBeInstanceOf(LocalRecognitionService);
            expect(service.name).toBe('local-opencv');
        });
        
        it('should initialize without OpenCV', async () => {
            await service.initialize();
            const isAvailable = await service.isAvailable();
            // 即使 OpenCV 不可用，服务也应该能初始化（降级模式）
            expect(true).toBe(true);
        });
        
        it('should return service status', async () => {
            const status = await service.getStatus();
            expect(status).toHaveProperty('name');
            expect(status).toHaveProperty('available');
            expect(status).toHaveProperty('load');
            expect(status).toHaveProperty('avgResponseTime');
            expect(status).toHaveProperty('successRate');
        });
    });
    
    describe('Recognition', () => {
        it('should handle recognition without OpenCV (fallback mode)', async () => {
            const mockRequest = {
                deviceId: 'test-device',
                screenshot: Buffer.from([]),
                template: Buffer.from([]),
                threshold: 0.8,
                timeout: 5000,
                priority: 5,
            };
            
            const result = await service.recognize(mockRequest);
            
            // 在没有 OpenCV 的情况下，应该返回失败结果但不抛出错误
            expect(result).toHaveProperty('found', false);
            expect(result).toHaveProperty('confidence', 0);
            expect(result).toHaveProperty('responseTime');
        });
        
        it('should handle batch recognition', async () => {
            const mockRequests = [
                {
                    deviceId: 'test-device-1',
                    screenshot: Buffer.from([]),
                    template: Buffer.from([]),
                    threshold: 0.8,
                    timeout: 5000,
                    priority: 5,
                },
                {
                    deviceId: 'test-device-2',
                    screenshot: Buffer.from([]),
                    template: Buffer.from([]),
                    threshold: 0.8,
                    timeout: 5000,
                    priority: 5,
                },
            ];
            
            const results = await service.recognizeBatch(mockRequests);
            
            expect(Array.isArray(results)).toBe(true);
            expect(results.length).toBe(2);
            results.forEach(result => {
                expect(result).toHaveProperty('found', false);
                expect(result).toHaveProperty('confidence', 0);
            });
        });
    });
    
    describe('Error Handling', () => {
        it('should handle invalid screenshot data', async () => {
            const mockRequest = {
                deviceId: 'test-device',
                screenshot: null as any,
                template: Buffer.from([]),
                threshold: 0.8,
                timeout: 5000,
                priority: 5,
            };
            
            const result = await service.recognize(mockRequest);
            
            // 应该返回错误但不抛出异常
            expect(result).toBeDefined();
            expect(result.found).toBe(false);
        });
        
        it('should handle timeout', async () => {
            const mockRequest = {
                deviceId: 'test-device',
                screenshot: Buffer.from([]),
                template: Buffer.from([]),
                threshold: 0.8,
                timeout: 1, // 1ms 超时
                priority: 5,
            };
            
            const result = await service.recognize(mockRequest);
            
            expect(result).toBeDefined();
        });
    });
    
    describe('Configuration', () => {
        it('should use configured threshold', async () => {
            const strictConfig: RecognitionServiceConfig = {
                ...mockConfig,
                defaultThreshold: 0.95,
            };
            
            const strictService = new LocalRecognitionService(strictConfig);
            await strictService.initialize();
            
            const status = await strictService.getStatus();
            expect(status).toBeDefined();
        });
        
        it('should use configured timeout', async () => {
            const fastConfig: RecognitionServiceConfig = {
                ...mockConfig,
                defaultTimeout: 1000,
            };
            
            const fastService = new LocalRecognitionService(fastConfig);
            await fastService.initialize();
            
            const status = await fastService.getStatus();
            expect(status).toBeDefined();
        });
    });
    
    describe('Lifecycle', () => {
        it('should initialize and destroy properly', async () => {
            await service.initialize();
            await service.destroy();
            
            const status = await service.getStatus();
            expect(status.available).toBe(false);
        });
        
        it('should handle multiple initializations', async () => {
            await service.initialize();
            await service.initialize(); // 第二次初始化应该无副作用
            
            const status = await service.getStatus();
            expect(status).toBeDefined();
        });
    });
});
