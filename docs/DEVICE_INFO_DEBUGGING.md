# 设备信息获取调试指南

## 问题诊断步骤

### 1. 打开开发者工具

启动应用后，按 `Ctrl+Shift+I` (Windows/Linux) 或 `Cmd+Option+I` (Mac) 打开开发者工具。

### 2. 查看控制台日志

在 Console 标签页中，筛选以下日志：

#### 步骤 1: 检查设备列表
```
[Device] adb.devices() 结果：[...]
```
这个日志显示从 ADB 获取到的设备列表。

**预期结果**：
```javascript
[
  {
    id: "RPT0220113005709",
    model: "model:xxx:yyy:zzz"
  }
]
```

---

#### 步骤 2: 检查 info 函数是否被调用
```
[Device] 开始获取设备信息：RPT0220113005709
[Device] $mapi.adb.info: [Function: info]
```

**如果看到这个日志**：说明代码执行到了调用 `info` 的地方。

**如果 `$mapi.adb.info` 显示 `undefined`**：说明 `info` 函数没有正确导出，需要检查 render.ts 的导出。

---

#### 步骤 3: 检查 ADB 命令执行
```
[ADB.info] 开始获取设备 RPT0220113005709 的详细信息
[ADB.info] 执行命令：getprop ro.build.version.release
[ADB.info] version: 10
[ADB.info] 执行命令：getprop ro.build.version.sdk
[ADB.info] sdkVersion: 29
[ADB.info] 执行命令：getprop ro.product.brand
[ADB.info] brand: Huawei
[ADB.info] 执行命令：getprop ro.product.model
[ADB.info] model: LIO-AN00
[ADB.info] 执行命令：getprop ro.product.manufacturer
[ADB.info] manufacturer: Huawei
```

**如果看到这些日志**：说明 ADB 命令正在执行。

**如果某个命令报错**：会在后面显示错误信息。

---

#### 步骤 4: 检查获取到的设备信息
```
[Device] 获取到的设备信息：{
  version: "10",
  sdkVersion: "29",
  brand: "Huawei",
  model: "LIO-AN00",
  manufacturer: "Huawei"
}
```

**如果看到这个日志**：说明设备信息获取成功。

**如果对象为空 `{}`**：说明 ADB 命令执行失败或返回空值。

---

## 常见问题排查

### 问题 1: `$mapi.adb.info` 是 undefined

**原因**: `info` 函数没有正确导出

**解决方案**:
1. 检查 `electron/mapi/adb/render.ts` 的 `export default` 中是否包含 `info`
2. 检查 `electron/mapi/render.ts` 是否正确导出了 adb 模块

---

### 问题 2: ADB 命令执行失败

**错误日志示例**:
```
[ADB] 获取设备信息失败：Error: device 'xxx' not found
```

**可能原因**:
1. 设备未连接
2. ADB 权限问题
3. 设备未授权

**解决方案**:
1. 确保设备已连接：`adb devices`
2. 检查设备授权状态
3. 重启 ADB 服务器：`adb kill-server && adb start-server`

---

### 问题 3: 命令返回空值

**日志示例**:
```
[ADB.info] version: 
[ADB.info] sdkVersion: 
[ADB.info] brand: 
```

**可能原因**:
1. 设备系统属性不存在
2. 设备需要 root 权限
3. 设备 ROM 定制导致属性名不同

**解决方案**:
1. 手动测试 ADB 命令：
   ```bash
   adb shell getprop ro.build.version.release
   adb shell getprop ro.build.version.sdk
   adb shell getprop ro.product.brand
   adb shell getprop ro.product.model
   ```
2. 如果手动执行也返回空，说明设备不支持这些属性
3. 尝试其他属性名（某些 ROM 使用不同的属性名）

---

### 问题 4: 设备信息获取超时

**错误日志**:
```
[ADB] 获取设备信息失败：Error: timeout
```

