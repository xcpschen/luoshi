# LinkAndroid 项目完整技术架构文档

## 一、项目概述

**LinkAndroid** 是一款基于 **Electron + Vue 3** 的跨平台 Android 设备管理工具，支持设备连接、投屏、文件管理、应用安装等功能。

### 技术栈
- **前端框架**: Vue 3 + TypeScript + Pinia + Vue Router
- **UI 框架**: Arco Design Vue
- **后端框架**: Electron 29
- **数据库**: SQLite (better-sqlite3)
- **设备通信**: ADB (@devicefarmer/adbkit)
- **投屏**: Scrcpy
- **构建工具**: Vite 5 + electron-builder

---

## 二、项目目录结构

```
linkandroid/
├── electron/                    # Electron 主进程代码
│   ├── main/                   # 主进程入口
│   │   └── index.ts           # 主进程初始化、窗口创建
│   ├── preload/               # 预加载脚本
│   │   └── index.ts          # 暴露安全 API 给渲染进程
│   ├── mapi/                  # 模块化 API 层（主进程 + 渲染进程）
│   │   ├── adb/              # ADB 设备管理
│   │   ├── app/              # 应用基础功能
│   │   ├── config/           # 配置管理
│   │   ├── db/               # SQLite 数据库
│   │   ├── event/            # 事件通信
│   │   ├── file/             # 文件操作
│   │   ├── log/              # 日志系统
│   │   ├── scrcpy/           # 投屏功能
│   │   ├── serve/            # WebSocket 服务器
│   │   ├── storage/          # 本地存储
│   │   ├── ui/               # UI 交互
│   │   ├── user/             # 用户管理
│   │   └── ...               # 其他模块
│   ├── config/               # Electron 配置
│   ├── lib/                  # 工具库
│   └── page/                 # Electron 页面
├── src/                       # Vue 渲染进程代码
│   ├── components/           # Vue 组件
│   ├── layouts/              # 布局组件
│   ├── pages/                # 页面组件
│   ├── router/               # 路由配置
│   ├── store/                # Pinia 状态管理
│   ├── lang/                 # 国际化
│   ├── lib/                  # 前端工具库
│   ├── types/                # TypeScript 类型定义
│   ├── App.vue              # 根组件
│   └── main.ts              # Vue 应用入口
├── scripts/                   # 构建脚本
├── .github/                   # GitHub Actions CI/CD
└── package.json              # 项目配置
```

---

## 三、核心架构设计

### 3.1 双进程架构

```
┌─────────────────────────────────────────────────────────┐
│                    Electron 应用                          │
├───────────────────────┬─────────────────────────────────┤
│    主进程 (Main)       │      渲染进程 (Renderer)         │
│  ┌─────────────────┐  │  ┌─────────────────────────────┐│
│  │  BrowserWindow  │◄─┼──┤      Vue 3 App              ││
│  │  - 创建窗口     │  │  │  - Device.vue               ││
│  │  - IPC 通信     │  │  │  - DeviceItem.vue           ││
│  │  - 系统 API     │  │  │  - DeviceFileManagerDialog  ││
│  └────────┬────────┘  │  └──────────────┬──────────────┘│
│           │           │                 │               │
│  ┌────────▼────────┐  │  ┌──────────────▼──────────────┐│
│  │  MAPI (Main)    │  │  │  MAPI (Render)              ││
│  │  - adb/main     │  │  │  - adb/render               ││
│  │  - file/main    │  │  │  - file/render              ││
│  │  - db/main      │  │  │  - db/render                ││
│  │  - event/main   │  │  │  - event/render             ││
│  └────────┬────────┘  │  └──────────────┬──────────────┘│
│           │           │                 │               │
│  ┌────────▼────────┐  │  ┌──────────────▼──────────────┐│
│  │  Node.js API    │  │  │  window.$mapi               ││
│  │  - ADB 命令     │  │  │  - $mapi.adb                ││
│  │  - 文件系统     │  │  │  - $mapi.file               ││
│  │  - SQLite       │  │  │  - $mapi.db                 ││
│  │  - 子进程       │  │  │                             ││
│  └─────────────────┘  │  └─────────────────────────────┘│
└───────────────────────┴─────────────────────────────────┘
           │                           │
           └───────────┬───────────────┘
                       │
              IPC 通信 (ipcRenderer/ipcMain)
```

