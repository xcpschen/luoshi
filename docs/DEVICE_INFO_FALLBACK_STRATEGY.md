# 设备信息备用属性获取策略

## 问题说明

某些 Android 设备的以下系统属性无法获取到值：
- `ro.product.manufacturer`
- `ro.product.model`
- `ro.product.brand`

这导致设备信息显示为 "Unknown"。

## 解决方案

采用**多级降级策略**，尝试多个不同的系统属性来获取设备信息。

---

## 品牌（brand）获取策略

### 尝试顺序

```typescript
// 1. 首选：ro.product.brand
result["brand"] = shell("getprop ro.product.brand").trim();

// 2. 备用 1：ro.product.manufacturer
if (!result["brand"]) {
    result["brand"] = shell("getprop ro.product.manufacturer").trim();
}

// 3. 备用 2：persist.sys.manufacturer
if (!result["brand"]) {
    result["brand"] = shell("getprop persist.sys.manufacturer").trim();
}
```

### 属性说明

| 属性 | 说明 | 示例值 |
|------|------|--------|
| `ro.product.brand` | 设备品牌 | "Huawei" |
| `ro.product.manufacturer` | 设备制造商 | "Huawei" |
| `persist.sys.manufacturer` | 持久化制造商信息 | "Xiaomi" |

---

## 型号（model）获取策略

### 尝试顺序

```typescript
// 1. 首选：ro.product.model
result["model"] = shell("getprop ro.product.model").trim();

// 2. 备用 1：ro.product.device
if (!result["model"]) {
    result["model"] = shell("getprop ro.product.device").trim();
}

// 3. 备用 2：ro.product.name
if (!result["model"]) {
    result["model"] = shell("getprop ro.product.name").trim();
}
```

### 属性说明

| 属性 | 说明 | 示例值 |
|------|------|--------|
| `ro.product.model` | 设备型号 | "LIO-AN00" |
| `ro.product.device` | 设备代号 | "HWLIO" |
| `ro.product.name` | 设备名称 | "LIO-AN00" |

---

## 制造商（manufacturer）获取策略

### 尝试顺序

```typescript
// 1. 首选：ro.product.manufacturer
result["manufacturer"] = shell("getprop ro.product.manufacturer").trim();

// 2. 备用 1：persist.sys.manufacturer
if (!result["manufacturer"]) {
    result["manufacturer"] = shell("getprop persist.sys.manufacturer").trim();
}

// 3. 备用 2：使用 brand 作为备用
if (!result["manufacturer"]) {
    result["manufacturer"] = result["brand"];
}
```

### 属性说明

| 属性 | 说明 | 示例值 |
|------|------|--------|
| `ro.product.manufacturer` | 设备制造商 | "Huawei" |
| `persist.sys.manufacturer` | 持久化制造商信息 | "Xiaomi" |
| `result["brand"]` | 品牌（作为最后备用） | "Huawei" |

---

## Android 版本和 SDK 版本

这两个属性通常都能正常获取：

```typescript
// Android 版本
result["version"] = shell("getprop ro.build.version.release").trim();

// SDK 版本
result["sdkVersion"] = shell("getprop ro.build.version.sdk").trim();
```

---

## 完整的获取流程

```
开始
  ↓
获取 Android 版本
  ↓
获取 SDK 版本
  ↓
获取品牌（3 个属性尝试）
  ├─ ro.product.brand
  ├─ ro.product.manufacturer
  └─ persist.sys.manufacturer
  ↓
获取型号（3 个属性尝试）
  ├─ ro.product.model
  ├─ ro.product.device
  └─ ro.product.name
  ↓
获取制造商（3 个属性尝试）
  ├─ ro.product.manufacturer
  ├─ persist.sys.manufacturer
  └─ 使用 brand
  ↓
返回结果
```

---

## 测试不同品牌设备

### Huawei 设备
```bash
# 预期输出
ro.product.brand: Huawei
ro.product.model: LIO-AN00
ro.product.manufacturer: Huawei
```

### Xiaomi 设备
```bash
# 预期输出
ro.product.brand: Xiaomi
ro.product.model: M2011K2C
ro.product.manufacturer: Xiaomi
```

### Samsung 设备
```bash
# 预期输出
ro.product.brand: samsung
ro.product.model: SM-G9910
ro.product.manufacturer: samsung
```

### OnePlus 设备
```bash
# 预期输出
ro.product.brand: OnePlus
ro.product.model: KB2000
ro.product.manufacturer: OnePlus
```

---

## 特殊情况处理

### 情况 1: 所有属性都为空

