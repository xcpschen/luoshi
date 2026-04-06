import { ipcMain } from 'electron';
import {
    imageRecognition,
    setupImageRecognition,
    ServiceType,
} from './index';
import { RecognitionRequest } from './types';
import ImageRecognitionConfig from './config';

/**
 * 图像识别服务 IPC 处理器
 */
export class ImageRecognitionIPC {
    private static initialized = false;
    
    /**
     * 初始化图像识别服务
     */
    static async init(): Promise<void> {
        if (this.initialized) {
            return;
        }
        
        try {
            // 注册配置管理 IPC
            ImageRecognitionConfig.registerIPC();
            
            // 异步初始化，不阻塞主界面加载
            // 从配置加载并初始化服务
            ImageRecognitionConfig.getConfig().then(config => {
                if (config.enabled) {
                    setupImageRecognition(config).catch(error => {
                        console.error('[ImageRecognitionIPC] Failed to setup services:', error);
                    });
                }
            }).catch(error => {
                console.error('[ImageRecognitionIPC] Failed to load config:', error);
            });
            
            this.initialized = true;
            console.log('[ImageRecognitionIPC] Initialization started (non-blocking)');
        } catch (error) {
            console.error('[ImageRecognitionIPC] Failed to initialize:', error);
        }
    }
    
    /**
     * 注册 IPC 处理器
     */
    static register(): void {
        // 检查是否启用
        ipcMain.handle('imageRecognition:isAvailable', async () => {
            try {
                const config = await ImageRecognitionConfig.getConfig();
                return config.enabled;
            } catch (error) {
                console.error('[ImageRecognitionIPC] Failed to get config:', error);
                return false;
            }
        });
        
        // 查找单个图像
        ipcMain.handle('imageRecognition:findImage', async (event, options: {
            deviceId: string;
            templatePath: string;
            threshold?: number;
            timeout?: number;
        }) => {
            try {
                const config = await ImageRecognitionConfig.getConfig();
                if (!config.enabled) {
                    return {
                        success: false,
                        error: '图像识别服务未启用',
                    };
                }
                
                const result = await imageRecognition.findImage(options);
                return { success: true, result };
            } catch (error: any) {
                console.error('[ImageRecognitionIPC] findImage error:', error);
                return {
                    success: false,
                    error: error.message,
                };
            }
        });
        
        // 批量查找图像
        ipcMain.handle('imageRecognition:findImages', async (event, options: Array<{
            deviceId: string;
            templatePath: string;
            threshold?: number;
        }>) => {
            try {
                const config = await ImageRecognitionConfig.getConfig();
                if (!config.enabled) {
                    return {
                        success: false,
                        error: '图像识别服务未启用',
                    };
                }
                
                const results = await imageRecognition.findImages(options);
                return { success: true, results };
            } catch (error: any) {
                console.error('[ImageRecognitionIPC] findImages error:', error);
                return {
                    success: false,
                    error: error.message,
                };
            }
        });
        
        // 获取服务状态
        ipcMain.handle('imageRecognition:getServiceStatus', async () => {
            try {
                const statuses = await imageRecognition.getServiceStatus();
                return { success: true, statuses };
            } catch (error: any) {
                console.error('[ImageRecognitionIPC] getServiceStatus error:', error);
                return {
                    success: false,
                    error: error.message,
                };
            }
        });
        
        // 获取推荐服务
        ipcMain.handle('imageRecognition:getRecommendedService', async () => {
            try {
                const service = await imageRecognition.getRecommendedService();
                return { success: true, service };
            } catch (error: any) {
                console.error('[ImageRecognitionIPC] getRecommendedService error:', error);
                return {
                    success: false,
                    error: error.message,
                };
            }
        });
        
        // 切换服务（同时更新配置）
        ipcMain.handle('imageRecognition:switchService', async (
            event,
            serviceType: ServiceType,
            config?: any
        ) => {
            try {
                await imageRecognition.switchService(serviceType, config);
                await ImageRecognitionConfig.setServiceType(serviceType);
                return { success: true };
            } catch (error: any) {
                console.error('[ImageRecognitionIPC] switchService error:', error);
                return {
                    success: false,
                    error: error.message,
                };
            }
        });
        
        console.log('[ImageRecognitionIPC] IPC handlers registered');
    }
    
    /**
     * 销毁服务
     */
    static async destroy(): Promise<void> {
        try {
            await imageRecognition.destroy();
            console.log('[ImageRecognitionIPC] Service destroyed');
        } catch (error) {
            console.error('[ImageRecognitionIPC] Failed to destroy:', error);
        }
    }
}

export default ImageRecognitionIPC;
