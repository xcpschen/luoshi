# 设备管理界面字段说明

## 概述

本文档详细说明设备管理界面中展示的所有字段及其数据来源。

---

## 一、设备卡片展示字段

### 1.1 卡片头部信息

```
┌─────────────────────────────────────────────────┐
│ [图标] 设备名称                     [状态]      │
│         品牌 型号 • Android 版本 • SDK 版本     │
│         活跃连接数/总连接数                      │
└─────────────────────────────────────────────────┘
```

#### 字段详情

| 显示内容 | 字段路径 | 数据类型 | 来源 | 说明 |
|---------|---------|---------|------|------|
| **设备图标** | `connections[].type` | Enum | 计算属性 | 根据连接类型显示 USB/WiFi/混合图标 |
| **设备名称** | `device.name` | String | 用户自定义 | 用户设置的设备名称，可编辑 |
| **状态指示器** | `connections[].status` | Enum | 计算属性 | 绿 (在线)/黄 (部分)/灰 (离线) |
| **品牌** | `device.identity.brand` | String | 设备信息 | 设备品牌（如 Huawei、Xiaomi） |
| **型号** | `device.identity.model` | String | 设备信息 | 设备型号（如 LIO-AN00） |
| **Android 版本** | `device.identity.androidVersion` | String | 设备信息 | Android 系统版本 |
| **SDK 版本** | `device.identity.sdkVersion` | Number | 设备信息 | Android SDK API 级别 |
| **活跃连接数** | 计算属性 | Number | 实时计算 | 状态为 CONNECTED 的连接数 |
| **总连接数** | `device.connections.length` | Number | 数组长度 | 所有连接的数量 |

---

### 1.2 标签区域（可选）

```
[标签 1] [标签 2] [标签 3] ...
```

#### 字段详情

| 显示内容 | 字段路径 | 数据类型 | 来源 | 说明 |
|---------|---------|---------|------|------|
| **标签列表** | `device.tags` | String[] | 用户自定义 | 用户添加的设备标签数组 |

---

### 1.3 连接详情（展开后可见）

```
连接详情
┌─────────────────────────────────────────────┐
│ [USB] USB 连接          [默认] [在线] [删除]│
│       地址：RPT0220113005709                │
│       最后活跃：2024-03-30 16:00            │
├─────────────────────────────────────────────┤
│ [WiFi] WiFi 调试         [在线] [删除]     │
│        地址：192.168.0.104:5555             │
│        最后活跃：2024-03-30 16:00           │
└─────────────────────────────────────────────┘
```

#### 字段详情

| 显示内容 | 字段路径 | 数据类型 | 来源 | 说明 |
|---------|---------|---------|------|------|
| **连接类型图标** | `connection.type` | Enum | 数据字段 | USB/WiFi/网络图标 |
| **连接类型名称** | `connection.type` | Enum | 翻译 | 经过 i18n 翻译的连接类型 |
| **默认标识** | `connection.isDefault` | Boolean | 数据字段 | 是否为主要连接 |
| **连接状态** | `connection.status` | Enum | 数据字段 | 在线/等待/离线 |
| **删除按钮** | - | - | 操作 | 删除该连接（最后一个连接时删除设备） |
| **连接地址** | `connection.address` | String | 数据字段 | USB 为序列号，WiFi 为 IP:端口 |
| **最后活跃时间** | `connection.lastActiveAt` | Date | 数据字段 | 最后活动时间 |

---

### 1.4 卡片底部信息

```
首次连接：2024-01-01 • 总连接数：5    [投屏] [文件]
```

#### 字段详情

| 显示内容 | 字段路径 | 数据类型 | 来源 | 说明 |
|---------|---------|---------|------|------|
| **首次连接时间** | `device.firstConnectedAt` | Date | 数据字段 | 设备首次连接的时间 |
| **总连接数** | `device.totalConnections` | Number | 数据字段 | 历史总连接次数 |
| **投屏按钮** | - | - | 操作 | 打开投屏功能 |
| **文件按钮** | - | - | 操作 | 打开文件管理 |

---

## 二、数据结构详解

### 2.1 DeviceUnifiedRecord（完整结构）

