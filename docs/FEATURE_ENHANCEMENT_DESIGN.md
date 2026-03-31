# LinkAndroid 功能增强技术设计文档

## 项目概述

本文档详细描述 LinkAndroid 项目的三大功能增强：
1. **设备管理重构** - 统一设备管理，树形管理方式
2. **批量操作功能** - 多设备文件和应用批量操作
3. **自动化操作** - 集成 Airtest 实现可视化自动化

---

# 第一部分：设备管理重构

## 1.1 需求分析

### 当前问题
1. 同一设备通过不同连接方式（USB/WiFi/网络）会被识别为多个设备
2. 设备列表重复，管理混乱
3. 无法查看设备的历史连接记录
4. 缺少统一的设备管理中心

### 目标
1. 统一设备标识，无论连接方式如何，同一设备只显示一次
2. 树形结构展示设备的管理方式（USB/WiFi/网络）
3. 新增设备管理页面，集中管理所有设备
4. 保留设备配置和操作的独立性

## 1.2 架构设计

### 1.2.1 数据模型设计

#### 新建设备统一标识

```typescript
// src/types/DeviceUnified.ts

// 设备唯一标识（基于硬件信息）
export type DeviceUnifiedIdentity = {
    // 硬件序列号（USB 设备）或 MAC 地址（网络设备）
    hardwareId: string;
    
    // 设备型号
    model: string;
    
    // 设备品牌
    brand: string;
    
    // Android 版本
    androidVersion: string;
    
    // SDK 版本
    sdkVersion: number;
    
    // 设备指纹（用于快速匹配）
    fingerprint: string;
};

// 连接方式
export enum EnumConnectionType {
    USB = "usb",              // USB 连接
    WIFI_DEBUG = "wifi_debug", // WiFi 调试
    NETWORK = "network",       // 网络设备（adb connect）
}

// 单个连接实例
export type DeviceConnection = {
    id: string;                        // 连接 ID（当前 ADB ID）
    type: EnumConnectionType;          // 连接类型
    status: EnumDeviceStatus;          // 连接状态
    address: string;                   // 连接地址（USB 设备为空，WiFi 为 IP:端口）
    connectedAt: Date;                 // 连接时间
    lastActiveAt: Date;                // 最后活跃时间
    isDefault: boolean;                // 是否为默认连接
};

// 统一的设备记录
export type DeviceUnifiedRecord = {
    // 基础信息
    unifiedId: string;                 // 统一设备 ID（UUID）
    identity: DeviceUnifiedIdentity;   // 设备身份信息
    name: string;                      // 用户自定义名称
    avatar?: string;                   // 设备头像/图标
    
    // 连接管理
    connections: DeviceConnection[];   // 所有连接实例
    activeConnectionId?: string;       // 当前活跃连接 ID
    
    // 配置信息
    setting: DeviceSetting;            // 设备配置
    tags: string[];                    // 设备标签
    
    // 统计信息
    totalConnections: number;          // 总连接次数
    firstConnectedAt: Date;            // 首次连接时间
    lastConnectedAt: Date;             // 最后连接时间
    
    // 元数据
    createdAt: Date;
    updatedAt: Date;
};

// 设备配置（扩展原有配置）
export type DeviceSetting = {
    // 投屏配置
    dimWhenMirror: string;
    alwaysTop: string;
    mirrorSound: string;
    videoBitRate: string;
    maxFps: string;
    videoCodec: string;
    videoBuffer: string;
    maxSize: string;
    scrcpyArgs: string;
    
    // 新增配置
    autoConnect: boolean;              // 是否自动连接
    autoBackup: boolean;               // 是否自动备份
    backupPath?: string;               // 备份路径
    notes?: string;                    // 设备备注
};
```

#### 数据库表设计

```sql
-- 统一设备表
CREATE TABLE device_unified (
    unified_id VARCHAR(64) PRIMARY KEY,
    hardware_id VARCHAR(128) NOT NULL,
    model VARCHAR(128),
    brand VARCHAR(128),
    android_version VARCHAR(32),
    sdk_version INTEGER,
    fingerprint VARCHAR(256),
    
    name VARCHAR(255),
    avatar TEXT,
    
    setting TEXT,  -- JSON 字符串
    tags TEXT,     -- JSON 数组
    
    total_connections INTEGER DEFAULT 0,
    first_connected_at DATETIME,
    last_connected_at DATETIME,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(hardware_id)
);

-- 设备连接表
CREATE TABLE device_connection (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unified_id VARCHAR(64) NOT NULL,
    connection_id VARCHAR(128) NOT NULL,  -- 当前 ADB ID
    connection_type VARCHAR(32) NOT NULL,
    status VARCHAR(32),
    address VARCHAR(128),
    connected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_active_at DATETIME,
    is_default BOOLEAN DEFAULT 0,
    
    FOREIGN KEY (unified_id) REFERENCES device_unified(unified_id),
    UNIQUE(unified_id, connection_id)
);

-- 创建索引
CREATE INDEX idx_device_connection_unified ON device_connection(unified_id);
CREATE INDEX idx_device_connection_status ON device_connection(status);
CREATE INDEX idx_device_hardware_id ON device_unified(hardware_id);
CREATE INDEX idx_device_fingerprint ON device_unified(fingerprint);
```

### 1.2.2 设备身份识别算法

```typescript
// electron/mapi/adb/deviceIdentity.ts

import { Device } from "@devicefarmer/adbkit";

export class DeviceIdentity {
    /**
     * 从设备信息生成硬件 ID
     * 优先级：serial > MAC address > model+sdk
     */
    static async generateHardwareId(device: Device): Promise<string> {
        // 1. 如果是 USB 设备，使用序列号
        if (!device.id.includes(':')) {
            return `usb:${device.id}`;
        }
        
        // 2. 获取 MAC 地址
        try {
            const macAddress = await this.getDeviceMACAddress(device.id);
            if (macAddress) {
                return `mac:${macAddress}`;
            }
        } catch (e) {
            console.warn('Failed to get MAC address:', e);
        }
        
        // 3. 使用型号+SDK 版本作为备用
        return `model:${device.model}:${device.sdkVersion}`;
    }
    
    /**
     * 获取设备 MAC 地址
     */
    static async getDeviceMACAddress(deviceId: string): Promise<string | null> {
        const adb = window.$mapi.adb;
        try {
            // 尝试多种方式获取 MAC
            const commands = [
                `cat /sys/class/net/wlan0/address`,
                `ip link show wlan0 | awk '/link\\/ether/ {print $2}'`,
                `getprop ro.boot.wifi_mac`,
            ];
            
            for (const cmd of commands) {
                const result = await adb.shell(deviceId, cmd);
                const mac = result.trim().toLowerCase();
                if (mac && mac.match(/^([0-9a-f]{2}:){5}[0-9a-f]{2}$/i)) {
                    return mac;
                }
            }
        } catch (e) {
            console.warn('Failed to get MAC:', e);
        }
        return null;
    }
    
    /**
     * 生成设备指纹（用于快速匹配）
     */
    static generateFingerprint(identity: DeviceUnifiedIdentity): string {
        const parts = [
            identity.model,
            identity.androidVersion,
            identity.sdkVersion,
        ];
        return this.md5(parts.join('|'));
    }
    
    /**
     * 匹配现有设备
     */
    static async matchExistingDevice(
        device: Device,
        existingDevices: DeviceUnifiedRecord[]
    ): Promise<DeviceUnifiedRecord | null> {
        const hardwareId = await this.generateHardwareId(device);
        
        // 1. 优先匹配硬件 ID
        let matched = existingDevices.find(d => d.identity.hardwareId === hardwareId);
        if (matched) {
            return matched;
        }
        
        // 2. 尝试匹配指纹
        const fingerprint = this.generateFingerprint({
            hardwareId,
            model: device.model,
            brand: '',
            androidVersion: '',
            sdkVersion: device.sdkVersion || 0,
        });
        
        matched = existingDevices.find(d => d.identity.fingerprint === fingerprint);
        if (matched) {
            // 更新硬件 ID
            await this.updateHardwareId(matched.unifiedId, hardwareId);
            return matched;
        }
        
        return null;
    }
}
```

## 1.3 核心功能实现

### 1.3.1 设备管理 Store

