# IP 模块架构说明

## 架构设计

### 模块职责分离

```
┌─────────────────────────┐
│   DeviceIdentity.ts     │  ← 设备身份识别逻辑
│   - 生成硬件 ID          │
│   - 匹配设备            │
│   - 生成指纹            │
└───────────┬─────────────┘
            │ 调用
            ↓
┌─────────────────────────┐
│      ip.ts              │  ← IP 命令执行与解析
│   - getDeviceMAC()      │
│   - getDeviceNetworkInterfaces() │
│   - parseIpOutput()     │
└───────────┬─────────────┘
            │ 调用
            ↓
┌─────────────────────────┐
│    render.ts (adb)      │  ← ADB 命令执行
│   - shell()             │
│   - adbShell()          │
└─────────────────────────┘
```

## 对外接口

### ip.ts 提供的接口

#### 1. `getDeviceMAC(deviceId: string, ifname?: string): Promise<string | null>`

**功能**：获取设备指定网卡的 MAC 地址

**参数**：
- `deviceId`: 设备 ID（必填）
- `ifname`: 网卡名称（可选，默认 'wlan0'）

**返回**：MAC 地址字符串（小写），获取失败返回 null

**示例**：
```typescript
import { getDeviceMAC } from './ip';

const mac = await getDeviceMAC('RPT0220113005709', 'wlan0');
// 返回："aa:bb:cc:dd:ee:ff"
```

#### 2. `getDeviceNetworkInterfaces(deviceId: string): Promise<NetworkInterface[]>`

**功能**：获取设备的所有网络接口信息

**参数**：
- `deviceId`: 设备 ID

**返回**：网络接口数组

**示例**：
```typescript
import { getDeviceNetworkInterfaces } from './ip';

const interfaces = await getDeviceNetworkInterfaces('RPT0220113005709');
// 返回：
// [
//   {
//     ifindex: "2",
//     ifname: "wlan0",
//     flags: ["BROADCAST", "MULTICAST", "UP"],
//     link_type: "ether",
//     address: "aa:bb:cc:dd:ee:ff"
//   },
//   ...
// ]
```

#### 3. `parseIpOutput(output: string): NetworkInterface[]`

**功能**：解析 `ip -d a s` 命令输出（纯函数，不执行命令）

**参数**：
- `output`: 命令输出的原始文本

**返回**：网络接口数组

#### 4. `getMACFromIpOutput(output: string, ifname?: string): string | null`

**功能**：从 IP 命令输出中提取指定网卡的 MAC 地址（纯函数）

**参数**：
- `output`: `ip -d a s` 命令输出
- `ifname`: 网卡名称（可选，默认 'wlan0'）

**返回**：MAC 地址字符串

#### 5. `isValidMACAddress(mac: string): boolean`

**功能**：验证 MAC 地址格式

**参数**：
- `mac`: MAC 地址字符串

**返回**：是否为有效的 MAC 地址

### DeviceIdentity.ts 调用方式

```typescript
import { getDeviceMAC } from './ip';

export class DeviceIdentity {
    /**
     * 获取设备 MAC 地址
     */
    static async getDeviceMACAddress(deviceId: string): Promise<string | null> {
        // 直接调用 ip.ts 提供的接口
        const mac = await getDeviceMAC(deviceId, 'wlan0');
        
        if (mac) {
            console.log(`[DeviceIdentity] 获取 MAC 地址成功：${mac}`);
            return mac;
        }
        
        return null;
    }
    
    /**
     * 生成设备硬件 ID
     */
    static async generateHardwareId(device: Device): Promise<string> {
        // 优先使用 MAC 地址
        const macAddress = await this.getDeviceMACAddress(device.id);
        if (macAddress) {
            return `mac:${macAddress}`;
        }
        
        // 降级方案
        return `device:${device.id}`;
    }
}
```

## 执行流程

### 获取 MAC 地址的完整流程

```
1. 调用 getDeviceMAC(deviceId, 'wlan0')
   ↓
2. ip.ts 内部调用 adb.shell(deviceId, 'ip -d a s wlan0')
   ↓
3. 执行 ADB 命令，获取输出
   ↓
4. 调用 getMACFromIpOutput(output, 'wlan0') 解析
   ↓
5. 返回 MAC 地址字符串
```

### 示例输出

