import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import {
    DeviceUnifiedRecord,
    DeviceConnection,
    EnumConnectionType,
} from '../../types/DeviceUnified'
import {EnumDeviceStatus} from '../../types/Device'
import { DeviceIdentity, DeviceIdentityCache } from '../../../electron/mapi/adb/DeviceIdentity'
import { useDeviceStore } from './device'

// ADB 状态映射到设备状态
function mapAdbStateToDeviceStatus(adbState: string): EnumDeviceStatus {
    if (adbState === 'device') {
        return EnumDeviceStatus.CONNECTED
    } else if (adbState === 'unauthorized' || adbState === 'wait-for-device') {
        return EnumDeviceStatus.WAIT_CONNECTING
    } else {
        return EnumDeviceStatus.DISCONNECTED
    }
}

/**
 * DeviceUnified Store - 增量式实现
 * 不替换原有 device store，而是作为补充提供统一设备管理功能
 */
export const useDeviceUnifiedStore = defineStore('deviceUnified', () => {
    // State
    const unifiedDevices = ref<DeviceUnifiedRecord[]>([])
    const isLoading = ref(false)
    const error = ref<string | null>(null)
    const lastSyncTime = ref<Date | null>(null)

    // Getters
    const deviceCount = computed(() => unifiedDevices.value.length)
    
    const connectedDevices = computed(() => 
        unifiedDevices.value.filter(device => 
            device.connections.some(conn => conn.status === EnumDeviceStatus.CONNECTED)
        )
    )

    const usbDevices = computed(() => 
        unifiedDevices.value.filter(device => 
            device.connections.some(conn => conn.type === 'usb')
        )
    )

    const wifiDevices = computed(() => 
        unifiedDevices.value.filter(device => 
            device.connections.some(conn => conn.type === 'wifi_debug' || conn.type === 'network')
        )
    )

    const getDeviceByUnifiedId = computed(() => {
        return (unifiedId: string) => unifiedDevices.value.find(d => d.unifiedId === unifiedId)
    })

    const getDeviceByHardwareId = computed(() => {
        return (hardwareId: string) => unifiedDevices.value.find(d => d.identity.hardwareId === hardwareId)
    })

    // Actions
    /**
     * 从设备 store 同步数据（使用与设备页面相同的数据源）
     * 复用设备 store 的实时监听功能
     * @param showLoading 是否显示加载状态（默认 true）
     */
    async function syncDevices(showLoading: boolean = true) {
        if (showLoading) {
            isLoading.value = true
        }
        error.value = null

        try {
            // 使用设备 store 的数据（与设备页面保持一致）
            const deviceStore = useDeviceStore()
            const deviceRecords = deviceStore.records
            
            console.log('[DeviceUnified] 开始同步设备，设备 store 记录数:', deviceRecords.length)
            
            if (!deviceRecords || deviceRecords.length === 0) {
                console.log('[DeviceUnified] 没有检测到设备')
                if (showLoading) {
                    isLoading.value = false
                }
                return
            }

            // 先标记所有设备为离线（用于检测断开连接的设备）
            unifiedDevices.value.forEach(device => {
                device.connections.forEach(conn => {
                    conn.status = EnumDeviceStatus.DISCONNECTED
                })
            })

            // 逐个处理设备
            // 如果是首次同步（所有设备都标记为离线），则强制刷新设备信息
            const isInitialSync = unifiedDevices.value.every(device => 
                device.connections.every(conn => conn.status === EnumDeviceStatus.DISCONNECTED)
            )
            
            for (const deviceRecord of deviceRecords) {
                // 对于已连接的设备，确保信息是最新的
                const isDeviceConnected = deviceRecord.runtime?.status === EnumDeviceStatus.CONNECTED
                // 首次同步或设备连接时，强制刷新设备信息
                const forceRefresh = isInitialSync || isDeviceConnected
                await addOrUpdateDeviceFromRecord(deviceRecord, forceRefresh)
            }

            // 清理离线设备（可选）
            // await clearOfflineDevices()

            lastSyncTime.value = new Date()
            console.log('[DeviceUnified] 设备同步完成，总计:', unifiedDevices.value.length)
        } catch (err: any) {
            error.value = err.message || '同步设备失败'
            console.error('[DeviceUnified] 同步设备失败:', err)
        } finally {
            if (showLoading) {
                isLoading.value = false
            }
        }
    }

    /**
     * 从设备记录添加或更新设备（直接使用设备 store 的状态）
     * 优化：如果设备已有 MAC 地址、品牌、型号等信息，不重复获取
     * @param deviceRecord 设备记录
     * @param forceRefresh 是否强制刷新设备信息（即使信息已完整）
     */
    async function addOrUpdateDeviceFromRecord(deviceRecord: any, forceRefresh: boolean = false) {
        try {
            // 从设备 store 的 records 中获取 runtime 状态
            const deviceStore = useDeviceStore()
            const record = deviceStore.records.find(r => r.id === deviceRecord.id)
            const status = record?.runtime?.value?.status || record?.status || EnumDeviceStatus.WAIT_CONNECTING
            
            console.log(`[DeviceUnified] 同步设备状态：${deviceRecord.id}, runtime.status: ${status}`)
            
            // 使用设备 store 的状态，而不是重新计算
            const adbDevice = {
                ...deviceRecord,
                state: status === EnumDeviceStatus.CONNECTED ? 'device' : 
                       status === EnumDeviceStatus.WAIT_CONNECTING ? 'unauthorized' : 'offline',
                _forceRefresh: forceRefresh  // 传递强制刷新标志
            }
            
            await addOrUpdateDevice(adbDevice)
        } catch (err: any) {
            console.error('[DeviceUnified] 处理设备记录失败:', err)
        }
    }

    /**
     * 添加或更新设备（基于设备身份识别）
     * 优化：如果设备已有 MAC 地址、品牌、型号等信息，不重复获取
     */
    async function addOrUpdateDevice(adbDevice: any) {
        try {
            // 生成硬件 ID
            const hardwareId = await DeviceIdentity.generateHardwareId(adbDevice)
            
            // 检查缓存
            let cachedHardwareId = DeviceIdentityCache.get(adbDevice.id)
            if (cachedHardwareId && cachedHardwareId === hardwareId) {
                console.log('[DeviceUnified] 使用缓存的硬件 ID:', cachedHardwareId)
            } else {
                DeviceIdentityCache.set(adbDevice.id, hardwareId)
            }

            // 检查是否已存在该设备
            const existingDevice = unifiedDevices.value.find(
                d => d.identity.hardwareId === hardwareId
            )

            if (existingDevice) {
                // 更新现有设备
                console.log('[DeviceUnified] 更新现有设备连接状态:', existingDevice.name)
                await updateDeviceConnection(existingDevice, adbDevice)
                
                // 检查是否需要刷新设备信息
                // 1. 强制刷新标志（重启后首次同步）
                // 2. 设备信息不完整
                const needsInfoUpdate = adbDevice._forceRefresh ||
                    !existingDevice.identity.brand || existingDevice.identity.brand === 'Unknown' ||
                    !existingDevice.identity.model || existingDevice.identity.model === 'Unknown'
                
                if (needsInfoUpdate) {
                    console.log('[DeviceUnified] 更新设备信息:', existingDevice.unifiedId)
                    await updateDeviceInfo(existingDevice, adbDevice)
                } else {
                    console.log('[DeviceUnified] 设备信息已完整，跳过信息获取:', existingDevice.name)
                }
            } else {
                // 创建新设备
                console.log('[DeviceUnified] 创建新设备:', adbDevice.id, hardwareId)
                await createNewDevice(adbDevice, hardwareId)
            }
        } catch (err: any) {
            console.error('[DeviceUnified] 处理设备失败:', adbDevice.id, err)
        }
    }

    /**
     * 创建新设备记录
     */
    async function createNewDevice(adbDevice: any, hardwareId: string) {
        const unifiedId = crypto.randomUUID()
        const fingerprint = DeviceIdentity.generateFingerprint(
            adbDevice.model,
            adbDevice.version || '',
            parseInt(adbDevice.sdkVersion) || 0
        )

        const connectionType = adbDevice.id.includes(':') 
            ? 'wifi_debug' as EnumConnectionType
            : 'usb' as EnumConnectionType

        const now = new Date()

        const newDevice: DeviceUnifiedRecord = {
            unifiedId,
            identity: {
                hardwareId,
                model: adbDevice.model || 'Unknown',
                brand: adbDevice.brand || 'Unknown',
                androidVersion: adbDevice.version || 'Unknown',
                sdkVersion: parseInt(adbDevice.sdkVersion) || 0,
                fingerprint
            },
            name: `${adbDevice.brand || ''} ${adbDevice.model || adbDevice.id}`.trim(),
            connections: [{
                id: crypto.randomUUID(),
                type: connectionType,
                status: mapAdbStateToDeviceStatus(adbDevice.state),
                address: adbDevice.id,
                connectedAt: now,
                lastActiveAt: now,
                isDefault: true
            }],
            activeConnectionId: crypto.randomUUID(),
            setting: {
                dimWhenMirror: 'false',
                alwaysTop: 'false',
                mirrorSound: 'false',
                videoBitRate: '8000000',
                maxFps: '60',
                videoCodec: 'h264',
                videoBuffer: '0'
            },
            tags: [],
            totalConnections: 1,
            firstConnectedAt: now,
            lastConnectedAt: now,
            createdAt: now,
            updatedAt: now
        }

        // 保存到数据库（增量式：使用新的 device_unified 表）
        try {
            await window.$mapi.db.execute(
                `INSERT OR REPLACE INTO device_unified (
                    unified_id, hardware_id, model, brand, android_version, sdk_version, fingerprint,
                    name, setting, tags, total_connections, first_connected_at, last_connected_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    newDevice.unifiedId,
                    newDevice.identity.hardwareId,
                    newDevice.identity.model,
                    newDevice.identity.brand,
                    newDevice.identity.androidVersion,
                    newDevice.identity.sdkVersion,
                    newDevice.identity.fingerprint,
                    newDevice.name,
                    JSON.stringify(newDevice.setting),
                    JSON.stringify(newDevice.tags),
                    newDevice.totalConnections,
                    newDevice.firstConnectedAt.toISOString(),
                    newDevice.lastConnectedAt.toISOString()
                ]
            )

            // 保存连接信息
            const conn = newDevice.connections[0]
            await window.$mapi.db.execute(
                `INSERT OR REPLACE INTO device_connection (
                    unified_id, connection_id, connection_type, status, address,
                    connected_at, last_active_at, is_default
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    newDevice.unifiedId,
                    conn.id,
                    conn.type,
                    conn.status,
                    conn.address,
                    conn.connectedAt.toISOString(),
                    conn.lastActiveAt.toISOString(),
                    conn.isDefault ? 1 : 0
                ]
            )

            unifiedDevices.value.push(newDevice)
            console.log('[DeviceUnified] 创建新设备:', newDevice.name, unifiedId)
        } catch (err: any) {
            console.error('[DeviceUnified] 保存设备到数据库失败:', err)
        }
    }

    /**
     * 更新设备连接信息
     */
    async function updateDeviceConnection(existingDevice: DeviceUnifiedRecord, adbDevice: any) {
        const connectionType = adbDevice.id.includes(':') 
            ? 'wifi_debug' as EnumConnectionType
            : 'usb' as EnumConnectionType

        // 检查是否已有该连接
        const existingConnection = existingDevice.connections.find(
            conn => conn.address === adbDevice.id
        )

        if (existingConnection) {
            // 更新现有连接状态
            const oldStatus = existingConnection.status
            existingConnection.status = adbDevice.state as EnumDeviceStatus || 'offline'
            existingConnection.lastActiveAt = new Date()
            
            // 如果状态发生变化，同步到数据库
            if (oldStatus !== existingConnection.status) {
                console.log(`[DeviceUnified] 连接状态变化：${adbDevice.id} ${oldStatus} -> ${existingConnection.status}`)
                try {
                    await window.$mapi.db.execute(
                        `UPDATE device_connection SET status = ?, last_active_at = ? WHERE connection_id = ?`,
                        [
                            existingConnection.status,
                            existingConnection.lastActiveAt.toISOString(),
                            existingConnection.id
                        ]
                    )
                    console.log(`[DeviceUnified] 连接状态已同步到数据库：${adbDevice.id}`)
                } catch (err: any) {
                    console.error('[DeviceUnified] 更新连接状态到数据库失败:', err)
                }
            }
        } else {
            // 添加新连接
            const newConnection: DeviceConnection = {
                id: crypto.randomUUID(),
                type: connectionType,
                status: adbDevice.state as EnumDeviceStatus || 'offline',
                address: adbDevice.id,
                connectedAt: new Date(),
                lastActiveAt: new Date(),
                isDefault: false
            }
            existingDevice.connections.push(newConnection)
            existingDevice.totalConnections++
            existingDevice.updatedAt = new Date()
            
            // 保存新连接到数据库
            try {
                await window.$mapi.db.execute(
                    `INSERT INTO device_connection (
                        unified_id, connection_id, connection_type, status, address,
                        connected_at, last_active_at, is_default
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        existingDevice.unifiedId,
                        newConnection.id,
                        newConnection.type,
                        newConnection.status,
                        newConnection.address,
                        newConnection.connectedAt.toISOString(),
                        newConnection.lastActiveAt.toISOString(),
                        newConnection.isDefault ? 1 : 0
                    ]
                )
                console.log('[DeviceUnified] 新连接已保存到数据库:', adbDevice.id)
            } catch (err: any) {
                console.error('[DeviceUnified] 保存新连接到数据库失败:', err)
            }
        }

        console.log('[DeviceUnified] 更新设备连接:', existingDevice.name)
    }

    /**
     * 更新设备信息（品牌、型号等）
     * 如果 adbDevice 中已有信息，直接使用；否则从 ADB 重新获取
     */
    async function updateDeviceInfo(existingDevice: DeviceUnifiedRecord, adbDevice: any) {
        try {
            let brand = adbDevice.brand || adbDevice.raw?.brand;
            let model = adbDevice.model || adbDevice.raw?.model;
            let androidVersion = adbDevice.version || adbDevice.raw?.version;
            let sdkVersion = parseInt(adbDevice.sdkVersion || adbDevice.raw?.sdkVersion || '0');

            // 如果信息不完整，尝试从 ADB 重新获取
            if ((!brand || brand === 'Unknown' || !model || model === 'Unknown') && adbDevice.id) {
                console.log('[DeviceUnified] 设备信息不完整，从 ADB 重新获取:', adbDevice.id);
                try {
                    const deviceInfo: any = await window.$mapi.adb.info(adbDevice.id);
                    console.log('[DeviceUnified] ADB 获取到的设备信息:', deviceInfo);
                    
                    if (deviceInfo) {
                        brand = brand || deviceInfo?.brand || 'Unknown';
                        model = model || deviceInfo?.model || 'Unknown';
                        androidVersion = androidVersion || deviceInfo?.version || 'Unknown';
                        sdkVersion = sdkVersion || parseInt(deviceInfo?.sdkVersion || '0') || 0;
                    }
                } catch (error) {
                    console.error('[DeviceUnified] 从 ADB 获取设备信息失败:', error);
                }
            }

            // 只有当信息有效时才更新
            if ((brand && brand !== 'Unknown') || (model && model !== 'Unknown')) {
                const needsUpdate = 
                    existingDevice.identity.brand !== brand ||
                    existingDevice.identity.model !== model ||
                    existingDevice.identity.androidVersion !== androidVersion ||
                    existingDevice.identity.sdkVersion !== sdkVersion;

                if (needsUpdate) {
                    existingDevice.identity.brand = brand || 'Unknown';
                    existingDevice.identity.model = model || 'Unknown';
                    existingDevice.identity.androidVersion = androidVersion || 'Unknown';
                    existingDevice.identity.sdkVersion = sdkVersion || 0;
                    
                    // 更新设备名称
                    if (brand && brand !== 'Unknown' && model && model !== 'Unknown') {
                        existingDevice.name = `${brand} ${model}`.trim();
                    }
                    
                    existingDevice.updatedAt = new Date();
                    
                    // 保存到数据库
                    try {
                        await window.$mapi.db.execute(
                            `UPDATE device_unified SET brand = ?, model = ?, android_version = ?, sdk_version = ?, name = ?, updated_at = ? WHERE unified_id = ?`,
                            [
                                existingDevice.identity.brand,
                                existingDevice.identity.model,
                                existingDevice.identity.androidVersion,
                                existingDevice.identity.sdkVersion,
                                existingDevice.name,
                                existingDevice.updatedAt.toISOString(),
                                existingDevice.unifiedId
                            ]
                        );
                        console.log('[DeviceUnified] 设备信息已更新:', existingDevice.name);
                    } catch (err: any) {
                        console.error('[DeviceUnified] 更新设备信息失败:', err);
                    }
                } else {
                    console.log('[DeviceUnified] 设备信息无需更新:', existingDevice.name);
                }
            }
        } catch (err: any) {
            console.error('[DeviceUnified] 更新设备信息失败:', err);
        }
    }

    /**
     * 移除设备
     * 增量式：只标记为离线，不删除记录
     */
    function removeDevice(unifiedId: string) {
        const device = unifiedDevices.value.find(d => d.unifiedId === unifiedId)
        if (device) {
            // 将所有连接标记为离线
            device.connections.forEach(conn => {
                conn.status = EnumDeviceStatus.DISCONNECTED
            })
            device.updatedAt = new Date()
            console.log('[DeviceUnified] 设备已标记为离线:', device.name)
        }
    }

    /**
     * 更新设备名称
     */
    async function updateDeviceName(unifiedId: string, newName: string) {
        const device = unifiedDevices.value.find(d => d.unifiedId === unifiedId)
        if (device) {
            device.name = newName
            device.updatedAt = new Date()

            // 更新数据库
            try {
                await window.$mapi.db.execute(
                    `UPDATE device_unified SET name = ?, updated_at = ? WHERE unified_id = ?`,
                    [newName, device.updatedAt.toISOString(), unifiedId]
                )
                console.log('[DeviceUnified] 设备名称已更新:', newName)
            } catch (err: any) {
                console.error('[DeviceUnified] 更新设备名称失败:', err)
            }
        }
    }

    /**
     * 更新设备设置
     */
    async function updateDeviceSetting(unifiedId: string, setting: Partial<DeviceUnifiedRecord['setting']>) {
        const device = unifiedDevices.value.find(d => d.unifiedId === unifiedId)
        if (device) {
            device.setting = { ...device.setting, ...setting }
            device.updatedAt = new Date()

            // 更新数据库
            try {
                await window.$mapi.db.execute(
                    `UPDATE device_unified SET setting = ?, updated_at = ? WHERE unified_id = ?`,
                    [JSON.stringify(device.setting), device.updatedAt.toISOString(), unifiedId]
                )
                console.log('[DeviceUnified] 设备设置已更新:', unifiedId)
            } catch (err: any) {
                console.error('[DeviceUnified] 更新设备设置失败:', err)
            }
        }
    }

    /**
     * 添加设备标签
     */
    async function addDeviceTag(unifiedId: string, tag: string) {
        const device = unifiedDevices.value.find(d => d.unifiedId === unifiedId)
        if (device && !device.tags.includes(tag)) {
            device.tags.push(tag)
            device.updatedAt = new Date()

            // 更新数据库
            try {
                await window.$mapi.db.execute(
                    `UPDATE device_unified SET tags = ?, updated_at = ? WHERE unified_id = ?`,
                    [JSON.stringify(device.tags), device.updatedAt.toISOString(), unifiedId]
                )
                console.log('[DeviceUnified] 设备标签已添加:', tag)
            } catch (err: any) {
                console.error('[DeviceUnified] 添加设备标签失败:', err)
            }
        }
    }

    /**
     * 移除设备标签
     */
    async function removeDeviceTag(unifiedId: string, tag: string) {
        const device = unifiedDevices.value.find(d => d.unifiedId === unifiedId)
        if (device) {
            device.tags = device.tags.filter(t => t !== tag)
            device.updatedAt = new Date()

            // 更新数据库
            try {
                await window.$mapi.db.execute(
                    `UPDATE device_unified SET tags = ?, updated_at = ? WHERE unified_id = ?`,
                    [JSON.stringify(device.tags), device.updatedAt.toISOString(), unifiedId]
                )
                console.log('[DeviceUnified] 设备标签已移除:', tag)
            } catch (err: any) {
                console.error('[DeviceUnified] 移除设备标签失败:', err)
            }
        }
    }

    /**
     * 从数据库加载设备
     */
    async function loadFromDatabase() {
        try {
            const result = await window.$mapi.db.select(`
                SELECT 
                    du.*,
                    dc.connection_id,
                    dc.connection_type,
                    dc.status as connection_status,
                    dc.address,
                    dc.connected_at as conn_connected_at,
                    dc.last_active_at as conn_last_active_at,
                    dc.is_default
                FROM device_unified du
                LEFT JOIN device_connection dc ON du.unified_id = dc.unified_id
                ORDER BY du.last_connected_at DESC
            `)

            // 合并数据
            const deviceMap = new Map<string, DeviceUnifiedRecord>()
            
            for (const row of result) {
                if (!deviceMap.has(row.unified_id as string)) {
                    const device: DeviceUnifiedRecord = {
                        unifiedId: row.unified_id as string,
                        identity: {
                            hardwareId: row.hardware_id as string,
                            model: row.model as string,
                            brand: row.brand as string,
                            androidVersion: row.android_version as string,
                            sdkVersion: row.sdk_version as number,
                            fingerprint: row.fingerprint as string
                        },
                        name: row.name as string,
                        connections: [],
                        setting: JSON.parse(row.setting as string || '{}'),
                        tags: JSON.parse(row.tags as string || '[]'),
                        totalConnections: row.total_connections as number,
                        firstConnectedAt: new Date(row.first_connected_at as string),
                        lastConnectedAt: new Date(row.last_connected_at as string),
                        createdAt: new Date(row.created_at as string),
                        updatedAt: new Date(row.updated_at as string)
                    }
                    deviceMap.set(row.unified_id as string, device)
                }

                const device = deviceMap.get(row.unified_id as string)!
                if (row.connection_id) {
                    device.connections.push({
                        id: row.connection_id as string,
                        type: row.connection_type as EnumConnectionType,
                        status: row.connection_status as EnumDeviceStatus,
                        address: row.address as string,
                        connectedAt: new Date(row.conn_connected_at as string),
                        lastActiveAt: new Date(row.conn_last_active_at as string),
                        isDefault: !!row.is_default
                    })
                }
            }

            unifiedDevices.value = Array.from(deviceMap.values())
            console.log('[DeviceUnified] 从数据库加载设备:', unifiedDevices.value.length)
        } catch (err: any) {
            console.error('[DeviceUnified] 从数据库加载失败:', err)
            error.value = err.message
        }
    }

    /**
     * 清除离线设备（可选操作）
     */
    async function clearOfflineDevices() {
        const offlineDevices = unifiedDevices.value.filter(device => 
            device.connections.every(conn => conn.status === EnumDeviceStatus.DISCONNECTED)
        )

        for (const device of offlineDevices) {
            const index = unifiedDevices.value.findIndex(d => d.unifiedId === device.unifiedId)
            if (index !== -1) {
                unifiedDevices.value.splice(index, 1)
            }
        }

        console.log('[DeviceUnified] 清除离线设备:', offlineDevices.length)
    }

    // 保存设备 store 的监听器
    let stopWatchingDeviceStore: (() => void) | null = null
    
    /**
     * 初始化设备管理（页面加载时调用）
     * 复用设备 store 的实时监听功能
     */
    async function initialize() {
        console.log('[DeviceUnified] 初始化设备管理')
        
        // 1. 从数据库加载历史设备
        await loadFromDatabase()
        
        // 2. 同步当前设备状态（会强制刷新设备信息）
        await syncDevices()
        
        // 3. 监听设备 store 的变化，实现自动同步
        const deviceStore = useDeviceStore()
        stopWatchingDeviceStore = watch(
            () => deviceStore.records,
            async (newRecords, oldRecords) => {
                console.log('[DeviceUnified] 检测到设备 store 变化，开始同步...')
                console.log('[DeviceUnified] 旧记录数:', oldRecords?.length || 0)
                console.log('[DeviceUnified] 新记录数:', newRecords.length)
                
                // 防抖处理，避免频繁同步
                await syncDevices(false) // 不显示 loading
            },
            { deep: true }
        )
        
        console.log('[DeviceUnified] 设备管理初始化完成')
    }
    
    /**
     * 清理监听器
     */
    function cleanup() {
        if (stopWatchingDeviceStore) {
            stopWatchingDeviceStore()
            stopWatchingDeviceStore = null
            console.log('[DeviceUnified] 设备 store 监听器已清理')
        }
    }

    /**
     * 删除设备的指定连接方式
     * 如果只剩最后一个连接，则直接删除设备
     */
    async function removeDeviceConnection(unifiedId: string, connectionId: string) {
        const device = unifiedDevices.value.find(d => d.unifiedId === unifiedId)
        if (device) {
            const index = device.connections.findIndex(c => c.id === connectionId)
            if (index !== -1) {
                // 如果是最后一个连接，直接删除设备
                if (device.connections.length === 1) {
                    console.log(`[DeviceUnified] 最后一个连接，删除设备：${unifiedId}`)
                    await deleteDevice(unifiedId)
                    return
                }
                
                // 否则只删除连接
                device.connections.splice(index, 1)
                device.totalConnections--
                device.updatedAt = new Date()
                
                // 从数据库删除连接
                try {
                    await window.$mapi.db.execute(
                        `DELETE FROM device_connection WHERE connection_id = ?`,
                        [connectionId]
                    )
                    console.log(`[DeviceUnified] 连接已删除：${connectionId}`)
                } catch (err: any) {
                    console.error('[DeviceUnified] 删除连接失败:', err)
                    throw err
                }
            }
        }
    }

    /**
     * 完全删除设备（从内存和数据库）
     */
    async function deleteDevice(unifiedId: string) {
        // 从内存移除
        const index = unifiedDevices.value.findIndex(d => d.unifiedId === unifiedId)
        if (index !== -1) {
            unifiedDevices.value.splice(index, 1)
        }
        
        // 从数据库删除（先删除连接，再删除设备）
        try {
            await window.$mapi.db.execute(
                `DELETE FROM device_connection WHERE unified_id = ?`,
                [unifiedId]
            )
            await window.$mapi.db.execute(
                `DELETE FROM device_unified WHERE unified_id = ?`,
                [unifiedId]
            )
            console.log(`[DeviceUnified] 设备已删除：${unifiedId}`)
        } catch (err: any) {
            console.error('[DeviceUnified] 删除设备失败:', err)
            throw err
        }
    }

    return {
        // State
        unifiedDevices,
        isLoading,
        error,
        lastSyncTime,
        
        // Getters
        deviceCount,
        connectedDevices,
        usbDevices,
        wifiDevices,
        getDeviceByUnifiedId,
        getDeviceByHardwareId,
        
        // Actions
        initialize,
        syncDevices,
        addOrUpdateDevice,
        removeDevice,
        updateDeviceName,
        updateDeviceSetting,
        addDeviceTag,
        removeDeviceTag,
        loadFromDatabase,
        clearOfflineDevices,
        removeDeviceConnection,
        deleteDevice,
        cleanup
    }
})
