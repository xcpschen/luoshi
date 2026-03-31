# 设备管理页面功能增强

## 概述

为设备管理页面的设备卡片添加了完整的设备操作功能，包括投屏、文件管理、应用管理和设备设置，所有功能都复用了设备页面的现有实现。

## 实现的功能

### 1. 投屏到电脑 (Mirror)

**功能描述**：将设备屏幕投射到电脑上进行操作。

**实现方式**：
- 复用 `device store` 的 `doMirror()` 方法
- 自动选择在线连接或尝试主动连接
- 使用设备页面的投屏设置和参数配置

**连接管理**：
1. 优先使用默认连接（如果在线）
2. 如果没有默认连接，使用第一个在线连接
3. 如果所有连接都离线，尝试主动连接（WiFi 调用 ADB connect，USB 验证设备存在）
4. 如果所有连接都失败，提示"没有可用的连接"

### 2. 文件管理 (File Manager)

**功能描述**：管理设备上的文件，支持上传、下载、删除等操作。

**实现方式**：
- 复用 `DeviceFileManagerDialog` 组件
- 通过 `fileManagerDialog.value?.show(deviceRecord)` 打开对话框
- 完整的文件浏览器界面

**连接管理**：与投屏功能相同的连接策略

### 3. 应用管理 (App Manager)

**功能描述**：管理设备上安装的应用，支持安装、卸载、导出等操作。

**实现方式**：
- 复用 `DeviceAppManagerDialog` 组件
- 通过 `appManagerDialog.value?.show(deviceRecord)` 打开对话框
- 显示已安装应用列表，支持批量操作

**连接管理**：与投屏功能相同的连接策略

### 4. 设备设置 (Settings)

**功能描述**：配置设备的各项参数，如投屏设置、预览图等。

**实现方式**：
- 复用 `DeviceSettingDialog` 组件
- 通过 `settingDialog.value?.show(tempDeviceRecord)` 打开对话框
- 保存设置到设备配置文件

**连接管理**：**不需要设备在线**
- 设置功能不依赖设备连接状态
- 可以直接打开设置对话框进行配置
- 设置会保存到 device store，下次连接时生效

## 技术实现

### 1. 连接管理工具库

**文件**：`src/lib/deviceConnection.ts`

**核心函数**：

#### `getOnlineConnections(connections)`
获取设备的在线连接列表

#### `getFirstOnlineConnection(connections)`
获取第一个在线连接

#### `selectConnection(connections)`
选择要使用的连接（优先默认连接）

#### `tryConnectDevice(connection)`
尝试主动连接设备
- WiFi 连接：调用 `window.$mapi.adb.connect(address)`
- USB 连接：验证设备是否在设备列表中

#### `getOrCreateConnection(connections, onConnectAttempt)`
获取或创建连接的完整策略
1. 尝试获取在线连接
2. 如果没有，遍历所有连接尝试主动连接
3. 返回第一个成功的连接，或 null（全部失败）

### 2. 设备卡片组件增强

**文件**：`src/pages/DeviceManage/DeviceUnifiedCard.vue`

**新增导入**：
```typescript
import { useDeviceStore } from "../../store/modules/device";
import { getOrCreateConnection } from "../../lib/deviceConnection";
import DeviceFileManagerDialog from "../Device/DeviceFileManagerDialog.vue";
import DeviceAppManagerDialog from "../Device/DeviceAppManagerDialog.vue";
import DeviceSettingDialog from "../Device/DeviceSettingDialog.vue";
```

**新增方法**：

#### `getOrCreateDeviceId()`
获取可用的设备 ID，处理连接逻辑

#### `handleMirror()`
投屏到电脑

#### `handleFileManage()`
打开文件管理对话框

#### `handleAppManage()`
打开应用管理对话框

#### `handleSettings()`
打开设备设置对话框

### 3. 国际化文本

**中文** (`zh-CN.json`)：
```json
{
    "deviceManage.apps": "应用",
    "deviceManage.noConnectionAvailable": "没有可用的连接",
    "deviceManage.deviceNotFound": "未找到设备",
    "deviceManage.connectionFailed": "连接 {address} 失败"
}
```

**英文** (`en-US.json`)：
```json
{
    "deviceManage.apps": "Apps",
    "deviceManage.noConnectionAvailable": "No connection available",
    "deviceManage.deviceNotFound": "Device not found",
    "deviceManage.connectionFailed": "Failed to connect {address}"
}
```

## 连接管理流程

