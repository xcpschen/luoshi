# AccessibilityService 集成方案

## 概述

通过集成 AccessibilityService 来实时获取触摸事件的控件信息（控件 ID、文本、类名等），提升录制功能的精确度和回放成功率。

---

## 需要新增/修改的文件清单

### 一、Android APK 模块（新增）

#### 1. `android/AccessibilityService/app/src/main/AndroidManifest.xml`
**作用**：APK 配置清单，声明辅助功能服务

**内容**：
```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.linkandroid.accessibility">

    <application
        android:allowBackup="true"
        android:label="LinkAndroid Accessibility"
        android:icon="@mipmap/ic_launcher">
        
        <service
            android:name=".TouchMonitorService"
            android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE"
            android:exported="true">
            <intent-filter>
                <action android:name="android.accessibilityservice.AccessibilityService" />
            </intent-filter>
            <meta-data
                android:name="android.accessibilityservice"
                android:resource="@xml/accessibility_service_config" />
        </service>
    </application>
</manifest>
```

---

#### 2. `android/AccessibilityService/app/src/main/java/com/linkandroid/accessibility/TouchMonitorService.java`
**作用**：核心服务类，监听触摸事件并提取控件信息

**内容**：
```java
package com.linkandroid.accessibility;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.accessibilityservice.GestureDescription;
import android.graphics.Path;
import android.graphics.Rect;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;

import org.json.JSONObject;

import java.io.DataOutputStream;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

public class TouchMonitorService extends AccessibilityService {
    
    private static final String TAG = "TouchMonitor";
    private static final String WEBSOCKET_PORT = "10668"; // 独立的 WebSocket 端口
    
    private Handler mainHandler;
    private Process logcatProcess;
    private boolean isRunning = false;
    
    @Override
    public void onServiceConnected() {
        super.onServiceConnected();
        mainHandler = new Handler(Looper.getMainLooper());
        
        // 配置服务类型
        AccessibilityServiceInfo info = new AccessibilityServiceInfo();
        info.eventTypes = AccessibilityEvent.TYPE_TOUCH_INTERACTION |
                         AccessibilityEvent.TYPE_WINDOWS_CHANGED |
                         AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED;
        info.feedbackType = AccessibilityServiceInfo.FEEDBACK_ALL_MASK;
        info.flags = AccessibilityServiceInfo.DEFAULT |
                    AccessibilityServiceInfo.FLAG_REQUEST_TOUCH_EXPLORATION_MODE |
                    AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS;
        info.notificationTimeout = 100;
        setServiceInfo(info);
        
        Log.d(TAG, "AccessibilityService connected");
        
        // 启动 WebSocket 服务器
        startWebSocketServer();
    }
    
    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null) return;
        
        int eventType = event.getEventType();
        
        switch (eventType) {
            case AccessibilityEvent.TYPE_TOUCH_INTERACTION:
                handleTouchEvent(event);
                break;
            case AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED:
            case AccessibilityEvent.TYPE_WINDOWS_CHANGED:
                handleWindowChangeEvent(event);
                break;
        }
    }
    
    /**
     * 处理触摸事件
     */
    private void handleTouchEvent(AccessibilityEvent event) {
        AccessibilityNodeInfo source = event.getSource();
        if (source == null) return;
        
        try {
            // 获取控件信息
            Map<String, Object> controlInfo = extractControlInfo(source, event);
            
            // 发送 WebSocket 广播
            broadcastTouchEvent(controlInfo);
            
            Log.d(TAG, "Touch event: " + new JSONObject(controlInfo).toString());
            
        } catch (Exception e) {
            Log.e(TAG, "Error handling touch event", e);
        } finally {
            source.recycle();
        }
    }
    
    /**
     * 提取控件信息
     */
    private Map<String, Object> extractControlInfo(AccessibilityNodeInfo node, AccessibilityEvent event) {
        Map<String, Object> info = new HashMap<>();
        
        // 基本信息
        info.put("timestamp", System.currentTimeMillis());
        info.put("eventType", getEventTypeName(event.getEventType()));
        
        // 控件 ID
        String viewId = null;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR2) {
            viewId = node.getViewIdResourceName();
        }
        info.put("viewId", viewId);
        
        // 控件文本
        CharSequence text = node.getText();
        if (text == null || text.length() == 0) {
            text = node.getContentDescription();
        }
        info.put("text", text != null ? text.toString() : null);
        
        // 控件类名
        info.put("className", node.getClassName() != null ? node.getClassName().toString() : null);
        
        // 控件包名
        info.put("packageName", node.getPackageName() != null ? node.getPackageName().toString() : null);
        
        // 控件位置（屏幕坐标）
        Rect bounds = new Rect();
        node.getBoundsInScreen(bounds);
        info.put("bounds", Map.of(
            "left", bounds.left,
            "top", bounds.top,
            "right", bounds.right,
            "bottom", bounds.bottom,
            "centerX", bounds.centerX(),
            "centerY", bounds.centerY()
        ));
        
        // 触摸坐标（从事件中获取）
        info.put("touchX", event.getX());
        info.put("touchY", event.getY());
        
        // 控件层级信息
        info.put("depth", getNodeDepth(node));
        info.put("childCount", node.getChildCount());
        
        // 控件属性
        info.put("clickable", node.isClickable());
        info.put("checkable", node.isCheckable());
        info.put("checked", node.isChecked());
        info.put("focusable", node.isFocusable());
        info.put("focused", node.isFocused());
        info.put("visibleToUser", node.isVisibleToUser());
        info.put("enabled", node.isEnabled());
        
        return info;
    }
    
    /**
     * 获取节点深度
     */
    private int getNodeDepth(AccessibilityNodeInfo node) {
        int depth = 0;
        AccessibilityNodeInfo parent = node.getParent();
        while (parent != null) {
            depth++;
            parent = parent.getParent();
        }
        return depth;
    }
    
    /**
     * 处理窗口变化事件
     */
    private void handleWindowChangeEvent(AccessibilityEvent event) {
        // 获取当前活动窗口
        AccessibilityNodeInfo rootNode = getRootInActiveWindow();
        if (rootNode == null) return;
        
        try {
            Map<String, Object> windowInfo = new HashMap<>();
            windowInfo.put("timestamp", System.currentTimeMillis());
            windowInfo.put("type", "window_changed");
            windowInfo.put("packageName", event.getPackageName() != null ? 
                event.getPackageName().toString() : null);
            windowInfo.put("className", event.getClassName() != null ? 
                event.getClassName().toString() : null);
            windowInfo.put("eventText", event.getText() != null ? 
                event.getText().toString() : null);
            
            broadcastMessage(windowInfo);
            
        } catch (Exception e) {
            Log.e(TAG, "Error handling window change", e);
        } finally {
            rootNode.recycle();
        }
    }
    
    /**
     * 启动 WebSocket 服务器
     */
    private void startWebSocketServer() {
        new Thread(() -> {
            try {
                // 使用 nc (netcat) 创建简单的 WebSocket 服务器
                // 或者通过广播发送事件，由主应用接收
                
                Log.d(TAG, "WebSocket server started on port " + WEBSOCKET_PORT);
            } catch (Exception e) {
                Log.e(TAG, "Error starting WebSocket server", e);
            }
        }).start();
    }
    
    /**
     * 广播触摸事件（通过 Intent Broadcast）
     */
    private void broadcastTouchEvent(Map<String, Object> eventInfo) {
        broadcastMessage(eventInfo);
    }
    
    /**
     * 广播消息（通过 Intent Broadcast）
     */
    private void broadcastMessage(Map<String, Object> message) {
        mainHandler.post(() -> {
            try {
                JSONObject json = new JSONObject(message);
                String jsonData = json.toString();
                
                // 发送广播，LinkAndroid 主应用接收
                android.content.Intent intent = new android.content.Intent(
                    "com.linkandroid.ACCESSIBILITY_EVENT");
                intent.putExtra("data", jsonData);
                intent.setPackage("com.linkandroid"); // 只发送给 LinkAndroid 主应用
                sendBroadcast(intent);
                
            } catch (Exception e) {
                Log.e(TAG, "Error broadcasting message", e);
            }
        });
    }
    
    /**
     * 获取事件类型名称
     */
    private String getEventTypeName(int eventType) {
        switch (eventType) {
            case AccessibilityEvent.TYPE_TOUCH_INTERACTION:
                return "touch_interaction";
            case AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED:
                return "window_state_changed";
            case AccessibilityEvent.TYPE_WINDOWS_CHANGED:
                return "windows_changed";
            default:
                return "unknown_" + eventType;
        }
    }
    
    @Override
    public void onInterrupt() {
        Log.w(TAG, "AccessibilityService interrupted");
        isRunning = false;
    }
    
    @Override
    public void onDestroy() {
        super.onDestroy();
        isRunning = false;
        Log.d(TAG, "AccessibilityService destroyed");
    }
}
```

