/**
 * Airtest 服务封装
 * 提供与 Python Airtest 服务的实际通信
 */

import { EventEmitter } from 'events';
import * as net from 'net';
import * as http from 'http';

/**
 * Airtest 连接配置
 */
export interface AirtestConnectionConfig {
    /** 设备 ID */
    deviceId: string;
    /** Airtest 服务器地址 */
    host?: string;
    /** Airtest 端口 */
    port?: number;
    /** 超时时间 */
    timeout?: number;
}

/**
 * Airtest 服务类
 */
export class AirtestConnector extends EventEmitter {
    private config: AirtestConnectionConfig;
    private connected: boolean = false;
    private socket: net.Socket | null = null;
    private readonly defaultHost: string = 'localhost';
    private readonly defaultPort: number = 12345;
    private readonly defaultTimeout: number = 30000;

    constructor(config: AirtestConnectionConfig) {
        super();
        this.config = {
            host: config.host || this.defaultHost,
            port: config.port || this.defaultPort,
            timeout: config.timeout || this.defaultTimeout,
            deviceId: config.deviceId,
        };
    }

    /**
     * 连接到 Airtest 服务
     */
    async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.socket = net.createConnection(
                    {
                        host: this.config.host,
                        port: this.config.port,
                    },
                    () => {
                        this.connected = true;
                        console.log(`[AirtestConnector] 已连接到 ${this.config.host}:${this.config.port}`);
                        this.emit('connected');
                        resolve();
                    }
                );

                this.socket.on('error', (error) => {
                    console.error('[AirtestConnector] 连接错误:', error);
                    this.connected = false;
                    this.emit('error', error);
                    reject(error);
                });

                this.socket.on('close', () => {
                    this.connected = false;
                    console.log('[AirtestConnector] 连接已关闭');
                    this.emit('disconnected');
                });

                this.socket.on('timeout', () => {
                    console.error('[AirtestConnector] 连接超时');
                    this.socket?.destroy();
                    reject(new Error('连接超时'));
                });

                this.socket.setTimeout(this.config.timeout);
            } catch (error: any) {
                reject(new Error(`连接 Airtest 服务失败：${error.message}`));
            }
        });
    }

    /**
     * 断开连接
     */
    disconnect(): void {
        if (this.socket) {
            this.socket.end();
            this.socket = null;
            this.connected = false;
        }
    }

    /**
     * 发送命令到 Airtest 服务
     */
    async sendCommand<T>(command: string, params: any = {}): Promise<T> {
        return new Promise((resolve, reject) => {
            if (!this.connected || !this.socket) {
                reject(new Error('未连接到 Airtest 服务'));
                return;
            }

            const message = JSON.stringify({
                command,
                params: {
                    deviceId: this.config.deviceId,
                    ...params,
                },
                timestamp: Date.now(),
            });

            console.log(`[AirtestConnector] 发送命令：${command}`, params);

            const timeout = setTimeout(() => {
                reject(new Error('命令执行超时'));
            }, this.config.timeout);

            const onData = (data: Buffer) => {
                try {
                    const response = JSON.parse(data.toString());
                    clearTimeout(timeout);
                    this.socket?.removeListener('data', onData);

                    if (response.error) {
                        reject(new Error(response.error));
                    } else {
                        resolve(response.data as T);
                    }
                } catch (error: any) {
                    clearTimeout(timeout);
                    reject(new Error(`解析响应失败：${error.message}`));
                }
            };

            this.socket.on('data', onData);
            this.socket.write(message + '\n');
        });
    }

    /**
     * 图像识别
     */
    async recognizeImage(
        imagePath: string,
        threshold: number = 0.8,
        region?: { x: number; y: number; width: number; height: number }
    ): Promise<{ found: boolean; x?: number; y?: number; confidence?: number }> {
        return this.sendCommand('recognize', {
            imagePath,
            threshold,
            region,
        });
    }

    /**
     * 点击操作
     */
    async tap(x: number, y: number): Promise<void> {
        return this.sendCommand('tap', { x, y });
    }

    /**
     * 长按操作
     */
    async longPress(x: number, y: number, duration: number = 1000): Promise<void> {
        return this.sendCommand('touch', {
            action: 'long_press',
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
        return this.sendCommand('touch', {
            action: 'swipe',
            fromX,
            fromY,
            toX,
            toY,
            duration,
        });
    }

    /**
     * 文本输入
     */
    async inputText(text: string): Promise<void> {
        return this.sendCommand('text', { text });
    }

    /**
     * 截图
     */
    async screenshot(): Promise<Buffer> {
        const response = await this.sendCommand<{ base64: string }>('screenshot');
        return Buffer.from(response.base64, 'base64');
    }

    /**
     * 获取设备信息
     */
    async getDeviceInfo(): Promise<{
        deviceId: string;
        model: string;
        androidVersion: string;
        sdkVersion: number;
        display: { width: number; height: number };
    }> {
        return this.sendCommand('getDeviceInfo');
    }

    /**
     * 检查连接状态
     */
    isConnected(): boolean {
        return this.connected && this.socket !== null;
    }
}

/**
 * Airtest 服务管理器（单例模式）
 */
export class AirtestServiceManager {
    private static instance: AirtestServiceManager;
    private connectors: Map<string, AirtestConnector> = new Map();

    private constructor() {}

    static getInstance(): AirtestServiceManager {
        if (!this.instance) {
            this.instance = new AirtestServiceManager();
        }
        return this.instance;
    }

    /**
     * 获取或创建连接器
     */
    getOrCreateConnector(deviceId: string, config?: Partial<AirtestConnectionConfig>): AirtestConnector {
        const existingConnector = this.connectors.get(deviceId);
        if (existingConnector && existingConnector.isConnected()) {
            return existingConnector;
        }

        const connector = new AirtestConnector({
            deviceId,
            ...config,
        });

        this.connectors.set(deviceId, connector);
        return connector;
    }

    /**
     * 断开连接器
     */
    disconnectConnector(deviceId: string): void {
        const connector = this.connectors.get(deviceId);
        if (connector) {
            connector.disconnect();
            this.connectors.delete(deviceId);
        }
    }

    /**
     * 断开所有连接器
     */
    disconnectAll(): void {
        for (const [deviceId, connector] of this.connectors.entries()) {
            connector.disconnect();
        }
        this.connectors.clear();
    }

    /**
     * 获取所有连接器
     */
    getAllConnectors(): Map<string, AirtestConnector> {
        return new Map(this.connectors);
    }
}
