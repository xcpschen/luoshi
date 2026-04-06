import { ipcMain } from 'electron';
import { Events } from '../event/main';
import db from '../db/main';
import {
    ImageRecognitionConfig,
    ImageRecognitionServiceType,
    DEFAULT_IMAGE_RECOGNITION_CONFIG,
} from '../../../src/types/ImageRecognition';

const CONFIG_TABLE = 'image_recognition_config';

/**
 * 从数据库读取配置项
 */
async function getConfigItem<T>(key: string, defaultValue: T): Promise<T> {
    try {
        const result = await db.first(
            `SELECT config_value FROM ${CONFIG_TABLE} WHERE config_key = ?`,
            [key]
        );
        
        if (result && result.config_value) {
            const value = result.config_value;
            // 尝试解析 JSON，如果是普通字符串则直接返回
            try {
                return JSON.parse(value) as T;
            } catch {
                // 如果不是有效 JSON，直接返回值（适用于字符串和布尔值）
                if (value === 'true') return true as T;
                if (value === 'false') return false as T;
                return value as T;
            }
        }
        
        return defaultValue;
    } catch (error) {
        console.error(`[ImageRecognitionConfig] Failed to get config item ${key}:`, error);
        return defaultValue;
    }
}

/**
 * 保存配置项到数据库
 */
async function setConfigItem<T>(key: string, value: T): Promise<void> {
    try {
        let stringValue: string;
        
        // 根据类型转换为字符串
        if (typeof value === 'object') {
            stringValue = JSON.stringify(value);
        } else if (typeof value === 'boolean') {
            stringValue = value ? 'true' : 'false';
        } else if (typeof value === 'string') {
            stringValue = value;
        } else {
            stringValue = String(value);
        }
        
        await db.execute(
            `INSERT OR REPLACE INTO ${CONFIG_TABLE} (config_key, config_value, updated_at) 
             VALUES (?, ?, CURRENT_TIMESTAMP)`,
            [key, stringValue]
        );
    } catch (error) {
        console.error(`[ImageRecognitionConfig] Failed to set config item ${key}:`, error);
        throw error;
    }
}

/**
 * 获取图像识别配置
 */
async function getConfig(): Promise<ImageRecognitionConfig> {
    try {
        const [enabled, serviceType, remote, local, cloud, fallbackServices] = await Promise.all([
            getConfigItem('enabled', DEFAULT_IMAGE_RECOGNITION_CONFIG.enabled),
            getConfigItem('service_type', DEFAULT_IMAGE_RECOGNITION_CONFIG.serviceType),
            getConfigItem('remote_config', DEFAULT_IMAGE_RECOGNITION_CONFIG.services.remote),
            getConfigItem('local_config', DEFAULT_IMAGE_RECOGNITION_CONFIG.services.local),
            getConfigItem('cloud_config', DEFAULT_IMAGE_RECOGNITION_CONFIG.services.cloud),
            getConfigItem('fallback_services', DEFAULT_IMAGE_RECOGNITION_CONFIG.fallbackServices),
        ]);
        
        return {
            enabled,
            serviceType,
            services: {
                remote,
                local,
                cloud,
            },
            fallbackServices,
        };
    } catch (error) {
        console.error('[ImageRecognitionConfig] Failed to load config, using defaults:', error);
        return DEFAULT_IMAGE_RECOGNITION_CONFIG;
    }
}

/**
 * 保存图像识别配置
 */
async function setConfig(config: ImageRecognitionConfig): Promise<void> {
    try {
        await Promise.all([
            setConfigItem('enabled', config.enabled),
            setConfigItem('service_type', config.serviceType),
            setConfigItem('remote_config', config.services.remote),
            setConfigItem('local_config', config.services.local),
            setConfigItem('cloud_config', config.services.cloud),
            setConfigItem('fallback_services', config.fallbackServices),
        ]);
        
        // 广播配置变更事件
        (Events.broadcast as any)('ImageRecognitionConfigChange', config);
    } catch (error) {
        console.error('[ImageRecognitionConfig] Failed to set config:', error);
        throw error;
    }
}

/**
 * 更新部分配置
 */