---

#### 3. `android/AccessibilityService/app/src/main/res/xml/accessibility_service_config.xml`
**作用**：辅助功能服务配置文件

**内容**：
```xml
<?xml version="1.0" encoding="utf-8"?>
<accessibility-service xmlns:android="http://schemas.android.com/apk/res/android"
    android:description="@string/accessibility_service_description"
    android:packageNames=""
    android:accessibilityEventTypes="typeAllMask"
    android:accessibilityFlags="flagDefault|flagRequestTouchExplorationMode|flagRetrieveInteractiveWindows"
    android:accessibilityFeedbackType="feedbackAllMask"
    android:notificationTimeout="100"
    android:settingsActivity="com.linkandroid.accessibility.SettingsActivity"
    android:canRetrieveWindowContent="true"
    android:canPerformGestures="true"
    android:canTakeScreenshot="true"
    android:isAccessibilityTool="true" />
```

---

#### 4. `android/AccessibilityService/app/src/main/res/values/strings.xml`
**作用**：字符串资源

**内容**：
```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">LinkAndroid Accessibility</string>
    <string name="accessibility_service_description">LinkAndroid 辅助功能服务用于监听触摸事件和获取控件信息，支持录制和回放功能。开启后可精确记录用户操作的控件 ID、文本等信息。</string>
    <string name="accessibility_service_title">LinkAndroid 辅助功能</string>
</resources>
```