```typescript
// src/store/modules/deviceUnified.ts

import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { DeviceUnifiedRecord, DeviceConnection, EnumConnectionType } from "../../types/DeviceUnified";

export const useDeviceUnifiedStore = defineStore("deviceUnified", () => {
    const records = ref<DeviceUnifiedRecord[]>([]);
    const selectedUnifiedId = ref<string | null>(null);
    
    // 计算属性
    const selectedDevice = computed(() => {
        return records.value.find(d => d.unifiedId === selectedUnifiedId.value) || null;
    });
    
    const activeDevices = computed(() => {
        return records.value.filter(d => 
            d.connections.some(c => c.status === 'connected')
        );
    });
    
    // 方法
    const syncDevices = async () => {
        // 1. 从 ADB 获取当前连接的设备
        const adbDevices = await window.$mapi.adb.devices();
        
        // 2. 从数据库加载所有统一设备
        const unifiedDevices = await loadUnifiedDevicesFromDB();
        
        // 3. 匹配和更新
        for (const adbDevice of adbDevices) {
            const matched = await DeviceIdentity.matchExistingDevice(
                adbDevice,
                unifiedDevices
            );
            
            if (matched) {
                // 更新现有设备连接
                await updateDeviceConnection(matched, adbDevice);
            } else {
                // 创建新设备
                await createNewUnifiedDevice(adbDevice);
            }
        }
        
        // 4. 标记离线设备
        await markOfflineDevices(adbDevices);
        
        // 5. 更新 records
        records.value = await loadUnifiedDevicesFromDB();
    };
    
    const addConnection = async (
        unifiedId: string,
        connectionType: EnumConnectionType,
        connectionId: string,
        address?: string
    ) => {
        const connection: DeviceConnection = {
            id: connectionId,
            type: connectionType,
            status: 'connected',
            address: address || '',
            connectedAt: new Date(),
            lastActiveAt: new Date(),
            isDefault: false,
        };
        
        // 保存到数据库
        await saveConnectionToDB(unifiedId, connection);
        
        // 更新设备记录
        const device = records.value.find(d => d.unifiedId === unifiedId);
        if (device) {
            device.connections.push(connection);
            if (!device.activeConnectionId) {
                device.activeConnectionId = connectionId;
            }
        }
    };
    
    const removeConnection = async (unifiedId: string, connectionId: string) => {
        // 从数据库删除
        await deleteConnectionFromDB(unifiedId, connectionId);
        
        // 更新记录
        const device = records.value.find(d => d.unifiedId === unifiedId);
        if (device) {
            device.connections = device.connections.filter(c => c.id !== connectionId);
            if (device.activeConnectionId === connectionId) {
                device.activeConnectionId = device.connections[0]?.id;
            }
        }
    };
    
    const setActiveConnection = async (unifiedId: string, connectionId: string) => {
        const device = records.value.find(d => d.unifiedId === unifiedId);
        if (!device) return;
        
        // 更新默认连接
        device.connections.forEach(c => {
            c.isDefault = (c.id === connectionId);
        });
        device.activeConnectionId = connectionId;
        
        // 保存到数据库
        await updateActiveConnectionInDB(unifiedId, connectionId);
    };
    
    const getActiveConnection = (unifiedId: string): DeviceConnection | null => {
        const device = records.value.find(d => d.unifiedId === unifiedId);
        if (!device) return null;
        
        const activeId = device.activeConnectionId || device.connections[0]?.id;
        return device.connections.find(c => c.id === activeId) || null;
    };
    
    return {
        records,
        selectedUnifiedId,
        selectedDevice,
        activeDevices,
        syncDevices,
        addConnection,
        removeConnection,
        setActiveConnection,
        getActiveConnection,
    };
});
```

### 1.3.2 设备管理页面

```vue
<!-- src/pages/DeviceManage.vue -->
<template>
    <div class="device-manage-container">
        <!-- 左侧设备列表 -->
        <div class="device-list">
            <div class="search-bar">
                <a-input-search 
                    v-model="searchKeywords"
                    placeholder="搜索设备名称、型号、标签..."
                />
                <a-button @click="syncDevices" type="primary">
                    <icon-refresh /> 同步设备
                </a-button>
            </div>
            
            <div class="device-tree">
                <a-tree 
                    :data="treeData"
                    :selected-keys="[selectedUnifiedId]"
                    @select="onDeviceSelect"
                >
                    <template #icon="node">
                        <device-status-icon :status="node.status" />
                    </template>
                    <template #title="node">
                        <div class="device-tree-node">
                            <span class="device-name">{{ node.name }}</span>
                            <span class="device-model">{{ node.model }}</span>
                            <span class="connection-count" v-if="node.connections > 1">
                                {{ node.connections }} 个连接
                            </span>
                        </div>
                    </template>
                </a-tree>
            </div>
        </div>
        
        <!-- 右侧设备详情 -->
        <div class="device-detail">
            <div v-if="selectedDevice" class="detail-content">
                <!-- 设备基本信息 -->
                <div class="section">
                    <h3>设备信息</h3>
                    <div class="info-grid">
                        <div class="info-item">
                            <label>名称:</label>
                            <a-input v-model="selectedDevice.name" />
                        </div>
                        <div class="info-item">
                            <label>型号:</label>
                            <span>{{ selectedDevice.identity.model }}</span>
                        </div>
                        <div class="info-item">
                            <label>品牌:</label>
                            <span>{{ selectedDevice.identity.brand }}</span>
                        </div>
                        <div class="info-item">
                            <label>Android 版本:</label>
                            <span>{{ selectedDevice.identity.androidVersion }}</span>
                        </div>
                        <div class="info-item">
                            <label>标签:</label>
                            <a-select 
                                v-model="selectedDevice.tags" 
                                mode="tags"
                                placeholder="添加标签"
                            />
                        </div>
                    </div>
                </div>
                
                <!-- 连接管理 -->
                <div class="section">
                    <h3>连接管理</h3>
                    <div class="connection-list">
                        <a-table :data="selectedDevice.connections">
                            <template #columns>
                                <a-table-column title="连接类型" data-index="type">
                                    <template #cell="{ record }">
                                        <connection-type-badge :type="record.type" />
                                    </template>
                                </a-table-column>
                                <a-table-column title="地址" data-index="address" />
                                <a-table-column title="状态" data-index="status">
                                    <template #cell="{ record }">
                                        <device-status :status="record.status" />
                                    </template>
                                </a-table-column>
                                <a-table-column title="连接时间" data-index="connectedAt">
                                    <template #cell="{ record }">
                                        {{ formatDateTime(record.connectedAt) }}
                                    </template>
                                </a-table-column>
                                <a-table-column title="操作">
                                    <template #cell="{ record }">
                                        <a-button 
                                            v-if="!record.isDefault"
                                            @click="setAsDefault(record)"
                                            size="small"
                                        >
                                            设为默认
                                        </a-button>
                                        <a-button 
                                            @click="removeConnection(record)"
                                            size="small"
                                            status="danger"
                                        >
                                            删除
                                        </a-button>
                                    </template>
                                </a-table-column>
                            </template>
                        </a-table>
                    </div>
                    
                    <!-- 添加新连接 -->
                    <div class="add-connection">
                        <h4>添加新连接</h4>
                        <a-space>
                            <a-select v-model="newConnectionType" style="width: 150px">
                                <a-option value="wifi_debug">WiFi 调试</a-option>
                                <a-option value="network">网络设备</a-option>
                            </a-select>
                            <a-input 
                                v-model="newConnectionAddress" 
                                placeholder="IP 地址：端口"
                                style="width: 200px"
                            />
                            <a-button @click="addNewConnection" type="primary">
                                添加连接
                            </a-button>
                        </a-space>
                    </div>
                </div>
                
                <!-- 设备配置 -->
                <div class="section">
                    <h3>设备配置</h3>
                    <device-setting-form 
                        v-model="selectedDevice.setting"
                    />
                </div>
                
                <!-- 统计信息 -->
                <div class="section">
                    <h3>统计信息</h3>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <label>总连接次数:</label>
                            <span>{{ selectedDevice.totalConnections }}</span>
                        </div>
                        <div class="stat-item">
                            <label>首次连接:</label>
                            <span>{{ formatDateTime(selectedDevice.firstConnectedAt) }}</span>
                        </div>
                        <div class="stat-item">
                            <label>最后连接:</label>
                            <span>{{ formatDateTime(selectedDevice.lastConnectedAt) }}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <a-empty v-else description="请选择一个设备查看详情" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useDeviceUnifiedStore } from '../store/modules/deviceUnified';
import { DeviceUnifiedRecord } from '../types/DeviceUnified';

const deviceStore = useDeviceUnifiedStore();
const searchKeywords = ref('');
const selectedUnifiedId = ref<string | null>(null);
const newConnectionType = ref('wifi_debug');
const newConnectionAddress = ref('');

const selectedDevice = computed(() => deviceStore.selectedDevice);

const treeData = computed(() => {
    return deviceStore.records.map(device => ({
        key: device.unifiedId,
        title: device.name,
        icon: device.status,
        model: device.identity.model,
        connections: device.connections.length,
        children: device.connections.map(conn => ({
            key: `${device.unifiedId}-${conn.id}`,
            title: `${conn.type} - ${conn.address || 'USB'}`,
            icon: conn.status,
        }))
    }));
});

const onDeviceSelect = (keys: string[]) => {
    if (keys[0]) {
        const [unifiedId] = keys[0].split('-');
        selectedUnifiedId.value = unifiedId;
        deviceStore.selectedUnifiedId = unifiedId;
    }
};

const syncDevices = async () => {
    await deviceStore.syncDevices();
};

const setAsDefault = async (connection: any) => {
    await deviceStore.setActiveConnection(selectedDevice.value.unifiedId, connection.id);
};

const removeConnection = async (connection: any) => {
    await deviceStore.removeConnection(selectedDevice.value.unifiedId, connection.id);
};

const addNewConnection = async () => {
    if (!newConnectionAddress.value) {
        return;
    }
    
    try {
        if (newConnectionType.value === 'wifi_debug') {
            // WiFi 调试配对流程
            // TODO: 打开配对对话框
        } else {
            // 网络设备连接
            await window.$mapi.adb.connect(newConnectionAddress.value);
        }
        
        await deviceStore.addConnection(
            selectedDevice.value.unifiedId,
            newConnectionType.value as any,
            `${newConnectionAddress.value}`,
            newConnectionAddress.value
        );
        
        newConnectionAddress.value = '';
    } catch (e) {
        console.error('Failed to add connection:', e);
    }
};
</script>

<style scoped lang="less">
.device-manage-container {
    display: flex;
    height: calc(100vh - 4rem);
    
    .device-list {
        width: 350px;
        border-right: 1px solid var(--color-border);
        padding: 16px;
        
        .search-bar {
            margin-bottom: 16px;
            display: flex;
            gap: 8px;
        }
        
        .device-tree {
            :deep(.arco-tree-node-title) {
                .device-tree-node {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    
                    .device-name {
                        font-weight: 500;
                    }
                    
                    .device-model {
                        font-size: 12px;
                        color: var(--color-text-3);
                    }
                    
                    .connection-count {
                        font-size: 11px;
                        color: var(--color-primary);
                    }
                }
            }
        }
    }
    
    .device-detail {
        flex: 1;
        overflow-y: auto;
        padding: 24px;
        
        .section {
            margin-bottom: 32px;
            
            h3 {
                margin-bottom: 16px;
                font-size: 16px;
                font-weight: 600;
            }
            
            h4 {
                margin: 16px 0 8px;
                font-size: 14px;
            }
        }
        
        .info-grid, .stats-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
            
            .info-item, .stat-item {
                display: flex;
                flex-direction: column;
                gap: 4px;
                
                label {
                    font-size: 12px;
                    color: var(--color-text-3);
                }
            }
        }
    }
}
</style>
```