**处理策略**：
- 使用设备 ID 作为型号
- 品牌显示 "Unknown"
- 制造商显示 "Unknown"

```typescript
name: deviceInfo.model ? `${deviceInfo.brand || ''} ${deviceInfo.model}`.trim() : deviceId
```

### 情况 2: 部分属性为空

**处理策略**：
- 使用获取到的属性
- 为空的属性使用备用值

例如：
- brand: "Huawei" (获取到)
- model: "" (未获取到) → 使用 ro.product.device
- manufacturer: "" (未获取到) → 使用 brand 的值 "Huawei"

---

## 日志输出示例

### 成功获取所有信息
```
[ADB.info] 开始获取设备 RPT0220113005709 的详细信息
[ADB.info] 执行命令：getprop ro.build.version.release
[ADB.info] version: 10
[ADB.info] 执行命令：getprop ro.build.version.sdk
[ADB.info] sdkVersion: 29
[ADB.info] 尝试获取设备品牌
[ADB.info] brand: Huawei
[ADB.info] 尝试获取设备型号
[ADB.info] model: LIO-AN00
[ADB.info] 尝试获取设备制造商
[ADB.info] manufacturer: Huawei
[ADB] 设备信息：{"version":"10","sdkVersion":"29","brand":"Huawei","model":"LIO-AN00","manufacturer":"Huawei"}
```

### 使用备用属性
```
[ADB.info] 尝试获取设备品牌
[ADB.info] brand:  # ro.product.brand 为空
[ADB.info] brand: Huawei  # 使用 ro.product.manufacturer
[ADB.info] 尝试获取设备型号
[ADB.info] model:  # ro.product.model 为空
[ADB.info] model: HWLIO  # 使用 ro.product.device
[ADB.info] 尝试获取设备制造商
[ADB.info] manufacturer:  # ro.product.manufacturer 为空
[ADB.info] manufacturer:  # persist.sys.manufacturer 为空
[ADB.info] manufacturer: Huawei  # 使用 brand 作为备用
```

---

## 手动测试命令

### 测试所有可能的属性

```bash
# 品牌相关
adb shell getprop ro.product.brand
adb shell getprop ro.product.manufacturer
adb shell getprop persist.sys.manufacturer

# 型号相关
adb shell getprop ro.product.model
adb shell getprop ro.product.device
adb shell getprop ro.product.name

# 版本相关
adb shell getprop ro.build.version.release
adb shell getprop ro.build.version.sdk
```

### 查看所有系统属性
```bash
adb shell getprop
```

从输出中筛选相关属性：
```bash
adb shell getprop | grep -E "brand|model|manufacturer|device|name"
```

---

## 代码实现

### 修改的文件
- `/Users/chan/code/linkandroid/electron/mapi/adb/render.ts` - `info()` 函数

### 修改内容
1. 为每个属性添加 `.trim()` 去除空白
2. 添加多级降级策略
3. 添加详细的日志输出

### 降级逻辑
```typescript
// 品牌
result["brand"] = shell1 || shell2 || shell3 || "Unknown";

// 型号
result["model"] = shell1 || shell2 || shell3 || "Unknown";

// 制造商
result["manufacturer"] = shell1 || shell2 || result["brand"] || "Unknown";
```

---

## 预期效果

### 修改前
```
设备名称：Unknown Device
品牌：Unknown
型号：Unknown
Android 版本：10
SDK 版本：29
```

### 修改后（理想情况）
```
设备名称：Huawei LIO-AN00
品牌：Huawei
型号：LIO-AN00
Android 版本：10
SDK 版本：29
```

### 修改后（部分属性获取失败）
```
设备名称：Huawei HWLIO
品牌：Huawei
型号：HWLIO  # 使用 ro.product.device
Android 版本：10
SDK 版本：29
```

### 修改后（所有属性都失败）
```
设备名称：RPT0220113005709  # 使用设备 ID
品牌：Unknown
型号：Unknown
Android 版本：10
SDK 版本：29
```

---

## 总结

### 改进点
1. ✅ 多级降级策略，提高获取成功率
2. ✅ 添加 `.trim()` 去除空白字符
3. ✅ 详细的日志输出，便于调试
4. ✅ 最后备用方案，确保不会显示为空

### 测试建议
1. 在不同品牌的设备上测试
2. 查看日志输出，确认使用了哪个属性
3. 如果仍然获取失败，添加新的备用属性

### 后续优化
- 收集不同设备的属性值，建立设备信息数据库
- 根据设备 ID 自动匹配已知信息
- 允许用户手动编辑设备信息

---

**更新时间**: 2024-03-30
**修改文件**: `electron/mapi/adb/render.ts`
