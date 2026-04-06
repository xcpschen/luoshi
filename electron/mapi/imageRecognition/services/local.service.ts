import {
    IImageRecognitionService,
    RecognitionRequest,
    RecognitionResult,
    RecognitionServiceConfig,
    ServiceStatus,
} from '../types';
import { readFileSync } from 'fs';

// OpenCV 实例（已禁用）
let cv: any = null;

async function loadOpenCV(): Promise<any> {
    // 暂时禁用 OpenCV 加载，避免阻塞主界面
    return null;
}

export class LocalRecognitionService implements IImageRecognitionService {
    readonly name = 'local-opencv';
    
    private config: RecognitionServiceConfig;
    private isInitialized = false;
    private stats = {
        totalRequests: 0,
        failedRequests: 0,
        totalResponseTime: 0,
    };
    
    constructor(config: RecognitionServiceConfig) {
        this.config = config;
    }
    
    async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }
        
        await loadOpenCV();
        this.isInitialized = true;
        
        if (!cv) {
            console.log('[LocalRecognition] Service initialized in fallback mode');
        } else {
            console.log('[LocalRecognition] Service initialized with OpenCV');
        }
    }
    
    async destroy(): Promise<void> {
        this.isInitialized = false;
        // 清理 OpenCV 资源
        if (cv) {
            try {
                cv['delete']?.();
            } catch (error) {
                console.error('[LocalRecognition] Failed to delete OpenCV:', error);
            }
        }
    }
    
    async isAvailable(): Promise<boolean> {
        return this.isInitialized;
    }
    
    async recognize(request: RecognitionRequest): Promise<RecognitionResult> {
        const startTime = Date.now();
        this.stats.totalRequests++;
        
        try {
            // 验证服务可用性
            if (!await this.isAvailable()) {
                throw new Error('Service not initialized');
            }
            
            // 加载图像
            const screenshot = await this.loadImage(request.screenshot);
            const template = await this.loadImage(request.template);
            
            // 执行模板匹配
            const result = await this.matchTemplate(screenshot, template, request.threshold);
            
            const responseTime = Date.now() - startTime;
            this.stats.totalResponseTime += responseTime;
            
            return {
                found: result.found,
                confidence: result.confidence,
                x: result.x,
                y: result.y,
                width: result.width,
                height: result.height,
                responseTime,
                engine: this.name,
            };
        } catch (error: any) {
            this.stats.failedRequests++;
            console.error('[LocalRecognition] Recognition error:', error);
            return {
                found: false,
                confidence: 0,
                error: error.message,
                responseTime: Date.now() - startTime,
                engine: this.name,
            };
        }
    }
    
    async recognizeBatch(requests: RecognitionRequest[]): Promise<RecognitionResult[]> {
        // 串行执行（避免 GPU 资源竞争）
        const results: RecognitionResult[] = [];
        
        for (const request of requests) {
            const result = await this.recognize(request);
            results.push(result);
        }
        
        return results;
    }
    
    async getStatus(): Promise<ServiceStatus> {
        const avgResponseTime = this.stats.totalRequests > 0
            ? this.stats.totalResponseTime / this.stats.totalRequests
            : 0;
        
        const successRate = this.stats.totalRequests > 0
            ? ((this.stats.totalRequests - this.stats.failedRequests) / this.stats.totalRequests) * 100
            : 0;
        
        return {
            name: this.name,
            available: await this.isAvailable(),
            load: 0, // 本地服务无负载概念
            avgResponseTime,
            successRate,
            totalRequests: this.stats.totalRequests,
            failedRequests: this.stats.failedRequests,
        };
    }
    
    /**
     * 加载图像
     */
    private async loadImage(source: string | Buffer): Promise<Uint8Array> {
        try {
            let imageData: Buffer;
            
            if (typeof source === 'string') {
                // 如果是路径，读取文件
                if (source.startsWith('/') || source.startsWith('C:') || source.includes('\\')) {
                    imageData = readFileSync(source);
                } else {
                    // Base64
                    imageData = Buffer.from(source, 'base64');
                }
            } else {
                imageData = source;
            }
            
            // 返回 Uint8Array
            return new Uint8Array(imageData);
        } catch (error: any) {
            throw new Error(`Failed to load image: ${error.message}`);
        }
    }
    
    /**
     * 模板匹配
     */
    private async matchTemplate(
        screenshotData: Uint8Array,
        templateData: Uint8Array,
        threshold: number
    ): Promise<{
        found: boolean;
        confidence: number;
        x: number;
        y: number;
        width: number;
        height: number;
    }> {
        // 如果没有 OpenCV，返回失败
        if (!cv) {
            console.warn('[LocalRecognition] OpenCV not available, skipping template matching');
            return {
                found: false,
                confidence: 0,
                x: 0,
                y: 0,
                width: 0,
                height: 0,
            };
        }
        
        return new Promise((resolve) => {
            try {
                // 解码图像
                const screenshot = cv.imdecode(screenshotData, cv.IMREAD_COLOR);
                const template = cv.imdecode(templateData, cv.IMREAD_COLOR);
                
                if (screenshot.empty() || template.empty()) {
                    console.error('[LocalRecognition] Failed to decode images');
                    screenshot.delete();
                    template.delete();
                    resolve({
                        found: false,
                        confidence: 0,
                        x: 0,
                        y: 0,
                        width: 0,
                        height: 0,
                    });
                    return;
                }
                
                // 多尺度匹配
                const scales = [1.0, 0.8, 0.6, 0.4];
                
                for (const scale of scales) {
                    const resizedTemplate = new cv.Mat();
                    cv.resize(template, resizedTemplate, new cv.Size(0, 0), scale, scale);
                    
                    const result = new cv.Mat();
                    cv.matchTemplate(screenshot, resizedTemplate, result, cv.TM_CCOEFF_NORMED);
                    
                    const resultData = {
                        minVal: 0,
                        maxVal: 0,
                        minLoc: { x: 0, y: 0 },
                        maxLoc: { x: 0, y: 0 },
                    };
                    cv.minMaxLoc(result, resultData);
                    
                    if (resultData.maxVal >= threshold) {
                        const matchResult = {
                            found: true,
                            confidence: resultData.maxVal,
                            x: resultData.maxLoc.x / scale,
                            y: resultData.maxLoc.y / scale,
                            width: resizedTemplate.cols / scale,
                            height: resizedTemplate.rows / scale,
                        };
                        
                        resizedTemplate.delete();
                        result.delete();
                        screenshot.delete();
                        template.delete();
                        
                        resolve(matchResult);
                        return;
                    }
                    
                    resizedTemplate.delete();
                    result.delete();
                }
                
                // 未找到匹配
                screenshot.delete();
                template.delete();
                
                resolve({
                    found: false,
                    confidence: 0,
                    x: 0,
                    y: 0,
                    width: 0,
                    height: 0,
                });
            } catch (error) {
                console.error('[LocalRecognition] Template matching error:', error);
                resolve({
                    found: false,
                    confidence: 0,
                    x: 0,
                    y: 0,
                    width: 0,
                    height: 0,
                });
            }
        });
    }
}
