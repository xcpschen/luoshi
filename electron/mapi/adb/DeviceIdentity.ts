import { Device } from '@devicefarmer/adbkit';
import { createHash } from 'crypto';
import { getDeviceMAC } from './ip';

/**
 * 设备身份识别工具类
 * 用于生成和匹配设备的唯一标识
 */
export class DeviceIdentity {
    /**
     * 生成设备硬件 ID
     * 
     * 只使用 MAC 地址作为设备的唯一标识
     * 
     * @param device ADB 设备对象
     * @returns 硬件 ID 字符串（格式：mac:xx:xx:xx:xx:xx:xx）
     */
    static async generateHardwareId(device: Device): Promise<string> {
        try {
            // 获取 MAC 地址
            const macAddress = await this.getDeviceMACAddress(device.id);
            if (macAddress) {
                return `mac:${macAddress}`;
            }
            
            // 如果无法获取 MAC 地址，抛出错误
            throw new Error(`Unable to get MAC address for device ${device.id}`);
        } catch (error) {
            console.error('Failed to generate hardware ID:', error);
            throw error;
        }
    }
    
    /**
     * 获取设备 MAC 地址
     * 
     * 使用 `ip -d a s wlan0` 命令获取 MAC 地址
     * 
     * @param deviceId 设备 ID
     * @returns MAC 地址（小写），获取失败返回 null
     */
    static async getDeviceMACAddress(deviceId: string): Promise<string | null> {
        try {
            // 调用 ip.ts 模块获取 wlan0 网卡的 MAC 地址
            const mac = await getDeviceMAC(deviceId, 'wlan0');
            
            if (mac) {
                console.log(`[DeviceIdentity] 获取 MAC 地址成功：${mac}`);
                return mac;
            }
        } catch (error) {
            console.error('[DeviceIdentity] 获取 MAC 地址失败:', error);
        }
        
        return null;
    }
    
    /**
     * 匹配现有设备
     * 
     * 使用 MAC 地址进行精确匹配
     * 
     * @param device 新发现的设备
     * @param existingDevices 现有设备列表
     * @returns 匹配的设备，未匹配返回 null
     */
    static async matchExistingDevice<T extends { 
        identity: { 
            hardwareId: string;
        };
        unifiedId: string;
    }>(
        device: Device,
        existingDevices: T[]
    ): Promise<T | null> {
        try {
            // 生成硬件 ID（MAC 地址）
            const hardwareId = await this.generateHardwareId(device);
            
            // 精确匹配硬件 ID
            const matchedDevice = existingDevices.find(
                d => d.identity.hardwareId === hardwareId
            );
            
            if (matchedDevice) {
                return matchedDevice;
            }
            
            return null;
        } catch (error) {
            console.error('Failed to match existing device:', error);
            return null;
        }
    }
    
    /**
     * 生成设备指纹（用于兼容性）
     */
    static generateFingerprint(
        model: string,
        androidVersion: string,
        sdkVersion: number
    ): string {
        const parts = [model, androidVersion, sdkVersion.toString()].join('|');
        return createHash('md5').update(parts).digest('hex');
    }
}

/**
 * 设备身份缓存
 * 
 * 用于缓存已识别的设备身份，避免重复计算
 */
export class DeviceIdentityCache {
    private static cache: Map<string, {
        hardwareId: string;
        timestamp: number;
    }> = new Map();
    
    private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 分钟
    
    /**
     * 获取缓存的硬件 ID
     */
    static get(deviceId: string): string | null {
        const cached = this.cache.get(deviceId);
        
        if (!cached) {
            return null;
        }
        
        // 检查是否过期
        if (Date.now() - cached.timestamp > this.CACHE_TTL) {
            this.cache.delete(deviceId);
            return null;
        }
        
        return cached.hardwareId;
    }
    
    /**
     * 设置缓存
     */
    static set(deviceId: string, hardwareId: string): void {
        this.cache.set(deviceId, {
            hardwareId,
            timestamp: Date.now(),
        });
    }
    
    /**
     * 清理过期缓存
     */
    static cleanup(): void {
        const now = Date.now();
        for (const [deviceId, cached] of this.cache.entries()) {
            if (now - cached.timestamp > this.CACHE_TTL) {
                this.cache.delete(deviceId);
            }
        }
    }
}
