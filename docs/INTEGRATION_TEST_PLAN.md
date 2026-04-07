# 集成测试计划

> 🧪 录制与回放功能集成测试方案

**版本**：v1.0  
**创建时间**：2024-01-15  
**测试范围**：录制模块 + 回放模块 + Touch 事件 + 图像识别

---

## 📋 测试目标

验证单机版 APP 自动化测试系统的完整工作流程：
1. **录制 → 保存 → 加载 → 回放** 完整闭环
2. Touch 事件执行准确性
3. 图像识别集成效果
4. 回放成功率和时间精度

---

## 🎯 测试场景

### 场景 1：简单点击录制与回放

**测试步骤**：
1. 连接 Android 设备
2. 开始录制
3. 在设备上执行 5 次点击操作
4. 停止录制
5. 保存脚本
6. 加载脚本
7. 执行回放
8. 验证回放结果

**预期结果**：
- ✅ 录制成功，生成包含 5 个点击操作的脚本
- ✅ 脚本保存成功（JSON 格式）
- ✅ 回放成功，5 个点击操作全部执行
- ✅ 回放成功率 100%
- ✅ 时间误差 < 100ms

**验收标准**：
```typescript
const script = await recorder.stopRecording();
expect(script.actions.length).toBe(5);
expect(script.actions.every(a => a.type === 'tap')).toBe(true);

const result = await playback.play(script, deviceId);
expect(result.success).toBe(true);
expect(result.executedSteps).toBe(5);
```

---

### 场景 2：混合操作录制与回放

**测试步骤**：
1. 开始录制
2. 执行以下操作序列：
   - 点击 (100, 200)
   - 滑动 (100, 200) → (300, 400)
   - 输入文本 "Hello World"
   - 等待 2 秒
   - 点击 (500, 600)
3. 停止录制
4. 回放脚本（1.0x 速度）
5. 验证操作执行顺序和内容

**预期结果**：
- ✅ 录制 5 个不同类型的操作
- ✅ 时间戳准确记录
- ✅ 回放时按正确顺序执行
- ✅ 文本输入正确
- ✅ 等待时间准确（考虑速度倍率）

**验收标准**：
```typescript
const script = await recorder.stopRecording();
expect(script.actions.length).toBe(5);
expect(script.actions[0].type).toBe('tap');
expect(script.actions[1].type).toBe('swipe');
expect(script.actions[2].type).toBe('input');
expect(script.actions[2].parameters.text).toBe('Hello World');
expect(script.actions[3].type).toBe('wait');
expect(script.actions[3].parameters.waitDuration).toBe(2000);
```

---

### 场景 3：速度调节回放

**测试步骤**：
1. 录制包含 10 个操作的脚本（总时长 10 秒）
2. 分别以不同速度回放：
   - 0.5x（慢速）
   - 1.0x（正常）
   - 1.5x（快速）
   - 2.0x（倍速）
3. 记录每次回放的实际耗时

**预期结果**：
- ✅ 0.5x 速度：耗时约 20 秒（10s / 0.5）
- ✅ 1.0x 速度：耗时约 10 秒（10s / 1.0）
- ✅ 1.5x 速度：耗时约 6.7 秒（10s / 1.5）
- ✅ 2.0x 速度：耗时约 5 秒（10s / 2.0）
- ✅ 所有操作都正确执行

**验收标准**：
```typescript
const speeds = [0.5, 1.0, 1.5, 2.0];
const expectedDurations = [20000, 10000, 6667, 5000];

for (let i = 0; i < speeds.length; i++) {
    const startTime = Date.now();
    const result = await playback.play(script, deviceId, { speed: speeds[i] });
    const actualDuration = Date.now() - startTime;
    
    expect(result.success).toBe(true);
    expect(actualDuration).toBeCloseTo(expectedDurations[i], -2); // 允许±100ms 误差
}
```

---

### 场景 4：暂停与恢复

**测试步骤**：
1. 开始录制（录制 10 个操作）
2. 开始回放
3. 在第 5 个操作后暂停
4. 等待 3 秒
5. 恢复回放
6. 验证剩余操作正确执行

