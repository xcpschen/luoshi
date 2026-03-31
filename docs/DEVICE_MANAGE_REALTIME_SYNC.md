# 设备管理实时监听功能

## 概述

实现设备管理页面实时监听设备连接状态变化，复用设备 store 的监听机制，确保重启后能够重新获取设备信息。

## 问题描述

用户反馈的问题：
1. **没有实时监听连接状态** - 设备连接/断开时，设备管理页面不更新
2. **重启后没有重新获取** - 应用重启后，设备信息没有重新获取
3. **没有复用设备页面的运行状态** - 设备管理页面应该使用设备 store 的实时状态

## 实现方案

### 1. 复用设备 Store 的监听机制

设备 store 已经有完善的监听机制：
- **ADB Watch**：通过 `$mapi.adb.watch()` 监听设备变化
- **WebSocket 推送**：设备连接/断开时自动刷新
- **定时刷新**：定期调用 `refresh()` 更新设备状态

设备管理页面不需要自己实现监听，只需要：
1. 监听设备 store 的 `records` 变化
2. 当设备变化时，自动同步到设备管理页面

### 2. 实时监听实现

#### 2.1 设置监听器

在设备管理页面挂载时设置监听器：

```typescript
const setupDeviceWatcher = () => {
    // 监听设备 store 的 records 变化
    stopWatchingDevices = watch(
        () => deviceStore.records,
        async (newRecords, oldRecords) => {
            console.log('[DeviceManage] 检测到设备变化，开始同步...')
            
            // 设备数量变化或设备列表变化时，重新同步
            if (newRecords.length !== oldRecords?.length || 
                newRecords.some((r, i) => r.id !== oldRecords?.[i]?.id)) {
                console.log('[DeviceManage] 设备列表发生变化，重新同步')
                await deviceUnifiedStore.syncDevices()
            }
        },
        { deep: true }
    )
    
    console.log('[DeviceManage] 设备监听器已设置')
}
```

#### 2.2 清理监听器

在页面卸载时清理监听器：

```typescript
onUnmounted(() => {
    cleanupDeviceWatcher()
})
```

### 3. 重启后重新获取设备信息

#### 3.1 初始化流程

```typescript
async function initialize() {
    console.log('[DeviceUnified] 初始化设备管理')
    
    // 1. 从数据库加载历史设备
    await loadFromDatabase()
    
    // 2. 同步当前设备状态（会强制刷新设备信息）
    await syncDevices()
    
    console.log('[DeviceUnified] 设备管理初始化完成')
}
```

#### 3.2 强制刷新策略

在 `syncDevices()` 中判断是否需要强制刷新：

```typescript
// 如果是首次同步（所有设备都标记为离线），则强制刷新设备信息
const isInitialSync = unifiedDevices.value.every(device => 
    device.connections.every(conn => conn.status === EnumDeviceStatus.DISCONNECTED)
)

for (const deviceRecord of deviceRecords) {
    const isDeviceConnected = deviceRecord.runtime?.status === EnumDeviceStatus.CONNECTED
    // 首次同步或设备连接时，强制刷新设备信息
    const forceRefresh = isInitialSync || isDeviceConnected
    await addOrUpdateDeviceFromRecord(deviceRecord, forceRefresh)
}
```

#### 3.3 设备信息更新逻辑

```typescript
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
```

### 4. 连接状态同步

#### 4.1 标记离线设备

在同步开始时，先标记所有设备为离线：

```typescript
// 先标记所有设备为离线（用于检测断开连接的设备）
unifiedDevices.value.forEach(device => {
    device.connections.forEach(conn => {
        conn.status = EnumDeviceStatus.DISCONNECTED
    })
})
```

#### 4.2 更新连接状态

在 `updateDeviceConnection()` 中更新连接状态：

```typescript
function updateDeviceConnection(existingDevice: DeviceUnifiedRecord, adbDevice: any) {
    const existingConnection = existingDevice.connections.find(
        conn => conn.address === adbDevice.id
    )

    if (existingConnection) {
        // 更新现有连接状态
        existingConnection.status = adbDevice.state as EnumDeviceStatus || 'offline'
        existingConnection.lastActiveAt = new Date()
    } else {
        // 添加新连接
        // ...
    }
}
```