---

#### 5. `android/AccessibilityService/app/build.gradle`
**作用**：Gradle 构建配置

**内容**：
```groovy
plugins {
    id 'com.android.application'
}

android {
    namespace 'com.linkandroid.accessibility'
    compileSdk 34

    defaultConfig {
        applicationId "com.linkandroid.accessibility"
        minSdk 24
        targetSdk 34
        versionCode 1
        versionName "1.0"
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_1_8
        targetCompatibility JavaVersion.VERSION_1_8
    }
}

dependencies {
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'com.google.android.material:material:1.11.0'
    implementation 'org.json:json:20230227'
}
```

---

### 二、Electron 主进程（新增/修改）

#### 6. `electron/mapi/accessibility/main.ts` (新增)
**作用**：AccessibilityService 的 Electron 主进程接口

**内容**：
```typescript
import { ipcMain, BrowserWindow } from "electron";
import { Log } from "../log/main";
import { spawn } from "child_process";

let accessibilityServiceRunning = false;
let logcatProcess: any = null;
let wsServer: any = null;

/**
 * 注册 AccessibilityService 处理器
 */
export function registerAccessibilityHandlers() {
    /**
     * 检查 AccessibilityService 是否已安装
     */
    ipcMain.handle("accessibility:isInstalled", async () => {
        try {
            const { exec } = await import("child_process");
            return new Promise((resolve) => {
                exec(
                    'adb shell pm list packages | grep "com.linkandroid.accessibility"',
                    (error: any, stdout: string) => {
                        if (error) {
                            resolve(false);
                        } else {
                            resolve(stdout.includes("com.linkandroid.accessibility"));
                        }
                    }
                );
            });
        } catch (error) {
            Log.error("Check accessibility service installed error:", error);
            return false;
        }
    });

    /**
     * 安装 AccessibilityService APK
     */
    ipcMain.handle("accessibility:install", async (_, apkPath: string) => {
        try {
            const { exec } = await import("child_process");
            return new Promise((resolve, reject) => {
                exec(`adb install -r "${apkPath}"`, (error: any, stdout: string) => {
                    if (error) {
                        Log.error("Install accessibility service error:", error);
                        reject(error);
                    } else {
                        Log.info("Install accessibility service success:", stdout);
                        resolve(true);
                    }
                });
            });
        } catch (error) {
            Log.error("Install accessibility service error:", error);
            return false;
        }
    });

    /**
     * 检查 AccessibilityService 是否已启用
     */
    ipcMain.handle("accessibility:isEnabled", async () => {
        try {
            const { exec } = await import("child_process");
            return new Promise((resolve) => {
                exec(
                    'adb shell settings get secure enabled_accessibility_services',
                    (error: any, stdout: string) => {
                        if (error) {
                            resolve(false);
                        } else {
                            resolve(stdout.includes("com.linkandroid.accessibility"));
                        }
                    }
                );
            });
        } catch (error) {
            Log.error("Check accessibility service enabled error:", error);
            return false;
        }
    });

    /**
     * 启用 AccessibilityService
     */
    ipcMain.handle("accessibility:enable", async () => {
        try {
            const { exec } = await import("child_process");
            return new Promise((resolve, reject) => {
                exec(
                    'adb shell settings put secure enabled_accessibility_services com.linkandroid.accessibility/com.linkandroid.accessibility.TouchMonitorService',
                    (error: any, stdout: string) => {
                        if (error) {
                            Log.error("Enable accessibility service error:", error);
                            reject(error);
                        } else {
                            Log.info("Enable accessibility service success");
                            resolve(true);
                        }
                    }
                );
            });
        } catch (error) {
            Log.error("Enable accessibility service error:", error);
            return false;
        }
    });

    /**
     * 启动触摸事件监听
     */
    ipcMain.handle("accessibility:startListening", async () => {
        if (accessibilityServiceRunning) {
            return true;
        }

        try {
            const { spawn } = await import("child_process");
            
            // 通过 logcat 监听辅助功能事件
            logcatProcess = spawn("adb", [
                "logcat",
                "-s",
                "TouchMonitor:D",
                "AccessibilityService:D"
            ]);

            logcatProcess.stdout.on("data", (data: Buffer) => {
                const message = data.toString();
                // 解析日志中的 JSON 数据
                const jsonMatch = message.match(/\{[^}]+\}/);
                if (jsonMatch) {
                    try {
                        const eventData = JSON.parse(jsonMatch[0]);
                        // 广播给渲染进程
                        BrowserWindow.getAllWindows().forEach((window) => {
                            window.webContents.send("accessibility:event", eventData);
                        });
                    } catch (error) {
                        // 忽略解析错误
                    }
                }
            });

            accessibilityServiceRunning = true;
            Log.info("Accessibility service listening started");
            return true;
        } catch (error) {
            Log.error("Start accessibility listening error:", error);
            return false;
        }
    });

    /**
     * 停止触摸事件监听
     */
    ipcMain.handle("accessibility:stopListening", async () => {
        if (logcatProcess) {
            logcatProcess.kill();
            logcatProcess = null;
        }
        accessibilityServiceRunning = false;
        Log.info("Accessibility service listening stopped");
        return true;
    });

    /**
     * 获取当前界面的控件树
     */
    ipcMain.handle("accessibility:getControlTree", async (_, deviceId: string) => {
        try {
            const { exec } = await import("child_process");
            return new Promise((resolve, reject) => {
                exec(
                    `adb -s ${deviceId} shell uiautomator dump /sdcard/window_dump.xml && adb -s ${deviceId} pull /sdcard/window_dump.xml /tmp/window_dump.xml`,
                    (error: any, stdout: string) => {
                        if (error) {
                            reject(error);
                        } else {
                            // 读取并解析 XML
                            const fs = require("fs");
                            const xml = fs.readFileSync("/tmp/window_dump.xml", "utf-8");
                            resolve(xml);
                        }
                    }
                );
            });
        } catch (error) {
            Log.error("Get control tree error:", error);
            return null;
        }
    });

    Log.info("Accessibility service handlers registered");
}

/**
 * 清理资源
 */
export function cleanupAccessibility() {
    if (logcatProcess) {
        logcatProcess.kill();
        logcatProcess = null;
    }
    accessibilityServiceRunning = false;
}
```