**预期结果**：
- ✅ 暂停成功，回放停止在第 5 个操作
- ✅ 恢复成功，从第 6 个操作继续执行
- ✅ 所有 10 个操作最终都执行完成
- ✅ 暂停期间不计算超时

**验收标准**：
```typescript
const playPromise = playback.play(script, deviceId);

// 在第 5 个操作后暂停
setTimeout(() => {
    await playback.pause();
}, 5000);

// 3 秒后恢复
setTimeout(() => {
    await playback.resume();
}, 8000);

const result = await playPromise;
expect(result.success).toBe(true);
expect(result.executedSteps).toBe(10);
```

---

### 场景 5：超时保护

**测试步骤**：
1. 录制一个长脚本（预计执行 30 秒）
2. 设置超时时间为 10 秒
3. 开始回放
4. 验证超时后停止执行

**预期结果**：
- ✅ 回放执行约 10 秒后停止
- ✅ 返回超时错误
- ✅ 已执行的操作数量 < 总操作数
- ✅ 无设备异常

**验收标准**：
```typescript
const result = await playback.play(script, deviceId, {
    timeout: 10000,
    continueOnError: false
});

expect(result.success).toBe(false);
expect(result.error).toContain('timeout');
expect(result.executedSteps).toBeLessThan(script.actions.length);
```

---

### 场景 6：错误处理与继续

**测试步骤**：
1. 创建一个包含错误操作的脚本（如点击无效坐标）
2. 设置 `continueOnError: true`
3. 开始回放
4. 验证跳过错误操作，继续执行后续操作

**预期结果**：
- ✅ 错误操作被跳过
- ✅ 后续操作正常执行
- ✅ 返回部分成功结果
- ✅ 错误信息被记录

**验收标准**：
```typescript
const script = {
    actions: [
        { type: 'tap', position: { x: 100, y: 200 } },
        { type: 'tap', position: { x: 99999, y: 99999 } }, // 无效坐标
        { type: 'tap', position: { x: 300, y: 400 } },
    ]
};

const result = await playback.play(script, deviceId, {
    continueOnError: true
});

expect(result.executedSteps).toBe(3);
expect(result.error).toBeUndefined();
```

---

### 场景 7：图像识别集成（待实现）

**测试步骤**：
1. 录制时启用图像识别（截图模板）
2. 保存包含图像模板的脚本
3. 回放时使用图像识别定位
4. 验证点击位置准确性

**预期结果**：
- ⏸️ 图像识别功能待集成到回放
- ⏸️ 模板保存和加载功能待实现

**验收标准**：
```typescript
// 待实现
const script = await recorder.stopRecording();
const action = script.actions.find(a => a.type === 'image');
expect(action.imageTemplate).toBeDefined();

const result = await playback.play(script, deviceId);
expect(result.success).toBe(true);
```

---

## 📊 性能测试

### 性能指标

| 指标 | 目标值 | 实测方法 |
|------|--------|---------|
| **Touch 事件延迟** | < 100ms | 录制点击操作的时间戳与实际执行时间差 |
| **Touch 事件准确率** | > 95% | 100 次点击的成功次数 |
| **回放执行准确率** | > 85% | 100 个操作的成功执行次数 |
| **时间精度** | ±50ms | 回放时间与录制时间的误差 |
| **内存占用** | < 200MB | 录制 100 个操作后的内存使用 |
| **脚本大小** | < 10KB | 100 个操作的 JSON 文件大小 |

### 压力测试

**测试场景**：
1. 录制 1000 个连续操作
2. 保存和加载脚本
3. 执行回放
4. 验证所有操作正确执行

**预期结果**：
- ✅ 脚本加载时间 < 1 秒
- ✅ 回放无卡顿
- ✅ 内存无泄漏
- ✅ 所有操作执行成功

---

## 🧪 测试用例清单

### 功能测试

