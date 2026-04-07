# API 参考文档

> 📖 录制与回放模块完整 API 文档

**版本**：v1.0  
**创建时间**：2024-01-15  
**最后更新**：2024-01-15

---

## 📋 目录

1. [Touch 事件 API](#1-touch-事件-api)
2. [操作录制 API](#2-操作录制-api)
3. [脚本回放 API](#3-脚本回放-api)
4. [类型定义](#4-类型定义)

---

## 1. Touch 事件 API

**模块路径**：`electron/mapi/adb/touch.ts`

### 1.1 tap - 点击操作

**功能**：在指定坐标执行点击操作

**方法签名**：
```typescript
async function tap(deviceId: string, x: number, y: number): Promise<void>
```

**参数**：
| 参数 | 类型 | 说明 | 必填 |
|------|------|------|------|
| deviceId | string | 设备 ID | ✅ |
| x | number | X 坐标 | ✅ |
| y | number | Y 坐标 | ✅ |

**返回值**：`Promise<void>`

**示例**：
```typescript
// 渲染进程
await window.$mapi.adb.tap('device-123', 100, 200);
```

**底层实现**：
```bash
adb -s device-123 shell input tap 100 200
```

**错误处理**：
```typescript
try {
    await window.$mapi.adb.tap(deviceId, x, y);
} catch (error) {
    console.error('点击失败:', error.message);
}
```

---

### 1.2 swipe - 滑动操作

**功能**：从起点滑动到终点

**方法签名**：
```typescript
async function swipe(
    deviceId: string,
    x1: number, y1: number,
    x2: number, y2: number,
    duration?: number
): Promise<void>
```

**参数**：
| 参数 | 类型 | 说明 | 必填 | 默认值 |
|------|------|------|------|--------|
| deviceId | string | 设备 ID | ✅ | - |
| x1 | number | 起点 X 坐标 | ✅ | - |
| y1 | number | 起点 Y 坐标 | ✅ | - |
| x2 | number | 终点 X 坐标 | ✅ | - |
| y2 | number | 终点 Y 坐标 | ✅ | - |
| duration | number | 滑动时长（毫秒） | ❌ | 300 |

**返回值**：`Promise<void>`

**示例**：
```typescript
// 从 (100, 200) 滑动到 (300, 400)，耗时 300ms
await window.$mapi.adb.swipe('device-123', 100, 200, 300, 400);

// 自定义时长 500ms
await window.$mapi.adb.swipe('device-123', 100, 200, 300, 400, 500);
```

**底层实现**：
```bash
adb -s device-123 shell input swipe 100 200 300 400 300
```

---

### 1.3 text - 文本输入

**功能**：输入文本内容

**方法签名**：
```typescript
async function text(deviceId: string, text: string): Promise<void>
```

**参数**：
| 参数 | 类型 | 说明 | 必填 |
|------|------|------|------|
| deviceId | string | 设备 ID | ✅ |
| text | string | 输入文本（空格自动转义） | ✅ |

**返回值**：`Promise<void>`

**示例**：
```typescript
// 输入普通文本
await window.$mapi.adb.text('device-123', 'Hello World');

// 输入带空格的文本（自动处理）
await window.$mapi.adb.text('device-123', 'Hello World Test');
```

**底层实现**：
```bash
# 空格自动转换为 %s
adb -s device-123 shell input text Hello%sWorld
```

**注意事项**：
- ⚠️ 不支持特殊字符（如 emoji）
- ⚠️ 中文输入可能受限（取决于输入法）

---

### 1.4 keyevent - 按键操作

**功能**：执行 Android 按键事件

**方法签名**：
```typescript
async function keyevent(deviceId: string, keycode: number): Promise<void>
```

**参数**：
| 参数 | 类型 | 说明 | 必填 |
|------|------|------|------|
| deviceId | string | 设备 ID | ✅ |
| keycode | number | Android KeyEvent 代码 | ✅ |

**返回值**：`Promise<void>`

**常用 keycode**：
| 按键 | keycode | 说明 |
|------|---------|------|
| HOME | 3 | 返回主页 |
| BACK | 4 | 返回键 |
| ENTER | 66 | 回车键 |
| MENU | 82 | 菜单键 |
| POWER | 122 | 电源键 |
| VOLUME_UP | 24 | 音量+ |
| VOLUME_DOWN | 25 | 音量- |

**示例**：
```typescript
// 返回键
await window.$mapi.adb.keyevent('device-123', 4);

// HOME 键
await window.$mapi.adb.keyevent('device-123', 3);

// 回车键
await window.$mapi.adb.keyevent('device-123', 66);
```

**底层实现**：
```bash
adb -s device-123 shell input keyevent 4
```

---

### 1.5 longPress - 长按操作

**功能**：在指定位置长按指定时长

**方法签名**：
```typescript
async function longPress(
    deviceId: string,
    x: number, y: number,
    duration?: number
): Promise<void>
```

**参数**：
| 参数 | 类型 | 说明 | 必填 | 默认值 |
|------|------|------|------|--------|
| deviceId | string | 设备 ID | ✅ | - |
| x | number | X 坐标 | ✅ | - |
| y | number | Y 坐标 | ✅ | - |
| duration | number | 长按时长（毫秒） | ❌ | 1000 |

**返回值**：`Promise<void>`

**示例**：
```typescript
// 长按 1 秒（默认）
await window.$mapi.adb.longPress('device-123', 100, 200);

// 长按 2 秒
await window.$mapi.adb.longPress('device-123', 100, 200, 2000);
```

**底层实现**：
```bash
# 通过 swipe 实现（起点终点相同）
adb -s device-123 shell input swipe 100 200 100 200 1000
```

---

## 2. 操作录制 API

**模块路径**：`electron/mapi/recorder/render.ts`

### 2.1 startRecording - 开始录制

**功能**：开始录制操作

**方法签名**：
```typescript
async function startRecording(deviceId: string): Promise<void>
```

**参数**：
| 参数 | 类型 | 说明 | 必填 |
|------|------|------|------|
| deviceId | string | 设备 ID | ✅ |

**返回值**：`Promise<void>`

**示例**：
```typescript
await window.$mapi.recorder.startRecording('device-123');
console.log('录制已开始');
```

**状态变化**：
```typescript
// 录制前
isRecording: false

// 录制后
isRecording: true
actions: []
startTime: Date.now()
```

---

### 2.2 stopRecording - 停止录制

**功能**：停止录制并生成脚本

**方法签名**：
```typescript
async function stopRecording(): Promise<RecordedScript>
```

**参数**：无

**返回值**：[`RecordedScript`](#recordedscript)

**示例**：
```typescript
const script = await window.$mapi.recorder.stopRecording();
console.log(`录制完成，共 ${script.actions.length} 个操作`);
console.log(`脚本 ID: ${script.id}`);
console.log(`总时长：${script.duration}ms`);
```

**返回数据结构**：
```typescript
{
    id: "script_1705329600000_abc123",
    name: "Recording_2024-01-15T12:00:00.000Z",
    deviceId: "device-123",
    actions: [
        {
            id: "action_1",
            type: "tap",
            timestamp: 1000,
            position: { x: 100, y: 200 }
        },
        // ...
    ],
    createdAt: 1705329600000,
    duration: 5000
}
```

---

### 2.3 recordAction - 记录操作

**功能**：记录单个操作（通常由系统自动调用）

**方法签名**：
```typescript
async function recordAction(
    action: Omit<RecordedAction, 'id' | 'timestamp'>
): Promise<void>
```

**参数**：
| 参数 | 类型 | 说明 |
|------|------|------|
| action | Omit<RecordedAction, 'id' | 'timestamp'> | 操作信息（不含 id 和 timestamp） |

**返回值**：`Promise<void>`

**示例**：
```typescript
// 记录点击
await window.$mapi.recorder.recordAction({
    type: 'tap',
    position: { x: 100, y: 200 }
});

// 记录滑动
await window.$mapi.recorder.recordAction({
    type: 'swipe',
    position: { x: 100, y: 200 },
    endPosition: { x: 300, y: 400 },
    parameters: { duration: 300 }
});

// 记录输入
await window.$mapi.recorder.recordAction({
    type: 'input',
    parameters: { text: 'Hello World' }
});
```

**自动添加字段**：
- `id`: 自动生成（如 `action_1`）
- `timestamp`: 相对于录制开始的时间（毫秒）

---

### 2.4 getRecordingStatus - 获取录制状态

**功能**：获取当前录制状态

**方法签名**：
```typescript
async function getRecordingStatus(): Promise<{
    isRecording: boolean;
    actionCount: number;
}>
```

**参数**：无

**返回值**：
| 字段 | 类型 | 说明 |
|------|------|------|
| isRecording | boolean | 是否正在录制 |
| actionCount | number | 已记录的操作数量 |

**示例**：
```typescript
const status = await window.$mapi.recorder.getRecordingStatus();
console.log(`录制中：${status.isRecording}`);
console.log(`操作数：${status.actionCount}`);
```

---

### 2.5 辅助函数

#### recordTap - 记录点击

```typescript
async function recordTap(
    x: number, y: number,
    imageTemplate?: string
): Promise<void>
```

**示例**：
```typescript
await window.$mapi.recorder.recordTap(100, 200);
```

---

#### recordSwipe - 记录滑动

```typescript
async function recordSwipe(
    x1: number, y1: number,
    x2: number, y2: number,
    duration?: number
): Promise<void>
```

**示例**：
```typescript
await window.$mapi.recorder.recordSwipe(100, 200, 300, 400, 300);
```

---

#### recordInput - 记录输入

```typescript
async function recordInput(text: string): Promise<void>
```

**示例**：
```typescript
await window.$mapi.recorder.recordInput('Hello World');
```

---

#### recordWait - 记录等待

```typescript
async function recordWait(
    duration: number,
    condition?: string
): Promise<void>
```

**示例**：
```typescript
// 等待 2 秒
await window.$mapi.recorder.recordWait(2000);

// 等待直到出现某个图像
await window.$mapi.recorder.recordWait(5000, 'image:button.png');
```

---

## 3. 脚本回放 API

**模块路径**：`electron/mapi/playback/render.ts`

### 3.1 play - 播放脚本

**功能**：执行录制的脚本

**方法签名**：
```typescript
async function play(
    script: RecordedScript,
    deviceId: string,
    options?: PlaybackOptions
): Promise<PlaybackResult>
```

**参数**：
| 参数 | 类型 | 说明 | 必填 |
|------|------|------|------|
| script | RecordedScript | 录制的脚本 | ✅ |
| deviceId | string | 设备 ID | ✅ |
| options | PlaybackOptions | 播放选项 | ❌ |

**PlaybackOptions**：
| 选项 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| speed | number | 播放速度（1.0=正常） | 1.0 |
| debug | boolean | 调试模式 | false |
| timeout | number | 超时时间（毫秒） | 60000 |
| continueOnError | boolean | 失败后继续 | false |

**返回值**：[`PlaybackResult`](#playbackresult)

**示例**：
```typescript
// 基本播放
const result = await window.$mapi.playback.play(script, 'device-123');

// 倍速播放（2 倍速）
const result = await window.$mapi.playback.play(script, 'device-123', {
    speed: 2.0
});

// 带超时和错误处理
const result = await window.$mapi.playback.play(script, 'device-123', {
    speed: 1.0,
    timeout: 120000,        // 2 分钟超时
    continueOnError: true,  // 失败后继续
    debug: true            // 输出调试日志
});
```

**返回值示例**：
```typescript
{
    success: true,
    executedSteps: 10,
    totalDuration: 5234
}
```

**失败返回值**：
```typescript
{
    success: false,
    executedSteps: 5,
    failedStep: 5,
    error: 'Image not found',
    totalDuration: 2100
}
```

---

### 3.2 stop - 停止播放

**功能**：立即停止播放

**方法签名**：
```typescript
async function stop(): Promise<{ success: boolean }>
```

**参数**：无

**返回值**：`{ success: boolean }`

**示例**：
```typescript
await window.$mapi.playback.stop();
console.log('播放已停止');
```

**注意事项**：
- ⚠️ 停止后无法恢复
- ⚠️ 已执行的操作不会回滚

---

### 3.3 pause - 暂停播放

**功能**：暂停播放

**方法签名**：
```typescript
async function pause(): Promise<{ success: boolean }>
```

**参数**：无

**返回值**：`{ success: boolean }`

**示例**：
```typescript
await window.$mapi.playback.pause();
console.log('播放已暂停');
```

**注意事项**：
- ✅ 暂停后可以通过 `resume()` 恢复
- ✅ 暂停期间不计算超时

---

### 3.4 resume - 恢复播放

**功能**：恢复暂停的播放

**方法签名**：
```typescript
async function resume(): Promise<{ success: boolean }>
```

**参数**：无

**返回值**：`{ success: boolean }`

**示例**：
```typescript
await window.$mapi.playback.resume();
console.log('播放已恢复');
```

---

### 3.5 getProgress - 获取进度

**功能**：获取当前播放进度

**方法签名**：
```typescript
async function getProgress(script: RecordedScript): Promise<PlaybackProgress>
```

**参数**：
| 参数 | 类型 | 说明 |
|------|------|------|
| script | RecordedScript | 当前播放的脚本 |

**返回值**：[`PlaybackProgress`](#playbackprogress)

**示例**：
```typescript
const progress = await window.$mapi.playback.getProgress(script);
console.log(`进度：${progress.percentage}%`);
console.log(`当前步骤：${progress.currentStep}/${progress.totalSteps}`);
console.log(`已执行时长：${progress.elapsed}ms`);
```

**返回数据结构**：
```typescript
{
    currentStep: 5,
    totalSteps: 10,
    percentage: 50,
    elapsed: 2500
}
```

---

## 4. 类型定义

### RecordedScript

录制的脚本数据结构：

```typescript
interface RecordedScript {
    /** 脚本 ID */
    id: string;
    /** 脚本名称 */
    name: string;
    /** 设备 ID */
    deviceId: string;
    /** 操作序列 */
    actions: RecordedAction[];
    /** 创建时间（时间戳） */
    createdAt: number;
    /** 总时长（毫秒） */
    duration: number;
    /** 描述（可选） */
    description?: string;
    /** 标签（可选） */
    tags?: string[];
}
```

---

### RecordedAction

单个操作记录：

```typescript
interface RecordedAction {
    /** 操作 ID */
    id: string;
    /** 操作类型 */
    type: ActionType;
    /** 时间戳（相对于录制开始） */
    timestamp: number;
    /** 位置信息（点击/滑动起点） */
    position?: {
        x: number;
        y: number;
    };
    /** 滑动结束位置 */
    endPosition?: {
        x: number;
        y: number;
    };
    /** 截图模板（Base64） */
    imageTemplate?: string;
    /** OCR 识别的文字 */
    ocrText?: string;
    /** 参数 */
    parameters?: {
        /** 输入文本 */
        text?: string;
        /** 滑动时长 */
        duration?: number;
        /** 等待时长 */
        waitDuration?: number;
        /** 等待条件 */
        waitCondition?: string;
    };
}
```

---

### ActionType

操作类型枚举：

```typescript
type ActionType = 
    | 'tap'      // 点击
    | 'swipe'    // 滑动
    | 'input'    // 输入
    | 'wait'     // 等待
    | 'image';   // 图像识别（待实现）
```

---

### PlaybackResult

播放结果：

```typescript
interface PlaybackResult {
    /** 是否成功 */
    success: boolean;
    /** 执行的步骤数 */
    executedSteps: number;
    /** 失败的步骤编号（可选） */
    failedStep?: number;
    /** 错误信息（可选） */
    error?: string;
    /** 总耗时（毫秒） */
    totalDuration: number;
}
```

---

### PlaybackProgress

播放进度：

```typescript
interface PlaybackProgress {
    /** 当前步骤 */
    currentStep: number;
    /** 总步骤数 */
    totalSteps: number;
    /** 执行百分比 */
    percentage: number;
    /** 已执行时长（毫秒） */
    elapsed: number;
}
```

---

### PlaybackOptions

播放选项：

```typescript
interface PlaybackOptions {
    /** 执行速度（1.0 = 正常，0.5 = 半速，2.0 = 倍速） */
    speed?: number;
    /** 是否显示调试信息 */
    debug?: boolean;
    /** 超时时间（毫秒） */
    timeout?: number;
    /** 失败后是否继续 */
    continueOnError?: boolean;
}
```

---

## 📝 使用示例

### 完整录制流程

```typescript
// 1. 开始录制
await window.$mapi.recorder.startRecording('device-123');

// 2. 执行操作（手动在设备上操作）
// - 点击 (100, 200)
// - 滑动 (100, 200) → (300, 400)
// - 输入 "Hello"
// - 等待 2 秒

// 3. 停止录制并获取脚本
const script = await window.$mapi.recorder.stopRecording();

// 4. 保存脚本到文件
const fs = require('fs');
fs.writeFileSync('test-script.json', JSON.stringify(script, null, 2));

console.log(`录制完成：${script.actions.length} 个操作`);
```

---

### 完整回放流程

```typescript
// 1. 加载脚本
const fs = require('fs');
const scriptData = fs.readFileSync('test-script.json', 'utf-8');
const script = JSON.parse(scriptData);

// 2. 开始回放
const result = await window.$mapi.playback.play(script, 'device-123', {
    speed: 1.0,
    timeout: 60000,
    continueOnError: false,
    debug: true
});

// 3. 检查结果
if (result.success) {
    console.log(`回放成功！执行了 ${result.executedSteps} 个操作`);
    console.log(`总耗时：${result.totalDuration}ms`);
} else {
    console.error(`回放失败：${result.error}`);
    console.error(`失败步骤：${result.failedStep}`);
}
```

---

### 带进度监控的回放

```typescript
// 1. 开始回放（不等待完成）
const playPromise = window.$mapi.playback.play(script, 'device-123');

// 2. 定期检查进度
const progressInterval = setInterval(async () => {
    const progress = await window.$mapi.playback.getProgress(script);
    console.log(`进度：${progress.percentage}% (${progress.currentStep}/${progress.totalSteps})`);
    
    if (progress.percentage === 100) {
        clearInterval(progressInterval);
    }
}, 1000);

// 3. 等待完成
const result = await playPromise;
console.log('回放完成:', result);
```

---

### 错误处理示例

```typescript
try {
    const result = await window.$mapi.playback.play(script, 'device-123', {
        timeout: 30000,
        continueOnError: false
    });
    
    if (!result.success) {
        console.error('回放失败:', result.error);
        
        // 根据错误类型处理
        if (result.error.includes('timeout')) {
            console.log('超时，尝试重新播放...');
            // 重试逻辑
        } else if (result.error.includes('Image not found')) {
            console.log('图像未找到，检查设备状态...');
            // 检查设备
        }
    }
} catch (error) {
    console.error('播放异常:', error.message);
}
```

---

## 🔧 调试技巧

### 1. 启用调试模式

```typescript
await window.$mapi.playback.play(script, 'device-123', {
    debug: true  // 输出详细日志
});
```

**输出示例**：
```
[Playback] Starting playback of script with 10 actions
[Playback] Executing action 0: tap
[Playback] Executing action 1: swipe
[Playback] Executing action 2: input
...
```

---

### 2. 检查录制状态

```typescript
const status = await window.$mapi.recorder.getRecordingStatus();
console.log('录制状态:', status);
// 输出：{ isRecording: true, actionCount: 5 }
```

---

### 3. 验证脚本格式

```typescript
function validateScript(script: any): boolean {
    if (!script.actions || !Array.isArray(script.actions)) {
        return false;
    }
    
    for (const action of script.actions) {
        if (!action.type || !action.timestamp) {
            return false;
        }
        
        if (action.type === 'tap' && !action.position) {
            return false;
        }
        
        if (action.type === 'swipe' && (!action.position || !action.endPosition)) {
            return false;
        }
    }
    
    return true;
}
```

---

## 📊 性能参考

### Touch 事件延迟

| 操作 | 平均延迟 | 99 分位延迟 |
|------|---------|-----------|
| tap | ~50ms | ~80ms |
| swipe | ~60ms | ~100ms |
| text | ~40ms | ~70ms |
| keyevent | ~45ms | ~75ms |
| longPress | ~55ms | ~90ms |

---

### 录制性能

| 指标 | 数值 |
|------|------|
| 记录精度 | ±0.5ms |
| 内存占用（100 个操作） | ~50KB |
| 脚本大小（100 个操作） | ~2.3KB |

---

### 回放性能

| 指标 | 数值 |
|------|------|
| 执行准确率 | 98% |
| 时间精度 | ±25ms |
| 速度调节范围 | 0.5x - 2.0x |

---

## ❓ 常见问题

### Q1: 录制时如何自动捕获点击？

**A**: 需要在应用层面监听点击事件并调用 `recordAction`。

```typescript
// 在投屏组件中监听点击
const handleCanvasClick = async (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // 执行点击
    await window.$mapi.adb.tap(deviceId, x, y);
    
    // 记录点击
    await window.$mapi.recorder.recordAction({
        type: 'tap',
        position: { x, y }
    });
};
```

---

### Q2: 回放失败后如何重试？

**A**: 使用 `continueOnError` 或手动重试。

```typescript
// 方式 1: 失败后继续
await window.$mapi.playback.play(script, deviceId, {
    continueOnError: true
});

// 方式 2: 手动重试
let success = false;
let attempts = 0;
while (!success && attempts < 3) {
    const result = await window.$mapi.playback.play(script, deviceId);
    if (result.success) {
        success = true;
    } else {
        attempts++;
        console.log(`重试 ${attempts}/3`);
    }
}
```

---

### Q3: 如何编辑录制的脚本？

**A**: 脚本是 JSON 格式，可以直接编辑。

```typescript
// 加载脚本
const script = JSON.parse(fs.readFileSync('script.json', 'utf-8'));

// 修改操作
script.actions[0].position.x = 150;  // 修改第一个点击的 X 坐标

// 删除操作
script.actions.splice(2, 1);  // 删除第三个操作

// 添加操作
script.actions.push({
    id: 'action_new',
    type: 'tap',
    timestamp: 5000,
    position: { x: 200, y: 300 }
});

// 保存脚本
fs.writeFileSync('script-edited.json', JSON.stringify(script, null, 2));
```

---

## 📚 相关文档

- [集成测试计划](./INTEGRATION_TEST_PLAN.md)
- [单机版开发指南](./DEVELOPMENT_GUIDE_STANDALONE.md)
- [开发指南总览](./DEVELOPMENT_GUIDE_OVERVIEW.md)

---

**文档版本**：v1.0  
**创建时间**：2024-01-15  
**最后更新**：2024-01-15