## 1.4 迁移方案

### 1.4.1 数据迁移脚本

```typescript
// electron/mapi/db/migration-device-unified.ts

export async function migrateToUnifiedDevices(db: Database) {
    console.log('Starting device migration...');
    
    // 1. 从旧设备表读取数据
    const oldDevices = db.select('SELECT * FROM devices') as any[];
    
    for (const oldDevice of oldDevices) {
        try {
            // 2. 生成硬件 ID
            const hardwareId = await generateHardwareIdFromOldDevice(oldDevice);
            
            // 3. 检查是否已存在
            const existing = db.first(
                'SELECT unified_id FROM device_unified WHERE hardware_id = ?',
                [hardwareId]
            );
            
            if (existing) {
                // 已存在，添加连接
                await db.execute(
                    `INSERT OR REPLACE INTO device_connection 
                     (unified_id, connection_id, connection_type, status, address, is_default)
                     VALUES (?, ?, ?, ?, ?, 1)`,
                    [
                        existing.unified_id,
                        oldDevice.device_id,
                        oldDevice.type,
                        oldDevice.status,
                        oldDevice.address || '',
                    ]
                );
            } else {
                // 新建设备
                const unifiedId = generateUUID();
                await db.execute(
                    `INSERT INTO device_unified 
                     (unified_id, hardware_id, model, name, setting, 
                      first_connected_at, last_connected_at, total_connections)
                     VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
                    [
                        unifiedId,
                        hardwareId,
                        oldDevice.model || '',
                        oldDevice.name,
                        oldDevice.setting,
                        new Date(),
                        new Date(),
                    ]
                );
                
                // 添加连接记录
                await db.execute(
                    `INSERT INTO device_connection 
                     (unified_id, connection_id, connection_type, status, address, is_default)
                     VALUES (?, ?, ?, ?, ?, 1)`,
                    [
                        unifiedId,
                        oldDevice.device_id,
                        oldDevice.type,
                        oldDevice.status,
                        oldDevice.address || '',
                    ]
                );
            }
        } catch (e) {
            console.error('Failed to migrate device:', oldDevice, e);
        }
    }
    
    console.log('Device migration completed');
}
```

---

# 第二部分：批量操作功能

## 2.1 需求分析

### 功能列表
1. 选择多个设备进行批量操作
2. 选择多个文件批量上传到设备
3. 批量删除设备文件
4. 批量安装应用到多个设备
5. 批量删除应用
6. 操作任务队列管理
7. 操作进度查看和取消

## 2.2 架构设计

### 2.2.1 批量操作任务模型

```typescript
// src/types/BatchOperation.ts

// 操作类型
export enum EnumBatchOperationType {
    FILE_UPLOAD = 'file_upload',
    FILE_DELETE = 'file_delete',
    FILE_DOWNLOAD = 'file_download',
    APP_INSTALL = 'app_install',
    APP_UNINSTALL = 'app_uninstall',
    SHELL_COMMAND = 'shell_command',
}

// 操作状态
export enum EnumOperationStatus {
    PENDING = 'pending',
    RUNNING = 'running',
    SUCCESS = 'success',
    FAILED = 'failed',
    CANCELLED = 'cancelled',
}

// 单个操作项
export interface BatchOperationItem {
    id: string;                    // 操作项 ID
    operationType: EnumBatchOperationType;
    status: EnumOperationStatus;
    progress: number;              // 进度 0-100
    
    // 目标设备
    targetDevices: string[];       // unifiedId 列表
    
    // 操作数据
    data: {
        // 文件操作
        sourceFiles?: string[];    // 源文件路径（本地）
        targetPath?: string;       // 目标路径（设备）
        
        // 应用操作
        apkFiles?: string[];       // APK 文件路径
        packageNames?: string[];   // 包名
        
        // Shell 命令
        command?: string;
        
        // 其他
        [key: string]: any;
    };
    
    // 执行结果
    result?: {
        successCount: number;
        failedCount: number;
        errors: Array<{
            deviceId: string;
            error: string;
        }>;
    };
    
    // 时间戳
    createdAt: Date;
    startedAt?: Date;
    completedAt?: Date;
}

// 批量操作任务
export interface BatchOperationTask {
    id: string;                    // 任务 ID
    name: string;                  // 任务名称
    items: BatchOperationItem[];   // 操作项列表
    status: EnumOperationStatus;   // 总体状态
    overallProgress: number;       // 总体进度
    
    // 配置
    config: {
        parallelDevices: number;   // 并行设备数（默认 3）
        retryTimes: number;        // 重试次数（默认 0）
        skipErrors: boolean;       // 跳过错误继续（默认 false）
    };
    
    // 统计
    statistics: {
        totalItems: number;
        successItems: number;
        failedItems: number;
        cancelledItems: number;
    };
    
    createdAt: Date;
    startedAt?: Date;
    completedAt?: Date;
}
```

### 2.2.2 批量操作管理器

```typescript
// electron/mapi/batchOperation/main.ts

import { EventEmitter } from 'events';
import { BatchOperationTask, BatchOperationItem, EnumOperationStatus } from '../../types/BatchOperation';

export class BatchOperationManager extends EventEmitter {
    private tasks: Map<string, BatchOperationTask> = new Map();
    private activeTasks: Set<string> = new Set();
    private readonly maxConcurrentTasks = 3;
    