## 代码变更

### 文件：`src/pages/DeviceManage.vue`

#### 1. 导入必要的模块

```typescript
import { computed, ref, onMounted, onUnmounted, watch } from "vue";
import { useDeviceStore } from "../store/modules/device";
```

#### 2. 添加监听器管理

```typescript
const deviceStore = useDeviceStore();
let stopWatchingDevices: (() => void) | null = null

const setupDeviceWatcher = () => {
    stopWatchingDevices = watch(
        () => deviceStore.records,
        async (newRecords, oldRecords) => {
            if (newRecords.length !== oldRecords?.length || 
                newRecords.some((r, i) => r.id !== oldRecords?.[i]?.id)) {
                await deviceUnifiedStore.syncDevices()
            }
        },
        { deep: true }
    )
}

const cleanupDeviceWatcher = () => {
    if (stopWatchingDevices) {
        stopWatchingDevices()
        stopWatchingDevices = null
    }
}
```

#### 3. 修改生命周期钩子

```typescript
onMounted(() => {
    // 初始化设备管理
    deviceUnifiedStore.initialize().then(() => {
        console.log('[DeviceManage] 初始化完成')
    }).catch(err => {
        console.error('[DeviceManage] 初始化失败:', err)
    })
    
    // 设置设备监听器，实现实时更新
    setupDeviceWatcher()
});

onUnmounted(() => {
    // 清理监听器
    cleanupDeviceWatcher()
});
```

### 文件：`src/store/modules/deviceUnified.ts`

#### 1. 添加 `initialize()` 方法

```typescript
async function initialize() {
    console.log('[DeviceUnified] 初始化设备管理')
    
    // 1. 从数据库加载历史设备
    await loadFromDatabase()
    
    // 2. 同步当前设备状态（会强制刷新设备信息）
    await syncDevices()
    
    console.log('[DeviceUnified] 设备管理初始化完成')
}
```

#### 2. 修改 `syncDevices()` 方法

```typescript
async function syncDevices() {
    // ...
    
    // 判断是否是首次同步
    const isInitialSync = unifiedDevices.value.every(device => 
        device.connections.every(conn => conn.status === EnumDeviceStatus.DISCONNECTED)
    )
    
    for (const deviceRecord of deviceRecords) {
        const isDeviceConnected = deviceRecord.runtime?.status === EnumDeviceStatus.CONNECTED
        const forceRefresh = isInitialSync || isDeviceConnected
        await addOrUpdateDeviceFromRecord(deviceRecord, forceRefresh)
    }
    
    // ...
}
```

#### 3. 修改 `addOrUpdateDeviceFromRecord()` 方法

```typescript
async function addOrUpdateDeviceFromRecord(deviceRecord: any, forceRefresh: boolean = false) {
    const adbDevice = {
        ...deviceRecord,
        state: status === EnumDeviceStatus.CONNECTED ? 'device' : 
               status === EnumDeviceStatus.WAIT_CONNECTING ? 'unauthorized' : 'offline',
        _forceRefresh: forceRefresh  // 传递强制刷新标志
    }
    
    await addOrUpdateDevice(adbDevice)
}
```

#### 4. 修改 `addOrUpdateDevice()` 方法

```typescript
async function addOrUpdateDevice(adbDevice: any) {
    if (existingDevice) {
        updateDeviceConnection(existingDevice, adbDevice)
        
        // 检查是否需要刷新设备信息
        const needsInfoUpdate = adbDevice._forceRefresh ||
            !existingDevice.identity.brand || existingDevice.identity.brand === 'Unknown' ||
            !existingDevice.identity.model || existingDevice.identity.model === 'Unknown'
        
        if (needsInfoUpdate) {
            await updateDeviceInfo(existingDevice, adbDevice)
        }
    }
}
```

## 日志输出

### 页面加载初始化

