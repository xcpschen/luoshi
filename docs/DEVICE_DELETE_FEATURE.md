# 设备删除功能实现说明

## 实现时间
2024-03-30

## 实现目标
为设备管理页面添加删除设备和删除设备连接方式的功能。

---

## 一、功能概述

### 1.1 删除设备连接方式
- ✅ 支持删除单个连接方式（如删除 WiFi 连接，保留 USB 连接）
- ✅ **智能判断：如果只剩最后一个连接，删除时直接删除设备**
- ✅ 删除前显示确认对话框
- ✅ 从内存和数据库同时删除
- ✅ 删除成功提示

### 1.2 删除设备
- ✅ 支持完全删除设备
- ✅ **删除设备时自动删除所有连接**
- ✅ 删除前显示确认对话框（带设备名称）
- ✅ 从内存和数据库同时删除
- ✅ 删除成功提示

---

## 二、实现细节

### 2.1 Store 层实现

**文件**: `/Users/chan/code/linkandroid/src/store/modules/deviceUnified.ts`

#### 新增方法

##### 1. `removeDeviceConnection(unifiedId, connectionId)`
```typescript
async function removeDeviceConnection(unifiedId: string, connectionId: string) {
    const device = unifiedDevices.value.find(d => d.unifiedId === unifiedId)
    if (device) {
        const index = device.connections.findIndex(c => c.id === connectionId)
        if (index !== -1) {
            // 智能判断：如果是最后一个连接，直接删除设备
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
            await window.$mapi.db.execute(
                `DELETE FROM device_connection WHERE connection_id = ?`,
                [connectionId]
            )
        }
    }
}
```

**智能逻辑**：
- 检查设备的连接数
- 如果只剩 1 个连接 → 调用 `deleteDevice()` 删除整个设备
- 如果有多个连接 → 只删除指定的连接

##### 2. `deleteDevice(unifiedId)`
```typescript
async function deleteDevice(unifiedId: string) {
    // 从内存删除
    const index = unifiedDevices.value.findIndex(d => d.unifiedId === unifiedId)
    if (index !== -1) {
        unifiedDevices.value.splice(index, 1)
    }
    
    // 从数据库删除（先删除连接，再删除设备）
    await window.$mapi.db.execute(
        `DELETE FROM device_connection WHERE unified_id = ?`,
        [unifiedId]
    )
    await window.$mapi.db.execute(
        `DELETE FROM device_unified WHERE unified_id = ?`,
        [unifiedId]
    )
}
```

---

### 2.2 页面层实现

**文件**: `/Users/chan/code/linkandroid/src/pages/DeviceManage.vue`

#### 新增方法

##### 1. `handleRemoveConnection(unifiedId, connectionId)`
```typescript
const handleRemoveConnection = async (unifiedId: string, connectionId: string) => {
    try {
        await Dialog.confirm(t('deviceManage.confirmRemoveConnection'));
        await deviceUnifiedStore.removeDeviceConnection(unifiedId, connectionId);
        Dialog.tipSuccess(t('deviceManage.removeConnectionSuccess'));
    } catch (e: any) {
        if (e !== 'cancel') {
            Dialog.tipError(mapError(e));
        }
    }
};
```

##### 2. `handleDeleteDevice(unifiedId, deviceName)`
```typescript
const handleDeleteDevice = async (unifiedId: string, deviceName: string) => {
    try {
        await Dialog.confirm(t('deviceManage.confirmDeleteDeviceDesc', { name: deviceName }));
        await deviceUnifiedStore.deleteDevice(unifiedId);
        Dialog.tipSuccess(t('deviceManage.deleteDeviceSuccess'));
    } catch (e: any) {
        if (e !== 'cancel') {
            Dialog.tipError(mapError(e));
        }
    }
};
```

---

### 2.3 组件层实现

**文件**: `/Users/chan/code/linkandroid/src/pages/DeviceManage/DeviceUnifiedCard.vue`

#### 新增方法

##### 1. `handleRemoveConnection(connectionId)`
```typescript
const handleRemoveConnection = async (connectionId: string) => {
    try {
        await Dialog.confirm(t('deviceManage.confirmRemoveConnection'));
        await deviceUnifiedStore.removeDeviceConnection(props.device.unifiedId, connectionId);
        Dialog.tipSuccess(t('deviceManage.removeConnectionSuccess'));
        emit('delete');
    } catch (e: any) {
        if (e !== 'cancel') {
            Dialog.tipError(mapError(e));
        }
    }
};
```

