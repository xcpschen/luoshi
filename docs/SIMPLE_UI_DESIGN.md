# 简化版 UI 设计方案 - 自动化操作编排器

> 🎯 **简单傻瓜化**的可视化操作编排界面
> 
> 核心目标：让任何人都能快速上手，3 分钟创建自动化任务

**版本**：v1.0  
**创建时间**：2024-01-15

---

## 📋 核心功能

### 1. 一键录制（最简单）
```
点击"开始录制" → 操作手机 → 点击"停止录制" → 自动生成步骤
```

### 2. 可视化编排（拖拽式）
```
从工具箱拖拽操作 → 放到步骤列表 → 在截图上点位置 → 完成
```

### 3. 智能回放（一键执行）
```
选择任务 → 点击"执行" → 自动完成所有操作
```

---

## 🎨 界面布局

### 主界面（三分区）

```
┌──────────────────────────────────────────────────────────┐
│  顶部工具栏                                              │
│  [←返回]  自动化任务           [+ 新建任务] [执行全部]  │
├────────────┬───────────────────────────┬─────────────────┤
│            │                           │                 │
│  任务列表  │   可视化编辑器            │  属性面板      │
│            │                           │                 │
│  [搜索]    │  ┌─────────────────────┐ │ (选中步骤的    │
│            │  │  手机屏幕预览       │ │  详细配置)     │
│  - 任务 1  │  │  (实时截图/录屏)    │ │                 │
│  - 任务 2  │  │                     │ │ - 步骤名称     │
│  - 任务 3  │  │  ● 点击位置标记     │ │ - 坐标 X/Y     │
│            │  │                     │ │ - 等待时长     │
│  [+ 新建]  │  └─────────────────────┘ │ - 执行条件     │
│            │                           │                 │
│            │  ┌─────────────────────┐ │                 │
│            │  │  步骤 1: 点击 (100,200)│ │                 │
│            │  │  步骤 2: 等待 2 秒     │ │                 │
│            │  │  步骤 3: 滑动...     │ │                 │
│            │  │  [+ 添加步骤]       │ │                 │
│            │  └─────────────────────┘ │                 │
│            │                           │                 │
├────────────┴───────────────────────────┴─────────────────┤
│  底部状态栏                                              │
│  设备：Pixel 6 (已连接) | 步骤：5 个 | 预计：12 秒      │
└──────────────────────────────────────────────────────────┘
```

---

## 🎯 核心交互设计

### 1. 一键录制流程

**步骤 1：点击录制按钮**
```
┌─────────────────────────────┐
│  🎬 开始录制                │
├─────────────────────────────┤
│                             │
│  选择要录制的设备：         │
│  ○ Pixel 6 (已连接)         │
│  ○ iPhone 13 (未连接)       │
│                             │
│  [取消] [开始录制]          │
└─────────────────────────────┘
```

**步骤 2：实际操作手机**
```
┌─────────────────────────────┐
│  🔴 正在录制... (00:15)     │
├─────────────────────────────┤
│                             │
│  ┌─────────────────────┐   │
│  │  手机实时投屏       │   │
│  │                     │   │
│  │  (用户实际操作)     │   │
│  │                     │   │
│  └─────────────────────┘   │
│                             │
│  已记录：8 个操作           │
│                             │
│  [暂停] [停止录制]          │
└─────────────────────────────┘
```

**步骤 3：查看录制的步骤**
```
┌─────────────────────────────┐
│  ✅ 录制完成                │
├─────────────────────────────┤
│                             │
│  录制结果：12 个操作        │
│  总时长：23 秒              │
│                             │
│  步骤列表：                 │
│  ✓ 1. 点击 (100, 200)       │
│  ✓ 2. 等待 2 秒              │
│  ✓ 3. 滑动 (100,200→300,400)│
│  ✓ 4. 输入 "Hello"          │
│  ...                        │
│                             │
│  [删除不需要的步骤]         │
│  [保存任务] [重新录制]      │
└─────────────────────────────┘
```

---