### 3.2 IPC 通信机制

#### 主进程 → 渲染进程

**事件监听** (在 `electron/preload/index.ts`):

```typescript
ipcRenderer.on("MAIN_PROCESS_MESSAGE", (_event: any, payload: any) => {
    if ("APP_READY" === payload.type) {
        MAPI.init(payload.data.AppEnv);
    } else if ("CALL_PAGE" === payload.type) {
        // 调用页面注册的方法
        window["__page"].callPage[type](resolve, reject, data);
    } else if ("CHANNEL" === payload.type) {
        // 频道消息
        window["__page"].channel[channel](data);
    } else if ("BROADCAST" === payload.type) {
        // 广播消息
        window["__page"].broadcastListeners[type].forEach(cb => cb(data));
    }
});
```

**广播类型**:
- `ConfigChange` - 配置变更
- `ConfigEnvChange` - 环境变量变更
- `UserChange` - 用户信息变更
- `DarkModeChange` - 暗黑模式变更
- `DeviceConnect` - 设备连接
- `DeviceDisconnect` - 设备断开
- `DevicePreview` - 设备预览图

#### 渲染进程 → 主进程

**API 调用模式**:

```typescript
// 渲染进程调用
const result = await window.$mapi.adb.fileList(deviceId, path);

// 实际执行流程
window.$mapi.adb.fileList (render.ts)
  → ipcRenderer.invoke("adb:fileList", deviceId, path)
  → ipcMain.handle("adb:fileList", async (_, deviceId, path) => {...})
  → adbShell 命令执行
  → 返回结果
```

---

## 四、完整调用链路分析

### 4.1 设备发现与连接链路

#### 链路 1: USB 设备自动发现

```
用户插入 USB 设备
    ↓
ADB 守护进程检测到设备
    ↓
electron/mapi/adb/main.ts:devices()
    ↓
(adbkit).listDevicesWithPaths()
    ↓
返回设备列表 { id, type, model }
    ↓
渲染进程：deviceStore.refresh()
    ↓
window.$mapi.adb.devices()
    ↓
ADB.render.devices()
    ↓
ipcRenderer.invoke("adb:devices")
    ↓
ADB.main.devices()
    ↓
client.listDevicesWithPaths()
    ↓
返回设备数据
    ↓
Pinia Store: device.records 更新
    ↓
Vue 响应式更新 Device.vue 组件
    ↓
DeviceItem.vue 渲染设备卡片
```

#### 链路 2: 无线设备配对连接

```
用户点击"无线配对"
    ↓
DeviceWirelessPairingDialog.vue 打开
    ↓
输入配对码和 IP 地址
    ↓
window.$mapi.adb.pair(host, port, password)
    ↓
ADB.main.pair()
    ↓
spawn(adb, ["pair", "host:port", password])
    ↓
监听 stdout/stderr
    ↓
"Successfully paired" → 配对成功
    ↓
window.$mapi.adb.connect(host, port)
    ↓
ADB.main.connect()
    ↓
spawn(adb, ["connect", "host:port"])
    ↓
WebSocket Server 广播 "DeviceConnect"
    ↓
所有 Render 客户端收到消息
    ↓
deviceStore.refresh() 触发
    ↓
设备列表更新
```

### 4.2 投屏功能调用链路

```
用户点击投屏按钮
    ↓
DeviceActionMirror.vue:doMirror()
    ↓
deviceStore.doMirror(device)
    ↓
检查设备状态和 runtime.mirrorController
    ↓
window.$mapi.scrcpy.mirror(serial, options)
    ↓
Scrcpy.render.mirror()
    ↓
Scrcpy.render.spawnShell([scrcpy, --serial, serial, ...args])
    ↓
设置环境变量:
  - ADB=/path/to/adb
  - SCRCPY_SERVER_PATH=/path/to/scrcpy-server
  - SCRCPY_FONT_PATH=/path/to/font.ttf
    ↓
Apps.spawnShell([binary, ...args])
    ↓
spawn(binary, args, {stdio: ['pipe', 'pipe', 'pipe']})
    ↓
监听 stdout/stderr/close/error
    ↓
返回 process controller
    ↓
存储到 device.runtime.mirrorController
    ↓
Vue 响应式更新按钮状态
```

