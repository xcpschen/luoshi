import { ipcRenderer } from 'electron';
import type { 
    ImageRecognitionConfig,
    ImageRecognitionServiceType 
} from '../../../src/types/ImageRecognition';

/**
 * 获取完整配置
 */
export async function getConfig(): Promise<ImageRecognitionConfig> {
    return await ipcRenderer.invoke('imageRecognition.config:getConfig');
}

/**
 * 保存完整配置
 */
export async function setConfig(config: ImageRecognitionConfig): Promise<void> {
    await ipcRenderer.invoke('imageRecognition.config:setConfig', config);
}

/**
 * 更新部分配置
 */
export async function updateConfig(updates: Partial<ImageRecognitionConfig>): Promise<ImageRecognitionConfig> {
    return await ipcRenderer.invoke('imageRecognition.config:updateConfig', updates);
}

/**
 * 获取启用状态
 */
export async function isEnabled(): Promise<boolean> {
    return await ipcRenderer.invoke('imageRecognition.config:isEnabled');
}

/**
 * 设置启用状态
 */
export async function setEnabled(enabled: boolean): Promise<void> {
    await ipcRenderer.invoke('imageRecognition.config:setEnabled', enabled);
}

/**
 * 获取服务类型
 */
export async function getServiceType(): Promise<ImageRecognitionServiceType> {
    return await ipcRenderer.invoke('imageRecognition.config:getServiceType');
}

/**
 * 设置服务类型
 */
export async function setServiceType(serviceType: ImageRecognitionServiceType): Promise<void> {
    await ipcRenderer.invoke('imageRecognition.config:setServiceType', serviceType);
}

/**
 * 获取服务配置
 */
export async function getServiceConfig(serviceType: ImageRecognitionServiceType): Promise<any> {
    return await ipcRenderer.invoke('imageRecognition.config:getServiceConfig', serviceType);
}

/**
 * 更新服务配置
 */
export async function updateServiceConfig(
    serviceType: ImageRecognitionServiceType,
    updates: Record<string, any>
): Promise<void> {
    await ipcRenderer.invoke('imageRecognition.config:updateServiceConfig', serviceType, updates);
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
};