### 2. 可视化编排（傻瓜式）

**步骤 1：添加操作**
```
┌─────────────────────────────┐
│  ➕ 添加操作                │
├─────────────────────────────┤
│                             │
│  常用操作：                 │
│  ┌─────┐ ┌─────┐ ┌─────┐  │
│  │ 👆  │ │ ✋  │ │ ⌨️  │  │
│  │点击 │ │滑动 │ │输入 │  │
│  └─────┘ └─────┘ └─────┘  │
│                             │
│  ┌─────┐ ┌─────┐ ┌─────┐  │
│  │ ⏱️  │ │ 🖼️ │ │ 🔘 │  │
│  │等待 │ │图像 │ │按键 │  │
│  │     │ │识别 │ │     │  │
│  └─────┘ └─────┘ └─────┘  │
│                             │
│  💡 提示：点击操作类型，    │
│     然后在屏幕上选择位置    │
└─────────────────────────────┘
```

**步骤 2：在屏幕上点选位置**
```
┌─────────────────────────────┐
│  📍 选择点击位置            │
├─────────────────────────────┤
│                             │
│  ┌─────────────────────┐   │
│  │                     │   │
│  │   手机屏幕截图      │   │
│  │                     │   │
│  │       ● ← 点击这里  │   │
│  │                     │   │
│  │                     │   │
│  └─────────────────────┘   │
│                             │
│  坐标：X: 320, Y: 450       │
│                             │
│  [取消] [确认]              │
└─────────────────────────────┘
```

**步骤 3：完成配置**
```
✅ 步骤已添加：点击 (320, 450)

[继续添加] [完成]
```

---

### 3. 步骤编辑（拖拽排序）

```
┌─────────────────────────────┐
│  📋 操作步骤                │
├─────────────────────────────┤
│                             │
│  ☰ 1. 打开应用              │
│    └─ 点击 (100, 200)       │
│                             │
│  ☰ 2. 等待加载              │
│    └─ 等待 3 秒              │
│                             │
│  ☰ 3. 点击登录按钮          │
│    └─ 点击 (500, 300)       │
│                             │
│  ☰ 4. 输入用户名            │
│    └─ 输入 "admin"          │
│                             │
│  [+ 添加步骤]               │
│                             │
│  💡 提示：拖动 ☰ 可以调整   │
│     步骤顺序                │
└─────────────────────────────┘
```

---

## 🎯 核心功能实现

### 1. 录制功能

**文件结构**：
```
src/pages/Automation/
├── Recorder/
│   ├── RecorderPanel.vue      # 录制面板
│   ├── StepList.vue           # 步骤列表
│   └── ScreenPreview.vue      # 屏幕预览
```

**核心代码**：
```vue
<template>
    <div class="recorder-panel">
        <!-- 录制控制 -->
        <div class="recorder-controls">
            <a-button
                v-if="!isRecording"
                type="primary"
                status="success"
                @click="startRecording"
            >
                <template #icon><icon-record /></template>
                开始录制
            </a-button>
            
            <a-button
                v-else
                type="primary"
                status="danger"
                @click="stopRecording"
            >
                <template #icon><icon-stop /></template>
                停止录制 ({{ recordedSteps.length }})
            </a-button>
        </div>
        
        <!-- 屏幕预览（实时投屏） -->
        <ScreenPreview
            :device-id="deviceId"
            :highlight="isRecording"
            @click="onScreenClick"
        />
        
        <!-- 步骤列表 -->
        <div class="steps-list">
            <div
                v-for="(step, index) in recordedSteps"
                :key="step.id"
                class="step-item"
            >
                <span class="step-index">{{ index + 1 }}</span>
                <span class="step-desc">{{ getStepDescription(step) }}</span>
                <a-button
                    size="mini"
                    status="danger"
                    @click="removeStep(index)"
                >
                    <icon-delete />
                </a-button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
const isRecording = ref(false);
const recordedSteps = ref<Step[]>([]);

const startRecording = async () => {
    isRecording.value = true;
    recordedSteps.value = [];
    
    // 开始监听设备操作
    await window.$mapi.recorder.startRecording(deviceId.value);
    
    // 监听操作事件
    window.$mapi.recorder.on('action-recorded', (action) => {
        recordedSteps.value.push(action);
    });
};

const stopRecording = async () => {
    isRecording.value = false;
    
    const script = await window.$mapi.recorder.stopRecording();
    
    // 显示录制结果
    showSaveDialog(script);
};

const onScreenClick = async (e: MouseEvent) => {
    if (!isRecording.value) return;
    
    const coords = getScreenCoords(e);
    
    // 执行点击并记录
    await window.$mapi.adb.tap(deviceId.value, coords.x, coords.y);
    
    recordedSteps.value.push({
        type: 'tap',
        position: coords,
        timestamp: Date.now()
    });
};
</script>
```

