import {
    IImageRecognitionService,
    RecognitionRequest,
    RecognitionResult,
    RecognitionServiceConfig,
    ServiceStatus,
} from '../types';

/**
 * 云服务识别（示例：百度 AI、阿里云等）
 */
export class CloudRecognitionService implements IImageRecognitionService {
    readonly name = 'cloud-api';
    
    private config: RecognitionServiceConfig;
    private apiKey: string;
    private apiSecret: string;
    private endpoint: string;
    private stats = {
        totalRequests: 0,
        failedRequests: 0,
        totalResponseTime: 0,
    };
    
    constructor(config: RecognitionServiceConfig) {
        this.config = config;
        this.apiKey = config.options?.apiKey || '';
        this.apiSecret = config.options?.apiSecret || '';
        this.endpoint = config.options?.endpoint || '';
    }
    
    async initialize(): Promise<void> {
        // 验证 API 密钥（可选，如果没有配置则标记为不可用）
        if (!this.apiKey || !this.apiSecret) {
            console.warn('[CloudRecognition] API credentials not configured, service will be unavailable');
        }
    }
    
    async destroy(): Promise<void> {
        // 清理资源
    }
    
    async isAvailable(): Promise<boolean> {
        // 如果没有配置 API 密钥，服务不可用
        if (!this.apiKey || !this.apiSecret) {
            return false;
        }
        return !!(this.apiKey && this.apiSecret && this.endpoint);
    }
    
    async recognize(request: RecognitionRequest): Promise<RecognitionResult> {
        const startTime = Date.now();
        this.stats.totalRequests++;
        
        try {
            // 调用云 API
            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    image: typeof request.screenshot === 'string'
                        ? request.screenshot
                        : request.screenshot.toString('base64'),
                    template: typeof request.template === 'string'
                        ? request.template
                        : request.template.toString('base64'),
                    threshold: request.threshold,
                }),
            });
            
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            
            const result = await response.json();
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
            console.error('[CloudRecognition] Recognition error:', error);
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
        // 限制并发数（避免 API 限流）
        const results: RecognitionResult[] = [];
        const batchSize = 5;
        
        for (let i = 0; i < requests.length; i += batchSize) {
            const batch = requests.slice(i, i + batchSize);
            const batchResults = await Promise.all(batch.map(r => this.recognize(r)));
            results.push(...batchResults);
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
            load: 0,
            avgResponseTime,
            successRate,
            totalRequests: this.stats.totalRequests,
            failedRequests: this.stats.failedRequests,
        };
    }
}
