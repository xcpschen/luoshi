# DeviceIdentity 唯一标识重构说明

## 重构目标

将设备唯一标识简化为**只使用 MAC 地址**，移除所有其他标识方式（USB 序列号、设备 ID、设备指纹等）。

## 修改内容

### 1. **简化 `generateHardwareId` 方法**

**修改前：**
```typescript
static async generateHardwareId(device: Device): Promise<string> {
    // 优先级策略
    // 1. MAC 地址
    // 2. USB 序列号
    // 3. 设备 ID
    
    const macAddress = await this.getDeviceMACAddress(device.id);
    if (macAddress) {
        return `mac:${macAddress}`;
    }
    
    // 降级方案
    if (!device.id.includes(':')) {
        return `usb:${device.id}`;
    }
    
    return `device:${device.id}`;  // 或 fallback
}
```

**修改后：**
```typescript
static async generateHardwareId(device: Device): Promise<string> {
    // 只使用 MAC 地址
    const macAddress = await this.getDeviceMACAddress(device.id);
    if (macAddress) {
        return `mac:${macAddress}`;
    }
    
    // 无法获取 MAC 地址时抛出错误
    throw new Error(`Unable to get MAC address for device ${device.id}`);
}
```

**变化：**
- ✅ 移除了 USB 序列号降级方案
- ✅ 移除了设备 ID 降级方案
- ✅ 获取失败时抛出错误，而不是返回备用标识

### 2. **简化 `matchExistingDevice` 方法**

**修改前：**
```typescript
static async matchExistingDevice<T>(device: Device, existingDevices: T[]): Promise<T | null> {
    const hardwareId = await this.generateHardwareId(device);
    
    // 1. 匹配硬件 ID
    const matchedByHardwareId = existingDevices.find(
        d => d.identity.hardwareId === hardwareId
    );
    if (matchedByHardwareId) return matchedByHardwareId;
    
    // 2. 匹配设备 ID（备用）
    const matchedById = existingDevices.find(
        d => d.identity.hardwareId === `device:${device.id}`
    );
    if (matchedById) return matchedById;
    
    return null;
}
```

**修改后：**
```typescript
static async matchExistingDevice<T>(device: Device, existingDevices: T[]): Promise<T | null> {
    const hardwareId = await this.generateHardwareId(device);
    
    // 只匹配硬件 ID（MAC 地址）
    const matchedDevice = existingDevices.find(
        d => d.identity.hardwareId === hardwareId
    );
    
    if (matchedDevice) return matchedDevice;
    
    return null;
}
```

**变化：**
- ✅ 移除了设备 ID 备用匹配逻辑
- ✅ 只保留 MAC 地址精确匹配
- ✅ 简化了类型定义（移除了 `fingerprint` 字段）

### 3. **移除不再使用的方法**

**已移除的方法：**
- ❌ `generateFingerprint()` - 生成设备指纹（基于型号、Android 版本等）
- ❌ `updateHardwareId()` - 更新硬件 ID
- ❌ `isValidMACAddress()` - 验证 MAC 地址格式（已有 `ip.ts` 中的验证）
- ❌ `executeShellCommand()` - 执行 ADB shell 命令（由 `ip.ts` 处理）
- ❌ `md5()` - MD5 哈希计算

**清理的导入：**
- ❌ `import { createHash } from 'crypto'` - 不再需要

### 4. **保留的方法**

**核心方法：**
- ✅ `generateHardwareId()` - 生成硬件 ID（只使用 MAC）
- ✅ `getDeviceMACAddress()` - 获取 MAC 地址
- ✅ `matchExistingDevice()` - 匹配设备（只使用 MAC）

## 最终代码结构

```typescript
import { Device } from '@devicefarmer/adbkit';
import { getDeviceMAC } from './ip';

export class DeviceIdentity {
    /**
     * 生成设备硬件 ID
     * 只使用 MAC 地址作为设备的唯一标识
     */
    static async generateHardwareId(device: Device): Promise<string> {
        const macAddress = await this.getDeviceMACAddress(device.id);
        if (macAddress) {
            return `mac:${macAddress}`;
        }
        throw new Error(`Unable to get MAC address for device ${device.id}`);
    }
    
    /**
     * 获取设备 MAC 地址
     * 调用 ip.ts 模块获取 wlan0 网卡的 MAC 地址
     */
    static async getDeviceMACAddress(deviceId: string): Promise<string | null> {
        const mac = await getDeviceMAC(deviceId, 'wlan0');
        if (mac) {
            console.log(`[DeviceIdentity] 获取 MAC 地址成功：${mac}`);
            return mac;
        }
        return null;
    }
    
    /**
     * 匹配现有设备
     * 使用 MAC 地址进行精确匹配
     */
    static async matchExistingDevice<T>(device: Device, existingDevices: T[]): Promise<T | null> {
        const hardwareId = await this.generateHardwareId(device);
        const matchedDevice = existingDevices.find(
            d => d.identity.hardwareId === hardwareId
        );
        return matchedDevice || null;
    }
}
```

