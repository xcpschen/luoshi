import {
    IImageRecognitionService,
    RecognitionRequest,
    RecognitionResult,
    RecognitionServiceConfig,
    ServiceStatus,
} from '../types';
import WebSocket from 'ws';

export class RemoteRecognitionService implements IImageRecognitionService {
    readonly name = 'remote-worker';
    
    private config: RecognitionServiceConfig;
    private ws: WebSocket | null = null;
    private isConnected = false;
    private requestCallbacks: Map<string, {
        resolve: (result: RecognitionResult) => void;
        reject: (error: Error) => void;
        timeout: NodeJS.Timeout;
    }> = new Map();
    private stats = {
        totalRequests: 0,
        failedRequests: 0,
        totalResponseTime: 0,
    };
    
    constructor(config: RecognitionServiceConfig) {
        this.config = config;
    }
    
    async initialize(): Promise<void> {
        if (this.ws) {
            return;
        }
        
        const serverUrl = this.config.options?.serverUrl || 'ws://localhost:8765';
        
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(serverUrl);
                
                this.ws.on('open', () => {
                    console.log('[RemoteRecognition] Connected to remote recognition server');
                    this.isConnected = true;
                    resolve();
                });
                
                this.ws.on('message', (data: Buffer) => {
                    this.handleMessage(data);
                });
                
                this.ws.on('close', () => {
                    console.log('[RemoteRecognition] Disconnected from remote recognition server');
                    this.isConnected = false;
                });
                
                this.ws.on('error', (error) => {
                    console.error('[RemoteRecognition] WebSocket error:', error);
                    this.isConnected = false;
                    reject(error);
                });
                
                // 连接超时
                setTimeout(() => {
                    if (!this.isConnected) {
                        reject(new Error('Connection timeout'));
                    }
                }, 10000);
            } catch (error) {
                reject(error);
            }
        });
    }
    
    async destroy(): Promise<void> {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
            this.isConnected = false;
            
            // 清理所有待处理的请求
            for (const [id, callback] of this.requestCallbacks.entries()) {
                clearTimeout(callback.timeout);
                callback.reject(new Error('Service destroyed'));
            }
            this.requestCallbacks.clear();
        }
    }
    
    async isAvailable(): Promise<boolean> {
        return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
    }
    
    async recognize(request: RecognitionRequest): Promise<RecognitionResult> {
        const startTime = Date.now();
        this.stats.totalRequests++;
        
        return new Promise(async (resolve, reject) => {
            try {
                if (!await this.isAvailable()) {
                    throw new Error('Remote service not available');
                }
                
                const requestId = this.generateRequestId();
                
                // 设置超时
                const timeout = setTimeout(() => {
                    this.requestCallbacks.delete(requestId);
                    this.stats.failedRequests++;
                    reject(new Error('Request timeout'));
                }, request.timeout || this.config.defaultTimeout);
                
                // 注册回调
                this.requestCallbacks.set(requestId, {
                    resolve,
                    reject,
                    timeout,
                });
                
                // 发送请求
                this.ws?.send(JSON.stringify({
                    type: 'RECOGNIZE',
                    requestId,
                    data: {
                        screenshot: typeof request.screenshot === 'string'
                            ? request.screenshot
                            : request.screenshot.toString('base64'),
                        template: typeof request.template === 'string'
                            ? request.template
                            : request.template.toString('base64'),
                        threshold: request.threshold || this.config.defaultThreshold,
                        timeout: request.timeout || this.config.defaultTimeout,
                    },
                }));
            } catch (error: any) {
                this.stats.failedRequests++;
                reject(error);
            }
        });
    }
    
    async recognizeBatch(requests: RecognitionRequest[]): Promise<RecognitionResult[]> {
        // 并行执行多个请求
        const results = await Promise.all(
            requests.map(request => this.recognize(request))
        );
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
            load: 0, // 从服务器获取
            avgResponseTime,
            successRate,
            totalRequests: this.stats.totalRequests,
            failedRequests: this.stats.failedRequests,
        };
    }
    
    /**
     * 处理服务器消息
     */
    private handleMessage(data: Buffer): void {
        try {
            const message = JSON.parse(data.toString());
            
            switch (message.type) {
                case 'RECOGNIZE_RESULT': {
                    const callback = this.requestCallbacks.get(message.requestId);
                    if (callback) {
                        clearTimeout(callback.timeout);
                        this.requestCallbacks.delete(message.requestId);
                        
                        const responseTime = Date.now();
                        this.stats.totalResponseTime += responseTime;
                        
                        callback.resolve({
                            found: message.result.found,
                            confidence: message.result.confidence,
                            x: message.result.x,
                            y: message.result.y,
                            width: message.result.width,
                            height: message.result.height,
                            responseTime,
                            engine: this.name,
                        });
                    }
                    break;
                }
                
                case 'RECOGNIZE_ERROR': {
                    const callback = this.requestCallbacks.get(message.requestId);
                    if (callback) {
                        clearTimeout(callback.timeout);
                        this.requestCallbacks.delete(message.requestId);
                        this.stats.failedRequests++;
                        callback.reject(new Error(message.error));
                    }
                    break;
                }
            }
        } catch (error) {
            console.error('[RemoteRecognition] Failed to parse message:', error);
        }
    }
    
    private generateRequestId(): string {
        return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
}