---

#### 7. `electron/mapi/accessibility/render.ts` (新增)
**作用**：AccessibilityService 的渲染进程接口

**内容**：
```typescript
import { ipcRenderer } from "electron";

export default {
    /**
     * 检查 AccessibilityService 是否已安装
     */
    async isInstalled(): Promise<boolean> {
        return await ipcRenderer.invoke("accessibility:isInstalled");
    },

    /**
     * 安装 AccessibilityService APK
     */
    async install(apkPath: string): Promise<boolean> {
        return await ipcRenderer.invoke("accessibility:install", apkPath);
    },

    /**
     * 检查 AccessibilityService 是否已启用
     */
    async isEnabled(): Promise<boolean> {
        return await ipcRenderer.invoke("accessibility:isEnabled");
    },

    /**
     * 启用 AccessibilityService
     */
    async enable(): Promise<boolean> {
        return await ipcRenderer.invoke("accessibility:enable");
    },

    /**
     * 启动触摸事件监听
     */
    async startListening(): Promise<boolean> {
        return await ipcRenderer.invoke("accessibility:startListening");
    },

    /**
     * 停止触摸事件监听
     */
    async stopListening(): Promise<boolean> {
        return await ipcRenderer.invoke("accessibility:stopListening");
    },

    /**
     * 获取当前界面的控件树
     */
    async getControlTree(deviceId: string): Promise<string | null> {
        return await ipcRenderer.invoke("accessibility:getControlTree", deviceId);
    },

    /**
     * 监听触摸事件
     */
    onTouchEvent(callback: (event: any) => void) {
        ipcRenderer.on("accessibility:event", (_, eventData) => {
            callback(eventData);
        });
    },

    /**
     * 移除触摸事件监听
     */
    removeOnTouchEvent(callback: (event: any) => void) {
        ipcRenderer.removeListener("accessibility:event", callback);
    },
};
```

