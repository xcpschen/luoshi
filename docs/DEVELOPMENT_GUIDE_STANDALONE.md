# 单机版开发指南

> 📘 单机集成功能详细开发步骤

**版本**：v1.0  
**创建时间**：2024-01-15  
**最后更新**：2024-01-15

---

## 📋 开发任务清单

### Phase 1：基础功能（Week 1）

- [ ] [Touch 事件模块](#1-touch-事件模块)
- [ ] [图像识别优化](#2-图像识别优化)

### Phase 2：操作录制（Week 2）

- [ ] [录制服务](#3-操作录制模块)

### Phase 3：脚本回放（Week 3）

- [ ] [回放服务](#4-脚本回放模块)

---

## 1. Touch 事件模块

**优先级**：P0 🔴  
**预估工时**：2 天  
**难度**：⭐⭐

### 1.1 文件结构

```
electron/mapi/adb/
├── touch.ts          # ✨ 新增
├── render.ts         # 修改（集成 touch）
└── main.ts           # 无需修改
```

### 1.2 实现步骤

#### Step 1: 创建 touch.ts

**文件路径**：`electron/mapi/adb/touch.ts`

```typescript
import { adbShell } from './render';

/**
 * 点击操作
 * @param deviceId 设备 ID
 * @param x X 坐标
 * @param y Y 坐标
 */
export const tap = async (deviceId: string, x: number, y: number): Promise<void> => {
    return await adbShell([
        '-s', deviceId,
        'shell', 'input', 'tap',
        x.toString(), y.toString()
    ]);
};

/**
 * 滑动操作
 * @param deviceId 设备 ID
 * @param x1 起点 X 坐标
 * @param y1 起点 Y 坐标
 * @param x2 终点 X 坐标
 * @param y2 终点 Y 坐标
 * @param duration 滑动时长（毫秒），默认 300ms
 */
export const swipe = async (
    deviceId: string,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    duration: number = 300
): Promise<void> => {
    return await adbShell([
        '-s', deviceId,
        'shell', 'input', 'swipe',
        x1.toString(), y1.toString(),
        x2.toString(), y2.toString(),
        duration.toString()
    ]);
};

/**
 * 文本输入
 * @param deviceId 设备 ID
 * @param text 输入文本
 */
export const text = async (deviceId: string, text: string): Promise<void> => {
    // 空格需要特殊处理
    const formattedText = text.replace(/ /g, '%s');
    return await adbShell([
        '-s', deviceId,
        'shell', 'input', 'text',
        formattedText
    ]);
};

/**
 * 按键操作
 * @param deviceId 设备 ID
 * @param keycode 按键代码（Android KeyEvent）
 * 
 * 常用 keycode:
 * - 3: HOME
 * - 4: BACK
 * - 66: ENTER
 * - 82: MENU
 * - 122: POWER
 */
export const keyevent = async (deviceId: string, keycode: number): Promise<void> => {
    return await adbShell([
        '-s', deviceId,
        'shell', 'input', 'keyevent',
        keycode.toString()
    ]);
};

/**
 * 长按操作（通过延迟实现）
 * @param deviceId 设备 ID
 * @param x X 坐标
 * @param y Y 坐标
 * @param duration 长按时长（毫秒），默认 1000ms
 */
export const longPress = async (
    deviceId: string,
    x: number,
    y: number,
    duration: number = 1000
): Promise<void> => {
    // 使用 swipe 实现长按（起点终点相同）
    await swipe(deviceId, x, y, x, y, duration);
};

export default {
    tap,
    swipe,
    text,
    keyevent,
    longPress,
};
```

#### Step 2: 集成到 render.ts

**文件路径**：`electron/mapi/adb/render.ts`

**修改位置**：文件开头导入 + 导出对象

```typescript
// 在文件开头添加导入
import touch from './touch';

// ... existing code ...

// 在导出对象中添加 touch 方法
export default {
    // ... existing methods
    ...touch,  // ✨ 新增：展开 touch 模块的所有方法
};
```

#### Step 3: 添加类型定义

**文件路径**：`src/types/Device.ts`

**新增内容**：

```typescript
// 在文件末尾添加 Touch 相关类型
export interface TouchPosition {
    x: number;
    y: number;
}

export interface TouchOptions {
    duration?: number;
}

export interface InputOptions {
    clearFirst?: boolean;
}
```

#### Step 4: 在 Vue 组件中使用

**示例**：`src/pages/Device/DeviceItem.vue`

```vue
<script setup lang="ts">
// ... existing imports

const handleTap = async (x: number, y: number) => {
    try {
        await window.$mapi.adb.tap(props.device.id, x, y);
        Dialog.tipSuccess('点击成功');
    } catch (error) {
        Dialog.tipError('点击失败');
    }
};

const handleSwipe = async (
    x1: number, y1: number,
    x2: number, y2: number
) => {
    try {
        await window.$mapi.adb.swipe(
            props.device.id,
            x1, y1, x2, y2,
            300
        );
        Dialog.tipSuccess('滑动成功');
    } catch (error) {
        Dialog.tipError('滑动失败');
    }
};
</script>
```

### 1.3 测试用例

#### 单元测试

**文件路径**：`tests/unit/adb/touch.test.ts`

```typescript
import { touch } from '../../../electron/mapi/adb/touch';
import { adbShell } from '../../../electron/mapi/adb/render';

jest.mock('../../../electron/mapi/adb/render');

describe('TouchService', () => {
    const mockDeviceId = 'test-device-123';
    const mockShell = adbShell as jest.MockedFunction<typeof adbShell>;

    beforeEach(() => {
        mockShell.mockClear();
        mockShell.mockResolvedValue('success');
    });

    describe('tap', () => {
        it('should execute tap command with correct coordinates', async () => {
            await touch.tap(mockDeviceId, 100, 200);

            expect(mockShell).toHaveBeenCalledWith([
                '-s', mockDeviceId,
                'shell', 'input', 'tap',
                '100', '200'
            ]);
        });
    });

    describe('swipe', () => {
        it('should execute swipe command with default duration', async () => {
            await touch.swipe(mockDeviceId, 100, 200, 300, 400);

            expect(mockShell).toHaveBeenCalledWith([
                '-s', mockDeviceId,
                'shell', 'input', 'swipe',
                '100', '200', '300', '400',
                '300'
            ]);
        });

        it('should execute swipe command with custom duration', async () => {
            await touch.swipe(mockDeviceId, 100, 200, 300, 400, 500);

            expect(mockShell).toHaveBeenCalledWith([
                '-s', mockDeviceId,
                'shell', 'input', 'swipe',
                '100', '200', '300', '400',
                '500'
            ]);
        });
    });

    describe('text', () => {
        it('should execute text input command', async () => {
            await touch.text(mockDeviceId, 'Hello');

            expect(mockShell).toHaveBeenCalledWith([
                '-s', mockDeviceId,
                'shell', 'input', 'text',
                'Hello'
            ]);
        });

        it('should handle spaces in text', async () => {
            await touch.text(mockDeviceId, 'Hello World');

            expect(mockShell).toHaveBeenCalledWith([
                '-s', mockDeviceId,
                'shell', 'input', 'text',
                'Hello%sWorld'
            ]);
        });
    });

    describe('keyevent', () => {
        it('should execute keyevent command', async () => {
            await touch.keyevent(mockDeviceId, 3);

            expect(mockShell).toHaveBeenCalledWith([
                '-s', mockDeviceId,
                'shell', 'input', 'keyevent',
                '3'
            ]);
        });
    });
});
```

### 1.4 验收标准

- [ ] 能成功执行点击操作
- [ ] 能成功执行滑动操作
- [ ] 能成功输入文本
- [ ] 能执行按键操作
- [ ] 延迟 < 100ms
- [ ] 单元测试通过率 100%
- [ ] 代码覆盖率 > 90%

---

## 2. 图像识别优化

**优先级**：P0 🔴  
**预估工时**：3 天  
**难度**：⭐⭐⭐

### 2.1 当前问题

**文件路径**：`electron/mapi/imageRecognition/services/local.service.ts`

**当前状态**：
```typescript
// OpenCV 实例（已禁用）
let cv: any = null;

async function loadOpenCV(): Promise<any> {
    // 暂时禁用 OpenCV 加载，避免阻塞主界面
    return null;
}
```

### 2.2 修改方案

#### Step 1: 恢复 OpenCV 加载

**文件路径**：`electron/mapi/imageRecognition/services/local.service.ts`

**修改内容**：

```typescript
// OpenCV 实例
let cv: any = null;
let isLoading = false;

async function loadOpenCV(): Promise<any> {
    if (cv) {
        return cv;
    }
    
    if (isLoading) {
        // 等待加载完成
        return new Promise((resolve) => {
            const checkLoaded = setInterval(() => {
                if (cv) {
                    clearInterval(checkLoaded);
                    resolve(cv);
                }
            }, 100);
        });
    }
    
    isLoading = true;
    
    try {
        // 使用动态导入，避免阻塞主线程
        const opencv = await import('@techstark/opencv-js');
        cv = opencv.default || opencv;
        
        // 等待 OpenCV 初始化完成
        await new Promise<void>((resolve, reject) => {
            const checkReady = setInterval(() => {
                if (cv['ready']) {
                    clearInterval(checkReady);
                    resolve();
                }
            }, 100);
            
            // 超时处理（10 秒）
            setTimeout(() => {
                clearInterval(checkReady);
                console.warn('[LocalRecognition] OpenCV initialization timeout');
                resolve(); // 即使超时也继续，可能部分功能可用
            }, 10000);
        });
        
        console.log('[LocalRecognition] OpenCV loaded successfully');
        isLoading = false;
        return cv;
    } catch (error) {
        console.warn('[LocalRecognition] Failed to load OpenCV:', error);
        cv = null;
        isLoading = false;
        return null;
    }
}
```

#### Step 2: 优化模板匹配

**修改位置**：`matchTemplate` 方法

```typescript
private async matchTemplate(
    screenshotData: Uint8Array,
    templateData: Uint8Array,
    threshold: number
): Promise<{
    found: boolean;
    confidence: number;
    x: number;
    y: number;
    width: number;
    height: number;
}> {
    if (!cv) {
        console.warn('[LocalRecognition] OpenCV not available, skipping template matching');
        return {
            found: false,
            confidence: 0,
            x: 0,
            y: 0,
            width: 0,
            height: 0,
        };
    }
    
    return new Promise((resolve) => {
        try {
            // 解码图像
            const screenshot = cv.imdecode(screenshotData, cv.IMREAD_COLOR);
            const template = cv.imdecode(templateData, cv.IMREAD_COLOR);
            
            if (screenshot.empty() || template.empty()) {
                console.error('[LocalRecognition] Failed to decode images');
                screenshot.delete();
                template.delete();
                resolve({
                    found: false,
                    confidence: 0,
                    x: 0,
                    y: 0,
                    width: 0,
                    height: 0,
                });
                return;
            }
            
            // 转换为灰度图（加速匹配）
            const srcGray = new cv.Mat();
            const templGray = new cv.Mat();
            cv.cvtColor(screenshot, srcGray, cv.COLOR_BGR2GRAY);
            cv.cvtColor(template, templGray, cv.COLOR_BGR2GRAY);
            
            // 多尺度匹配（优化：减少尺度数量）
            const scales = [1.0, 0.8, 0.6];
            
            for (const scale of scales) {
                const resizedTemplate = new cv.Mat();
                cv.resize(templGray, resizedTemplate, new cv.Size(0, 0), scale, scale);
                
                const result = new cv.Mat();
                cv.matchTemplate(srcGray, resizedTemplate, result, cv.TM_CCOEFF_NORMED);
                
                const resultData = {
                    minVal: 0,
                    maxVal: 0,
                    minLoc: { x: 0, y: 0 },
                    maxLoc: { x: 0, y: 0 },
                };
                cv.minMaxLoc(result, resultData);
                
                if (resultData.maxVal >= threshold) {
                    const matchResult = {
                        found: true,
                        confidence: resultData.maxVal,
                        x: resultData.maxLoc.x / scale,
                        y: resultData.maxLoc.y / scale,
                        width: resizedTemplate.cols / scale,
                        height: resizedTemplate.rows / scale,
                    };
                    
                    // 清理资源
                    resizedTemplate.delete();
                    result.delete();
                    srcGray.delete();
                    templGray.delete();
                    screenshot.delete();
                    template.delete();
                    
                    resolve(matchResult);
                    return;
                }
                
                resizedTemplate.delete();
                result.delete();
            }
            
            // 未找到匹配
            srcGray.delete();
            templGray.delete();
            screenshot.delete();
            template.delete();
            
            resolve({
                found: false,
                confidence: 0,
                x: 0,
                y: 0,
                width: 0,
                height: 0,
            });
        } catch (error) {
            console.error('[LocalRecognition] Template matching error:', error);
            resolve({
                found: false,
                confidence: 0,
                x: 0,
                y: 0,
                width: 0,
                height: 0,
            });
        }
    });
}
```

#### Step 3: 添加图像缓存

**新增文件**：`electron/mapi/imageRecognition/utils/template.cache.ts`

```typescript
import * as cv from '@techstark/opencv-js';

interface CachedTemplate {
    mat: cv.Mat;
    pyramid: cv.Mat[];
    lastUsed: number;
    hitCount: number;
}

export class TemplateCache {
    private cache = new Map<string, CachedTemplate>();
    private maxSize = 500;
    private maxMemoryMB = 100;
    
    /**
     * 获取或加载模板
     */
    async getOrLoad(templatePath: string): Promise<cv.Mat> {
        const cached = this.cache.get(templatePath);
        
        // 缓存命中
        if (cached && Date.now() - cached.lastUsed < 5 * 60 * 1000) {
            cached.lastUsed = Date.now();
            cached.hitCount++;
            return cached.mat.clone();
        }
        
        // 缓存未命中，加载并预处理
        const template = await this.loadTemplate(templatePath);
        const pyramid = this.buildPyramid(template);
        
        // 保存到缓存
        this.cache.set(templatePath, {
            mat: template,
            pyramid,
            lastUsed: Date.now(),
            hitCount: 0,
        });
        
        // 清理旧缓存
        this.evictIfNeeded();
        
        return template.clone();
    }
    
    /**
     * 加载并预处理模板
     */
    private async loadTemplate(templatePath: string): Promise<cv.Mat> {
        const fs = await import('fs');
        const imageData = fs.readFileSync(templatePath);
        const template = cv.imdecode(new Uint8Array(imageData), cv.IMREAD_COLOR);
        
        // 转换为灰度图
        const gray = new cv.Mat();
        cv.cvtColor(template, gray, cv.COLOR_BGR2GRAY);
        
        // 高斯模糊（降噪）
        cv.GaussianBlur(gray, gray, [5, 5], 0);
        
        template.delete();
        return gray;
    }
    
    /**
     * 构建图像金字塔
     */
    private buildPyramid(template: cv.Mat): cv.Mat[] {
        const pyramid: cv.Mat[] = [];
        const scales = [1.0, 0.8, 0.6, 0.4];
        
        for (const scale of scales) {
            const scaled = new cv.Mat();
            cv.resize(template, scaled, new cv.Size(0, 0), scale, scale);
            pyramid.push(scaled);
        }
        
        return pyramid;
    }
    
    /**
     * 清理缓存
     */
    private evictIfNeeded() {
        if (this.cache.size <= this.maxSize) {
            return;
        }
        
        // 按最后使用时间排序，删除最旧的
        const entries = Array.from(this.cache.entries())
            .sort((a, b) => a[1].lastUsed - b[1].lastUsed);
        
        const toDelete = Math.floor(this.cache.size * 0.2); // 删除 20%
        for (let i = 0; i < toDelete; i++) {
            const [key, cached] = entries[i];
            
            // 清理 OpenCV 资源
            cached.mat.delete();
            cached.pyramid.forEach(mat => mat.delete());
            
            this.cache.delete(key);
        }
    }
    
    /**
     * 清空缓存
     */
    clear() {
        for (const [key, cached] of this.cache.entries()) {
            cached.mat.delete();
            cached.pyramid.forEach(mat => mat.delete());
        }
        this.cache.clear();
    }
}

// 单例
export const templateCache = new TemplateCache();
```

#### Step 4: 使用缓存

**修改文件**：`electron/mapi/imageRecognition/services/local.service.ts`

```typescript
import { templateCache } from '../utils/template.cache';

// ... 在 matchTemplate 方法中使用缓存 ...

private async matchTemplate(
    screenshotData: Uint8Array,
    templateData: Uint8Array,
    threshold: number
): Promise<...> {
    // ... 解码 screenshot ...
    
    // 使用缓存加载模板
    const template = await templateCache.getOrLoad(templatePath);
    
    // ... 后续匹配逻辑 ...
}
```

### 2.3 测试用例

**文件路径**：`tests/unit/imageRecognition/local.test.ts`

```typescript
describe('LocalRecognitionService', () => {
    it('should load OpenCV without blocking', async () => {
        const service = new LocalRecognitionService(mockConfig);
        
        const startTime = Date.now();
        await service.initialize();
        const duration = Date.now() - startTime;
        
        // 初始化应该在 1 秒内完成（非阻塞）
        expect(duration).toBeLessThan(1000);
    });
    
    it('should recognize template successfully', async () => {
        const service = new LocalRecognitionService(mockConfig);
        await service.initialize();
        
        const result = await service.recognize(mockRequest);
        
        expect(result).toHaveProperty('found');
        expect(result).toHaveProperty('confidence');
        expect(result).toHaveProperty('responseTime');
    });
});
```

### 2.4 验收标准

- [ ] OpenCV 加载不阻塞主界面（< 1 秒）
- [ ] 识别准确率 > 90%
- [ ] 识别速度 < 300ms
- [ ] 缓存命中率 > 80%
- [ ] 内存占用 < 200MB
- [ ] 单元测试通过率 100%

---

## 3. 操作录制模块

**优先级**：P0 🔴  
**预估工时**：5 天  
**难度**：⭐⭐⭐⭐

### 3.1 文件结构

```
electron/mapi/
└── recorder/
    ├── main.ts           # ✨ 新增：主进程服务
    └── render.ts         # ✨ 新增：渲染进程 API

src/
├── pages/
│   └── Recorder/
│       └── RecorderPanel.vue  # ✨ 新增：录制界面
├── types/
│   └── Recorder.ts       # ✨ 新增：类型定义
└── store/modules/
    └── recorder.ts       # ✨ 新增：状态管理
```

### 3.2 实现步骤

#### Step 1: 定义类型

**文件路径**：`src/types/Recorder.ts`

```typescript
/**
 * 录制的操作类型
 */
export type ActionType = 'tap' | 'swipe' | 'input' | 'wait' | 'image';

/**
 * 单个操作记录
 */
export interface RecordedAction {
    /** 操作 ID */
    id: string;
    /** 操作类型 */
    type: ActionType;
    /** 时间戳（相对于录制开始） */
    timestamp: number;
    /** 位置信息 */
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

/**
 * 录制的脚本
 */
export interface RecordedScript {
    /** 脚本 ID */
    id: string;
    /** 脚本名称 */
    name: string;
    /** 设备 ID */
    deviceId: string;
    /** 操作序列 */
    actions: RecordedAction[];
    /** 创建时间 */
    createdAt: number;
    /** 总时长（毫秒） */
    duration: number;
    /** 描述 */
    description?: string;
    /** 标签 */
    tags?: string[];
}

/**
 * 录制状态
 */
export type RecorderStatus = 'idle' | 'recording' | 'paused' | 'stopped';
```

#### Step 2: 实现主进程服务

**文件路径**：`electron/mapi/recorder/main.ts`

```typescript
import { ipcMain, BrowserWindow } from 'electron';
import { RecordedAction, RecordedScript } from '../../../src/types/Recorder';
import { adb } from '../adb';

class ActionRecorder {
    private isRecording = false;
    private actions: RecordedAction[] = [];
    private startTime = 0;
    private currentDeviceId: string | null = null;
    private actionIdCounter = 0;
    
    /**
     * 开始录制
     */
    startRecording(deviceId: string) {
        this.isRecording = true;
        this.actions = [];
        this.startTime = Date.now();
        this.currentDeviceId = deviceId;
        this.actionIdCounter = 0;
        
        console.log(`[Recorder] Started recording on device ${deviceId}`);
    }
    
    /**
     * 停止录制
     */
    stopRecording(): RecordedScript {
        this.isRecording = false;
        
        const script: RecordedScript = {
            id: this.generateScriptId(),
            name: `Recording_${new Date().toISOString()}`,
            deviceId: this.currentDeviceId!,
            actions: [...this.actions],
            createdAt: Date.now(),
            duration: Date.now() - this.startTime,
        };
        
        console.log(`[Recorder] Stopped recording, ${script.actions.length} actions recorded`);
        
        this.currentDeviceId = null;
        return script;
    }
    
    /**
     * 记录操作
     */
    recordAction(action: Omit<RecordedAction, 'id' | 'timestamp'>) {
        if (!this.isRecording) {
            return;
        }
        
        const recordedAction: RecordedAction = {
            ...action,
            id: `action_${++this.actionIdCounter}`,
            timestamp: Date.now() - this.startTime,
        };
        
        this.actions.push(recordedAction);
        
        console.log(`[Recorder] Recorded action: ${action.type} at ${recordedAction.timestamp}ms`);
    }
    
    /**
     * 生成脚本 ID
     */
    private generateScriptId(): string {
        return `script_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
    
    /**
     * 获取当前状态
     */
    getStatus(): { isRecording: boolean; actionCount: number } {
        return {
            isRecording: this.isRecording,
            actionCount: this.actions.length,
        };
    }
}

// 单例
const recorder = new ActionRecorder();

// IPC Handlers
export function registerRecorderHandlers() {
    ipcMain.handle('recorder:start', async (event, deviceId: string) => {
        recorder.startRecording(deviceId);
        return { success: true };
    });
    
    ipcMain.handle('recorder:stop', async () => {
        const script = recorder.stopRecording();
        return { success: true, script };
    });
    
    ipcMain.handle('recorder:record-action', async (event, action) => {
        recorder.recordAction(action);
        return { success: true };
    });
    
    ipcMain.handle('recorder:get-status', async () => {
        return recorder.getStatus();
    });
}
```

#### Step 3: 实现渲染进程 API

**文件路径**：`electron/mapi/recorder/render.ts`

```typescript
import { ipcRenderer } from 'electron';
import { RecordedAction, RecordedScript } from '../../../src/types/Recorder';

/**
 * 开始录制
 */
export const startRecording = async (deviceId: string): Promise<void> => {
    await ipcRenderer.invoke('recorder:start', deviceId);
};

/**
 * 停止录制
 */
export const stopRecording = async (): Promise<RecordedScript> => {
    const result = await ipcRenderer.invoke('recorder:stop');
    return result.script;
};

/**
 * 记录操作
 */
export const recordAction = async (action: Omit<RecordedAction, 'id' | 'timestamp'>): Promise<void> => {
    await ipcRenderer.invoke('recorder:record-action', action);
};

/**
 * 获取录制状态
 */
export const getRecordingStatus = async (): Promise<{ isRecording: boolean; actionCount: number }> => {
    return await ipcRenderer.invoke('recorder:get-status');
};

/**
 * 辅助函数：记录点击
 */
export const recordTap = async (x: number, y: number, imageTemplate?: string): Promise<void> => {
    await recordAction({
        type: 'tap',
        position: { x, y },
        imageTemplate,
    });
};

/**
 * 辅助函数：记录滑动
 */
export const recordSwipe = async (
    x1: number, y1: number,
    x2: number, y2: number,
    duration: number = 300
): Promise<void> => {
    await recordAction({
        type: 'swipe',
        position: { x: x1, y: y1 },
        endPosition: { x: x2, y: y2 },
        parameters: { duration },
    });
};

/**
 * 辅助函数：记录输入
 */
export const recordInput = async (text: string): Promise<void> => {
    await recordAction({
        type: 'input',
        parameters: { text },
    });
};

/**
 * 辅助函数：记录等待
 */
export const recordWait = async (duration: number, condition?: string): Promise<void> => {
    await recordAction({
        type: 'wait',
        parameters: {
            waitDuration: duration,
            waitCondition: condition,
        },
    });
};

export default {
    startRecording,
    stopRecording,
    recordAction,
    getRecordingStatus,
    recordTap,
    recordSwipe,
    recordInput,
    recordWait,
};
```

### 3.3 录制界面

**文件路径**：`src/pages/Recorder/RecorderPanel.vue`

```vue
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { Dialog } from '../../lib/dialog';
import { t } from '../../lang';
import { useDeviceStore } from '../../store/modules/device';
import { RecordedAction } from '../../types/Recorder';

const deviceStore = useDeviceStore();

const isRecording = ref(false);
const actionCount = ref(0);
const recordingTime = ref(0);
const actions = ref<RecordedAction[]>([]);

let timer: any = null;

const startRecording = async () => {
    if (!deviceStore.selectedDevice) {
        Dialog.tipError(t('device.notSelected'));
        return;
    }
    
    try {
        await window.$mapi.recorder.startRecording(deviceStore.selectedDevice.id);
        isRecording.value = true;
        actionCount.value = 0;
        recordingTime.value = 0;
        actions.value = [];
        
        // 启动计时器
        timer = setInterval(() => {
            recordingTime.value++;
        }, 1000);
        
        Dialog.tipSuccess(t('recorder.started'));
    } catch (error) {
        Dialog.tipError(t('recorder.startFailed'));
    }
};

const stopRecording = async () => {
    try {
        const script = await window.$mapi.recorder.stopRecording();
        isRecording.value = false;
        
        if (timer) {
            clearInterval(timer);
        }
        
        Dialog.tipSuccess(t('recorder.stopped', { count: script.actions.length }));
        
        // 保存脚本
        await saveScript(script);
    } catch (error) {
        Dialog.tipError(t('recorder.stopFailed'));
    }
};

const saveScript = async (script: any) => {
    // TODO: 实现脚本保存逻辑
    console.log('Save script:', script);
};

const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

onUnmounted(() => {
    if (timer) {
        clearInterval(timer);
    }
});
</script>

<template>
    <div class="recorder-panel">
        <div class="recorder-header">
            <h3>{{ $t('recorder.title') }}</h3>
            <div class="recorder-status">
                <a-tag v-if="isRecording" color="red">
                    <icon-loading />
                    {{ $t('recorder.recording') }}
                </a-tag>
                <a-tag v-else color="green">
                    {{ $t('recorder.stopped') }}
                </a-tag>
            </div>
        </div>
        
        <div class="recorder-info">
            <div class="info-item">
                <label>{{ $t('recorder.time') }}</label>
                <span>{{ formatTime(recordingTime) }}</span>
            </div>
            <div class="info-item">
                <label>{{ $t('recorder.actions') }}</label>
                <span>{{ actionCount }}</span>
            </div>
        </div>
        
        <div class="recorder-actions">
            <a-button
                v-if="!isRecording"
                type="primary"
                status="success"
                @click="startRecording"
            >
                <template #icon>
                    <icon-record />
                </template>
                {{ $t('recorder.start') }}
            </a-button>
            <a-button
                v-else
                type="primary"
                status="danger"
                @click="stopRecording"
            >
                <template #icon>
                    <icon-stop />
                </template>
                {{ $t('recorder.stop') }}
            </a-button>
        </div>
        
        <div class="recorder-action-list">
            <h4>{{ $t('recorder.actionList') }}</h4>
            <a-empty v-if="actions.length === 0" :description="$t('recorder.noActions')" />
            <div v-else class="action-list">
                <div v-for="action in actions" :key="action.id" class="action-item">
                    <span class="action-type">{{ action.type }}</span>
                    <span class="action-time">{{ action.timestamp }}ms</span>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped lang="less">
.recorder-panel {
    padding: 20px;
    
    .recorder-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
    }
    
    .recorder-info {
        display: flex;
        gap: 20px;
        margin-bottom: 20px;
        
        .info-item {
            display: flex;
            flex-direction: column;
            gap: 5px;
            
            label {
                font-size: 12px;
                color: var(--color-text-2);
            }
            
            span {
                font-size: 18px;
                font-weight: bold;
            }
        }
    }
    
    .recorder-actions {
        margin-bottom: 20px;
    }
}
</style>
```

### 3.4 验收标准

- [ ] 能开始录制
- [ ] 能停止录制
- [ ] 能记录点击操作
- [ ] 能记录滑动操作
- [ ] 能记录输入操作
- [ ] 能记录等待操作
- [ ] 自动生成脚本（JSON）
- [ ] 显示录制时长
- [ ] 显示操作数量
- [ ] 单元测试通过率 100%

---

## 4. 脚本回放模块

**优先级**：P0 🔴  
**预估工时**：5 天  
**难度**：⭐⭐⭐⭐

### 4.1 文件结构

```
electron/mapi/
└── playback/
    ├── main.ts           # ✨ 新增：主进程服务
    └── render.ts         # ✨ 新增：渲染进程 API

src/
├── pages/
│   └── Playback/
│       └── PlaybackPanel.vue  # ✨ 新增：回放界面
└── types/
    └── Playback.ts       # ✨ 新增：类型定义
```

### 4.2 实现步骤

#### Step 1: 定义类型

**文件路径**：`src/types/Playback.ts`

```typescript
import { RecordedScript } from './Recorder';

/**
 * 回放状态
 */
export type PlaybackStatus = 'idle' | 'playing' | 'paused' | 'stopped' | 'completed' | 'failed';

/**
 * 回放进度
 */
export interface PlaybackProgress {
    /** 当前步骤 */
    currentStep: number;
    /** 总步骤数 */
    totalSteps: number;
    /** 执行百分比 */
    percentage: number;
    /** 已执行时长（毫秒） */
    elapsed: number;
}

/**
 * 回放结果
 */
export interface PlaybackResult {
    /** 是否成功 */
    success: boolean;
    /** 执行的步骤数 */
    executedSteps: number;
    /** 失败的步骤 */
    failedStep?: number;
    /** 错误信息 */
    error?: string;
    /** 总耗时（毫秒） */
    totalDuration: number;
}

/**
 * 回放选项
 */
export interface PlaybackOptions {
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

#### Step 2: 实现主进程服务

**文件路径**：`electron/mapi/playback/main.ts`

```typescript
import { ipcMain } from 'electron';
import { RecordedScript, RecordedAction } from '../../../src/types/Recorder';
import { PlaybackResult, PlaybackOptions } from '../../../src/types/Playback';
import { adb } from '../adb';
import { imageRecognition } from '../imageRecognition';

class ScriptPlayer {
    private isPlaying = false;
    private isPaused = false;
    private currentStep = 0;
    private startTime = 0;
    private pauseStartTime = 0;
    private totalPauseTime = 0;
    
    /**
     * 播放脚本
     */
    async play(script: RecordedScript, deviceId: string, options: PlaybackOptions = {}): Promise<PlaybackResult> {
        const {
            speed = 1.0,
            debug = false,
            timeout = 60000,
            continueOnError = false,
        } = options;
        
        this.isPlaying = true;
        this.isPaused = false;
        this.currentStep = 0;
        this.startTime = Date.now();
        this.totalPauseTime = 0;
        
        if (debug) {
            console.log(`[Playback] Starting playback of script with ${script.actions.length} actions`);
        }
        
        try {
            for (let i = 0; i < script.actions.length; i++) {
                if (!this.isPlaying) {
                    return {
                        success: false,
                        executedSteps: i,
                        error: 'Playback stopped by user',
                        totalDuration: Date.now() - this.startTime,
                    };
                }
                
                // 检查超时
                const elapsed = Date.now() - this.startTime - this.totalPauseTime;
                if (elapsed > timeout) {
                    return {
                        success: false,
                        executedSteps: i,
                        error: 'Playback timeout',
                        totalDuration: elapsed,
                    };
                }
                
                this.currentStep = i;
                const action = script.actions[i];
                
                if (debug) {
                    console.log(`[Playback] Executing action ${i}: ${action.type}`);
                }
                
                try {
                    await this.executeAction(action, deviceId, speed);
                } catch (error: any) {
                    if (!continueOnError) {
                        throw error;
                    }
                    console.warn(`[Playback] Action ${i} failed, continuing:`, error.message);
                }
                
                // 等待到下一个操作的时间（考虑速度倍率）
                if (i < script.actions.length - 1) {
                    const nextAction = script.actions[i + 1];
                    const waitTime = (nextAction.timestamp - action.timestamp) / speed;
                    await this.sleep(waitTime);
                }
            }
            
            return {
                success: true,
                executedSteps: script.actions.length,
                totalDuration: Date.now() - this.startTime,
            };
        } catch (error: any) {
            return {
                success: false,
                executedSteps: this.currentStep,
                failedStep: this.currentStep,
                error: error.message,
                totalDuration: Date.now() - this.startTime,
            };
        } finally {
            this.isPlaying = false;
        }
    }
    
    /**
     * 执行单个操作
     */
    private async executeAction(
        action: RecordedAction,
        deviceId: string,
        speed: number
    ): Promise<void> {
        switch (action.type) {
            case 'tap':
                await this.executeTap(action, deviceId);
                break;
                
            case 'swipe':
                await this.executeSwipe(action, deviceId);
                break;
                
            case 'input':
                await this.executeInput(action, deviceId);
                break;
                
            case 'wait':
                await this.executeWait(action, speed);
                break;
                
            case 'image':
                await this.executeImage(action, deviceId);
                break;
        }
    }
    
    /**
     * 执行点击
     */
    private async executeTap(action: RecordedAction, deviceId: string): Promise<void> {
        if (action.imageTemplate) {
            // 使用图像识别定位
            const result = await imageRecognition.findImage({
                deviceId,
                templatePath: action.imageTemplate,
            });
            
            if (result.found) {
                await adb.tap(deviceId, result.x, result.y);
            } else {
                throw new Error('Image not found for tap action');
            }
        } else if (action.position) {
            await adb.tap(deviceId, action.position.x, action.position.y);
        } else {
            throw new Error('Tap action missing position or image');
        }
    }
    
    /**
     * 执行滑动
     */
    private async executeSwipe(action: RecordedAction, deviceId: string): Promise<void> {
        if (!action.position || !action.endPosition) {
            throw new Error('Swipe action missing position');
        }
        
        await adb.swipe(
            deviceId,
            action.position.x,
            action.position.y,
            action.endPosition.x,
            action.endPosition.y,
            action.parameters?.duration || 300
        );
    }
    
    /**
     * 执行输入
     */
    private async executeInput(action: RecordedAction, deviceId: string): Promise<void> {
        if (!action.parameters?.text) {
            throw new Error('Input action missing text');
        }
        
        await adb.text(deviceId, action.parameters.text);
    }
    
    /**
     * 执行等待
     */
    private async executeWait(action: RecordedAction, speed: number): Promise<void> {
        const duration = action.parameters?.waitDuration || 1000;
        await this.sleep(duration / speed);
    }
    
    /**
     * 执行图像识别等待
     */
    private async executeImage(action: RecordedAction, deviceId: string): Promise<void> {
        if (!action.imageTemplate) {
            throw new Error('Image action missing template');
        }
        
        const timeout = action.parameters?.waitDuration || 5000;
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            const result = await imageRecognition.findImage({
                deviceId,
                templatePath: action.imageTemplate,
            });
            
            if (result.found) {
                return;
            }
            
            await this.sleep(500);
        }
        
        throw new Error('Image not found within timeout');
    }
    
    /**
     * 暂停播放
     */
    pause() {
        if (!this.isPlaying || this.isPaused) return;
        this.isPaused = true;
        this.pauseStartTime = Date.now();
    }
    
    /**
     * 恢复播放
     */
    resume() {
        if (!this.isPaused) return;
        this.isPaused = false;
        this.totalPauseTime += Date.now() - this.pauseStartTime;
    }
    
    /**
     * 停止播放
     */
    stop() {
        this.isPlaying = false;
        this.isPaused = false;
    }
    
    /**
     * 获取进度
     */
    getProgress(script: RecordedScript): { currentStep: number; totalSteps: number; percentage: number } {
        return {
            currentStep: this.currentStep,
            totalSteps: script.actions.length,
            percentage: Math.round((this.currentStep / script.actions.length) * 100),
        };
    }
    
    /**
     * 睡眠辅助函数
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 单例
const player = new ScriptPlayer();

// IPC Handlers
export function registerPlaybackHandlers() {
    ipcMain.handle('playback:play', async (event, script, deviceId, options) => {
        return await player.play(script, deviceId, options);
    });
    
    ipcMain.handle('playback:stop', async () => {
        player.stop();
        return { success: true };
    });
    
    ipcMain.handle('playback:pause', async () => {
        player.pause();
        return { success: true };
    });
    
    ipcMain.handle('playback:resume', async () => {
        player.resume();
        return { success: true };
    });
    
    ipcMain.handle('playback:get-progress', async (event, script) => {
        return player.getProgress(script);
    });
}
```

### 4.3 验收标准

- [ ] 能解析录制脚本
- [ ] 能按时间戳执行操作
- [ ] 支持图像识别定位
- [ ] 支持速度调节（0.5x, 1x, 2x）
- [ ] 支持暂停/恢复
- [ ] 支持超时控制
- [ ] 支持失败后继续
- [ ] 显示执行进度
- [ ] 回放成功率 > 85%
- [ ] 单元测试通过率 100%

---

## 📊 总结

### 开发优先级

1. **Touch 事件**（2 天）- 最简单，立即见效
2. **图像识别优化**（3 天）- 核心功能，必须恢复
3. **操作录制**（5 天）- 增强功能
4. **脚本回放**（5 天）- 增强功能

### 总工作量

- **新增文件**：9 个
- **修改文件**：4 个
- **新增代码**：~2000 行
- **修改代码**：~130 行
- **总工时**：15 天（3 周）

### 下一步

完成单机版开发后，可以参考：
- [集群版 Worker 节点开发指南](./DEVELOPMENT_GUIDE_CLUSTER_WORKER.md)
- [集群版调度中心开发指南](./DEVELOPMENT_GUIDE_CLUSTER_SCHEDULER.md)

---

**文档版本**：v1.0  
**创建时间**：2024-01-15  
**最后更新**：2024-01-15