**投屏参数传递**:

```typescript
{
    title: "设备名称",
    args: [
        '--max-size', '720',
        '--max-fps', '60',
        '--video-bit-rate', '2M',
        '--video-codec', 'h265',
        '--no-audio-playback',
        '--no-video-playback',  // 预览模式
    ],
    stdout: (data) => { /* 处理输出 */ },
    stderr: (data) => { /* 处理错误 */ },
    success: () => { /* 投屏成功 */ },
    error: (msg, code) => { /* 投屏失败 */ }
}
```

### 4.3 文件管理功能调用链路

#### 文件列表加载

```
用户打开文件管理器
    ↓
DeviceFileManagerDialog.vue:show(device)
    ↓
doRefresh()
    ↓
window.$mapi.adb.fileList(deviceId, filePath)
    ↓
ADB.render.fileList()
    ↓
ipcRenderer.invoke("adb:fileList", deviceId, filePath)
    ↓
ADB.main.fileList()
    ↓
adbShell(["-s", deviceId, "shell", "ls", "-la", filePath])
    ↓
解析 ls 输出
    ↓
返回文件数组 {name, type, size, updateTime}
    ↓
Vue 响应式更新 fileRecords
    ↓
渲染文件列表
```

#### 文件上传

```
用户点击上传按钮
    ↓
doUpload()
    ↓
window.$mapi.file.openFile()
    ↓
File.main.openFile()
    ↓
dialog.showOpenDialog({properties: ["openFile"]})
    ↓
返回文件路径
    ↓
window.$mapi.adb.filePush(deviceId, localPath, devicePath)
    ↓
ADB.render.filePush()
    ↓
ipcRenderer.invoke("adb:filePush", deviceId, localPath, devicePath)
    ↓
ADB.main.filePush()
    ↓
device.push(localPath, devicePath)
    ↓
监听 progress 事件
    ↓
上传完成后触发媒体扫描:
  adbShell(["am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE"])
    ↓
返回成功
    ↓
Dialog.tipSuccess()
    ↓
doRefresh() 刷新列表
```

#### 文件下载

```
用户选择文件并点击下载
    ↓
doDownload()
    ↓
window.$mapi.file.openDirectory()
    ↓
选择保存目录
    ↓
循环处理每个文件:
  window.$mapi.adb.filePull(deviceId, sourcePath, targetPath)
    ↓
ADB.render.filePull()
    ↓
device.pull(devicePath)
    ↓
pipe(writeStream)
    ↓
监听 progress
    ↓
下载完成
    ↓
Dialog.tipSuccess()
```

### 4.4 数据库操作链路

```
应用启动
    ↓
MAPI.init()
    ↓
DB.main.init()
    ↓
dbPath = path.join(AppEnv.userData, "data", "linkandroid.db")
    ↓
dbConn = sqlite3(dbPath)
    ↓
执行数据库迁移
    ↓
migration.migrate(dbConn)
    ↓
创建表结构:
  - users
  - devices
  - settings
  - tasks
    ↓
渲染进程：window.$mapi.db.select(sql, params)
    ↓
DB.render.select()
    ↓
ipcRenderer.invoke("db:select", sql, params)
    ↓
DB.main.select()
    ↓
dbConn.prepare(sql).all(...params)
    ↓
返回结果数组
    ↓
渲染进程使用数据
```

---

## 五、数据存储方案

### 5.1 SQLite 数据库

**位置**: `~/Library/Application Support/LinkAndroid/data/linkandroid.db`

**表结构**:

```sql
-- 用户表
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(255) UNIQUE,
    email VARCHAR(255),
    token TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 设备表
CREATE TABLE devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id VARCHAR(255) UNIQUE,
    name VARCHAR(255),
    type VARCHAR(50),
    status VARCHAR(50),
    setting TEXT,  -- JSON 字符串
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 设置表
CREATE TABLE settings (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 任务表
CREATE TABLE tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type VARCHAR(50),
    status VARCHAR(50),
    data TEXT,  -- JSON 字符串
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 5.2 文件系统存储

```
~/Library/Application Support/LinkAndroid/data/
├── linkandroid.db          # SQLite 数据库
├── logs/                   # 日志文件
│   └── linkandroid.log
├── storage/                # 临时存储
│   └── temp_*.tmp
└── config.json            # 配置文件
```

### 5.3 配置存储

**方式 1: localStorage** (渲染进程)
```typescript
localStorage.setItem("device_preview_image", "yes");
localStorage.getItem("device_preview_image");
```

**方式 2: window.$mapi.config** (跨进程)
```typescript
// 渲染进程
await window.$mapi.config.set("Device.previewImage", "yes");
const value = await window.$mapi.config.get("Device.previewImage", "yes");

// 主进程
Config.main.set("Device.previewImage", "yes");
const value = Config.main.get("Device.previewImage", "yes");
```

**方式 3: Pinia Store** (内存状态)
```typescript
// store/modules/device.ts
const deviceRuntime = ref<Map<string, DeviceRuntime>>(new Map());
const deviceStore = useDeviceStore();
deviceStore.records.push(device);
```

---

## 六、页面与窗体嵌入关系

### 6.1 主窗口结构

```
BrowserWindow (mainWindow)
└── index.html
    └── App.vue
        └── RouterView
            ├── Main Layout
            │   ├── Device.vue
            │   │   ├── DeviceItem.vue (多个)
            │   │   │   └── DeviceActionMirror.vue
            │   │   ├── DeviceFileManagerDialog.vue (dialog)
            │   │   ├── DeviceFileUploadDialog.vue (dialog)
            │   │   ├── DeviceSettingDialog.vue (dialog)
            │   │   └── DeviceShellDialog.vue (dialog)
            │   ├── Home.vue
            │   ├── Lib.vue
            │   └── Setting.vue
            └── Raw Layout (无边框窗口)
```

### 6.2 对话框管理

**模式 1: ref 引用**
```typescript
// Device.vue
const fileManagerDialog = ref<InstanceType<typeof DeviceFileManagerDialog> | null>(null);

// 调用
fileManagerDialog.value?.show(device);
```

**模式 2: 条件渲染**
```typescript
<DeviceFileManagerDialog 
    v-if="showFileManager" 
    :device="currentDevice"
    @close="showFileManager = false"
/>
```

### 6.3 投屏窗口

```
BrowserWindow (mainWindow)
└── Device.vue
    └── DeviceActionMirror.vue
        └── window.$mapi.scrcpy.mirror()
            └── spawn(scrcpy, [...])
                └── 创建独立窗口 (scrcpy 管理)
```

---

## 七、事件监听与回调机制

### 7.1 主进程事件监听

```typescript
// electron/main/index.ts
AppRuntime.mainWindow.on("closed", () => {
    AppRuntime.mainWindow = null;
});

AppRuntime.mainWindow.on("show", async () => {
    await executeHooks(AppRuntime.mainWindow, "Show");
});

AppRuntime.mainWindow.on("close", event => {
    if (!app.quitForce) {
        executeHooks(AppRuntime.mainWindow, "ShowQuitConfirmDialog");
        event.preventDefault();
    }
});

AppRuntime.mainWindow.webContents.on("did-finish-load", () => {
    Page.ready("main");
    DevToolsManager.autoShow(AppRuntime.mainWindow);
});
```

### 7.2 渲染进程事件监听

```typescript
// electron/preload/index.ts
window["__page"] = {
    hooks: {},
    onShow: (cb: Function) => {
        window["__page"].hooks.onShow = cb;
    },
    onBroadcast: (type: string, cb: (data: any) => void) => {
        if (!(type in window["__page"].broadcastListeners)) {
            window["__page"].broadcastListeners[type] = [];
        }
        window["__page"].broadcastListeners[type].push(cb);
    },
    registerCallPage: (name: string, cb: Function) => {
        window["__page"].callPage[name] = cb;
    },
    createChannel: (cb: (data: any) => void) => {
        const channel = Math.random().toString(36).substring(2);
        window["__page"].channel[channel] = cb;
        return channel;
    },
};
```

### 7.3 Vue 组件事件

```typescript
// DeviceItem.vue
const emit = defineEmits<{
    (e: "setting"): void;
    (e: "file-manager"): void;
    (e: "file-upload", record: DeviceRecord): void;
    (e: "adb-shell"): void;
}>();