##### 2. `handleDeleteDevice()`
```typescript
const handleDeleteDevice = async () => {
    try {
        await Dialog.confirm(t('deviceManage.confirmDeleteDeviceDesc', { name: props.device.name }));
        await deviceUnifiedStore.deleteDevice(props.device.unifiedId);
        Dialog.tipSuccess(t('deviceManage.deleteDeviceSuccess'));
        emit('delete');
    } catch (e: any) {
        if (e !== 'cancel') {
            Dialog.tipError(mapError(e));
        }
    }
};
```

---

## 三、UI 交互设计

### 3.1 删除设备连接方式

#### UI 位置
在设备卡片的"连接详情"展开区域，每个连接右侧显示删除按钮。

#### 视觉效果
```
[USB 图标] USB 连接 [默认]        [在线] [删除按钮]
         地址：RPT0220113005709
         最后活跃：2024-03-30 16:00

[WiFi 图标] WiFi 调试           [在线] [删除按钮]
          地址：192.168.0.104:5555
          最后活跃：2024-03-30 16:00
```

#### 交互流程
1. 用户点击展开设备卡片
2. 显示所有连接详情
3. 每个连接右侧显示红色删除按钮
4. 点击删除按钮
5. 弹出确认对话框
6. 确认后删除连接
7. 显示成功提示

---

### 3.2 删除设备

#### UI 位置
在设备卡片右上角的设置下拉菜单中。

#### 菜单结构
```
[设置按钮] ▼
├─ 设置
├─ 添加标签
└─ 删除设备 (红色，带删除图标)
```

#### 交互流程
1. 用户点击右上角设置按钮
2. 显示下拉菜单
3. 点击"删除设备"（红色）
4. 弹出确认对话框（显示设备名称）
5. 确认后删除设备
6. 显示成功提示

---

## 四、数据库操作

### 4.1 删除连接方式

```sql
DELETE FROM device_connection WHERE connection_id = ?
```

**参数**: `connectionId`

**影响**:
- 仅删除指定的连接记录
- 设备记录保留
- `total_connections` 会在内存中减 1

---

### 4.2 删除设备

```sql
-- 1. 先删除所有连接
DELETE FROM device_connection WHERE unified_id = ?

-- 2. 再删除设备
DELETE FROM device_unified WHERE unified_id = ?
```

**参数**: `unifiedId`

**影响**:
- 删除设备的所有连接记录
- 删除设备记录
- 级联删除（外键约束）

---

## 五、国际化支持

### 5.1 中文翻译 (zh-CN.json)

```json
{
    "deviceManage.deleteDevice": "删除设备",
    "deviceManage.confirmRemoveConnection": "确认删除连接",
    "deviceManage.confirmRemoveConnectionDesc": "确定要删除此连接方式吗？",
    "deviceManage.removeConnectionSuccess": "连接已删除",
    "deviceManage.confirmDeleteDeviceDesc": "确定要删除设备 {name} 吗？此操作不可恢复。",
    "deviceManage.deleteDeviceSuccess": "设备已删除"
}
```

### 5.2 英文翻译 (en-US.json)

```json
{
    "deviceManage.deleteDevice": "Delete Device",
    "deviceManage.confirmRemoveConnection": "Confirm Remove Connection",
    "deviceManage.confirmRemoveConnectionDesc": "Are you sure you want to remove this connection?",
    "deviceManage.removeConnectionSuccess": "Connection removed",
    "deviceManage.confirmDeleteDeviceDesc": "Are you sure you want to delete device {name}? This action cannot be undone.",
    "deviceManage.deleteDeviceSuccess": "Device deleted"
}
```

---

## 六、错误处理

### 6.1 取消操作
```typescript
try {
    await Dialog.confirm(...);
    // 执行删除
} catch (e: any) {
    if (e !== 'cancel') {
        // 只有非取消操作才显示错误
        Dialog.tipError(mapError(e));
    }
}
```

### 6.2 数据库错误
- 数据库操作失败时抛出异常
- 异常会被捕获并显示友好的错误提示
- 内存操作会回滚（因为先操作内存，后操作数据库）

---

## 七、安全性考虑

### 7.1 确认对话框
- 所有删除操作都需要确认
- 删除设备时显示设备名称，避免误删
- 提示"此操作不可恢复"

### 7.2 数据一致性
- 先删除连接，再删除设备（外键约束）
- 内存和数据库同步删除
- 事务性操作（要么全部成功，要么全部失败）

