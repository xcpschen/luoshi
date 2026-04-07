# 现有功能检查与操作执行文档

> 📋 基于现有代码的 MVP 功能实现情况检查与后续开发指南

---

## 📊 功能实现情况总览

| 功能模块 | 实现状态 | 完成度 | 文件路径 | 备注 |
|---------|---------|--------|---------|------|
| **设备管理** | ✅ 已完成 | 95% | `electron/mapi/adb/` | 支持 USB/WiFi 连接 |
| **投屏功能** | ✅ 已完成 | 90% | `electron/mapi/scrcpy/` | scrcpy 集成 |
| **屏幕录制** | ✅ 已完成 | 85% | `src/pages/Device/DeviceRecordDialog.vue` | MP4/GIF 录制 |
| **图像识别** | ⚠️ 部分完成 | 70% | `electron/mapi/imageRecognition/` | OpenCV 已禁用 |
| **Touch 事件** | ❌ 未实现 | 0% | - | 需新增 |
| **操作录制** | ❌ 未实现 | 0% | - | 需新增 |
| **脚本回放** | ❌ 未实现 | 0% | - | 需新增 |

---

## ✅ 已完成功能详细说明

### 1. 设备管理（95%）

**核心文件**：
- [`electron/mapi/adb/main.ts`](file:///Users/chan/code/linkandroid/electron/mapi/adb/main.ts) - ADB 主进程服务
- [`electron/mapi/adb/render.ts`](file:///Users/chan/code/linkandroid/electron/mapi/adb/render.ts) - ADB 渲染进程 API
- [`src/pages/Device.vue`](file:///Users/chan/code/linkandroid/src/pages/Device.vue) - 设备管理界面

**已实现功能**：
- ✅ USB 设备连接/断开
- ✅ WiFi 设备连接（配对码 + 二维码）
- ✅ mDNS 设备发现
- ✅ 设备状态监控
- ✅ ADB Shell 命令执行
- ✅ 设备信息获取（品牌/型号/Android 版本）
- ✅ 文件管理（上传/下载/删除）
- ✅ APK 安装/卸载
- ✅ 端口转发

**关键代码**：
```typescript
// electron/mapi/adb/render.ts
const devices = async () => {
    return (await getClient()).listDevicesWithPaths();
};

const connect = async (host: string, port?: number) => {
    await (await getClient()).connect(host, port);
};

const shell = async (id: string, command: string) => {
    const client = await getClient();
    const res = await client.getDevice(id).shell(command).then(Adb.util.readAll);
    return res.toString();
};
```

**需要完善**：
- ⚠️ 设备连接状态持久化（保存到数据库）
- ⚠️ 多设备并发管理优化

---

### 2. 投屏功能（90%）

**核心文件**：
- [`electron/mapi/scrcpy/render.ts`](file:///Users/chan/code/linkandroid/electron/mapi/scrcpy/render.ts) - scrcpy 投屏服务
- [`src/pages/Device/DeviceActionMirror.vue`](file:///Users/chan/code/linkandroid/src/pages/Device/DeviceActionMirror.vue) - 投屏操作

**已实现功能**：
- ✅ scrcpy 服务启动/停止
- ✅ 投屏窗口管理
- ✅ 自定义投屏参数（比特率/帧率/分辨率）
- ✅ 投屏标题设置
- ✅ 字体和图标路径配置

**关键代码**：
```typescript
// electron/mapi/scrcpy/render.ts
const mirror = async (
    serial: string,
    option: {
        title?: string;
        args?: string[];
    }
) => {
    const args = [
        '--serial', serial,
        '--window-title', option.title || 'LinkAndroid',
        ...option.args,
    ]
    return spawnShell(args, { /* ... */ });
};
```

**需要完善**：
- ⚠️ 投屏画面捕获（用于图像识别）
- ⚠️ 低延迟视频流推送（WebSocket）
- ⚠️ 投屏界面交互（点击/滑动转发到设备）

---

### 3. 屏幕录制（85%）

**核心文件**：
- [`src/pages/Device/DeviceRecordDialog.vue`](file:///Users/chan/code/linkandroid/src/pages/Device/DeviceRecordDialog.vue) - 录制对话框
- [`electron/mapi/adb/render.ts`](file:///Users/chan/code/linkandroid/electron/mapi/adb/render.ts) - screenrecord 实现

**已实现功能**：
- ✅ 设备端 screenrecord 录制
- ✅ MP4/GIF 格式选择
- ✅ 录制时长统计
- ✅ 自动下载录制文件
- ✅ FFmpeg 转码处理

**关键代码**：
```typescript
// electron/mapi/adb/render.ts
const screenrecord = async (deviceId: string, option?: {
    progress: (type: "error" | "success", data: any) => void;
}) => {
    const controller = {
        stop: null as Function | null,
        devicePath: null as string | null,
    };
    controller.devicePath = "/sdcard/LinkAndroid_screenshot_" + TimeUtil.timestampInMs() + ".mp4";
    const shellControl = await spawnShell([
        "-s", deviceId, "shell", "screenrecord", controller.devicePath
    ], { /* ... */ });
    controller.stop = () => {
        shellControl.stop();
    };
    return controller;
};
```

**需要完善**：
- ⚠️ 录制参数配置（比特率/帧率/分辨率）
- ⚠️ 实时预览录制画面
- ⚠️ 录制文件自动清理

---

### 4. 图像识别（70%）

**核心文件**：
- [`electron/mapi/imageRecognition/local.service.ts`](file:///Users/chan/code/linkandroid/electron/mapi/imageRecognition/services/local.service.ts) - OpenCV 服务
- [`electron/mapi/imageRecognition/facade.ts`](file:///Users/chan/code/linkandroid/electron/mapi/imageRecognition/facade.ts) - 统一接口
- [`electron/mapi/imageRecognition/index.ts`](file:///Users/chan/code/linkandroid/electron/mapi/imageRecognition/index.ts) - 初始化入口

**已实现功能**：
- ✅ 图像识别服务抽象层
- ✅ 多服务支持（本地/远程/云）
- ✅ 模板匹配算法（多尺度）
- ✅ 批量识别支持
- ✅ 服务状态监控
- ✅ 降级模式（OpenCV 不可用时）

**关键代码**：
```typescript
// electron/mapi/imageRecognition/services/local.service.ts
private async matchTemplate(
    screenshotData: Uint8Array,
    templateData: Uint8Array,
    threshold: number
): Promise<{found: boolean; confidence: number; x: number; y: number; width: number; height: number}> {
    if (!cv) {
        console.warn('[LocalRecognition] OpenCV not available, skipping template matching');
        return {found: false, confidence: 0, x: 0, y: 0, width: 0, height: 0};
    }
    
    // 多尺度匹配
    const scales = [1.0, 0.8, 0.6, 0.4];
    for (const scale of scales) {
        const resizedTemplate = new cv.Mat();
        cv.resize(template, resizedTemplate, new cv.Size(0, 0), scale, scale);
        
        const result = new cv.Mat();
        cv.matchTemplate(screenshot, resizedTemplate, result, cv.TM_CCOEFF_NORMED);
        
        const resultData = {minVal: 0, maxVal: 0, minLoc: {x: 0, y: 0}, maxLoc: {x: 0, y: 0}};
        cv.minMaxLoc(result, resultData);
        
        if (resultData.maxVal >= threshold) {
            return {
                found: true,
                confidence: resultData.maxVal,
                x: resultData.maxLoc.x / scale,
                y: resultData.maxLoc.y / scale,
                width: resizedTemplate.cols / scale,
                height: resizedTemplate.rows / scale,
            };
        }
    }
    
    return {found: false, confidence: 0, x: 0, y: 0, width: 0, height: 0};
}
```

**需要完善**：
- 🔴 **OpenCV 加载问题**：当前已禁用，需要恢复
- ⚠️ 图像预处理优化（灰度转换、ROI 限制）
- ⚠️ 模板缓存机制
- ⚠️ OCR 功能集成（Tesseract.js）

---

## ❌ 未实现功能

### 1. Touch 事件执行（0%）

**需要实现的功能**：
- 点击操作（`input tap x y`）
- 滑动操作（`input swipe x1 y1 x2 y2 duration`）
- 长按操作（`input tap` + 延迟）
- 文本输入（`input text`）
- 按键操作（`input keyevent`）

**实现方案**：继承现有 ADB 服务，新增 touch 相关方法

**新增文件**：
```
electron/mapi/adb/touch.ts  (新增)
```

**代码实现**：
```typescript
// electron/mapi/adb/touch.ts
import { adbShell } from './render';

/**
 * 点击操作
 */
const tap = async (deviceId: string, x: number, y: number) => {
    return await adbShell(['-s', deviceId, 'shell', 'input', 'tap', x.toString(), y.toString()]);
};

/**
 * 滑动操作
 */
const swipe = async (
    deviceId: string,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    duration: number = 300
) => {
    return await adbShell([
        '-s', deviceId, 'shell', 'input', 'swipe',
        x1.toString(), y1.toString(),
        x2.toString(), y2.toString(),
        duration.toString()
    ]);
};

/**
 * 文本输入
 */
const text = async (deviceId: string, text: string) => {
    return await adbShell(['-s', deviceId, 'shell', 'input', 'text', text.replace(/ /g, '%s')]);
};

/**
 * 按键操作
 */
const keyevent = async (deviceId: string, keycode: number) => {
    return await adbShell(['-s', deviceId, 'shell', 'input', 'keyevent', keycode.toString()]);
};

export default {
    tap,
    swipe,
    text,
    keyevent,
};
```

**集成到 render.ts**：
```typescript
// electron/mapi/adb/render.ts (修改)
import touch from './touch';

export default {
    // ... existing methods
    ...touch,
};
```

---

### 2. 操作录制（0%）

**需要实现的功能**：
- 监听用户操作（点击/滑动/输入）
- 记录操作序列（时间戳 + 坐标 + 类型）
- 自动截图（触发区域）
- 生成操作脚本（JSON 格式）

**实现方案**：新增录制服务，继承 scrcpy 和 touch 模块

**新增文件**：
```
electron/mapi/recorder/main.ts      (新增)
electron/mapi/recorder/render.ts    (新增)
src/pages/Recorder/RecorderPanel.vue (新增)
```

**数据结构**：
```typescript
// src/types/Recorder.ts (新增)
export interface RecordedAction {
    id: string;
    type: 'tap' | 'swipe' | 'input' | 'wait' | 'image';
    timestamp: number;
    position?: { x: number; y: number };
    imageTemplate?: Buffer;      // 触发区域的截图
    ocrText?: string;            // OCR 识别的文字
    parameters?: {
        text?: string;           // 输入文本
        duration?: number;       // 滑动时长
        waitCondition?: string;  // 等待条件
    };
}

export interface RecordedScript {
    id: string;
    name: string;
    deviceId: string;
    actions: RecordedAction[];
    createdAt: number;
    duration: number;
}
```

**核心实现**：
```typescript
// electron/mapi/recorder/main.ts (新增)
import { ipcMain, BrowserWindow } from 'electron';
import { RecordedAction } from '../../../src/types/Recorder';

class ActionRecorder {
    private isRecording = false;
    private actions: RecordedAction[] = [];
    private startTime = 0;
    
    startRecording() {
        this.isRecording = true;
        this.actions = [];
        this.startTime = Date.now();
    }
    
    stopRecording(): RecordedAction[] {
        this.isRecording = false;
        return this.actions;
    }
    
    recordAction(action: Omit<RecordedAction, 'id' | 'timestamp'>) {
        if (!this.isRecording) return;
        
        const recordedAction: RecordedAction = {
            ...action,
            id: Math.random().toString(36).substring(2),
            timestamp: Date.now() - this.startTime,
        };
        
        this.actions.push(recordedAction);
    }
}

const recorder = new ActionRecorder();

// IPC Handlers
ipcMain.handle('recorder:start', () => {
    recorder.startRecording();
});

ipcMain.handle('recorder:stop', () => {
    return recorder.stopRecording();
});

ipcMain.handle('recorder:record-action', (event, action) => {
    recorder.recordAction(action);
});
```

---

### 3. 脚本回放（0%）

**需要实现的功能**：
- 解析录制脚本（JSON）
- 按时间戳执行操作
- 图像识别定位（增强鲁棒性）
- 执行进度显示
- 错误处理（超时/失败重试）

**实现方案**：继承图像识别和 touch 模块

**新增文件**：
```
electron/mapi/playback/main.ts      (新增)
electron/mapi/playback/render.ts    (新增)
src/pages/Playback/PlaybackPanel.vue (新增)
```

**核心实现**：
```typescript
// electron/mapi/playback/main.ts (新增)
import { RecordedScript } from '../../../src/types/Recorder';
import { imageRecognition } from '../imageRecognition';
import { adb } from '../adb';

class ScriptPlayer {
    private isPlaying = false;
    private currentStep = 0;
    
    async play(script: RecordedScript, deviceId: string) {
        this.isPlaying = true;
        this.currentStep = 0;
        
        for (const action of script.actions) {
            if (!this.isPlaying) break;
            
            this.currentStep++;
            
            try {
                await this.executeAction(action, deviceId);
                
                // 等待到下一个操作的时间
                if (action.timestamp > 0) {
                    await this.sleep(action.timestamp);
                }
            } catch (error) {
                console.error('Playback error:', error);
                // 错误处理逻辑
            }
        }
        
        this.isPlaying = false;
    }
    
    private async executeAction(action: RecordedAction, deviceId: string) {
        switch (action.type) {
            case 'tap':
                if (action.imageTemplate) {
                    // 使用图像识别定位
                    const result = await imageRecognition.findImage({
                        deviceId,
                        templatePath: action.imageTemplate.toString('base64'),
                    });
                    if (result.found) {
                        await adb.tap(deviceId, result.x, result.y);
                    }
                } else if (action.position) {
                    await adb.tap(deviceId, action.position.x, action.position.y);
                }
                break;
                
            case 'swipe':
                if (action.position) {
                    // 需要额外的结束位置信息
                    await adb.swipe(
                        deviceId,
                        action.position.x,
                        action.position.y,
                        action.parameters?.endX || action.position.x,
                        action.parameters?.endY || action.position.y,
                        action.parameters?.duration || 300
                    );
                }
                break;
                
            case 'input':
                if (action.parameters?.text) {
                    await adb.text(deviceId, action.parameters.text);
                }
                break;
                
            case 'wait':
                await this.sleep(action.parameters?.duration || 1000);
                break;
        }
    }
    
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    stop() {
        this.isPlaying = false;
    }
}

const player = new ScriptPlayer();

// IPC Handlers
ipcMain.handle('playback:play', async (event, script, deviceId) => {
    return await player.play(script, deviceId);
});

ipcMain.handle('playback:stop', () => {
    player.stop();
});
```

---

## 🔧 需要修改的现有代码

### 1. 恢复 OpenCV 功能

**修改文件**：[`electron/mapi/imageRecognition/services/local.service.ts`](file:///Users/chan/code/linkandroid/electron/mapi/imageRecognition/services/local.service.ts)

**当前状态**：
```typescript
// OpenCV 实例（已禁用）
let cv: any = null;

async function loadOpenCV(): Promise<any> {
    // 暂时禁用 OpenCV 加载，避免阻塞主界面
    return null;
}
```

**修改方案**：
```typescript
// OpenCV 实例
let cv: any = null;

async function loadOpenCV(): Promise<any> {
    if (cv) {
        return cv;
    }
    
    try {
        // 使用 Web Worker 异步加载，避免阻塞主界面
        const opencv = await import('@techstark/opencv-js');
        cv = opencv.default || opencv;
        
        // 等待 OpenCV 初始化完成
        await new Promise<void>((resolve) => {
            const checkReady = setInterval(() => {
                if (cv['ready']) {
                    clearInterval(checkReady);
                    resolve();
                }
            }, 100);
            
            // 超时处理
            setTimeout(() => {
                clearInterval(checkReady);
                resolve();
            }, 10000);
        });
        
        console.log('[LocalRecognition] OpenCV loaded successfully');
        return cv;
    } catch (error) {
        console.warn('[LocalRecognition] Failed to load OpenCV:', error);
        cv = null;
        return null;
    }
}
```

---

### 2. 添加屏幕捕获功能

**修改文件**：[`electron/mapi/scrcpy/render.ts`](file:///Users/chan/code/linkandroid/electron/mapi/scrcpy/render.ts)

**新增方法**：
```typescript
// electron/mapi/scrcpy/render.ts (新增)
const captureScreen = async (
    serial: string,
    option?: {
        format?: 'png' | 'jpg';
        quality?: number;
    }
): Promise<Buffer> => {
    const tempPath = `/tmp/scrcpy_capture_${Date.now()}.${option?.format || 'png'}`;
    
    await spawnShell([
        '--serial', serial,
        '--capture-output',
        '--output', tempPath,
        '--output-format', option?.format || 'png',
    ], {
        // ... options
    });
    
    // 读取文件并返回 Buffer
    const buffer = fs.readFileSync(tempPath);
    fs.unlinkSync(tempPath);
    
    return buffer;
};

export default {
    getBinPath,
    spawnShell,
    mirror,
    captureScreen, // 新增
};
```

---

## 📁 新增文件清单

### 核心功能模块

```
electron/mapi/
├── adb/
│   └── touch.ts                    # 新增：Touch 事件执行
├── recorder/
│   ├── main.ts                     # 新增：录制主进程服务
│   └── render.ts                   # 新增：录制渲染进程 API
├── playback/
│   ├── main.ts                     # 新增：回放主进程服务
│   └── render.ts                   # 新增：回放渲染进程 API
└── imageRecognition/
    └── services/
        └── local.service.ts        # 修改：恢复 OpenCV 功能

src/
├── pages/
│   ├── Recorder/
│   │   └── RecorderPanel.vue      # 新增：录制界面
│   └── Playback/
│       └── PlaybackPanel.vue      # 新增：回放界面
├── types/
│   └── Recorder.ts                 # 新增：录制相关类型定义
└── store/modules/
    └── recorder.ts                 # 新增：录制状态管理
```

### 辅助工具模块

```
electron/mapi/
└── script/
    ├── main.ts                     # 新增：脚本管理
    └── render.ts                   # 新增：脚本管理 API

src/
└── pages/
    └── Script.vue                  # 修改：实现脚本管理界面
```

---

## 🚀 开发优先级

### Phase 1（1 周）：Touch 事件 + 恢复 OpenCV

1. **Touch 事件执行**（2 天）
   - 创建 `electron/mapi/adb/touch.ts`
   - 实现 tap/swipe/text/keyevent
   - 集成到 render.ts
   - 编写单元测试

2. **恢复 OpenCV 功能**（3 天）
   - 修改 `local.service.ts` 的 loadOpenCV 方法
   - 使用 Web Worker 异步加载
   - 添加图像预处理优化
   - 性能测试

3. **集成测试**（2 天）
   - Touch + OpenCV 联调
   - 端到端测试
   - Bug 修复

---

### Phase 2（1 周）：操作录制

1. **录制服务**（3 天）
   - 创建 recorder 模块
   - 实现操作监听
   - 自动截图功能
   - 脚本生成

2. **录制界面**（2 天）
   - 创建 RecorderPanel.vue
   - 录制控制 UI
   - 操作列表展示
   - 脚本保存/加载

3. **测试优化**（2 天）
   - 功能测试
   - 性能优化
   - 用户体验改进

---

### Phase 3（1 周）：脚本回放

1. **回放服务**（3 天）
   - 创建 playback 模块
   - 脚本解析
   - 执行引擎
   - 错误处理

2. **回放界面**（2 天）
   - 创建 PlaybackPanel.vue
   - 播放控制 UI
   - 进度显示
   - 日志查看

3. **测试优化**（2 天）
   - 功能测试
   - 稳定性优化
   - 性能提升

---

## 📊 代码量估算

| 模块 | 新增文件 | 修改文件 | 新增代码量 | 修改代码量 |
|------|---------|---------|-----------|-----------|
| Touch 事件 | 1 | 1 | ~200 行 | ~20 行 |
| OpenCV 恢复 | 0 | 1 | 0 | ~50 行 |
| 操作录制 | 4 | 1 | ~800 行 | ~30 行 |
| 脚本回放 | 4 | 1 | ~1000 行 | ~30 行 |
| **总计** | **9** | **4** | **~2000 行** | **~130 行** |

---

## ✅ 验收标准

### Touch 事件
- [ ] 能成功执行点击操作
- [ ] 能成功执行滑动操作
- [ ] 能成功输入文本
- [ ] 延迟 < 100ms

### OpenCV 恢复
- [ ] OpenCV 加载不阻塞主界面
- [ ] 识别准确率 > 90%
- [ ] 识别速度 < 300ms

### 操作录制
- [ ] 能完整记录用户操作
- [ ] 自动截图成功
- [ ] 脚本格式正确（JSON）

### 脚本回放
- [ ] 能成功解析脚本
- [ ] 操作执行准确
- [ ] 图像识别定位成功
- [ ] 回放成功率 > 85%

---

## 📝 下一步行动

1. **立即执行**：
   - [ ] 创建 `electron/mapi/adb/touch.ts`
   - [ ] 修改 `electron/mapi/imageRecognition/services/local.service.ts`

2. **本周完成**：
   - [ ] Touch 事件功能开发 + 测试
   - [ ] OpenCV 功能恢复 + 测试

3. **下周开始**：
   - [ ] 操作录制模块开发
   - [ ] 脚本回放模块开发

---

**文档版本**：v1.0  
**创建时间**：2024-01-15  
**最后更新**：2024-01-15  

**审批**：
- [ ] 技术负责人
- [ ] 产品经理
- [ ] 项目负责人
