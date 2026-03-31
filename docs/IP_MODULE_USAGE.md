# IP 模块使用说明

## 概述

`ip.ts` 模块用于解析 Android 设备 `ip -d a s` 命令的输出，提取网络接口信息，主要用于获取 MAC 地址。

该模块是从 Python 版本的 `ip.py` 转换而来，使用 TypeScript 重写，并适配了 ADB 调用。

## 主要功能

### 1. 解析 IP 命令输出

```typescript
import { parseIpOutput } from './ip';

const output = `
2: wlan0: <BROADCAST,MULTICAST,UP> link/ether aa:bb:cc:dd:ee:ff
    link/ether aa:bb:cc:dd:ee:ff brd ff:ff:ff:ff:ff:ff
`;

const interfaces = parseIpOutput(output);
// 返回：
// [
//   {
//     ifindex: "2",
//     ifname: "wlan0",
//     flags: ["BROADCAST", "MULTICAST", "UP"],
//     link_type: "ether",
//     address: "aa:bb:cc:dd:ee:ff"
//   }
// ]
```

### 2. 获取指定接口的 MAC 地址

```typescript
import { getMACFromIpOutput } from './ip';

const output = await adbShell('ip -d a s wlan0');
const mac = getMACFromIpOutput(output, 'wlan0');
// 返回："aa:bb:cc:dd:ee:ff"
```

### 3. 通过 ADB 获取设备 MAC 地址

```typescript
import { getDeviceMACAddress } from './ip';

// 假设 adbShell 是一个可以执行 ADB shell 命令的函数
const adbShell = async (command: string) => {
    return await window.$mapi.adb.shell(deviceId, command);
};

const mac = await getDeviceMACAddress(deviceId, adbShell, 'wlan0');
// 返回："aa:bb:cc:dd:ee:ff"
```

## API 文档

### parseIpOutput(output: string): NetworkInterface[]

解析 `ip -d a s` 命令的输出，返回网络接口数组。

**参数：**
- `output`: 命令输出的原始文本

**返回：**
- `NetworkInterface[]`: 网络接口数组

### getMACFromIpOutput(output: string, ifname?: string): string | null

从 IP 命令输出中获取指定网络接口的 MAC 地址。

**参数：**
- `output`: `ip -d a s` 命令输出
- `ifname`: 网络接口名称（默认 'wlan0'）

**返回：**
- `string | null`: MAC 地址（小写），未找到返回 null

### isValidMACAddress(mac: string): boolean

验证 MAC 地址格式是否有效。

**参数：**
- `mac`: MAC 地址字符串

**返回：**
- `boolean`: 是否为有效的 MAC 地址

### getDeviceMACAddress(deviceId: string, adbShell: Function, ifname?: string): Promise<string | null>

通过 ADB 获取设备的 MAC 地址。

**参数：**
- `deviceId`: 设备 ID
- `adbShell`: ADB shell 执行函数，签名：`(command: string) => Promise<string>`
- `ifname`: 网络接口名称（默认 'wlan0'）

**返回：**
- `Promise<string | null>`: MAC 地址（小写），获取失败返回 null

## 使用示例

### 在 DeviceIdentity 中使用

```typescript
import { getDeviceMACAddress } from './ip';

export class DeviceIdentity {
    static async getDeviceMACAddress(deviceId: string): Promise<string | null> {
        try {
            // 执行 ip -d a s wlan0 命令
            const output = await this.executeShellCommand(deviceId, 'ip -d a s wlan0');
            
            // 解析输出获取 MAC 地址
            const { getMACFromIpOutput } = await import('./ip');
            const mac = getMACFromIpOutput(output, 'wlan0');
            
            if (mac) {
                console.log(`[DeviceIdentity] 获取 MAC 地址成功：${mac}`);
                return mac;
            }
        } catch (error) {
            console.error('[DeviceIdentity] 获取 MAC 地址失败:', error);
        }
        
        return null;
    }
    
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

### 在 render.ts 中使用

```typescript
import { getDeviceMACAddress } from './ip';

const getMAC = async (deviceId: string): Promise<string | null> => {
    const adbShell = async (command: string) => {
        return await client.getDevice(deviceId).shell(command).then(Adb.util.readAll);
    };
    
    return await getDeviceMACAddress(deviceId, adbShell, 'wlan0');
};
```

## 支持的命令

模块设计用于解析以下命令的输出：

```bash
# 获取所有网络接口信息
ip -d a s

# 获取指定网络接口信息
ip -d a s wlan0
```

## 输出格式示例

`ip -d a s wlan0` 的典型输出：

```
2: wlan0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc mq state UP qlen 1000
    link/ether aa:bb:cc:dd:ee:ff brd ff:ff:ff:ff:ff:ff
    inet 192.168.1.100/24 brd 192.168.1.255 scope global wlan0
       valid_lft forever preferred_lft forever
```

解析后的结果：

```typescript
{
    ifindex: "2",
    ifname: "wlan0",
    flags: ["BROADCAST", "MULTICAST", "UP", "LOWER_UP"],
    link_type: "ether",
    address: "aa:bb:cc:dd:ee:ff",
    operstate: undefined
}
```

## 注意事项

1. **权限要求**：某些设备可能需要 root 权限才能执行 `ip` 命令
2. **接口名称**：默认使用 `wlan0`，但某些设备可能使用不同的名称（如 `eth0`）
3. **错误处理**：建议始终使用 try-catch 包裹调用，处理可能的异常
4. **MAC 地址格式**：返回的 MAC 地址始终为小写格式

## 与 Python 版本的差异

| 特性 | Python 版本 | TypeScript 版本 |
|------|-------------|-----------------|
| 正则表达式 | `re.search` | `RegExp.exec` |
| 命名捕获组 | `(?P<name>...)` | 手动解析 |
| 命令执行 | `subprocess.Popen` | 通过 ADB shell |
| 类型系统 | 动态类型 | 静态类型 |
| 异步支持 | 同步 | 异步（Promise） |

## 文件位置

- TypeScript 实现：`/Users/chan/code/linkandroid/electron/mapi/adb/ip.ts`
- Python 原始版本：`/Users/chan/code/linkandroid/ip.py`

## 更新日志

- **2024-03-30**: 初始版本，从 Python 转换而来
  - 支持解析 `ip -d a s` 命令输出
  - 支持提取 MAC 地址
  - 支持 ADB 集成