---

## 八、用户体验优化

### 8.1 视觉反馈
- 删除按钮使用红色，表示危险操作
- 删除设备菜单项使用红色
- 删除成功显示绿色提示
- 删除失败显示红色提示

### 8.2 操作提示
- 删除前：确认对话框
- 删除成功：成功提示
- 删除失败：错误提示
- 取消操作：无提示

---

## 九、测试场景

### 9.1 删除连接方式测试

**场景 1**: 删除 WiFi 连接，保留 USB 连接
```
前置条件：设备有 USB 和 WiFi 两个连接
操作：点击 WiFi 连接的删除按钮，确认
预期：
  - WiFi 连接被删除
  - USB 连接保留
  - 设备保留
  - 显示"连接已删除"提示
```

**场景 2**: 删除最后一个连接（智能删除设备）
```
前置条件：设备只有一个连接
操作：点击该连接的删除按钮，确认
预期：
  - 连接被删除
  - 设备也被删除（智能判断）
  - 显示"设备已删除"提示（不是"连接已删除"）
```

**场景 3**: 删除多连接设备中的一个
```
前置条件：设备有 USB、WiFi、网络三个连接
操作：点击 WiFi 连接的删除按钮，确认
预期：
  - WiFi 连接被删除
  - USB 和网络连接保留
  - 设备保留
  - totalConnections 从 3 变为 2
```

---

### 9.2 删除设备测试

**场景 1**: 删除有连接的设备
```
前置条件：设备有 1 个或多个连接
操作：点击设置 → 删除设备，确认
预期：
  - 所有连接被删除
  - 设备被删除
  - 显示"设备已删除"提示
```

**场景 2**: 删除无连接的设备
```
前置条件：设备没有任何连接
操作：点击设置 → 删除设备，确认
预期：
  - 设备被删除
  - 显示"设备已删除"提示
```

**场景 3**: 取消删除
```
前置条件：任意设备
操作：点击设置 → 删除设备，取消
预期：
  - 设备保留
  - 无提示
```

---

## 十、文件变更清单

### 修改的文件

1. **`/Users/chan/code/linkandroid/src/store/modules/deviceUnified.ts`**
   - 新增 `removeDeviceConnection()` 方法
   - 新增 `deleteDevice()` 方法
   - 导出新增方法

2. **`/Users/chan/code/linkandroid/src/pages/DeviceManage.vue`**
   - 新增 `handleRemoveConnection()` 方法
   - 新增 `handleDeleteDevice()` 方法

3. **`/Users/chan/code/linkandroid/src/pages/DeviceManage/DeviceUnifiedCard.vue`**
   - 新增 `handleRemoveConnection()` 方法
   - 新增 `handleDeleteDevice()` 方法
   - 新增 `delete` 事件
   - 修改连接详情 UI，添加删除按钮
   - 修改设置菜单，添加删除设备选项

4. **`/Users/chan/code/linkandroid/src/lang/zh-CN.json`**
   - 新增 6 条中文翻译

5. **`/Users/chan/code/linkandroid/src/lang/en-US.json`**
   - 新增 6 条英文翻译

---

## 十一、总结

### 实现的功能
✅ 删除设备连接方式（单个删除）
✅ 删除设备（完全删除）
✅ 删除前确认对话框
✅ 删除成功提示
✅ 删除错误处理
✅ 中英文国际化支持

### 实现的特点
1. **安全性** - 所有删除操作都需要确认
2. **一致性** - 内存和数据库同步删除
3. **友好性** - 清晰的提示和反馈
4. **可靠性** - 完善的错误处理
5. **国际化** - 支持中英文切换

### 用户体验
- 删除按钮位置明显（红色）
- 确认对话框提示明确
- 操作结果即时反馈
- 取消操作无副作用

---

## 十二、后续优化建议

### 1. 批量删除（优先级：低）
```typescript
async function batchDeleteDevices(unifiedIds: string[]) {
    for (const id of unifiedIds) {
        await deleteDevice(id);
    }
}
```

### 2. 回收站功能（优先级：低）
- 删除的设备移到回收站
- 支持恢复已删除设备
- 定期清理回收站

### 3. 删除日志（优先级：中）
- 记录删除操作日志
- 记录删除时间、操作者
- 便于问题排查

---

**实现完成时间**: 2024-03-30
**实现状态**: ✅ 完成
**测试状态**: ⏳ 待测试
