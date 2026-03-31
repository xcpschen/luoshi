# 设备管理页面功能完整实现

## 概述

为设备管理页面的设备卡片添加了与设备页面完全一致的操作功能，包括投屏、文件管理、应用管理、命令行和设置等所有功能。

## 实现的功能

### 1. 投屏到电脑 (Mirror)

**图标**：`iconfont icon-mirror`  
**功能**：将设备屏幕投射到电脑上进行操作。

**连接要求**：✅ 需要设备在线  
**连接策略**：
- 优先使用默认连接（如果在线）
- 如果没有默认连接，使用第一个在线连接
- 如果所有连接都离线，尝试主动连接
- 如果所有连接都失败，提示"没有可用的连接"

**实现**：复用 `deviceStore.doMirror()` 方法

---

### 2. 文件管理 (Files)

**图标**：`icon-upload`  
**下拉菜单**：
- **文件管理** (`icon-folder`) - 浏览和管理设备文件
- **上传文件** (`icon-upload`) - 上传文件到设备

**连接要求**：✅ 需要设备在线  
**连接策略**：与投屏功能相同

**实现**：
- 文件管理：复用 `DeviceFileManagerDialog`
- 上传文件：复用 `DeviceFileManagerDialog`（内置上传功能）

---

### 3. 应用管理 (Apps)

**图标**：`iconfont icon-apk`  
**下拉菜单**：
- **应用管理** (`icon-apps`) - 管理已安装应用
- **安装应用** (`icon-plus`) - 安装 APK 文件

**连接要求**：✅ 需要设备在线  
**连接策略**：与投屏功能相同

**实现**：
- 应用管理：复用 `DeviceAppManagerDialog`
- 安装应用：复用 `DeviceAppInstallDialog`

---

### 4. 设置 (Settings)

**图标**：`icon-settings`  
**下拉菜单**：
- **设备设置** (`icon-settings`) - 配置设备参数
- **命令行** (`icon-terminal`) - ADB Shell 命令行

**连接要求**：
- 设备设置：❌ **不需要设备在线**
- 命令行：✅ 需要设备在线

**实现**：
- 设备设置：复用 `DeviceSettingDialog`（创建临时设备记录）
- 命令行：复用 `DeviceAdbShellDialog`

---

## 按钮布局

设备卡片底部按钮从左到右：

```
[投屏] [文件 ▼] [应用 ▼] [设置 ▼]
```

每个按钮都有对应的图标和文字说明，下拉菜单完全复用设备页面的结构：

1. **投屏** - `iconfont icon-mirror` + "投屏"
   - 无下拉菜单

2. **文件** - `icon-upload` + "文件"
   - 文件管理 (`icon-folder`)
   - 上传文件 (`icon-upload`)

3. **应用** - `iconfont icon-apk` + "应用"
   - 应用管理 (`icon-apps`)
   - 安装应用 (`icon-plus`)

4. **设置** - `icon-settings` + "设置"
   - 命令行 (`icon-terminal`) ← **与设备页面顺序一致**
   - 设备设置 (`icon-settings`)

**下拉菜单配置**：
- `trigger="hover"` - 悬停触发
- `:popup-max-height="false"` - 不限制最大高度（与设备页面一致）

---

## 连接管理策略

### 需要在线的功能

- 投屏到电脑
- 文件管理
- 上传文件
- 应用管理
- 安装应用
- 命令行

**连接流程**：
```
用户点击功能
    ↓
getOrCreateDeviceId()
    ↓
有在线连接？
    ├─ 是 → 返回连接地址
    └─ 否 → 尝试主动连接所有连接
            ↓
            WiFi → adb.connect(address)
            USB → 验证设备存在
            ↓
            成功？
            ├─ 是 → 返回连接地址
            └─ 否 → 提示"没有可用的连接"
```

### 不需要在线的功能

- **设备设置** - 直接打开设置对话框，配置参数下次连接时生效

**实现方式**：
```typescript
const tempDeviceRecord: any = {
    id: props.device.connections[0]?.address || props.device.unifiedId,
    name: props.device.name,
    setting: { ...props.device.setting },
};
settingDialog.value?.show(tempDeviceRecord);
```

---

## 技术实现

### 1. 连接管理工具库

**文件**：`src/lib/deviceConnection.ts`

**核心函数**：
- `getOnlineConnections(connections)` - 获取在线连接
- `selectConnection(connections)` - 选择要使用的连接
- `tryConnectDevice(connection)` - 尝试主动连接
- `getOrCreateConnection(connections, onConnectAttempt)` - 完整连接策略

### 2. 设备卡片组件

**文件**：`src/pages/DeviceManage/DeviceUnifiedCard.vue`

**新增导入**：
```typescript
import { getOrCreateConnection } from "../../lib/deviceConnection";
import DeviceFileManagerDialog from "../Device/DeviceFileManagerDialog.vue";
import DeviceAppManagerDialog from "../Device/DeviceAppManagerDialog.vue";
import DeviceAppInstallDialog from "../Device/DeviceAppInstallDialog.vue";
import DeviceSettingDialog from "../Device/DeviceSettingDialog.vue";
import DeviceAdbShellDialog from "../Device/DeviceAdbShellDialog.vue";
```