    /**
     * 创建批量操作任务
     */
    async createTask(
        name: string,
        items: BatchOperationItem[],
        config?: Partial<BatchOperationTask['config']>
    ): Promise<string> {
        const taskId = this.generateTaskId();
        
        const task: BatchOperationTask = {
            id: taskId,
            name,
            items,
            status: EnumOperationStatus.PENDING,
            overallProgress: 0,
            config: {
                parallelDevices: 3,
                retryTimes: 0,
                skipErrors: false,
                ...config,
            },
            statistics: {
                totalItems: items.length,
                successItems: 0,
                failedItems: 0,
                cancelledItems: 0,
            },
            createdAt: new Date(),
        };
        
        this.tasks.set(taskId, task);
        this.emit('task-created', task);
        
        return taskId;
    }
    
    /**
     * 开始执行任务
     */
    async startTask(taskId: string): Promise<void> {
        const task = this.tasks.get(taskId);
        if (!task) {
            throw new Error(`Task ${taskId} not found`);
        }
        
        if (this.activeTasks.size >= this.maxConcurrentTasks) {
            throw new Error('Too many active tasks');
        }
        
        task.status = EnumOperationStatus.RUNNING;
        task.startedAt = new Date();
        this.activeTasks.add(taskId);
        
        this.emit('task-started', task);
        
        // 开始执行任务项
        this.executeTaskItems(task).then(() => {
            this.activeTasks.delete(taskId);
        });
    }
    
    /**
     * 执行任务项
     */
    private async executeTaskItems(task: BatchOperationTask): Promise<void> {
        const queue = [...task.items];
        const activeOperations: Promise<void>[] = [];
        
        while (queue.length > 0 || activeOperations.length > 0) {
            // 启动新的操作，直到达到并行限制
            while (activeOperations.length < task.config.parallelDevices && queue.length > 0) {
                const item = queue.shift()!;
                const promise = this.executeOperationItem(task, item)
                    .then(() => {
                        const index = activeOperations.indexOf(promise);
                        if (index > -1) {
                            activeOperations.splice(index, 1);
                        }
                    });
                activeOperations.push(promise);
            }
            
            // 等待至少一个操作完成
            if (activeOperations.length > 0) {
                await Promise.race(activeOperations);
            }
            
            // 更新总体进度
            this.updateTaskProgress(task);
        }
        
        // 所有操作完成
        task.status = EnumOperationStatus.SUCCESS;
        task.completedAt = new Date();
        this.emit('task-completed', task);
    }
    
    /**
     * 执行单个操作项
     */
    private async executeOperationItem(
        task: BatchOperationTask,
        item: BatchOperationItem
    ): Promise<void> {
        item.status = EnumOperationStatus.RUNNING;
        this.emit('item-started', { task, item });
        
        const results: Array<{ deviceId: string; success: boolean; error?: string }> = [];
        
        try {
            // 根据操作类型执行
            switch (item.operationType) {
                case EnumBatchOperationType.FILE_UPLOAD:
                    await this.executeFileUpload(task, item, results);
                    break;
                case EnumBatchOperationType.FILE_DELETE:
                    await this.executeFileDelete(task, item, results);
                    break;
                case EnumBatchOperationType.APP_INSTALL:
                    await this.executeAppInstall(task, item, results);
                    break;
                case EnumBatchOperationType.APP_UNINSTALL:
                    await this.executeAppUninstall(task, item, results);
                    break;
            }
            
            // 统计结果
            const successCount = results.filter(r => r.success).length;
            const failedCount = results.filter(r => !r.success).length;
            
            item.result = {
                successCount,
                failedCount,
                errors: results.filter(r => !r.success).map(r => ({
                    deviceId: r.deviceId,
                    error: r.error!,
                })),
            };
            
            item.status = failedCount > 0 
                ? EnumOperationStatus.FAILED 
                : EnumOperationStatus.SUCCESS;
            item.progress = 100;
            
        } catch (error: any) {
            item.status = EnumOperationStatus.FAILED;
            item.result = {
                successCount: 0,
                failedCount: item.targetDevices.length,
                errors: item.targetDevices.map(deviceId => ({
                    deviceId,
                    error: error.message,
                })),
            };
        }
        
        this.emit('item-completed', { task, item });
    }
    
    /**
     * 执行文件上传
     */
    private async executeFileUpload(
        task: BatchOperationTask,
        item: BatchOperationItem,
        results: any[]
    ): Promise<void> {
        const { sourceFiles, targetPath } = item.data;
        
        for (const deviceId of item.targetDevices) {
            try {
                // 获取活跃连接
                const connection = await this.getActiveConnection(deviceId);
                
                // 上传每个文件
                for (let i = 0; i < sourceFiles.length; i++) {
                    const sourceFile = sourceFiles[i];
                    const fileName = path.basename(sourceFile);
                    const devicePath = `${targetPath}/${fileName}`;
                    
                    await window.$mapi.adb.filePush(
                        connection.id,
                        sourceFile,
                        devicePath,
                        {
                            progress: (stats) => {
                                item.progress = Math.round((i / sourceFiles.length) * 100);
                            }
                        }
                    );
                }
                
                results.push({ deviceId, success: true });
            } catch (error: any) {
                results.push({ deviceId, success: false, error: error.message });
                
                if (!task.config.skipErrors) {
                    throw error;
                }
            }
        }
    }
    
    /**
     * 执行文件删除
     */
    private async executeFileDelete(
        task: BatchOperationTask,
        item: BatchOperationItem,
        results: any[]
    ): Promise<void> {
        const { targetFiles } = item.data;
        
        for (const deviceId of item.targetDevices) {
            try {
                const connection = await this.getActiveConnection(deviceId);
                
                for (const file of targetFiles) {
                    await window.$mapi.adb.fileDelete(connection.id, file);
                }
                
                results.push({ deviceId, success: true });
            } catch (error: any) {
                results.push({ deviceId, success: false, error: error.message });
                
                if (!task.config.skipErrors) {
                    throw error;
                }
            }
        }
    }
    
    /**
     * 执行应用安装
     */
    private async executeAppInstall(
        task: BatchOperationTask,
        item: BatchOperationItem,
        results: any[]
    ): Promise<void> {
        const { apkFiles } = item.data;
        
        for (const deviceId of item.targetDevices) {
            try {
                const connection = await this.getActiveConnection(deviceId);
                
                for (const apkFile of apkFiles) {
                    await window.$mapi.adb.install(connection.id, apkFile);
                }
                
                results.push({ deviceId, success: true });
            } catch (error: any) {
                results.push({ deviceId, success: false, error: error.message });
                
                if (!task.config.skipErrors) {
                    throw error;
                }
            }
        }
    }
    
    /**
     * 执行应用卸载
     */
    private async executeAppUninstall(
        task: BatchOperationTask,
        item: BatchOperationItem,
        results: any[]
    ): Promise<void> {
        const { packageNames } = item.data;
        
        for (const deviceId of item.targetDevices) {
            try {
                const connection = await this.getActiveConnection(deviceId);
                
                for (const packageName of packageNames) {
                    await window.$mapi.adb.uninstall(connection.id, packageName);
                }
                
                results.push({ deviceId, success: true });
            } catch (error: any) {
                results.push({ deviceId, success: false, error: error.message });
                
                if (!task.config.skipErrors) {
                    throw error;
                }
            }
        }
    }
    
    /**
     * 更新任务进度
     */
    private updateTaskProgress(task: BatchOperationTask): void {
        const totalProgress = task.items.reduce((sum, item) => sum + item.progress, 0);
        task.overallProgress = Math.round(totalProgress / task.items.length);
        this.emit('task-progress', { task, progress: task.overallProgress });
    }
    
    /**
     * 取消任务
     */
    async cancelTask(taskId: string): Promise<void> {
        const task = this.tasks.get(taskId);
        if (!task || task.status !== EnumOperationStatus.RUNNING) {
            return;
        }
        
        task.status = EnumOperationStatus.CANCELLED;
        task.completedAt = new Date();
        this.activeTasks.delete(taskId);
        
        this.emit('task-cancelled', task);
    }
    
    /**
     * 获取任务列表
     */
    getTasks(status?: EnumOperationStatus): BatchOperationTask[] {
        const tasks = Array.from(this.tasks.values());
        if (status) {
            return tasks.filter(t => t.status === status);
        }
        return tasks;
    }
    
