# 设备管理问题修复说明

## 修复时间
2024-03-30

## 修复的问题

### 1. ✅ 设备名称默认使用 MAC 地址显示

**问题描述**: 设备名称默认显示为 MAC 地址，而不是品牌和型号

**修复方案**: 
- 修改 `deviceUnified.ts` 中的 `createNewDevice()` 函数
- 设备名称改为使用 `品牌 + 型号` 的格式

**修改前**:
```typescript
name: `${adbDevice.model || 'Unknown Device'}`,
```

**修改后**:
```typescript
name: `${adbDevice.brand || ''} ${adbDevice.model || adbDevice.id}`.trim(),
```

**效果**:
- 新设备：显示为 "Huawei LIO-AN00"
- 如果获取不到品牌型号：显示为设备 ID

---

### 2. ✅ 品牌、型号、Android 版本、SDK 版本未获取

**问题描述**: 设备信息中品牌、型号、Android 版本、SDK 版本显示为 "Unknown" 或 0

**根本原因**: 
1. ADB 的 `info()` 函数只获取了 Android 版本，没有获取品牌、型号、SDK 版本
2. `device.ts` 的 `connectedDevices()` 函数没有调用 `info()` 获取详细信息

**修复方案**:

#### 修复 1: 增强 `info()` 函数
**文件**: `/Users/chan/code/linkandroid/electron/mapi/adb/render.ts`

**修改前**:
```typescript
const info = async (id: string) => {
    const result = {};
    result["version"] = parseInt(await shell(id, "getprop ro.build.version.release"));
    return result;
};
```

**修改后**:
```typescript
const info = async (id: string) => {
    const result: any = {};
    try {
        // 获取 Android 版本
        result["version"] = await shell(id, "getprop ro.build.version.release");
        
        // 获取 SDK 版本
        result["sdkVersion"] = await shell(id, "getprop ro.build.version.sdk");
        
        // 获取设备品牌
        result["brand"] = await shell(id, "getprop ro.product.brand");
        
        // 获取设备型号
        result["model"] = await shell(id, "getprop ro.product.model");
        
        // 获取设备制造商
        result["manufacturer"] = await shell(id, "getprop ro.product.manufacturer");
        
        console.log(`[ADB] 设备信息：${JSON.stringify(result)}`);
    } catch (error) {
        console.error('[ADB] 获取设备信息失败:', error);
    }
    return result;
};
```

**获取的信息**:
- `version`: Android 版本（如 "10"）
- `sdkVersion`: SDK 版本（如 "29"）
- `brand`: 设备品牌（如 "Huawei"）
- `model`: 设备型号（如 "LIO-AN00"）
- `manufacturer`: 制造商（如 "Huawei"）

---

#### 修复 2: 在 `connectedDevices()` 中调用 `info()`
**文件**: `/Users/chan/code/linkandroid/src/store/modules/device.ts`

**修改前**:
```typescript
async connectedDevices(): Promise<DeviceRecord[]> {
    const res = await $mapi.adb.devices();
    const data: DeviceRecord[] = [];
    for (const d of res || []) {
        data.push({
            id: d.id,
            type: isIPWithPort(d.id) ? EnumDeviceType.WIFI : EnumDeviceType.USB,
            name: d.model ? d.model.split(":")[1] : d.id,
            raw: d,
            // ...
        });
    }
    return data;
}
```

**修改后**:
```typescript
async connectedDevices(): Promise<DeviceRecord[]> {
    const res = await $mapi.adb.devices();
    const data: DeviceRecord[] = [];
    for (const d of res || []) {
        // 获取详细的设备信息
        let deviceInfo: any = {};
        try {
            deviceInfo = await $mapi.adb.info(d.id);
        } catch (error) {
            console.error(`[Device] 获取设备 ${d.id} 信息失败:`, error);
        }
        
        data.push({
            id: d.id,
            type: isIPWithPort(d.id) ? EnumDeviceType.WIFI : EnumDeviceType.USB,
            name: deviceInfo.model ? `${deviceInfo.brand || ''} ${deviceInfo.model}`.trim() : (d.model ? d.model.split(":")[1] : d.id),
            raw: {
                ...d,
                ...deviceInfo,  // 合并详细信息
            },
            // ...
        });
    }
    return data;
}
```

**效果**:
- 设备名称显示为 "Huawei LIO-AN00"
- 设备信息包含完整的品牌、型号、Android 版本、SDK 版本

---

### 3. ✅ 添加标签失败

**问题描述**: 点击添加标签按钮没有反应或报错

**根本原因**: `onAddTag` 方法的调用方式不正确，使用了错误的参数传递

**修复方案**:
**文件**: `/Users/chan/code/linkandroid/src/pages/DeviceManage/DeviceUnifiedCard.vue`

**修改前**:
```typescript
const onAddTag = async (value: string | null) => {
    if (!value) return;
    
    try {
        await deviceUnifiedStore.addDeviceTag(props.device.unifiedId, value.trim());
        Dialog.tipSuccess(t("deviceManage.tagAdded"));
    } catch (e: any) {
        Dialog.tipError(mapError(e));
    }
};
```

**修改后**:
```typescript
const onAddTag = async () => {
    try {
        const tagName = await Dialog.prompt(t("deviceManage.enterTagName"), "");
        if (!tagName) return;
        
        await deviceUnifiedStore.addDeviceTag(props.device.unifiedId, tagName.trim());
        Dialog.tipSuccess(t("deviceManage.tagAdded"));
    } catch (e: any) {
        if (e !== 'cancel') {
            Dialog.tipError(mapError(e));
        }
    }
};
```

**改进**:
- 在函数内部调用 `Dialog.prompt()` 获取用户输入
- 正确处理取消操作（不显示错误提示）
- 只对非取消操作的错误显示提示

