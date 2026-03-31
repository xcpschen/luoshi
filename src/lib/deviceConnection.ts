/**
 * 设备连接管理工具
 * 
 * 提供设备连接的获取、验证和主动连接功能
 */

import { EnumDeviceStatus } from '../types/Device'
import type { DeviceConnection } from '../types/DeviceUnified'

/**
 * 获取设备的在线连接
 * @param connections 设备的连接列表
 * @returns 在线的连接列表
 */
export function getOnlineConnections(connections: DeviceConnection[]): DeviceConnection[] {
    return connections.filter(
        conn => conn.status === EnumDeviceStatus.CONNECTED || conn.status === 'device'
    )
}

/**
 * 获取设备的第一个在线连接
 * @param connections 设备的连接列表
 * @returns 在线的连接，如果没有则返回 null
 */
export function getFirstOnlineConnection(connections: DeviceConnection[]): DeviceConnection | null {
    const onlineConnections = getOnlineConnections(connections)
    return onlineConnections.length > 0 ? onlineConnections[0] : null
}

/**
 * 选择要使用的连接
 * 优先返回默认连接，如果没有默认连接则返回第一个在线连接
 * @param connections 设备的连接列表
 * @returns 选中的连接，如果没有在线连接则返回 null
 */
export function selectConnection(connections: DeviceConnection[]): DeviceConnection | null {
    // 优先选择默认连接
    const defaultConnection = connections.find(conn => conn.isDefault)
    if (defaultConnection && (defaultConnection.status === EnumDeviceStatus.CONNECTED || defaultConnection.status === 'device')) {
        return defaultConnection
    }
    
    // 否则返回第一个在线连接
    return getFirstOnlineConnection(connections)
}

/**
 * 尝试主动连接设备
 * 
 * @param connection 要连接的连接
 * @returns 连接是否成功
 */
export async function tryConnectDevice(connection: DeviceConnection): Promise<boolean> {
    try {
        const address = connection.address
        
        // 判断是 USB 还是 WiFi 连接
        if (address.includes(':')) {
            // WiFi 连接 - 尝试使用 ADB connect
            console.log('[ConnectionUtils] 尝试连接 WiFi 设备:', address)
            try {
                await window.$mapi.adb.connect(address)
                console.log('[ConnectionUtils] WiFi 设备连接成功:', address)
                return true
            } catch (error: any) {
                console.error('[ConnectionUtils] WiFi 设备连接失败:', address, error)
                return false
            }
        } else {
            // USB 连接 - 通常不需要主动连接，只需验证设备是否存在
            console.log('[ConnectionUtils] 验证 USB 设备:', address)
            try {
                const devices = await window.$mapi.adb.devices()
                const deviceExists = devices.some((d: any) => d.id === address)
                if (deviceExists) {
                    console.log('[ConnectionUtils] USB 设备存在:', address)
                    return true
                } else {
                    console.log('[ConnectionUtils] USB 设备不存在:', address)
                    return false
                }
            } catch (error: any) {
                console.error('[ConnectionUtils] 验证 USB 设备失败:', address, error)
                return false
            }
        }
    } catch (error: any) {
        console.error('[ConnectionUtils] 主动连接设备失败:', error)
        return false
    }
}

/**
 * 获取或尝试连接设备
 * 
 * 策略：
 * 1. 如果有在线连接，直接返回
 * 2. 如果没有在线连接，尝试主动连接所有连接
 * 3. 如果都失败，返回 null
 * 
 * @param connections 设备的连接列表
 * @param onConnectAttempt 连接尝试回调（用于更新 UI）
 * @returns 可用的连接，如果所有连接都失败则返回 null
 */
export async function getOrCreateConnection(
    connections: DeviceConnection[],
    onConnectAttempt?: (connection: DeviceConnection, success: boolean) => void
): Promise<DeviceConnection | null> {
    // 1. 尝试获取在线连接
    const onlineConnection = selectConnection(connections)
    if (onlineConnection) {
        console.log('[ConnectionUtils] 使用在线连接:', onlineConnection.address)
        return onlineConnection
    }
    
    // 2. 没有在线连接，尝试主动连接所有连接
    console.log('[ConnectionUtils] 没有在线连接，尝试主动连接...')
    
    for (const connection of connections) {
        console.log('[ConnectionUtils] 尝试连接:', connection.address)
        const success = await tryConnectDevice(connection)
        
        if (onConnectAttempt) {
            onConnectAttempt(connection, success)
        }
        
        if (success) {
            console.log('[ConnectionUtils] 连接成功:', connection.address)
            // 等待一小段时间让设备状态更新
            await new Promise(resolve => setTimeout(resolve, 1000))
            return connection
        }
    }
    
    // 3. 所有连接都失败
    console.log('[ConnectionUtils] 所有连接尝试都失败')
    return null
}

/**
 * 获取设备连接状态文本
 * @param status 连接状态
 * @returns 状态文本（国际化 key）
 */
export function getConnectionStatusText(status: string): string {
    const statusMap: Record<string, string> = {
        [EnumDeviceStatus.CONNECTED]: 'device.status.connected',
        [EnumDeviceStatus.WAIT_CONNECTING]: 'device.status.waitConnecting',
        [EnumDeviceStatus.DISCONNECTED]: 'device.status.disconnected',
        'device': 'device.status.device',
        'offline': 'device.status.offline',
        'unauthorized': 'device.status.unauthorized',
    }
    
    return statusMap[status] || 'device.status.unknown'
}