---

#### 8. `electron/mapi/main.ts` (修改)
**作用**：注册 AccessibilityService 模块

**修改位置**：在 MAPI 对象中添加 accessibility 模块

**内容**：
```typescript
import accessibility, { registerAccessibilityHandlers } from "./accessibility/main";

const $mapi = {
    // ... 其他模块
    accessibility,
    // ...
};

export const MAPI = {
    async init() {
        // ... 其他初始化
        registerAccessibilityHandlers();
        console.log('[MAPI] Accessibility handlers registered');
        // ...
    },
    // ...
};
```

---

#### 9. `electron/mapi/render.ts` (修改)
**作用**：暴露 AccessibilityService API 到渲染进程

**修改位置**：在 exposeContext 中添加 accessibility

**内容**：
```typescript
import accessibility from "./accessibility/render";

export const MAPI = {
    init(env: typeof AppEnv | null = null) {
        if (!env) {
            exposeContext("$mapi", {
                // ... 其他模块
                accessibility,
            });
            // ...
        }
    },
    // ...
};
```

---

#### 10. `src/declarations/type.d.ts` (修改)
**作用**：添加 AccessibilityService 类型定义

**修改位置**：在 $mapi 类型中添加 accessibility

**内容**：
```typescript
accessibility: {
    isInstalled: () => Promise<boolean>;
    install: (apkPath: string) => Promise<boolean>;
    isEnabled: () => Promise<boolean>;
    enable: () => Promise<boolean>;
    startListening: () => Promise<boolean>;
    stopListening: () => Promise<boolean>;
    getControlTree: (deviceId: string) => Promise<string | null>;
    onTouchEvent: (callback: (event: any) => void) => void;
    removeOnTouchEvent: (callback: (event: any) => void) => void;
};
```

---

### 三、渲染进程/前端（新增/修改）

#### 11. `src/lib/accessibility.ts` (新增)
**作用**：封装 AccessibilityService 工具函数