```
[DeviceUnified] 初始化设备管理
[DeviceUnified] 从数据库加载设备：5
[DeviceUnified] 开始同步设备，设备 store 记录数：2
[DeviceUnified] 更新设备信息：mac:AA:BB:CC:DD:EE:FF
[DeviceUnified] 设备信息已更新：Xiaomi MI 9
[DeviceUnified] 设备同步完成，总计：2
[DeviceUnified] 设备管理初始化完成
[DeviceManage] 初始化完成
[DeviceManage] 设备监听器已设置
```

### 设备连接时

```
[Device] adb.devices() 结果：[{ id: '192.168.1.100:5555', ... }]
[Device] 开始获取设备信息：192.168.1.100:5555
[Device] 获取到的设备信息：{ brand: 'Xiaomi', model: 'MI 9', version: '11', sdkVersion: '30' }
[DeviceManage] 检测到设备变化，开始同步...
[DeviceManage] 设备列表发生变化，重新同步
[DeviceUnified] 开始同步设备，设备 store 记录数：3
[DeviceUnified] 创建新设备：192.168.1.100:5555 mac:AA:BB:CC:DD:EE:FF
[DeviceUnified] 设备同步完成，总计：3
```

### 设备断开时

```
[Device] adb.devices() 结果：[]
[DeviceManage] 检测到设备变化，开始同步...
[DeviceManage] 设备列表发生变化，重新同步
[DeviceUnified] 开始同步设备，设备 store 记录数：0
[DeviceUnified] 没有检测到设备
```

### 刷新页面时

```
[DeviceUnified] 初始化设备管理
[DeviceUnified] 从数据库加载设备：3
[DeviceUnified] 开始同步设备，设备 store 记录数：2
[DeviceUnified] 更新现有设备连接状态：Xiaomi MI 9
[DeviceUnified] 设备信息已完整，跳过信息获取：Xiaomi MI 9
[DeviceUnified] 设备同步完成，总计：2
```

## 功能测试

### 测试场景 1：页面加载

1. 打开设备管理页面
2. 查看控制台日志，应显示"初始化设备管理"
3. 验证设备列表正确显示

### 测试场景 2：设备连接

1. 连接新设备（USB 或 WiFi）
2. 查看设备管理页面，应自动显示新设备
3. 查看控制台日志，应显示"检测到设备变化"

### 测试场景 3：设备断开

1. 断开设备连接
2. 查看设备管理页面，设备应标记为离线
3. 查看控制台日志，应显示"检测到设备变化"

### 测试场景 4：应用重启

1. 重启应用
2. 打开设备管理页面
3. 查看控制台日志，应显示"更新设备信息"
4. 验证设备信息被重新获取

### 测试场景 5：刷新页面

1. 在设备管理页面点击刷新按钮
2. 查看控制台日志，应显示"设备信息已完整，跳过信息获取"
3. 验证连接状态正确更新

## 性能优化

### 避免不必要的刷新

通过 `watch` 的 `deep: true` 选项深度监听设备变化，但只在设备列表真正变化时才同步：

```typescript
if (newRecords.length !== oldRecords?.length || 
    newRecords.some((r, i) => r.id !== oldRecords?.[i]?.id)) {
    await deviceUnifiedStore.syncDevices()
}
```

### 避免重复获取设备信息

通过 `_forceRefresh` 标志控制何时获取设备信息：

- 首次同步（重启后）：强制刷新
- 设备信息不完整：强制刷新
- 其他情况：跳过获取

## 相关文件

- `src/pages/DeviceManage.vue` - 设备管理页面
- `src/store/modules/deviceUnified.ts` - 设备统一管理 store
- `src/store/modules/device.ts` - 设备 store（提供实时监听）

## 相关文档

- [DEVICE_INFO_CACHE_OPTIMIZATION.md](./DEVICE_INFO_CACHE_OPTIMIZATION.md) - 设备信息缓存优化
- [DEVICE_INFO_FALLBACK_STRATEGY.md](./DEVICE_INFO_FALLBACK_STRATEGY.md) - 设备信息 fallback 策略