// Device.vue
<DeviceItem 
    :record="r"
    @file-manager="fileManagerDialog?.show(r)"
    @file-upload="(record) => fileUploadDialog?.show(record)"
    @setting="settingDialog?.show(r)"
    @adb-shell="adbShellDialog?.show(r)"
/>
```

### 7.4 WebSocket 事件

```typescript
// electron/mapi/serve/main.ts
wss.on("connection", (ws: WebSocket, req) => {
    const clientType = url.searchParams.get("type");
    const deviceId = url.searchParams.get("deviceId");
    
    ws.on("message", (message: Buffer) => {
        const data = JSON.parse(message.toString());
        
        if (clientType === "DeviceManage" && data.type === "preview") {
            broadcast("Render", {
                type: "DevicePreview",
                deviceId,
                data: data.data,
            });
        }
    });
});
```

---

## 八、状态管理 (Pinia)

### 8.1 Device Store

```typescript
// store/modules/device.ts
export const useDeviceStore = defineStore("device", () => {
    const records = ref<DeviceRecord[]>([]);
    const deviceRuntime = ref<Map<string, DeviceRuntime>>(new Map());
    
    // 计算属性
    const connectedDevices = computed(() => {
        return records.value.filter(r => r.status === EnumDeviceStatus.CONNECTED);
    });
    
    // 方法
    const refresh = async () => {
        const devices = await window.$mapi.adb.devices();
        records.value = devices.map(d => ({
            id: d.id,
            type: isIPWithPort(d.id) ? EnumDeviceType.WIFI : EnumDeviceType.USB,
            name: d.model,
            status: createDeviceStatus(d),
            runtime: getDeviceRuntime(d),
        }));
    };
    
    const doMirror = async (device: DeviceRecord) => {
        if (device.runtime?.mirrorController) {
            // 停止投屏
            device.runtime.mirrorController.stop();
        } else {
            // 启动投屏
            const controller = await window.$mapi.scrcpy.mirror(device.id, {
                title: device.name,
                args: getMirrorArgs(device.setting),
            });
            device.runtime.mirrorController = controller;
        }
    };
    
    return {
        records,
        deviceRuntime,
        refresh,
        doMirror,
    };
});
```

### 8.2 Setting Store

```typescript
// store/modules/setting.ts
export const useSettingStore = defineStore("setting", () => {
    const config = ref({});
    
    const configGet = (key: string, defaultValue: any = null) => {
        const keys = key.split(".");
        let value = config.value;
        for (const k of keys) {
            if (!value || !(k in value)) {
                return defaultValue;
            }
            value = value[k];
        }
        return value;
    };
    
    const configSet = async (key: string, value: any) => {
        const keys = key.split(".");
        let configObj = config.value;
        for (let i = 0; i < keys.length - 1; i++) {
            if (!(keys[i] in configObj)) {
                configObj[keys[i]] = {};
            }
            configObj = configObj[keys[i]];
        }
        configObj[keys[keys.length - 1]] = value;
        await window.$mapi.config.set(key, value);
    };
    
    return {
        config,
        configGet,
        configSet,
    };
});
```

---

## 九、ADB 模块详解

### 9.1 ADB 架构

```
ADB 模块
├── main.ts (主进程)
│   ├── DeviceScanner (mDNS 设备扫描)
│   ├── AdbScanner (配对连接)
│   ├── adbShell (执行 ADB 命令)
│   ├── spawnShell (生成子进程)
│   └── devices/listDevicesWithPaths
│
└── render.ts (渲染进程)
    ├── getClient (创建 ADB 客户端)
    ├── devices (获取设备列表)
    ├── shell (执行 shell 命令)
    ├── connect/disconnect (连接断开)
    ├── filePush/filePull (文件传输)
    ├── fileList (文件列表)
    ├── fileDelete (删除文件)
    └── install/uninstall (应用管理)