    /**
     * 获取任务详情
     */
    getTask(taskId: string): BatchOperationTask | undefined {
        return this.tasks.get(taskId);
    }
}

export const batchOperationManager = new BatchOperationManager();
```

### 2.2.3 批量操作 UI 组件

```vue
<!-- src/components/BatchOperation/BatchOperationPanel.vue -->
<template>
    <div class="batch-operation-panel">
        <!-- 操作类型选择 -->
        <div class="operation-selector">
            <h3>选择操作类型</h3>
            <a-space>
                <a-radio-group v-model="operationType">
                    <a-radio value="file_upload">上传文件</a-radio>
                    <a-radio value="file_delete">删除文件</a-radio>
                    <a-radio value="app_install">安装应用</a-radio>
                    <a-radio value="app_uninstall">卸载应用</a-radio>
                </a-radio-group>
            </a-space>
        </div>
        
        <!-- 设备选择 -->
        <div class="device-selector">
            <h3>选择设备 ({{ selectedDevices.length }})</h3>
            <a-select
                v-model="selectedDevices"
                multiple
                placeholder="选择要操作的设备"
                style="width: 100%"
            >
                <a-option
                    v-for="device in availableDevices"
                    :key="device.unifiedId"
                    :value="device.unifiedId"
                >
                    <device-status-badge :status="device.status" />
                    {{ device.name }} ({{ device.identity.model }})
                </a-option>
            </a-select>
        </div>
        
        <!-- 文件/应用选择 -->
        <div class="target-selector" v-if="operationType === 'file_upload'">
            <h3>选择文件</h3>
            <a-space>
                <a-button @click="selectFiles">
                    <icon-upload /> 选择文件
                </a-button>
                <a-button @click="selectDirectory">
                    <icon-folder /> 选择目录
                </a-button>
            </a-space>
            
            <div class="file-list" v-if="selectedFiles.length > 0">
                <a-tag
                    v-for="file in selectedFiles"
                    :key="file"
                    closable
                    @close="removeFile(file)"
                >
                    {{ path.basename(file) }}
                </a-tag>
            </div>
            
            <a-input
                v-model="targetPath"
                placeholder="设备目标路径（默认：/sdcard/Download）"
                style="margin-top: 16px"
            />
        </div>
        
        <!-- 应用选择 -->
        <div class="target-selector" v-if="operationType === 'app_install'">
            <h3>选择 APK 文件</h3>
            <a-button @click="selectAPKFiles">
                <icon-upload /> 选择 APK
            </a-button>
            
            <div class="file-list" v-if="selectedAPKFiles.length > 0">
                <a-tag
                    v-for="file in selectedAPKFiles"
                    :key="file"
                    closable
                    @close="removeAPKFile(file)"
                >
                    {{ path.basename(file) }}
                </a-tag>
            </div>
        </div>
        
        <!-- 应用卸载 -->
        <div class="target-selector" v-if="operationType === 'app_uninstall'">
            <h3>输入包名</h3>
            <a-textarea
                v-model="packageNamesInput"
                placeholder="每行一个包名，例如：com.example.app"
                :auto-size="{ minRows: 3, maxRows: 10 }"
            />
        </div>
        
        <!-- 高级配置 -->
        <div class="advanced-config">
            <h3>高级配置</h3>
            <a-form layout="inline">
                <a-form-item label="并行设备数">
                    <a-input-number 
                        v-model="parallelDevices" 
                        :min="1" 
                        :max="10" 
                    />
                </a-form-item>
                <a-form-item label="重试次数">
                    <a-input-number 
                        v-model="retryTimes" 
                        :min="0" 
                        :max="3" 
                    />
                </a-form-item>
                <a-form-item>
                    <a-checkbox v-model="skipErrors">跳过错误继续</a-checkbox>
                </a-form-item>
            </a-form>
        </div>
        
        <!-- 操作按钮 -->
        <div class="action-buttons">
            <a-button 
                type="primary" 
                size="large"
                @click="createAndStartTask"
                :disabled="!canStart"
            >
                开始执行
            </a-button>
            <a-button @click="resetForm">重置</a-button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useDeviceUnifiedStore } from '../../store/modules/deviceUnified';
import { EnumBatchOperationType } from '../../types/BatchOperation';
import * as path from 'path';

const deviceStore = useDeviceUnifiedStore();

const operationType = ref<EnumBatchOperationType>('file_upload');
const selectedDevices = ref<string[]>([]);
const selectedFiles = ref<string[]>([]);
const selectedAPKFiles = ref<string[]>([]);
const targetPath = ref('/sdcard/Download');
const packageNamesInput = ref('');

const parallelDevices = ref(3);
const retryTimes = ref(0);
const skipErrors = ref(false);

const availableDevices = computed(() => deviceStore.activeDevices);

const canStart = computed(() => {
    if (selectedDevices.value.length === 0) return false;
    
    switch (operationType.value) {
        case 'file_upload':
            return selectedFiles.value.length > 0;
        case 'app_install':
            return selectedAPKFiles.value.length > 0;
        case 'app_uninstall':
            return packageNamesInput.value.trim().length > 0;
        default:
            return true;
    }
});

const selectFiles = async () => {
    const files = await window.$mapi.file.openFile({
        properties: ['multiSelections']
    });
    if (files) {
        selectedFiles.value = Array.isArray(files) ? files : [files];
    }
};

const selectAPKFiles = async () => {
    const files = await window.$mapi.file.openFile({
        filters: [{ name: 'APK Files', extensions: ['apk'] }],
        properties: ['multiSelections']
    });
    if (files) {
        selectedAPKFiles.value = Array.isArray(files) ? files : [files];
    }
};

const createAndStartTask = async () => {
    const items = [];
    
    switch (operationType.value) {
        case 'file_upload':
            items.push({
                operationType: EnumBatchOperationType.FILE_UPLOAD,
                targetDevices: selectedDevices.value,
                data: {
                    sourceFiles: selectedFiles.value,
                    targetPath: targetPath.value,
                },
            });
            break;
            
        case 'app_install':
            items.push({
                operationType: EnumBatchOperationType.APP_INSTALL,
                targetDevices: selectedDevices.value,
                data: {
                    apkFiles: selectedAPKFiles.value,
                },
            });
            break;
            
        case 'app_uninstall':
            const packageNames = packageNamesInput.value
                .split('\n')
                .map(p => p.trim())
                .filter(p => p.length > 0);
            
            items.push({
                operationType: EnumBatchOperationType.APP_UNINSTALL,
                targetDevices: selectedDevices.value,
                data: {
                    packageNames,
                },
            });
            break;
    }
    
    const taskId = await window.$mapi.batchOperation.createTask(
        `${operationType.value}_${Date.now()}`,
        items,
        {
            parallelDevices: parallelDevices.value,
            retryTimes: retryTimes.value,
            skipErrors: skipErrors.value,
        }
    );
    
    await window.$mapi.batchOperation.startTask(taskId);
    
    // 打开任务监控窗口
    openTaskMonitor(taskId);
};

const openTaskMonitor = (taskId: string) => {
    // TODO: 打开任务监控对话框
};
</script>

<style scoped lang="less">
.batch-operation-panel {
    padding: 24px;
    max-width: 800px;
    margin: 0 auto;
    
    .operation-selector,
    .device-selector,
    .target-selector,
    .advanced-config {
        margin-bottom: 24px;
        
        h3 {
            margin-bottom: 12px;
            font-size: 14px;
            font-weight: 600;
        }
    }
    
    .file-list {
        margin-top: 12px;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
    }
    
    .action-buttons {
        margin-top: 32px;
        display: flex;
        gap: 12px;
        justify-content: center;
    }
}
</style>
```

---

# 第三部分：自动化操作（集成 Airtest）

## 3.1 需求分析

### 功能列表
1. 可视化操作录制和回放
2. 定时任务调度
3. 操作频率控制
4. 图像识别和匹配
5. 脚本编辑和调试
6. 任务执行监控

## 3.2 架构设计

### 3.2.1 Airtest 集成方案

```typescript
// electron/mapi/automation/main.ts

import { spawn } from 'child_process';
import { EventEmitter } from 'events';

export interface AutomationAction {
    id: string;
    type: 'tap' | 'swipe' | 'text' | 'wait' | 'assert' | 'image';
    params: {
        x?: number;
        y?: number;
        duration?: number;
        text?: string;
        image?: string;  // base64 或文件路径
        threshold?: number;
        timeout?: number;
    };
    description?: string;
}