```typescript
interface DeviceUnifiedRecord {
    // 基本标识
    unifiedId: string;                    // UUID，数据库主键
    
    // 身份信息
    identity: {
        hardwareId: string;               // MAC 地址（如 "mac:aa:bb:cc:dd:ee:ff"）
        model: string;                    // 设备型号（如 "LIO-AN00"）
        brand: string;                    // 设备品牌（如 "Huawei"）
        androidVersion: string;           // Android 版本（如 "10"）
        sdkVersion: number;               // SDK 版本（如 29）
        fingerprint: string;              // 设备指纹（MD5 哈希）
    };
    
    // 用户信息
    name: string;                         // 用户自定义名称
    avatar?: string;                      // 设备头像（可选）
    
    // 连接信息
    connections: DeviceConnection[];      // 所有连接数组
    activeConnectionId?: string;          // 当前活跃连接 ID
    
    // 配置信息
    setting: DeviceUnifiedSetting;        // 设备配置
    tags: string[];                       // 设备标签
    
    // 统计信息
    totalConnections: number;             // 总连接次数
    
    // 时间信息
    firstConnectedAt: Date;               // 首次连接时间
    lastConnectedAt: Date;                // 最后连接时间
    createdAt: Date;                      // 创建时间
    updatedAt: Date;                      // 更新时间
}
```

---

### 2.2 DeviceConnection（连接实例）

```typescript
interface DeviceConnection {
    id: string;                           // 连接 ID（ADB ID）
    type: EnumConnectionType;             // 连接类型枚举
    status: EnumDeviceStatus;             // 连接状态枚举
    address: string;                      // 连接地址
    connectedAt: Date;                    // 连接建立时间
    lastActiveAt: Date;                   // 最后活跃时间
    isDefault: boolean;                   // 是否为默认连接
}
```

---

## 三、数据来源

### 3.1 数据库表结构

#### device_unified 表（设备主表）

| 字段名 | 类型 | 说明 | 对应前端字段 |
|-------|------|------|------------|
| `unified_id` | TEXT | 统一设备 ID（UUID） | `device.unifiedId` |
| `hardware_id` | TEXT | 硬件 ID（MAC 地址） | `device.identity.hardwareId` |
| `model` | TEXT | 设备型号 | `device.identity.model` |
| `brand` | TEXT | 设备品牌 | `device.identity.brand` |
| `android_version` | TEXT | Android 版本 | `device.identity.androidVersion` |
| `sdk_version` | INTEGER | SDK 版本 | `device.identity.sdkVersion` |
| `fingerprint` | TEXT | 设备指纹 | `device.identity.fingerprint` |
| `name` | TEXT | 设备名称 | `device.name` |
| `setting` | TEXT | 配置（JSON） | `device.setting` |
| `tags` | TEXT | 标签（JSON） | `device.tags` |
| `total_connections` | INTEGER | 总连接数 | `device.totalConnections` |
| `first_connected_at` | DATETIME | 首次连接时间 | `device.firstConnectedAt` |
| `last_connected_at` | DATETIME | 最后连接时间 | `device.lastConnectedAt` |
| `created_at` | DATETIME | 创建时间 | `device.createdAt` |
| `updated_at` | DATETIME | 更新时间 | `device.updatedAt` |

---

#### device_connection 表（设备连接表）

| 字段名 | 类型 | 说明 | 对应前端字段 |
|-------|------|------|------------|
| `connection_id` | TEXT | 连接 ID（UUID） | `connection.id` |
| `unified_id` | TEXT | 统一设备 ID（外键） | - |
| `connection_type` | TEXT | 连接类型 | `connection.type` |
| `status` | TEXT | 连接状态 | `connection.status` |
| `address` | TEXT | 连接地址 | `connection.address` |
| `connected_at` | DATETIME | 连接时间 | `connection.connectedAt` |
| `last_active_at` | DATETIME | 最后活跃时间 | `connection.lastActiveAt` |
| `is_default` | INTEGER | 是否默认 | `connection.isDefault` |

---

### 3.2 数据加载流程

```
1. 应用启动
   ↓
2. deviceUnifiedStore.loadFromDatabase()
   ↓
3. 执行 SQL 查询：
   SELECT du.*, dc.* 
   FROM device_unified du
   LEFT JOIN device_connection dc ON du.unified_id = dc.unified_id
   ↓
4. 数据合并（Map 结构）
   - 按 unified_id 分组
   - 每个设备聚合多个连接
   ↓
5. 存储到 unifiedDevices.value
   ↓
6. 组件渲染（DeviceUnifiedCard）
```

---

### 3.3 实时数据来源

#### 设备状态更新
```typescript
// 来自 device store 的运行时状态
const deviceStore = useDeviceStore()
const record = deviceStore.records.find(r => r.id === deviceRecord.id)
const status = record?.runtime?.value?.status || EnumDeviceStatus.WAIT_CONNECTING
```

#### 连接状态同步
- 当 ADB 连接/断开时，触发 `device` 事件
- `deviceUnifiedStore` 监听并更新对应设备状态
- UI 自动刷新显示最新状态

---

## 四、字段用途分类

### 4.1 身份标识类

| 字段 | 用途 | 是否可变 |
|------|------|---------|
| `unifiedId` | 数据库主键，前端引用 ID | ❌ 否 |
| `identity.hardwareId` | 设备唯一标识（MAC 地址） | ❌ 否 |
| `identity.fingerprint` | 设备指纹（快速匹配） | ❌ 否 |