```

### 9.2 ADB 命令执行流程

```typescript
// 1. 渲染进程调用
await window.$mapi.adb.shell(deviceId, "ls /sdcard");

// 2. render.ts
const shell = async (id: string, command: string) => {
    const client = await getClient();
    const res = await client.getDevice(id).shell(command).then(Adb.util.readAll);
    return res.toString();
};

// 3. adbkit 库执行
device.shell(command) 
  → 通过 USB/网络发送到设备
  → 执行 Android shell 命令
  → 返回 stdout 流

// 4. 读取结果
Adb.util.readAll(stream)
  → 收集所有数据
  → 返回 Buffer
  → 转换为字符串
```

---

## 十、Scrcpy 投屏详解

### 10.1 环境变量配置

```typescript
// electron/mapi/scrcpy/render.ts
option.env["ADB"] = await ADB.getBinPath();
option.env['SCRCPY_FONT_PATH'] = await extraResolveWithPlatform('scrcpy/font.ttf');
option.env['SCRCPY_ICON_ROOT_PATH'] = await extraResolveWithPlatform('scrcpy');
option.env['SCRCPY_SERVER_PATH'] = await extraResolveWithPlatform('scrcpy/scrcpy-server');
```

### 10.2 投屏参数

```typescript
const args = [
    '--serial', serial,                    // 设备序列号
    '--window-title', title,               // 窗口标题
    '--max-size', setting.maxSize,         // 最大尺寸
    '--max-fps', setting.maxFps,           // 最大帧率
    '--video-bit-rate', setting.videoBitRate, // 视频码率
    '--video-codec', setting.videoCodec,   // 视频编码
    '--video-buffer', setting.videoBuffer, // 视频缓冲区
    '--no-audio-playback',                 // 不播放音频
    '--no-video-playback',                 // 不播放视频（预览模式）
    ...setting.scrcpyArgs.split(' '),      // 额外参数
];
```

### 10.3 投屏控制

```typescript
// 启动投屏
const controller = await window.$mapi.scrcpy.mirror(deviceId, options);

// 停止投屏
controller.stop();

// 监听事件
controller.on("close", () => {
    console.log("投屏已关闭");
});

controller.on("error", (err) => {
    console.error("投屏错误", err);
});
```

---

## 十一、WebSocket 服务器

### 11.1 服务器架构

```typescript
// electron/mapi/serve/main.ts
let wss: WebSocketServer | null = null;
let wsPort: number = 10667;
const clients: Map<string, Set<WebSocket>> = new Map();
const deviceStates: Map<string, any> = new Map();

wss = new WebSocketServer({port: wsPort});

wss.on("connection", (ws: WebSocket, req) => {
    const url = new URL(req.url);
    const clientType = url.searchParams.get("type"); // Render, DeviceManage, DeviceMirror
    const deviceId = url.searchParams.get("deviceId");
    
    // 存储客户端
    if (!clients.has(clientType)) {
        clients.set(clientType, new Set());
    }
    clients.get(clientType)!.add(ws);
    
    // 监听消息
    ws.on("message", (message: Buffer) => {
        const data = JSON.parse(message.toString());
        handleMessage(clientType, deviceId, data);
    });
});
```

### 11.2 客户端类型

1. **Render** - 渲染进程客户端
   - 接收设备状态更新
   - 接收设备预览图
   - 接收面板配置

2. **DeviceManage** - 设备管理客户端
   - 发送设备连接/断开事件
   - 发送设备预览图
   - 发送面板按钮点击事件

3. **DeviceMirror** - 投屏客户端
   - 投屏控制

### 11.3 消息类型

```typescript
// 设备连接
{
    type: "DeviceConnect",
    id: "device_id"
}

// 设备断开
{
    type: "DeviceDisconnect",
    id: "device_id"
}