**ADB 命令**：
```bash
adb -s RPT0220113005709 shell ip -d a s wlan0
```

**命令输出**：
```
2: wlan0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc mq state UP qlen 1000
    link/ether aa:bb:cc:dd:ee:ff brd ff:ff:ff:ff:ff:ff
    inet 192.168.1.100/24 brd 192.168.1.255 scope global wlan0
       valid_lft forever preferred_lft forever
```

**解析结果**：
```typescript
{
    ifindex: "2",
    ifname: "wlan0",
    flags: ["BROADCAST", "MULTICAST", "UP", "LOWER_UP"],
    link_type: "ether",
    address: "aa:bb:cc:dd:ee:ff"  // ← 这就是 MAC 地址
}
```

## 依赖关系

### ip.ts 的依赖
- `./render` (adb.shell) - 用于执行 ADB shell 命令

### DeviceIdentity.ts 的依赖
- `./ip` (getDeviceMAC) - 用于获取 MAC 地址
- `@devicefarmer/adbkit` (Device) - 设备类型定义
- `crypto` - 用于生成 MD5 哈希

## 优势

### 1. 职责清晰
- **ip.ts**: 专注于 IP 命令执行和解析
- **DeviceIdentity.ts**: 专注于设备身份识别逻辑
- **render.ts**: 专注于 ADB 命令执行

### 2. 易于测试
- 纯函数（`parseIpOutput`, `getMACFromIpOutput`）可以轻松单元测试
- 依赖注入使得 mocking 更容易

### 3. 可复用性
- `ip.ts` 可以被多个模块使用
- 不仅限于 DeviceIdentity，其他地方也可以获取 MAC 地址

### 4. 易于维护
- 每个模块职责单一
- 修改 IP 命令解析逻辑不影响设备识别逻辑

## 使用场景

### 场景 1：设备统一识别
```typescript
// USB 连接和 WiFi 连接识别为同一设备
const usbMAC = await getDeviceMAC('RPT0220113005709', 'wlan0');
const wifiMAC = await getDeviceMAC('192.168.0.104:5555', 'wlan0');

// 两者返回相同的 MAC 地址
// usbMAC === wifiMAC === "aa:bb:cc:dd:ee:ff"
```

### 场景 2：获取所有网络接口
```typescript
const interfaces = await getDeviceNetworkInterfaces(deviceId);
interfaces.forEach(iface => {
    console.log(`${iface.ifname}: ${iface.address}`);
});
// 输出：
// wlan0: aa:bb:cc:dd:ee:ff
// eth0: 11:22:33:44:55:66
```

### 场景 3：验证 MAC 地址格式
```typescript
const mac = "aa:bb:cc:dd:ee:ff";
if (isValidMACAddress(mac)) {
    console.log("有效的 MAC 地址");
}
```

## 错误处理

### ip.ts 内部错误处理
```typescript
export async function getDeviceMAC(deviceId: string, ifname: string = 'wlan0'): Promise<string | null> {
    try {
        const output = await adb.shell(deviceId, `ip -d a s ${ifname}`);
        const mac = getMACFromIpOutput(output, ifname);
        
        if (mac) {
            return mac;
        } else {
            console.warn(`未找到 ${ifname} 的 MAC 地址`);
        }
        
        return null;  // 获取失败返回 null，不抛出异常
    } catch (error) {
        console.error(`获取设备 ${deviceId} 的 MAC 地址失败:`, error);
        return null;  // 异常也返回 null
    }
}
```

### 调用方错误处理
```typescript
const mac = await getDeviceMAC(deviceId);
if (mac) {
    // 成功处理
} else {
    // 降级方案：使用其他标识
    return `device:${deviceId}`;
}
```

## 文件位置

- **ip.ts**: `/Users/chan/code/linkandroid/electron/mapi/adb/ip.ts`
- **DeviceIdentity.ts**: `/Users/chan/code/linkandroid/electron/mapi/adb/DeviceIdentity.ts`
- **render.ts**: `/Users/chan/code/linkandroid/electron/mapi/adb/render.ts`

## 更新日志

- **2024-03-30**: 初始版本
  - ip.ts 负责执行 `ip -d a s` 命令
  - 提供 `getDeviceMAC()` 接口
  - DeviceIdentity 调用 ip.ts 获取 MAC 地址