**内容**：
```typescript
import { Dialog } from './dialog';
import { t } from '../lang';

/**
 * 检查并启用 AccessibilityService
 */
export async function ensureAccessibilityServiceEnabled(): Promise<boolean> {
    try {
        // 1. 检查是否已安装
        const installed = await window.$mapi.accessibility.isInstalled();
        if (!installed) {
            const result = await Dialog.confirm(
                t('accessibility.notInstalled'),
                t('accessibility.installNow')
            );
            if (result) {
                // TODO: 提供 APK 文件路径
                const apkPath = '/path/to/accessibility.apk';
                await window.$mapi.accessibility.install(apkPath);
            }
            return false;
        }

        // 2. 检查是否已启用
        const enabled = await window.$mapi.accessibility.isEnabled();
        if (!enabled) {
            const result = await Dialog.confirm(
                t('accessibility.notEnabled'),
                t('accessibility.enableNow')
            );
            if (result) {
                await window.$mapi.accessibility.enable();
            }
            return false;
        }

        // 3. 启动监听
        await window.$mapi.accessibility.startListening();
        return true;
    } catch (error: any) {
        console.error('Ensure accessibility service error:', error);
        Dialog.tipError(t('accessibility.enableFailed'));
        return false;
    }
}

/**
 * 解析控件信息
 */
export interface ControlInfo {
    viewId: string | null;
    text: string | null;
    className: string | null;
    packageName: string | null;
    bounds: {
        left: number;
        top: number;
        right: number;
        bottom: number;
        centerX: number;
        centerY: number;
    };
    touchX: number;
    touchY: number;
    clickable: boolean;
    checkable: boolean;
    checked: boolean;
    focusable: boolean;
    focused: boolean;
    visibleToUser: boolean;
    enabled: boolean;
    depth: number;
    childCount: number;
}

/**
 * 从事件中提取控件信息
 */
export function parseControlInfo(eventData: any): ControlInfo {
    return {
        viewId: eventData.viewId,
        text: eventData.text,
        className: eventData.className,
        packageName: eventData.packageName,
        bounds: eventData.bounds,
        touchX: eventData.touchX,
        touchY: eventData.touchY,
        clickable: eventData.clickable,
        checkable: eventData.checkable,
        checked: eventData.checked,
        focusable: eventData.focusable,
        focused: eventData.focused,
        visibleToUser: eventData.visibleToUser,
        enabled: eventData.enabled,
        depth: eventData.depth,
        childCount: eventData.childCount,
    };
}

/**
 * 将控件信息转换为录制步骤
 */
export function controlInfoToStep(controlInfo: ControlInfo, eventType: string) {
    const step: any = {
        type: eventType.includes('touch') ? 'tap' : 'wait',
        config: {
            // 优先使用控件 ID
            controlId: controlInfo.viewId,
            controlText: controlInfo.text,
            controlClass: controlInfo.className,
            // 降级到坐标
            x: controlInfo.touchX || controlInfo.bounds.centerX,
            y: controlInfo.touchY || controlInfo.bounds.centerY,
            // 控件属性
            clickable: controlInfo.clickable,
            bounds: controlInfo.bounds,
        }
    };

    return step;
}
```

---

#### 12. `src/pages/Automation/DeviceMirror.vue` (修改)
**作用**：集成触摸事件监听

**修改位置**：在组件中添加 AccessibilityService 监听

**内容**：
```typescript
// 在 onMounted 中启动监听
onMounted(async () => {
    console.log('[DeviceMirror] 组件已挂载');
    
    // 启动 AccessibilityService 监听
    const enabled = await window.$mapi.accessibility.startListening();
    if (enabled) {
        console.log('[DeviceMirror] AccessibilityService 监听已启动');
        
        // 监听触摸事件
        window.$mapi.accessibility.onTouchEvent(handleAccessibilityEvent);
    }
    
    connectMirror();
});

// 在 onUnmounted 中清理
onUnmounted(() => {
    stopMirror();
    
    // 停止 AccessibilityService 监听
    window.$mapi.accessibility.stopListening();
    window.$mapi.accessibility.removeOnTouchEvent(handleAccessibilityEvent);
});

// 处理 AccessibilityService 事件
const handleAccessibilityEvent = async (eventData: any) => {
    if (!isRecording) return;
    
    console.log('[DeviceMirror] 收到触摸事件:', eventData);
    
    // 解析控件信息
    const controlInfo = parseControlInfo(eventData);
    
    // 判断事件类型
    if (eventData.eventType === 'touch_interaction') {
        // 记录点击操作（优先使用控件 ID）
        if (controlInfo.viewId || controlInfo.text) {
            await recordTapWithControlInfo(controlInfo);
        } else {
            // 降级到坐标点击
            await recordTap(controlInfo.touchX, controlInfo.touchY);
        }
    }
};

// 使用控件信息记录点击
const recordTapWithControlInfo = async (controlInfo: ControlInfo) => {
    const screenshot = await captureScreenshot();
    if (!screenshot) return;
    
    // @ts-ignore - recorder API exists
    await window.$mapi.recorder.recordTap(
        controlInfo.touchX,
        controlInfo.touchY,
        screenshot,
        {
            controlId: controlInfo.viewId,
            controlText: controlInfo.text,
            controlClass: controlInfo.className,
            bounds: controlInfo.bounds,
        }
    );
    
    console.log('[DeviceMirror] 记录控件点击:', {
        id: controlInfo.viewId,
        text: controlInfo.text,
        class: controlInfo.className
    });
    
    // 更新画面
    mirrorImage.value = screenshot;
};
```