```
用户点击功能按钮
    ↓
调用 getOrCreateDeviceId()
    ↓
检查是否有在线连接？
    ├─ 是 → 返回连接地址
    └─ 否 → 尝试主动连接所有连接
            ↓
            WiFi 连接？
            ├─ 是 → 调用 adb.connect(address)
            └─ 否 → 验证设备是否在列表中
                    ↓
            连接成功？
            ├─ 是 → 返回连接地址
            └─ 否 → 尝试下一个连接
                    ↓
            所有连接都失败？
            └─ 返回 null，提示错误
    ↓
在 device store 中查找设备记录
    ↓
调用对应的功能方法
```

## 代码示例

### 投屏功能实现

```typescript
const handleMirror = async () => {
    try {
        const deviceId = await getOrCreateDeviceId();
        if (!deviceId) {
            Dialog.tipError(t('deviceManage.noConnectionAvailable'));
            return;
        }
        
        // 在 device store 中查找对应的设备
        const deviceRecord = deviceStore.records.find(r => r.id === deviceId);
        if (!deviceRecord) {
            Dialog.tipError(t('deviceManage.deviceNotFound'));
            return;
        }
        
        // 调用 device store 的投屏功能
        await deviceStore.doMirror(deviceRecord);
    } catch (error: any) {
        console.error('[DeviceUnifiedCard] 投屏失败:', error);
        Dialog.tipError(mapError(error));
    }
};
```

### 文件管理功能实现

```typescript
const handleFileManage = async () => {
    try {
        const deviceId = await getOrCreateDeviceId();
        if (!deviceId) {
            Dialog.tipError(t('deviceManage.noConnectionAvailable'));
            return;
        }
        
        const deviceRecord = deviceStore.records.find(r => r.id === deviceId);
        if (!deviceRecord) {
            Dialog.tipError(t('deviceManage.deviceNotFound'));
            return;
        }
        
        // 打开文件管理对话框
        fileManagerDialog.value?.show(deviceRecord);
    } catch (error: any) {
        console.error('[DeviceUnifiedCard] 文件管理失败:', error);
        Dialog.tipError(mapError(error));
    }
};
```

## 按钮布局

设备卡片底部按钮从左到右：
1. **投屏** (`icon-desktop`) - 将设备屏幕投射到电脑
2. **文件** (`icon-folder`) - 管理设备文件
3. **应用** (`icon-apps`) - 管理已安装应用
4. **设置** (`icon-settings`) - 设备配置

## 错误处理

### 连接异常处理

1. **没有可用连接**：提示"没有可用的连接"
2. **设备未找到**：提示"未找到设备"（设备记录不在 device store 中）
3. **连接失败**：在尝试连接时记录日志，继续尝试下一个连接

### 操作异常处理

所有功能都使用 try-catch 包裹，错误通过 `Dialog.tipError()` 提示用户。

## 优势

1. **代码复用**：完全复用设备页面的功能实现，不重复造轮子
2. **统一管理**：所有设备操作都通过 device store 管理
3. **智能连接**：自动选择或尝试连接设备，用户体验更好
4. **错误处理**：完善的错误提示和日志记录

## 测试建议

### 测试场景 1：在线设备

1. 连接设备（USB 或 WiFi）
2. 打开设备管理页面
3. 点击各个功能按钮
4. 验证功能正常工作

### 测试场景 2：离线设备

1. 断开设备连接
2. 在设备管理页面点击功能按钮
3. 验证提示"没有可用的连接"

### 测试场景 3：WiFi 重连

1. WiFi 设备离线
2. 点击功能按钮
3. 验证系统尝试自动连接
4. 连接成功后功能正常打开

### 测试场景 4：多连接设备

1. 设备同时有 USB 和 WiFi 连接
2. 验证优先使用默认连接
3. 如果默认连接离线，使用其他在线连接

## 相关文件

- `src/pages/DeviceManage/DeviceUnifiedCard.vue` - 设备卡片组件（增强版）
- `src/lib/deviceConnection.ts` - 连接管理工具库（新增）
- `src/store/modules/device.ts` - 设备 store（复用）
- `src/pages/Device/DeviceFileManagerDialog.vue` - 文件管理对话框（复用）
- `src/pages/Device/DeviceAppManagerDialog.vue` - 应用管理对话框（复用）
- `src/pages/Device/DeviceSettingDialog.vue` - 设备设置对话框（复用）

## 后续优化建议

1. **连接状态实时更新**：监听设备连接状态变化，实时更新按钮状态
2. **禁用离线设备按钮**：设备离线时禁用功能按钮，显示提示
3. **连接进度提示**：主动连接时显示进度提示
4. **批量操作支持**：支持对多个设备同时执行操作