---

### 4.2 设备信息类

| 字段 | 用途 | 是否可变 |
|------|------|---------|
| `identity.model` | 显示设备型号 | ❌ 否 |
| `identity.brand` | 显示设备品牌 | ❌ 否 |
| `identity.androidVersion` | 显示系统版本 | ⚠️ 系统升级时变 |
| `identity.sdkVersion` | 显示 SDK 级别 | ⚠️ 系统升级时变 |

---

### 4.3 用户自定义类

| 字段 | 用途 | 是否可变 |
|------|------|---------|
| `name` | 用户自定义设备名称 | ✅ 是 |
| `tags` | 用户添加的标签 | ✅ 是 |
| `setting` | 设备配置参数 | ✅ 是 |
| `avatar` | 设备头像 | ✅ 是 |

---

### 4.4 连接管理类

| 字段 | 用途 | 是否可变 |
|------|------|---------|
| `connections` | 所有连接实例数组 | ✅ 是 |
| `activeConnectionId` | 当前使用的连接 ID | ✅ 是 |
| `totalConnections` | 历史连接总次数 | ✅ 是 |

---

### 4.5 时间统计类

| 字段 | 用途 | 是否可变 |
|------|------|---------|
| `firstConnectedAt` | 首次连接时间 | ❌ 否 |
| `lastConnectedAt` | 最后连接时间 | ✅ 是 |
| `createdAt` | 记录创建时间 | ❌ 否 |
| `updatedAt` | 最后更新时间 | ✅ 是 |

---

## 五、计算属性说明

### 5.1 设备状态（deviceStatus）

```typescript
const deviceStatus = computed(() => {
    const onlineConnections = props.device.connections.filter(
        conn => conn.status === EnumDeviceStatus.CONNECTED
    );
    
    if (onlineConnections.length === 0) {
        return "offline";      // 无在线连接
    } else if (onlineConnections.length < props.device.connections.length) {
        return "partial";      // 部分在线
    }
    return "online";           // 全部在线
});
```

**用途**: 控制卡片边框颜色、状态指示器颜色

---

### 5.2 活跃连接数（activeConnectionCount）

```typescript
const activeConnectionCount = computed(() => {
    return props.device.connections.filter(
        conn => conn.status === EnumDeviceStatus.CONNECTED
    ).length;
});
```

**用途**: 显示当前活跃的连接数量

---

### 5.3 连接类型图标（connectionTypeIcon）

```typescript
const connectionTypeIcon = computed(() => {
    const types = props.device.connections.map(c => c.type);
    
    if (types.includes(EnumConnectionType.USB) && 
        types.includes(EnumConnectionType.WIFI_DEBUG)) {
        return "icon-link";    // 混合连接
    } else if (types.includes(EnumConnectionType.USB)) {
        return "icon-usb";     // 仅 USB
    } else {
        return "icon-wifi";    // 仅 WiFi/网络
    }
});
```

**用途**: 显示设备卡片左上角的图标

---

## 六、枚举类型说明

### 6.1 EnumConnectionType（连接类型）

| 值 | 说明 | 地址格式 |
|---|------|---------|
| `usb` | USB 连接 | 空或序列号 |
| `wifi_debug` | WiFi 调试 | IP:端口（如 192.168.0.104:5555） |
| `network` | 网络连接 | IP:端口（如 192.168.0.104:5555） |

---

### 6.2 EnumDeviceStatus（设备状态）

| 值 | 说明 | 显示颜色 |
|---|------|---------|
| `connected` | 已连接 | 绿色 |
| `waitConnecting` | 等待连接 | 黄色 |
| `disconnected` | 已断开 | 灰色 |

---

## 七、总结

### 字段总数统计

- **基本字段**: 15 个（unifiedId, name, identity 等）
- **身份信息**: 6 个（hardwareId, model, brand 等）
- **连接信息**: 每个设备 N 个连接，每个连接 7 个字段
- **配置信息**: 10+ 个（setting 对象的各种参数）
- **时间字段**: 4 个（createdAt, updatedAt 等）
- **计算属性**: 4 个（deviceStatus, activeConnectionCount 等）

### 数据来源分布

- **数据库持久化**: 80%（设备信息、连接信息、配置等）
- **实时计算**: 15%（状态判断、统计等）
- **用户输入**: 5%（名称、标签等）

### 关键数据流

```
设备连接 → ADB 检测 → 生成硬件 ID → 匹配/创建设备 → 保存到数据库
                                                    ↓
                                              用户界面展示
                                                    ↓
                                              状态实时更新
```

---

**文档更新时间**: 2024-03-30
**数据来源**: DeviceUnifiedCard.vue, DeviceUnified.ts, deviceUnified.ts