## 依赖关系

```
DeviceIdentity.ts
    ↓ 依赖
ip.ts (getDeviceMAC)
    ↓ 依赖
render.ts (adb.shell)
```

## 使用场景

### 场景 1：USB 和 WiFi 连接识别为同一设备

```typescript
// USB 连接
const usbDevice = { id: 'RPT0220113005709', type: 'device' };
const usbHardwareId = await DeviceIdentity.generateHardwareId(usbDevice);
// 返回："mac:aa:bb:cc:dd:ee:ff"

// WiFi 连接（同一设备）
const wifiDevice = { id: '192.168.0.104:5555', type: 'device' };
const wifiHardwareId = await DeviceIdentity.generateHardwareId(wifiDevice);
// 返回："mac:aa:bb:cc:dd:ee:ff"

// 两者硬件 ID 相同，识别为同一设备
usbHardwareId === wifiHardwareId  // true
```

### 场景 2：设备匹配

```typescript
const existingDevices = [
    { identity: { hardwareId: 'mac:aa:bb:cc:dd:ee:ff' }, unifiedId: 'device-1' },
    { identity: { hardwareId: 'mac:11:22:33:44:55:66' }, unifiedId: 'device-2' }
];

const newDevice = { id: '192.168.0.104:5555', type: 'device' };
const matched = await DeviceIdentity.matchExistingDevice(newDevice, existingDevices);

// 返回：{ identity: { hardwareId: 'mac:aa:bb:cc:dd:ee:ff' }, unifiedId: 'device-1' }
```

## 优势

### 1. **简化逻辑**
- ✅ 只有一种标识方式（MAC 地址）
- ✅ 移除了复杂的优先级策略
- ✅ 代码更易理解和维护

### 2. **准确识别**
- ✅ MAC 地址是设备的物理标识，不会改变
- ✅ USB 连接和 WiFi 连接可以正确识别为同一设备
- ✅ 避免了设备 ID 变化导致的识别问题

### 3. **减少错误**
- ✅ 移除了降级方案，避免了错误匹配
- ✅ 获取失败时抛出错误，便于问题排查
- ✅ 精确匹配，不会有模糊匹配的问题

### 4. **代码精简**
- ✅ 移除了 5 个不再使用的方法
- ✅ 减少了依赖（移除了 `crypto` 模块）
- ✅ 代码行数减少约 60%

## 注意事项

### 1. **MAC 地址获取失败处理**

如果设备无法获取 MAC 地址（如某些特殊设备），`generateHardwareId` 会抛出错误。调用方需要处理：

```typescript
try {
    const hardwareId = await DeviceIdentity.generateHardwareId(device);
    // 处理成功
} catch (error) {
    // 处理失败：记录日志、跳过设备等
    console.error('无法获取设备 MAC 地址:', error);
}
```

### 2. **设备缓存**

`DeviceIdentityCache` 类仍然保留，用于缓存已获取的硬件 ID，避免重复获取：

```typescript
// 先尝试从缓存获取
let hardwareId = DeviceIdentityCache.get(deviceId);

if (!hardwareId) {
    // 缓存未命中，生成新的硬件 ID
    hardwareId = await DeviceIdentity.generateHardwareId(device);
    // 保存到缓存
    DeviceIdentityCache.set(deviceId, hardwareId);
}
```

### 3. **数据库兼容性**

如果数据库中已有使用旧格式（`usb:*`, `device:*`, `fallback:*`）的硬件 ID，可能需要迁移：

```sql
-- 示例：更新旧格式的硬件 ID
UPDATE device_unified 
SET hardware_id = CONCAT('mac:', mac_address)
WHERE hardware_id LIKE 'usb:%' 
   OR hardware_id LIKE 'device:%'
   OR hardware_id LIKE 'fallback:%';
```

## 文件变更

### 修改的文件
- `/Users/chan/code/linkandroid/electron/mapi/adb/DeviceIdentity.ts`
  - 简化 `generateHardwareId` 方法
  - 简化 `matchExistingDevice` 方法
  - 移除 5 个不再使用的方法
  - 移除 `crypto` 模块导入

### 保留的文件
- `/Users/chan/code/linkandroid/electron/mapi/adb/ip.ts` - MAC 地址获取逻辑
- `/Users/chan/code/linkandroid/electron/mapi/adb/render.ts` - ADB 命令执行

## 更新日志

- **2024-03-30**: 重构唯一标识
  - 只保留 MAC 地址作为设备唯一标识
  - 移除 USB 序列号、设备 ID 等降级方案
  - 简化代码逻辑，提高可维护性