**可能原因**:
1. 设备响应慢
2. ADB 连接不稳定
3. 设备处于睡眠状态

**解决方案**:
1. 唤醒设备屏幕
2. 检查 USB 连接
3. 如果是 WiFi 连接，检查网络稳定性

---

## 手动测试 ADB 命令

### 在终端执行以下命令测试：

```bash
# 1. 查看设备列表
adb devices -l

# 2. 测试获取 Android 版本
adb -s <设备 ID> shell getprop ro.build.version.release

# 3. 测试获取 SDK 版本
adb -s <设备 ID> shell getprop ro.build.version.sdk

# 4. 测试获取设备品牌
adb -s <设备 ID> shell getprop ro.product.brand

# 5. 测试获取设备型号
adb -s <设备 ID> shell getprop ro.product.model

# 6. 测试获取制造商
adb -s <设备 ID> shell getprop ro.product.manufacturer
```

**预期输出示例**:
```
10          # Android 版本
29          # SDK 版本
Huawei      # 品牌
LIO-AN00    # 型号
Huawei      # 制造商
```

---

## 降级策略

如果某些属性获取失败，系统会使用以下降级策略：

### 设备名称降级
```typescript
// 优先级顺序：
1. deviceInfo.brand + deviceInfo.model  // "Huawei LIO-AN00"
2. d.model.split(":")[1]                // 从原始数据提取
3. d.id                                 // 设备 ID
```

### 设备信息降级
```typescript
// 如果 info() 获取失败：
brand: "Unknown"
model: "Unknown"
androidVersion: "Unknown"
sdkVersion: 0
```

---

## 完整的调试流程

### 1. 连接设备
```bash
adb devices -l
```

### 2. 启动应用
```bash
npm run dev
```

### 3. 打开开发者工具
按 `Ctrl+Shift+I` 或 `Cmd+Option+I`

### 4. 查看 Console 日志
筛选 `[Device]` 和 `[ADB]` 开头的日志

### 5. 检查日志输出
- 设备列表是否正确
- `info` 函数是否被调用
- ADB 命令是否执行成功
- 获取到的设备信息是否正确

### 6. 如果失败，检查错误信息
- 设备未找到
- 命令执行失败
- 返回空值
- 超时

### 7. 根据错误信息采取相应措施

---

## 修复后的预期日志

完整的成功日志应该如下：

```
[Device] adb.devices() 结果：[ { id: 'RPT0220113005709', model: 'model:xxx:yyy:zzz' } ]
[Device] 开始获取设备信息：RPT0220113005709
[Device] $mapi.adb.info: [Function: info]
[ADB.info] 开始获取设备 RPT0220113005709 的详细信息
[ADB.info] 执行命令：getprop ro.build.version.release
[ADB.info] version: 10
[ADB.info] 执行命令：getprop ro.build.version.sdk
[ADB.info] sdkVersion: 29
[ADB.info] 执行命令：getprop ro.product.brand
[ADB.info] brand: Huawei
[ADB.info] 执行命令：getprop ro.product.model
[ADB.info] model: LIO-AN00
[ADB.info] 执行命令：getprop ro.product.manufacturer
[ADB.info] manufacturer: Huawei
[ADB] 设备信息：{"version":"10","sdkVersion":"29","brand":"Huawei","model":"LIO-AN00","manufacturer":"Huawei"}
[Device] 获取到的设备信息：{
  version: "10",
  sdkVersion: "29",
  brand: "Huawei",
  model: "LIO-AN00",
  manufacturer: "Huawei"
}
```

---

## 下一步

1. **启动应用**
2. **连接设备**
3. **打开开发者工具查看日志**
4. **将日志输出发送给我**，我会根据日志进一步分析问题

---

**调试指南更新时间**: 2024-03-30
**添加的日志**: 
- `device.ts` 中的 `connectedDevices()` 函数
- `render.ts` 中的 `info()` 函数