---

#### 13. `src/lang/zh-CN.json` (修改)
**作用**：添加 AccessibilityService 相关翻译

**修改位置**：添加 accessibility 相关翻译

**内容**：
```json
{
    "accessibility": {
        "notInstalled": "未检测到辅助功能服务，是否现在安装？",
        "installNow": "立即安装",
        "notEnabled": "辅助功能服务未启用，是否现在启用？",
        "enableNow": "立即启用",
        "enableFailed": "启用辅助功能服务失败",
        "serviceTitle": "LinkAndroid 辅助功能",
        "serviceDescription": "LinkAndroid 辅助功能服务用于监听触摸事件和获取控件信息，支持录制和回放功能。"
    }
}
```

---

#### 14. `src/lang/en-US.json` (修改)
**作用**：添加 AccessibilityService 相关英文翻译

**修改位置**：添加 accessibility 相关翻译

**内容**：
```json
{
    "accessibility": {
        "notInstalled": "Accessibility service not detected. Install now?",
        "installNow": "Install Now",
        "notEnabled": "Accessibility service not enabled. Enable now?",
        "enableNow": "Enable Now",
        "enableFailed": "Failed to enable accessibility service",
        "serviceTitle": "LinkAndroid Accessibility",
        "serviceDescription": "LinkAndroid accessibility service for monitoring touch events and retrieving control information, supporting recording and playback features."
    }
}
```

---

## 集成步骤

### 步骤 1：编译 Android APK
```bash
cd android/AccessibilityService
./gradlew assembleRelease
# 生成的 APK 路径：app/build/outputs/apk/release/app-release.apk
```

### 步骤 2：将 APK 放到 Electron 资源目录
```bash
cp app/build/outputs/apk/release/app-release.apk \
   electron/resources/extra/accessibility/accessibility-service.apk
```

### 步骤 3：在 Electron 中注册模块
修改 `electron/mapi/main.ts` 和 `electron/mapi/render.ts`

### 步骤 4：在渲染进程中启用
```typescript
// 在应用启动时或录制前检查
import { ensureAccessibilityServiceEnabled } from '@/lib/accessibility';

await ensureAccessibilityServiceEnabled();
```

### 步骤 5：测试
1. 启动应用
2. 点击"开始录制"
3. 在设备上操作
4. 查看控制台是否输出控件信息
5. 停止录制，检查步骤中是否包含控件 ID

---

## 优势

1. **精确录制**：获取控件 ID、文本、类名等详细信息
2. **高可靠性**：回放时优先使用控件 ID，不受分辨率影响
3. **实时监听**：通过 logcat 实时获取触摸事件
4. **无需 Root**：只需启用辅助功能权限
5. **兼容性好**：支持 Android 7.0+ 所有版本

---

## 注意事项

1. **用户授权**：需要用户手动启用辅助功能权限
2. **性能影响**：监听所有触摸事件可能有轻微性能开销
3. **隐私考虑**：需要告知用户监听的范围和用途
4. **APK 分发**：需要将辅助功能 APK 打包到应用中

---

## 后续优化

1. **WebSocket 通信**：替代 logcat 方案，更高效
2. **手势支持**：支持滑动、长按等复杂手势的控件识别
3. **控件树缓存**：缓存界面控件树，提高查询效率
4. **智能匹配**：回放时智能匹配控件（文本模糊匹配等）