**新增方法**：
- `getOrCreateDeviceId()` - 获取或创建连接
- `handleMirror()` - 投屏
- `handleFileManage()` - 文件管理
- `handleFileUpload()` - 上传文件
- `handleAppManage()` - 应用管理
- `handleAppInstall()` - 安装应用
- `handleAdbShell()` - 命令行
- `handleSettings()` - 设备设置

### 3. 国际化文本

**中文** (`zh-CN.json`)：
```json
{
    "deviceManage.fileManager": "文件管理",
    "deviceManage.fileUpload": "上传文件",
    "deviceManage.appManager": "应用管理",
    "deviceManage.appInstall": "安装应用",
    "deviceManage.deviceSettings": "设备设置",
    "deviceManage.commandLine": "命令行"
}
```

**英文** (`en-US.json`)：
```json
{
    "deviceManage.fileManager": "File Manager",
    "deviceManage.fileUpload": "Upload Files",
    "deviceManage.appManager": "App Manager",
    "deviceManage.appInstall": "Install Apps",
    "deviceManage.deviceSettings": "Device Settings",
    "deviceManage.commandLine": "Command Line"
}
```

---

## 图标使用规范

### Iconfont 图标
- `icon-mirror` - 投屏
- `icon-apk` - 应用

### Arco Design 图标
- `icon-upload` - 文件
- `icon-folder` - 文件管理
- `icon-apps` - 应用管理
- `icon-plus` - 安装应用
- `icon-settings` - 设备设置
- `icon-terminal` - 命令行

---

## 代码示例

### 投屏功能

```typescript
const handleMirror = async () => {
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
        
        await deviceStore.doMirror(deviceRecord);
    } catch (error: any) {
        console.error('[DeviceUnifiedCard] 投屏失败:', error);
        Dialog.tipError(mapError(error));
    }
};
```

### 设备设置（不需要在线）

```typescript
const handleSettings = async () => {
    try {
        const tempDeviceRecord: any = {
            id: props.device.connections[0]?.address || props.device.unifiedId,
            name: props.device.name,
            setting: { ...props.device.setting },
        };
        
        settingDialog.value?.show(tempDeviceRecord);
    } catch (error: any) {
        console.error('[DeviceUnifiedCard] 设置失败:', error);
        Dialog.tipError(mapError(error));
    }
};
```

---

## 功能对比

| 功能 | 图标 | 是否需要在线 | 下拉菜单 | 复用组件 |
|------|------|-------------|---------|---------|
| 投屏 | `icon-mirror` | ✅ | ❌ | `deviceStore.doMirror()` |
| 文件管理 | `icon-upload` | ✅ | ✅ | `DeviceFileManagerDialog` |
| 文件上传 | `icon-upload` | ✅ | ✅ | `DeviceFileManagerDialog` |
| 应用管理 | `icon-apk` | ✅ | ✅ | `DeviceAppManagerDialog` |
| 安装应用 | `icon-apk` | ✅ | ✅ | `DeviceAppInstallDialog` |
| 设备设置 | `icon-settings` | ❌ | ✅ | `DeviceSettingDialog` |
| 命令行 | `icon-settings` | ✅ | ✅ | `DeviceAdbShellDialog` |

---

## 错误处理

### 连接异常

1. **没有可用连接** - 提示"没有可用的连接"
2. **设备未找到** - 提示"未找到设备"
3. **连接失败** - 记录日志，继续尝试下一个连接

### 操作异常

所有功能都使用 try-catch 包裹，错误通过 `Dialog.tipError()` 提示用户。

---

## 相关文件

- `src/pages/DeviceManage/DeviceUnifiedCard.vue` - 设备卡片组件（完整版）
- `src/lib/deviceConnection.ts` - 连接管理工具库
- `src/store/modules/device.ts` - 设备 store
- `src/pages/Device/DeviceFileManagerDialog.vue` - 文件管理对话框
- `src/pages/Device/DeviceAppManagerDialog.vue` - 应用管理对话框
- `src/pages/Device/DeviceAppInstallDialog.vue` - 应用安装对话框
- `src/pages/Device/DeviceSettingDialog.vue` - 设备设置对话框
- `src/pages/Device/DeviceAdbShellDialog.vue` - ADB Shell 对话框

---

## 测试建议

### 测试场景 1：在线设备功能

1. 连接设备（USB 或 WiFi）
2. 打开设备管理页面
3. 测试所有功能按钮
4. 验证下拉菜单正常显示
5. 验证功能正常工作

### 测试场景 2：离线设备功能

1. 断开设备连接
2. 点击投屏、文件管理、应用管理、命令行
3. 验证提示"没有可用的连接"
4. 点击设备设置
5. 验证设置对话框正常打开

### 测试场景 3：WiFi 重连

1. WiFi 设备离线
2. 点击任意需要在线的功能
3. 验证系统尝试自动连接
4. 连接成功后功能正常打开

### 测试场景 4：图标显示

1. 验证所有图标正确显示
2. 验证图标与设备页面一致
3. 验证文字说明正确显示

---

## 总结

设备管理页面现在拥有与设备页面**完全一致**的操作功能：
- ✅ 相同的图标
- ✅ 相同的功能
- ✅ 相同的组件复用
- ✅ 相同的连接策略
- ✅ 相同的用户体验

所有功能都直接复用设备页面的实现，确保了一致性和可维护性。