export interface AutomationScript {
    id: string;
    name: string;
    deviceId: string;  // unifiedId
    actions: AutomationAction[];
    config: {
        loop: boolean;
        loopTimes: number;
        interval: number;  // 毫秒
        errorHandling: 'stop' | 'continue' | 'retry';
        retryTimes: number;
    };
    createdAt: Date;
    updatedAt: Date;
}

export interface ScheduledTask {
    id: string;
    scriptId: string;
    deviceId: string;
    schedule: {
        type: 'once' | 'daily' | 'weekly' | 'cron';
        time?: string;  // HH:mm
        cronExpression?: string;
        daysOfWeek?: number[];  // 0-6
    };
    enabled: boolean;
    lastRunAt?: Date;
    nextRunAt?: Date;
}

export class AutomationManager extends EventEmitter {
    private scripts: Map<string, AutomationScript> = new Map();
    private scheduledTasks: Map<string, ScheduledTask> = new Map();
    private runningTasks: Map<string, any> = new Map();
    
    /**
     * 初始化 Airtest 环境
     */
    async init(): Promise<void> {
        // 检查 Airtest 是否安装
        const airtestPath = await this.checkAirtestInstallation();
        
        if (!airtestPath) {
            throw new Error('Airtest not installed');
        }
        
        // 启动 Airtest 服务
        await this.startAirtestServer(airtestPath);
    }
    
    /**
     * 检查 Airtest 安装
     */
    private async checkAirtestInstallation(): Promise<string | null> {
        try {
            // 尝试执行 airtest 命令
            const result = await this.execCommand('which airtest');
            return result.stdout.trim();
        } catch (e) {
            console.warn('Airtest not found in PATH');
            return null;
        }
    }
    
    /**
     * 启动 Airtest 服务
     */
    private async startAirtestServer(airtestPath: string): Promise<void> {
        // TODO: 实现 Airtest 服务启动
    }
    
    /**
     * 录制操作
     */
    async startRecording(deviceId: string): Promise<void> {
        const connection = await this.getDeviceConnection(deviceId);
        
        // 启动 ADB 截图和事件监听
        const process = spawn('adb', [
            '-s', connection.id,
            'shell', 'getevent', '-l'
        ]);
        
        process.stdout.on('data', (data) => {
            const events = this.parseInputEvents(data.toString());
            events.forEach(event => {
                this.emit('record-event', event);
            });
        });
        
        this.runningTasks.set(`record_${deviceId}`, process);
    }
    
    /**
     * 停止录制
     */
    stopRecording(deviceId: string): AutomationAction[] {
        const process = this.runningTasks.get(`record_${deviceId}`);
        if (process) {
            process.kill();
            this.runningTasks.delete(`record_${deviceId}`);
        }
        
        // 返回录制的动作
        return this.getRecordedActions(deviceId);
    }
    
    /**
     * 执行脚本
     */
    async executeScript(
        script: AutomationScript,
        options?: { loop?: boolean }
    ): Promise<void> {
        const connection = await this.getDeviceConnection(script.deviceId);
        
        console.log(`Executing script ${script.name} on device ${connection.id}`);
        
        let loopCount = 0;
        const maxLoops = options?.loop ? script.config.loopTimes : 1;
        
        while (loopCount < maxLoops) {
            for (const action of script.actions) {
                try {
                    await this.executeAction(connection.id, action);
                    
                    // 等待间隔
                    if (script.config.interval > 0) {
                        await this.sleep(script.config.interval);
                    }
                } catch (error: any) {
                    console.error(`Action failed: ${action.type}`, error);
                    
                    if (script.config.errorHandling === 'stop') {
                        throw error;
                    } else if (script.config.errorHandling === 'retry') {
                        // 重试逻辑
                        for (let i = 0; i < script.config.retryTimes; i++) {
                            try {
                                await this.executeAction(connection.id, action);
                                break;
                            } catch (retryError) {
                                if (i === script.config.retryTimes - 1) {
                                    throw retryError;
                                }
                            }
                        }
                    }
                    // continue: 继续下一个动作
                }
            }
            
            loopCount++;
            
            if (!options?.loop) {
                break;
            }
        }
    }
    
    /**
     * 执行单个动作
     */
    private async executeAction(
        deviceId: string,
        action: AutomationAction
    ): Promise<void> {
        switch (action.type) {
            case 'tap':
                await this.execTap(deviceId, action.params.x!, action.params.y!);
                break;
                
            case 'swipe':
                await this.execSwipe(
                    deviceId,
                    action.params.x!,
                    action.params.y!,
                    action.params.duration!
                );
                break;
                
            case 'text':
                await this.execText(deviceId, action.params.text!);
                break;
                
            case 'wait':
                await this.sleep(action.params.duration || 1000);
                break;
                
            case 'image':
                await this.execImageMatch(deviceId, action);
                break;
                
            case 'assert':
                await this.execAssert(deviceId, action);
                break;
        }
    }
    
    /**
     * 执行点击
     */
    private async execTap(deviceId: string, x: number, y: number): Promise<void> {
        await window.$mapi.adb.shell(
            deviceId,
            `input tap ${x} ${y}`
        );
    }
    
    /**
     * 执行滑动
     */
    private async execSwipe(
        deviceId: string,
        x1: number,
        y1: number,
        duration: number
    ): Promise<void> {
        const x2 = x1 + 100;  // 示例：向右滑动
        const y2 = y1;
        
        await window.$mapi.adb.shell(
            deviceId,
            `input swipe ${x1} ${y1} ${x2} ${y2} ${duration}`
        );
    }
    
    /**
     * 执行文本输入
     */
    private async execText(deviceId: string, text: string): Promise<void> {
        // 转义特殊字符
        const escapedText = text.replace(/ /g, '%s').replace(/'/g, "''");
        
        await window.$mapi.adb.shell(
            deviceId,
            `input text '${escapedText}'`
        );
    }
    
    /**
     * 执行图像匹配
     */
    private async execImageMatch(
        deviceId: string,
        action: AutomationAction
    ): Promise<void> {
        const { image, threshold = 0.8, timeout = 30000 } = action.params;
        
        // 使用 Airtest 的图像识别
        const result = await this.airtestFindImage(deviceId, image, threshold, timeout);
        
        if (result.found) {
            // 点击找到的图像位置
            await this.execTap(deviceId, result.x, result.y);
        } else {
            throw new Error(`Image not found: ${image}`);
        }
    }
    
    /**
     * Airtest 图像查找
     */
    private async airtestFindImage(
        deviceId: string,
        image: string,
        threshold: number,
        timeout: number
    ): Promise<{ found: boolean; x?: number; y?: number }> {
        // 调用 Airtest Python 脚本
        const script = `
import airtest
from airtest.core.api import *
auto_setup(__file__)
result = exists("${image}", threshold=${threshold}, timeout=${timeout/1000})
if result:
    print(f"{result[0]},{result[1]}")
else:
    print("not_found")
`;
        
        const output = await this.execPythonScript(script);
        
        if (output.includes('not_found')) {
            return { found: false };
        }
        
        const [x, y] = output.trim().split(',').map(Number);
        return { found: true, x, y };
    }
    
    /**
     * 创建定时任务
     */
    async createScheduledTask(task: ScheduledTask): Promise<string> {
        this.scheduledTasks.set(task.id, task);
        this.scheduleNextRun(task);
        return task.id;
    }
    
    /**
     * 调度下次运行
     */
    private scheduleNextRun(task: ScheduledTask): void {
        const now = new Date();
        let nextRun: Date;
        
        switch (task.schedule.type) {
            case 'once':
                nextRun = new Date(task.schedule.time!);
                break;
                
            case 'daily':
                nextRun = new Date(now);
                nextRun.setHours(...task.schedule.time!.split(':').map(Number));
                if (nextRun <= now) {
                    nextRun.setDate(nextRun.getDate() + 1);
                }
                break;
                
            case 'weekly':
                nextRun = new Date(now);
                nextRun.setHours(...task.schedule.time!.split(':').map(Number));
                const currentDay = nextRun.getDay();
                const targetDays = task.schedule.daysOfWeek!;
                let daysToAdd = 1;
                while (!targetDays.includes((currentDay + daysToAdd) % 7)) {
                    daysToAdd++;
                }
                nextRun.setDate(nextRun.getDate() + daysToAdd);
                break;
                
            case 'cron':
                // TODO: 使用 cron-parser 解析 cron 表达式
                nextRun = this.parseCronExpression(task.schedule.cronExpression!);
                break;
        }
        
        task.nextRunAt = nextRun;
        
        // 设置定时器
        const delay = nextRun.getTime() - Date.now();
        setTimeout(() => {
            this.executeScheduledTask(task);
        }, delay);
    }
    
    /**
     * 执行定时任务
     */
    private async executeScheduledTask(task: ScheduledTask): Promise<void> {
        const script = this.scripts.get(task.scriptId);
        if (!script) {
            console.error(`Script not found: ${task.scriptId}`);
            return;
        }
        
        console.log(`Executing scheduled task: ${task.id}`);
        task.lastRunAt = new Date();
        
        try {
            await this.executeScript(script);
        } catch (error) {
            console.error(`Scheduled task failed: ${task.id}`, error);
        }
        
        // 调度下次运行
        this.scheduleNextRun(task);
    }
}

export const automationManager = new AutomationManager();
```

### 3.2.2 可视化操作编辑器

```vue
<!-- src/pages/AutomationEditor.vue -->
<template>
    <div class="automation-editor">
        <!-- 工具栏 -->
        <div class="toolbar">
            <a-space>
                <a-button @click="startRecording" :loading="isRecording">
                    <icon-record /> {{ isRecording ? '录制中...' : '录制操作' }}
                </a-button>
                <a-button @click="stopRecording" :disabled="!isRecording">
                    <icon-stop /> 停止录制
                </a-button>
                <a-divider direction="vertical" />
                <a-button @click="addTapAction">
                    <icon-mind-mapping /> 添加点击
                </a-button>
                <a-button @click="addSwipeAction">
                    <icon-swap /> 添加滑动
                </a-button>
                <a-button @click="addTextAction">
                    <icon-font /> 添加文本
                </a-button>
                <a-button @click="addImageAction">
                    <icon-image /> 添加图像识别
                </a-button>
                <a-divider direction="vertical" />
                <a-button @click="runScript" type="primary">
                    <icon-play-arrow /> 运行脚本
                </a-button>
            </a-space>
        </div>
        