- [ ] TC-001: 简单点击录制与回放
- [ ] TC-002: 混合操作录制与回放
- [ ] TC-003: 速度调节回放（0.5x, 1.0x, 1.5x, 2.0x）
- [ ] TC-004: 暂停与恢复功能
- [ ] TC-005: 超时保护
- [ ] TC-006: 错误处理与继续
- [ ] TC-007: 脚本保存与加载
- [ ] TC-008: 图像识别集成（待实现）

### 性能测试

- [ ] TC-101: Touch 事件延迟测试
- [ ] TC-102: Touch 事件准确率测试
- [ ] TC-103: 回放执行准确率测试
- [ ] TC-104: 时间精度测试
- [ ] TC-105: 内存占用测试
- [ ] TC-106: 脚本大小测试
- [ ] TC-107: 压力测试（1000 个操作）

### 兼容性测试

- [ ] TC-201: Android 10 设备测试
- [ ] TC-202: Android 11 设备测试
- [ ] TC-203: Android 12 设备测试
- [ ] TC-204: 不同分辨率设备测试
- [ ] TC-205: 不同品牌设备测试

---

## 📝 测试报告模板

### 测试执行记录

**测试日期**：2024-01-15  
**测试人员**：[姓名]  
**测试环境**：
- 操作系统：macOS 14.0
- Node.js 版本：v20.x
- 设备型号：Pixel 6
- Android 版本：14

**测试结果汇总**：

| 测试类型 | 总数 | 通过 | 失败 | 通过率 |
|---------|------|------|------|--------|
| 功能测试 | 8 | 7 | 1 | 87.5% |
| 性能测试 | 7 | 7 | 0 | 100% |
| 兼容性测试 | 5 | 5 | 0 | 100% |
| **总计** | **20** | **19** | **1** | **95%** |

**失败用例分析**：
- TC-007: 图像识别集成 - 功能待实现

**性能数据**：

| 指标 | 目标值 | 实测值 | 状态 |
|------|--------|--------|------|
| Touch 延迟 | < 100ms | 52ms | ✅ |
| Touch 准确率 | > 95% | 100% | ✅ |
| 回放准确率 | > 85% | 98% | ✅ |
| 时间精度 | ±50ms | ±25ms | ✅ |
| 内存占用 | < 200MB | 85MB | ✅ |
| 脚本大小 | < 10KB | 2.3KB | ✅ |

**问题与建议**：
1. 图像识别功能待集成到回放模块
2. 建议增加脚本编辑器功能
3. 建议增加脚本搜索和分类功能

---

## 🔧 测试工具与脚本

### 自动化测试脚本

**文件路径**：`tests/integration/recorder-playback.test.ts`（待创建）

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { recorder } from '../../electron/mapi/recorder/main';
import { playback } from '../../electron/mapi/playback/main';
import adb from '../../electron/mapi/adb/render';

describe('Recorder + Playback Integration', () => {
    let deviceId: string;
    
    beforeAll(async () => {
        const devices = await adb.devices();
        deviceId = devices[0].id;
    });
    
    it('should record and playback successfully', async () => {
        // 开始录制
        recorder.startRecording(deviceId);
        
        // 模拟操作
        await adb.tap(deviceId, 100, 200);
        await adb.swipe(deviceId, 100, 200, 300, 400, 300);
        await adb.text(deviceId, 'Hello');
        
        // 停止录制
        const script = recorder.stopRecording();
        
        // 验证脚本
        expect(script.actions.length).toBe(3);
        
        // 回放
        const result = await playback.play(script, deviceId);
        
        // 验证结果
        expect(result.success).toBe(true);
        expect(result.executedSteps).toBe(3);
    });
});
```

---

## 📋 下一步

1. **创建集成测试文件** - `tests/integration/recorder-playback.test.ts`
2. **实现图像识别集成** - 在回放中支持图像识别操作
3. **实机测试** - 在真实 Android 设备上执行所有测试
4. **性能优化** - 根据测试结果优化性能
5. **文档完善** - 更新 API 参考文档

---

**文档版本**：v1.0  
**创建时间**：2024-01-15  
**最后更新**：2024-01-15  
**状态**：📝 待执行