// 设备预览
{
    type: "DevicePreview",
    deviceId: "device_id",
    data: "base64_image"
}

// 面板按钮点击
{
    type: "DevicePanelButtonClick",
    deviceId: "device_id",
    data: { id: "home" }
}

// 设备状态
{
    type: "DeviceStatus",
    id: "device_id",
    status: "connected"
}
```

---

## 十二、构建与部署

### 12.1 开发模式

```bash
# 启动 Vite 开发服务器
npm run dev

# Vite 配置
server: {
    port: 3344,
    strictPort: true,
}

# Electron 加载开发服务器
rendererLoadPath(window, "index.html")
  → 加载 http://localhost:3344
```

### 12.2 生产构建

```bash
# 构建所有平台
npm run build

# 仅构建 Windows
npm run build:win

# 仅构建 macOS
npm run build:mac

# electron-builder 配置
{
    "appId": "LinkAndroid",
    "win": {
        "target": "nsis",
        "artifactName": "${productName}-${version}-win-${arch}.${ext}"
    },
    "mac": {
        "target": "dmg",
        "artifactName": "${productName}-${version}-mac-${arch}.${ext}"
    }
}
```

### 12.3 GitHub Actions CI/CD

```yaml
# .github/workflows/pro-build.yml
on:
  push:
    tags:
      - v*.*.*

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        include:
          - os: ubuntu-latest
            arch: [arm64, amd64]
          - os: macos-latest
            arch: [arm64, amd64]
          - os: windows-latest
            arch: [arm64, amd64]
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install
      - run: npm run build
      - uses: softprops/action-gh-release@v2
        with:
          files: |
            code/dist-release/*.exe
            code/dist-release/*.dmg
            code/dist-release/*.AppImage
```

---

## 十三、关键技术点总结

### 13.1 IPC 通信优化

1. **批量操作**: 避免频繁 IPC 调用，合并多个操作
2. **Channel 机制**: 使用频道进行点对点通信
3. **Broadcast 机制**: 广播消息到所有窗口
4. **CallPage 机制**: 主进程调用渲染进程方法

### 13.2 性能优化

1. **虚拟滚动**: 大量设备列表时使用虚拟滚动
2. **图片懒加载**: 设备预览图懒加载
3. **防抖节流**: 搜索、刷新等操作防抖
4. **缓存策略**: 设备信息、配置信息缓存

### 13.3 错误处理

```typescript
// 全局错误捕获
process.on("uncaughtException", reason => {
    Log.error("UncaughtException", reason);
});

process.on("unhandledRejection", reason => {
    Log.error("UnhandledRejection", reason);
});

// 渲染进程错误
app.config.errorHandler = (err, vm, info) => {
    Log.error("VueError", err, info);
};
```

### 13.4 安全考虑

1. **contextBridge**: 暴露有限 API 给渲染进程
2. **preload 脚本**: 安全桥接主进程和渲染进程
3. **webSecurity**: 禁用同源策略（ Electron 应用）
4. **nodeIntegration**: 启用 Node.js 集成（可信环境）

---

## 十四、数据流图

```
用户操作
    ↓
Vue 组件 (Device.vue)
    ↓
Pinia Store (deviceStore)
    ↓
window.$mapi (API 层)
    ↓
IPC Renderer (ipcRenderer.invoke)
    ↓
IPC Main (ipcMain.handle)
    ↓
MAPI Main (adb/file/db/scrcpy)
    ↓
Node.js API (ADB/FS/SQLite/ChildProcess)
    ↓
外部系统 (Android 设备/文件系统/数据库)
    ↓
返回结果
    ↓
逆向返回到 Vue 组件
    ↓
Vue 响应式更新 UI
```

---

## 十五、总结

LinkAndroid 项目采用了典型的 **Electron 双进程架构**，通过 **IPC 通信**实现主进程和渲染进程的交互，使用 **Pinia** 进行状态管理，**ADB** 进行设备管理，**Scrcpy** 实现投屏功能，**SQLite** 进行数据持久化，**WebSocket** 实现多客户端通信。

整个架构清晰、模块化程度高，具有良好的可维护性和扩展性。