        <div class="editor-content">
            <!-- 左侧动作列表 -->
            <div class="action-list">
                <h3>动作序列</h3>
                <draggable 
                    v-model="script.actions" 
                    item-key="id"
                    @end="onDragEnd"
                >
                    <template #item="{ element, index }">
                        <div class="action-item" :class="{ active: selectedAction?.id === element.id }">
                            <div class="action-drag-handle">
                                <icon-drag-arrow />
                            </div>
                            <div class="action-icon">
                                <icon-mind-mapping v-if="element.type === 'tap'" />
                                <icon-swap v-else-if="element.type === 'swipe'" />
                                <icon-font v-else-if="element.type === 'text'" />
                                <icon-image v-else-if="element.type === 'image'" />
                            </div>
                            <div class="action-info" @click="selectAction(element)">
                                <div class="action-name">
                                    {{ getActionName(element) }}
                                </div>
                                <div class="action-desc">
                                    {{ element.description || '无描述' }}
                                </div>
                            </div>
                            <div class="action-actions">
                                <a-button 
                                    type="text" 
                                    size="small"
                                    @click="editAction(element)"
                                >
                                    <icon-edit />
                                </a-button>
                                <a-button 
                                    type="text" 
                                    size="small"
                                    status="danger"
                                    @click="deleteAction(index)"
                                >
                                    <icon-delete />
                                </a-button>
                            </div>
                        </div>
                    </template>
                </draggable>
            </div>
            
            <!-- 中间预览区域 -->
            <div class="preview-area">
                <h3>设备预览</h3>
                <a-select v-model="previewDeviceId" @change="loadDevicePreview">
                    <a-option
                        v-for="device in availableDevices"
                        :key="device.unifiedId"
                        :value="device.unifiedId"
                    >
                        {{ device.name }}
                    </a-option>
                </a-select>
                
                <div class="device-screen" @click="onScreenClick">
                    <img 
                        v-if="deviceScreenshot" 
                        :src="deviceScreenshot" 
                        alt="Device Screen"
                    />
                    <div 
                        v-for="action in script.actions" 
                        :key="action.id"
                        class="action-marker"
                        :style="getActionMarkerStyle(action)"
                    >
                        <icon-mind-mapping v-if="action.type === 'tap'" />
                    </div>
                </div>
            </div>
            
            <!-- 右侧配置面板 -->
            <div class="config-panel">
                <h3>动作配置</h3>
                <div v-if="selectedAction" class="action-config">
                    <a-form layout="vertical">
                        <a-form-item label="描述">
                            <a-input 
                                v-model="selectedAction.description"
                                placeholder="动作描述"
                            />
                        </a-form-item>
                        
                        <a-form-item 
                            v-if="['tap', 'swipe'].includes(selectedAction.type)"
                            label="坐标"
                        >
                            <a-space>
                                <a-input-number 
                                    v-model="selectedAction.params.x"
                                    placeholder="X"
                                    :min="0"
                                />
                                <a-input-number 
                                    v-model="selectedAction.params.y"
                                    placeholder="Y"
                                    :min="0"
                                />
                            </a-space>
                        </a-form-item>
                        
                        <a-form-item 
                            v-if="selectedAction.type === 'text'"
                            label="文本内容"
                        >
                            <a-textarea 
                                v-model="selectedAction.params.text"
                                placeholder="输入文本"
                            />
                        </a-form-item>
                        
                        <a-form-item 
                            v-if="selectedAction.type === 'image'"
                            label="图像模板"
                        >
                            <a-upload 
                                :file-list="imageFileList"
                                @change="onImageChange"
                            >
                                <a-button>
                                    <icon-upload /> 上传图像
                                </a-button>
                            </a-upload>
                        </a-form-item>
                        
                        <a-form-item 
                            v-if="selectedAction.type === 'wait'"
                            label="等待时间 (ms)"
                        >
                            <a-input-number 
                                v-model="selectedAction.params.duration"
                                :min="0"
                                :step="100"
                            />
                        </a-form-item>
                    </a-form>
                </div>
                <a-empty v-else description="请选择一个动作进行配置" />
            </div>
        </div>
        