---

### 2. 可视化编排器

**文件结构**：
```
src/pages/Automation/
├── Editor/
│   ├── StepEditor.vue         # 步骤编辑器
│   ├── StepToolbox.vue        # 操作工具箱
│   └── ScreenPicker.vue       # 屏幕拾取器
```

**核心代码**：
```vue
<template>
    <div class="step-editor">
        <!-- 操作工具箱 -->
        <StepToolbox @select="onSelectTool" />
        
        <!-- 屏幕预览 -->
        <ScreenPicker
            ref="pickerRef"
            :screenshot="currentScreenshot"
            @position-selected="onPositionSelected"
        />
        
        <!-- 步骤列表 -->
        <div class="step-list">
            <draggable
                v-model="steps"
                item-key="id"
                handle=".drag-handle"
            >
                <template #item="{ element, index }">
                    <div class="step-item">
                        <icon-drag-dot class="drag-handle" />
                        <span class="step-index">{{ index + 1 }}</span>
                        <span class="step-desc">
                            {{ getStepIcon(element.type) }}
                            {{ getStepDescription(element) }}
                        </span>
                        <a-button
                            size="mini"
                            @click="editStep(element)"
                        >
                            <icon-edit />
                        </a-button>
                        <a-button
                            size="mini"
                            status="danger"
                            @click="deleteStep(index)"
                        >
                            <icon-delete />
                        </a-button>
                    </div>
                </template>
            </draggable>
            
            <a-button long @click="addStep">
                <template #icon><icon-plus /></template>
                添加步骤
            </a-button>
        </div>
    </div>
</template>

<script setup lang="ts">
const steps = ref<Step[]>([]);
const currentTool = ref<string | null>(null);

const onSelectTool = (toolType: string) => {
    currentTool.value = toolType;
    
    if (toolType === 'tap') {
        // 启用屏幕拾取器
        pickerRef.value.enablePicker();
    } else if (toolType === 'wait') {
        // 直接添加等待步骤
        addStep({
            type: 'wait',
            duration: 1000
        });
    }
};

const onPositionSelected = (position: { x: number, y: number }) => {
    if (currentTool.value === 'tap') {
        addStep({
            type: 'tap',
            position
        });
    } else if (currentTool.value === 'swipe') {
        // 等待第二次选择
        swipeStartPos.value = position;
    }
};

const addStep = (step: Step) => {
    steps.value.push({
        id: generateId(),
        ...step,
        order: steps.value.length
    });
};
</script>
```

---

### 3. 回放功能

**文件结构**：
```
src/pages/Automation/
├── Playback/
│   ├── PlaybackPanel.vue      # 回放面板
│   └── ProgressView.vue       # 进度视图
```