async function updateConfig(updates: Partial<ImageRecognitionConfig>): Promise<ImageRecognitionConfig> {
    const config = await getConfig();
    const newConfig = { ...config, ...updates };
    
    if (updates.enabled !== undefined) {
        await setConfigItem('enabled', updates.enabled);
    }
    if (updates.serviceType !== undefined) {
        await setConfigItem('service_type', updates.serviceType);
    }
    if (updates.services) {
        if (updates.services.remote) {
            await setConfigItem('remote_config', updates.services.remote);
        }
        if (updates.services.local) {
            await setConfigItem('local_config', updates.services.local);
        }
        if (updates.services.cloud) {
            await setConfigItem('cloud_config', updates.services.cloud);
        }
    }
    if (updates.fallbackServices) {
        await setConfigItem('fallback_services', updates.fallbackServices);
    }
    
    (Events.broadcast as any)('ImageRecognitionConfigChange', newConfig);
    
    return newConfig;
}

/**
 * 获取是否启用图像识别
 */
async function isEnabled(): Promise<boolean> {
    return getConfigItem('enabled', true);
}

/**
 * 设置是否启用图像识别
 */
async function setEnabled(enabled: boolean): Promise<void> {
    await setConfigItem('enabled', enabled);
    (Events.broadcast as any)('ImageRecognitionConfigChange', { enabled });
}

/**
 * 获取当前使用的服务类型
 */
async function getServiceType(): Promise<ImageRecognitionServiceType> {
    return getConfigItem('service_type', 'local' as ImageRecognitionServiceType);
}

/**
 * 设置使用的服务类型
 */
async function setServiceType(serviceType: ImageRecognitionServiceType): Promise<void> {
    await setConfigItem('service_type', serviceType);
    (Events.broadcast as any)('ImageRecognitionConfigChange', { serviceType });
}

/**
 * 获取特定服务的配置
 */
async function getServiceConfig(
    serviceType: ImageRecognitionServiceType
): Promise<any> {
    const configKey = `${serviceType}_config`;
    const defaultConfig = DEFAULT_IMAGE_RECOGNITION_CONFIG.services[serviceType];
    return getConfigItem(configKey, defaultConfig);
}

/**
 * 更新特定服务的配置
 */
async function updateServiceConfig(
    serviceType: ImageRecognitionServiceType,
    updates: Record<string, any>
): Promise<void> {
    const configKey = `${serviceType}_config`;
    const currentConfig = await getServiceConfig(serviceType);
    const newConfig = { ...currentConfig, ...updates };
    
    await setConfigItem(configKey, newConfig);
    (Events.broadcast as any)('ImageRecognitionConfigChange', {
        services: {
            [serviceType]: newConfig,
        },
    });
}

/**
 * IPC 处理器注册
 */
export function registerIPC(): void {
    // 获取完整配置
    ipcMain.handle('imageRecognition.config:getConfig', async () => {
        return await getConfig();
    });

    // 保存完整配置
    ipcMain.handle('imageRecognition.config:setConfig', async (_, config: ImageRecognitionConfig) => {
        await setConfig(config);
    });

    // 更新部分配置
    ipcMain.handle('imageRecognition.config:updateConfig', async (_, updates: Partial<ImageRecognitionConfig>) => {
        return await updateConfig(updates);
    });

    // 获取启用状态
    ipcMain.handle('imageRecognition.config:isEnabled', async () => {
        return await isEnabled();
    });

    // 设置启用状态
    ipcMain.handle('imageRecognition.config:setEnabled', async (_, enabled: boolean) => {
        await setEnabled(enabled);
    });

    // 获取服务类型
    ipcMain.handle('imageRecognition.config:getServiceType', async () => {
        return await getServiceType();
    });

    // 设置服务类型
    ipcMain.handle('imageRecognition.config:setServiceType', async (_, serviceType: ImageRecognitionServiceType) => {
        await setServiceType(serviceType);
    });

    // 获取服务配置
    ipcMain.handle('imageRecognition.config:getServiceConfig', async (_, serviceType: ImageRecognitionServiceType) => {
        return await getServiceConfig(serviceType);
    });

    // 更新服务配置
    ipcMain.handle('imageRecognition.config:updateServiceConfig', async (
        _,
        serviceType: ImageRecognitionServiceType,
        updates: Record<string, any>
    ) => {
        await updateServiceConfig(serviceType, updates);
    });

    console.log('[ImageRecognitionConfig] IPC handlers registered');
}

export default {
    getConfig,
    setConfig,
    updateConfig,
    isEnabled,
    setEnabled,
    getServiceType,
    setServiceType,
    getServiceConfig,
    updateServiceConfig,
    registerIPC,
};