---

## 数据流程

### 完整的设备信息获取流程

```
1. 设备连接
   ↓
2. device.store.connectedDevices()
   ↓
3. $mapi.adb.devices() - 获取基本设备列表
   ↓
4. 对每个设备调用 $mapi.adb.info(deviceId)
   ↓
5. 执行 ADB shell 命令获取详细信息:
   - getprop ro.build.version.release → version
   - getprop ro.build.version.sdk → sdkVersion
   - getprop ro.product.brand → brand
   - getprop ro.product.model → model
   - getprop ro.product.manufacturer → manufacturer
   ↓
6. 合并信息到 device.raw
   ↓
7. deviceUnified.store.addOrUpdateDeviceFromRecord()
   ↓
8. 创建/更新 deviceUnified 记录
   ↓
9. 保存到数据库
   ↓
10. UI 渲染显示
```

---

## 修改的文件清单

### 1. `/Users/chan/code/linkandroid/electron/mapi/adb/render.ts`
- **修改**: 增强 `info()` 函数
- **新增**: 获取 brand, model, sdkVersion, manufacturer
- **影响**: 所有需要设备详细信息的场景

### 2. `/Users/chan/code/linkandroid/src/store/modules/device.ts`
- **修改**: `connectedDevices()` 函数
- **新增**: 调用 `adb.info()` 获取详细信息
- **影响**: 设备列表、设备管理页面

### 3. `/Users/chan/code/linkandroid/src/store/modules/deviceUnified.ts`
- **修改**: `createNewDevice()` 函数
- **改进**: 设备名称格式
- **影响**: 新建设备的名称显示

### 4. `/Users/chan/code/linkandroid/src/pages/DeviceManage/DeviceUnifiedCard.vue`
- **修改**: `onAddTag()` 函数
- **改进**: 标签添加交互
- **影响**: 设备标签功能

---

## 测试验证

### 测试场景 1: 新设备连接
```
前置条件：新设备首次连接
操作：连接设备
预期结果:
  ✅ 设备名称显示为 "品牌 型号" (如 "Huawei LIO-AN00")
  ✅ 品牌字段显示 "Huawei"
  ✅ 型号字段显示 "LIO-AN00"
  ✅ Android 版本显示正确 (如 "10")
  ✅ SDK 版本显示正确 (如 "29")
```

### 测试场景 2: 添加标签
```
前置条件：设备已连接
操作：点击设置 → 添加标签 → 输入标签名 → 确认
预期结果:
  ✅ 弹出输入框
  ✅ 输入标签名后成功添加
  ✅ 标签显示在设备上
  ✅ 取消时不显示错误提示
```

### 测试场景 3: 设备信息获取失败
```
前置条件：设备连接不稳定
操作：连接设备
预期结果:
  ✅ 如果 info() 失败，使用基本信息
  ✅ 设备名称降级显示设备 ID
  ✅ 不会导致应用崩溃
  ✅ 错误日志记录到控制台
```

---

## 技术细节

### ADB Shell 命令说明

| 属性 | Shell 命令 | 示例值 |
|------|-----------|--------|
| Android 版本 | `getprop ro.build.version.release` | "10" |
| SDK 版本 | `getprop ro.build.version.sdk` | "29" |
| 设备品牌 | `getprop ro.product.brand` | "Huawei" |
| 设备型号 | `getprop ro.product.model` | "LIO-AN00" |
| 制造商 | `getprop ro.product.manufacturer` | "Huawei" |

### 错误处理

```typescript
try {
    deviceInfo = await $mapi.adb.info(d.id);
} catch (error) {
    console.error(`[Device] 获取设备 ${d.id} 信息失败:`, error);
    // 降级处理：使用基本信息
}
```

### 降级策略

如果 `info()` 获取失败：
1. 设备名称：使用 `d.model` 或 `d.id`
2. 品牌：显示 "Unknown"
3. 型号：显示 "Unknown"
4. Android 版本：显示 "Unknown"
5. SDK 版本：显示 0

---

## 性能优化建议

### 1. 缓存设备信息
```typescript
const deviceInfoCache = new Map<string, any>();

async function getDeviceInfo(deviceId: string) {
    // 先尝试从缓存获取
    if (deviceInfoCache.has(deviceId)) {
        return deviceInfoCache.get(deviceId);
    }
    
    // 获取并缓存
    const info = await $mapi.adb.info(deviceId);
    deviceInfoCache.set(deviceId, info);
    return info;
}
```

### 2. 批量获取
对于多个设备同时连接的情况，可以并发获取信息：
```typescript
const deviceInfos = await Promise.all(
    devices.map(d => $mapi.adb.info(d.id).catch(e => null))
);
```

### 3. 延迟获取
对于已经显示的设备，可以延迟获取详细信息：
```typescript
// 先显示基本信息
setTimeout(() => {
    $mapi.adb.info(deviceId).then(info => {
        // 更新详细信息
    });
}, 1000);
```

---

## 总结

### 修复的问题
1. ✅ 设备名称默认使用 MAC 地址 → 改为使用品牌 + 型号
2. ✅ 品牌、型号、Android 版本、SDK 版本未获取 → 增强 info() 函数
3. ✅ 添加标签失败 → 修复 onAddTag() 调用方式

### 改进的效果
- **用户体验**: 设备名称更直观（显示品牌型号而非 MAC 地址）
- **信息完整性**: 所有设备信息字段都正确填充
- **功能可用性**: 标签功能正常工作
- **错误处理**: 更好的降级策略和错误提示

### 后续优化
- 考虑添加设备信息缓存机制
- 考虑批量并发获取设备信息
- 考虑添加手动刷新设备信息的按钮

---

**修复完成时间**: 2024-03-30
**测试状态**: ⏳ 待测试