**核心代码**：
```vue
<template>
    <div class="playback-panel">
        <!-- 任务选择 -->
        <a-select
            v-model="selectedTaskId"
            placeholder="选择要执行的任务"
        >
            <a-select-option
                v-for="task in tasks"
                :key="task.id"
                :value="task.id"
            >
                {{ task.name }} ({{ task.steps.length }}步)
            </a-select-option>
        </a-select>
        
        <!-- 执行控制 -->
        <div class="playback-controls">
            <a-button
                type="primary"
                :loading="isPlaying"
                @click="startPlayback"
            >
                <template #icon><icon-play /></template>
                开始执行
            </a-button>
            
            <a-button
                v-if="isPlaying"
                status="warning"
                @click="pausePlayback"
            >
                <template #icon><icon-pause /></template>
                暂停
            </a-button>
            
            <a-button
                v-if="isPlaying"
                status="danger"
                @click="stopPlayback"
            >
                <template #icon><icon-stop /></template>
                停止
            </a-button>
        </div>
        
        <!-- 进度显示 -->
        <ProgressView
            v-if="isPlaying"
            :current-step="currentStep"
            :total-steps="totalSteps"
            :elapsed="elapsedTime"
        />
        
        <!-- 执行日志 -->
        <div class="execution-log">
            <div
                v-for="log in logs"
                :key="log.timestamp"
                class="log-item"
                :class="log.level"
            >
                <span class="log-time">{{ formatTime(log.timestamp) }}</span>
                <span class="log-message">{{ log.message }}</span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
const isPlaying = ref(false);
const currentStep = ref(0);
const logs = ref<Log[]>([]);

const startPlayback = async () => {
    if (!selectedTaskId.value) {
        Dialog.tipError('请选择任务');
        return;
    }
    
    isPlaying.value = true;
    currentStep.value = 0;
    logs.value = [];
    
    try {
        const result = await window.$mapi.playback.play(
            selectedTaskId.value,
            deviceId.value,
            {
                speed: 1.0,
                debug: true
            }
        );
        
        if (result.success) {
            Dialog.tipSuccess('执行完成！');
        } else {
            Dialog.tipError(`执行失败：${result.error}`);
        }
    } catch (error: any) {
        Dialog.tipError(`执行异常：${error.message}`);
    } finally {
        isPlaying.value = false;
    }
};

// 监听执行进度
window.$mapi.playback.on('step-executed', (stepIndex: number) => {
    currentStep.value = stepIndex;
    logs.value.push({
        timestamp: Date.now(),
        level: 'info',
        message: `执行步骤 ${stepIndex + 1}`
    });
});
</script>
```

---

## 🎯 简化版功能清单

### P0（必须实现）🔴
- [x] 一键录制功能
- [x] 录制步骤查看和编辑
- [x] 可视化步骤添加（点击、等待、输入）
- [x] 屏幕拾取器（在截图上点选位置）
- [x] 步骤拖拽排序
- [x] 任务保存
- [x] 一键回放

### P1（应该实现）🟡
- [ ] 滑动操作录制和编排
- [ ] 图像识别步骤
- [ ] 循环和条件判断
- [ ] 步骤复制和删除
- [ ] 任务导入导出

### P2（可以后续实现）🟢
- [ ] 批量执行
- [ ] 定时任务
- [ ] 执行日志导出
- [ ] 变量和参数
- [ ] OCR 识别

---

## 📊 开发计划

### Week 1：录制功能
- Day 1-2: 录制面板 + 屏幕预览
- Day 3-4: 操作监听和记录
- Day 5: 步骤列表和编辑

### Week 2：可视化编排
- Day 1-2: 工具箱 + 屏幕拾取器
- Day 3-4: 步骤编辑器
- Day 5: 拖拽排序

### Week 3：回放功能
- Day 1-2: 回放面板
- Day 3-4: 执行控制 + 进度显示
- Day 5: 集成测试

---

## ✅ 验收标准

### 易用性
- [x] 3 分钟内完成第一个任务录制
- [x] 不需要看文档就能使用
- [x] 所有操作都有明确提示

### 功能性
- [x] 能录制完整的操作流程
- [x] 能可视化添加和编辑步骤
- [x] 能成功回放录制的任务

### 稳定性
- [x] 录制不丢失步骤
- [x] 回放准确率 > 90%
- [x] 无崩溃和卡死

---

**文档版本**：v1.0  
**创建时间**：2024-01-15  
**状态**：✅ 设计完成，准备开始编码