        <!-- 脚本配置对话框 -->
        <a-modal
            v-model:visible="showScriptConfig"
            title="脚本配置"
            @ok="saveScriptConfig"
        >
            <a-form layout="vertical">
                <a-form-item label="脚本名称">
                    <a-input v-model="script.name" />
                </a-form-item>
                <a-form-item label="循环执行">
                    <a-checkbox v-model="script.config.loop">启用循环</a-checkbox>
                </a-form-item>
                <a-form-item 
                    v-if="script.config.loop"
                    label="循环次数"
                >
                    <a-input-number 
                        v-model="script.config.loopTimes"
                        :min="1"
                    />
                </a-form-item>
                <a-form-item label="动作间隔 (ms)">
                    <a-input-number 
                        v-model="script.config.interval"
                        :min="0"
                        :step="100"
                    />
                </a-form-item>
                <a-form-item label="错误处理">
                    <a-radio-group v-model="script.config.errorHandling">
                        <a-radio value="stop">停止</a-radio>
                        <a-radio value="continue">继续</a-radio>
                        <a-radio value="retry">重试</a-radio>
                    </a-radio-group>
                </a-form-item>
            </a-form>
        </a-modal>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { AutomationScript, AutomationAction } from '../types/Automation';
import { useDeviceUnifiedStore } from '../store/modules/deviceUnified';
import draggable from 'vuedraggable';

const deviceStore = useDeviceUnifiedStore();

const script = ref<AutomationScript>({
    id: '',
    name: '未命名脚本',
    deviceId: '',
    actions: [],
    config: {
        loop: false,
        loopTimes: 1,
        interval: 500,
        errorHandling: 'stop',
        retryTimes: 0,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
});

const isRecording = ref(false);
const selectedAction = ref<AutomationAction | null>(null);
const previewDeviceId = ref('');
const deviceScreenshot = ref<string | null>(null);
const showScriptConfig = ref(false);
const imageFileList = ref([]);

const availableDevices = computed(() => deviceStore.activeDevices);

const startRecording = async () => {
    if (!previewDeviceId.value) {
        return;
    }
    
    await window.$mapi.automation.startRecording(previewDeviceId.value);
    isRecording.value = true;
    
    // 监听录制事件
    window.$mapi.automation.on('record-event', (event) => {
        addRecordedAction(event);
    });
};

const stopRecording = async () => {
    if (!previewDeviceId.value) {
        return;
    }
    
    await window.$mapi.automation.stopRecording(previewDeviceId.value);
    isRecording.value = false;
};

const addTapAction = () => {
    const action: AutomationAction = {
        id: generateId(),
        type: 'tap',
        params: { x: 0, y: 0 },
        description: '点击',
    };
    script.value.actions.push(action);
};

const addSwipeAction = () => {
    const action: AutomationAction = {
        id: generateId(),
        type: 'swipe',
        params: { x: 0, y: 0, duration: 500 },
        description: '滑动',
    };
    script.value.actions.push(action);
};

const addTextAction = () => {
    const action: AutomationAction = {
        id: generateId(),
        type: 'text',
        params: { text: '' },
        description: '输入文本',
    };
    script.value.actions.push(action);
};

const addImageAction = () => {
    const action: AutomationAction = {
        id: generateId(),
        type: 'image',
        params: { image: '', threshold: 0.8, timeout: 30000 },
        description: '图像识别',
    };
    script.value.actions.push(action);
};

const selectAction = (action: AutomationAction) => {
    selectedAction.value = action;
};

const editAction = (action: AutomationAction) => {
    selectedAction.value = action;
    // 打开编辑对话框
};

const deleteAction = (index: number) => {
    script.value.actions.splice(index, 1);
    if (selectedAction.value?.id === script.value.actions[index]?.id) {
        selectedAction.value = null;
    }
};

const runScript = async () => {
    try {
        await window.$mapi.automation.executeScript(script.value);
    } catch (error) {
        console.error('Script execution failed:', error);
    }
};

const onScreenClick = async (event: MouseEvent) => {
    if (!isRecording.value) {
        return;
    }
    
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // 添加点击动作
    const action: AutomationAction = {
        id: generateId(),
        type: 'tap',
        params: { x, y },
        description: `点击 (${Math.round(x)}, ${Math.round(y)})`,
    };
    script.value.actions.push(action);
};

const getActionName = (action: AutomationAction) => {
    const names = {
        tap: '点击',
        swipe: '滑动',
        text: '输入',
        wait: '等待',
        image: '图像识别',
        assert: '断言',
    };
    return names[action.type] || action.type;
};

const getActionMarkerStyle = (action: AutomationAction) => {
    if (action.type === 'tap' && action.params.x && action.params.y) {
        return {
            left: `${action.params.x}px`,
            top: `${action.params.y}px`,
        };
    }
    return {};
};
</script>

<style scoped lang="less">
.automation-editor {
    display: flex;
    flex-direction: column;
    height: calc(100vh - 4rem);
    
    .toolbar {
        padding: 16px;
        border-bottom: 1px solid var(--color-border);
    }
    
    .editor-content {
        display: flex;
        flex: 1;
        overflow: hidden;
        
        .action-list {
            width: 300px;
            border-right: 1px solid var(--color-border);
            padding: 16px;
            overflow-y: auto;
            
            .action-item {
                display: flex;
                align-items: center;
                padding: 12px;
                margin-bottom: 8px;
                background: var(--color-bg-2);
                border-radius: 4px;
                cursor: pointer;
                
                &:hover {
                    background: var(--color-bg-3);
                }
                
                &.active {
                    border: 2px solid var(--color-primary);
                }
                
                .action-drag-handle {
                    cursor: move;
                    margin-right: 8px;
                }
                
                .action-icon {
                    font-size: 20px;
                    margin-right: 12px;
                    color: var(--color-primary);
                }
                
                .action-info {
                    flex: 1;
                    
                    .action-name {
                        font-weight: 500;
                        margin-bottom: 4px;
                    }
                    
                    .action-desc {
                        font-size: 12px;
                        color: var(--color-text-3);
                    }
                }
                
                .action-actions {
                    display: flex;
                    gap: 4px;
                }
            }
        }
        
        .preview-area {
            flex: 1;
            padding: 16px;
            overflow-y: auto;
            
            .device-screen {
                position: relative;
                margin-top: 16px;
                border: 1px solid var(--color-border);
                border-radius: 4px;
                overflow: hidden;
                
                img {
                    width: 100%;
                    display: block;
                }
                
                .action-marker {
                    position: absolute;
                    width: 20px;
                    height: 20px;
                    background: rgba(var(--color-primary-rgb), 0.5);
                    border-radius: 50%;
                    transform: translate(-50%, -50%);
                    pointer-events: none;
                }
            }
        }
        
        .config-panel {
            width: 350px;
            border-left: 1px solid var(--color-border);
            padding: 16px;
            overflow-y: auto;
        }
    }
}
</style>
```

---

# 第四部分：实施计划

## 4.1 开发阶段划分

### 阶段一：设备管理重构（2 周）

**Week 1:**
- [ ] 数据库表结构设计和迁移
- [ ] DeviceUnified 类型定义
- [ ] DeviceIdentity 身份识别算法实现
- [ ] 设备管理 Store 开发

**Week 2:**
- [ ] 设备管理页面开发
- [ ] 设备树形展示组件
- [ ] 连接管理功能
- [ ] 数据迁移脚本和测试

### 阶段二：批量操作功能（2 周）

**Week 3:**
- [ ] 批量操作任务模型定义
- [ ] BatchOperationManager 实现
- [ ] IPC 通信接口
- [ ] 文件批量上传/下载

**Week 4:**
- [ ] 应用批量安装/卸载
- [ ] 批量操作 UI 组件
- [ ] 任务监控和进度显示
- [ ] 错误处理和重试机制

### 阶段三：自动化操作（3 周）

**Week 5:**
- [ ] Airtest 集成和环境检测
- [ ] AutomationManager 实现
- [ ] 基本动作执行（点击、滑动、文本）
- [ ] 操作录制功能

**Week 6:**
- [ ] 图像识别功能
- [ ] 可视化编辑器开发
- [ ] 脚本配置和管理
- [ ] 设备预览和动作标记

**Week 7:**
- [ ] 定时任务调度器
- [ ] 任务执行监控
- [ ] 错误处理和日志
- [ ] 完整功能测试

### 阶段四：集成测试和优化（1 周）

**Week 8:**
- [ ] 端到端集成测试
- [ ] 性能优化
- [ ] Bug 修复
- [ ] 文档编写
- [ ] 用户验收测试

## 4.2 技术难点和解决方案

### 难点 1：设备身份唯一性识别

**问题：** 如何确保同一设备无论通过何种方式连接都能正确识别

**解决方案：**
1. 优先级策略：USB 序列号 > MAC 地址 > 设备指纹
2. 多因子匹配：结合型号、Android 版本、SDK 版本
3. 自学习机制：根据连接历史优化匹配算法

### 难点 2：批量操作的并发控制

**问题：** 多设备并发操作时的资源竞争和错误处理

**解决方案：**
1. 信号量控制并发数量
2. 任务队列管理
3. 事务性操作（支持回滚）
4. 细粒度进度跟踪

### 难点 3：Airtest 图像识别性能

**问题：** 图像匹配的准确性和速度

**解决方案：**
1. 多阈值策略
2. 图像金字塔加速
3. GPU 加速（如可用）
4. 缓存匹配结果

### 难点 4：跨平台兼容性

**问题：** Windows、macOS、Linux 平台的差异

**解决方案：**
1. 统一抽象层
2. 平台特定实现
3. 充分测试矩阵
4. CI/CD 自动化测试

## 4.3 风险评估

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| Airtest 集成复杂度高 | 高 | 中 | 提前调研，预留缓冲时间 |
| 设备识别算法不准确 | 高 | 低 | 多轮测试，用户反馈机制 |
| 批量操作性能问题 | 中 | 中 | 性能测试，优化算法 |
| 数据迁移丢失 | 高 | 低 | 完整备份，回滚方案 |

---

# 第五部分：总结

本技术设计文档详细描述了 LinkAndroid 项目的三大功能增强：

1. **设备管理重构** - 实现统一设备标识和树形管理
2. **批量操作** - 支持多设备文件和应用的批量操作
3. **自动化操作** - 集成 Airtest 实现可视化自动化

每个功能模块都包含：
- 详细的需求分析
- 完整的架构设计
- 数据模型定义
- 核心代码实现
- UI 组件设计
- 测试和迁移方案

预计总开发周期为 **8 周**，分为 4 个阶段实施。

通过本方案的实施，LinkAndroid 将具备：
- 更强大的设备管理能力
- 高效的批量操作功能
- 可视化的自动化操作
- 更好的用户体验

这将显著提升产品的竞争力和用户满意度。
