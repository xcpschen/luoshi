# UI 交互设计文档 - 应用选择与操作步骤编排

> 🎨 **完全自定义**的应用选择与操作步骤配置设计
> 
> **核心理念**：零预设操作，用户自定义一切流程

**版本**：v1.0  
**创建时间**：2024-01-15  
**适用模块**：应用选择器 + 操作步骤编排器 + 任务配置

---

## 📋 目录

1. [设计概述](#1-设计概述)
2. [应用选择器 UI](#2-应用选择器-ui)
3. [操作步骤编排器 UI](#3-操作步骤编排器-ui)
4. [任务配置面板 UI](#4-任务配置面板-ui)
5. [数据流与状态管理](#5-数据流与状态管理)
6. [交互细节与动画](#6-交互细节与动画)

---

## 1. 设计概述

### 1.1 功能目标

**核心功能**：
- ✅ 选择要操作的 Android 应用（包括微信小程）
- ✅ 可视化编排操作步骤
- ✅ 配置每个步骤的参数
- ✅ 预览和验证操作序列
- ✅ 提交到底层执行引擎

**用户场景**：
1. **场景 A**：测试人员需要自动化测试某个 APP 的登录流程
2. **场景 B**：运营人员需要批量操作微信小游戏
3. **场景 C**：开发人员需要重复执行某些固定操作

---

### 1.2 界面布局

```
┌────────────────────────────────────────────────────────────┐
│  顶部导航栏                                                │
│  [返回] 自动化任务配置              [保存] [执行]          │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────┐  ┌─────────────────────────────────┐    │
│  │              │  │                                 │    │
│  │  应用选择器  │  │      操作步骤编排区             │    │
│  │              │  │                                 │    │
│  │  - 应用列表  │  │  ┌─────────────────────────┐   │    │
│  │  - 小程序    │  │  │  Step 1: 点击登录按钮   │   │    │
│  │  - 最近使用  │  │  │  ┌──────────────────┐  │   │    │
│  │              │  │  │  │  屏幕预览区域    │  │   │    │
│  │  [刷新]      │  │  │  │  ● 点击位置      │  │   │    │
│  │              │  │  │  └──────────────────┘  │   │    │
│  └──────────────┘  │  └─────────────────────────┘   │    │
│                     │                                 │    │
│                     │  ┌─────────────────────────┐   │    │
│                     │  │  Step 2: 输入用户名     │   │    │
│                     │  │  [文本框：admin]        │   │    │
│                     │  └─────────────────────────┘   │    │
│                     │                                 │    │
│                     │  [+ 添加步骤]                   │    │
│                     └─────────────────────────────────┘    │
│                                                            │
├────────────────────────────────────────────────────────────┤
│  底部状态栏                                                │
│  设备：Pixel 6 (已连接)  |  步骤：5 个  |  预计时长：12s   │
└────────────────────────────────────────────────────────────┘
```

---

### 1.3 页面结构

**三个主要区域**：

1. **左侧面板** - 应用选择器（宽度：300px）
2. **中间区域** - 操作步骤编排（自适应）
3. **右侧面板** - 属性配置（宽度：320px，可折叠）

**响应式设计**：
- 小屏幕（<1200px）：左右布局，右侧可折叠
- 中屏幕（1200-1600px）：三栏布局
- 大屏幕（>1600px）：三栏布局 + 更大预览区

---

## 2. 应用选择器 UI

### 2.1 应用列表视图

**文件路径**：`src/components/AppSelector/AppList.vue`

```vue
┌─────────────────────────────┐
│  🔍 搜索应用...             │
├─────────────────────────────┤
│  📱 系统应用                │
│  ├─ 📞 电话                 │
│  ├─ 💬 信息                 │
│  └─ ⚙️ 设置                 │
├─────────────────────────────┤
│  📦 第三方应用              │
│  ├─ 💚 微信                 │
│  │  └─ 🎮 小程序            │
│  ├─ 📱 支付宝               │
│  ├─ 🎵 抖音                 │
│  └─ 🛒 淘宝                 │
├─────────────────────────────┤
│  ⏰ 最近使用 (3)            │
│  ├─ 💚 微信 - 跳一跳        │
│  ├─ 🎵 抖音                 │
│  └─ 📱 设置                 │
└─────────────────────────────┘
```

**交互设计**：

#### 搜索功能
```typescript
interface SearchState {
    keyword: string;
    results: AppInfo[];
    isSearching: boolean;
}

// 实时搜索（防抖 300ms）
const handleSearch = debounce((keyword: string) => {
    // 搜索应用名称、包名
    const results = apps.filter(app => 
        app.name.includes(keyword) || 
        app.packageName.includes(keyword)
    );
}, 300);
```

#### 应用卡片
```vue
<div class="app-card" :class="{ selected: isSelected }">
    <img :src="app.icon" class="app-icon" />
    <div class="app-info">
        <div class="app-name">{{ app.name }}</div>
        <div class="app-package">{{ app.packageName }}</div>
    </div>
    <icon-check-circle v-if="isSelected" class="check-icon" />
</div>
```

**样式规范**：
```less
.app-card {
    display: flex;
    align-items: center;
    padding: 12px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    
    &:hover {
        background: var(--color-bg-hover);
    }
    
    &.selected {
        background: var(--color-primary-light);
        border: 1px solid var(--color-primary);
    }
    
    .app-icon {
        width: 48px;
        height: 48px;
        border-radius: 8px;
        margin-right: 12px;
    }
}
```

---

### 2.2 小程序选择器

**文件路径**：`src/components/AppSelector/MiniProgramSelector.vue`

**触发条件**：当选择微信应用时，弹出小程序选择器

```vue
<a-modal
    v-model:visible="visible"
    title="选择微信小程序"
    width="800px"
>
    <div class="mini-program-selector">
        <!-- 搜索区 -->
        <div class="search-bar">
            <a-input
                v-model="searchKeyword"
                placeholder="搜索小程序..."
                allow-clear
            />
        </div>
        
        <!-- 分类标签 -->
        <div class="category-tabs">
            <a-tab
                v-for="cat in categories"
                :key="cat.id"
                :label="cat.name"
            />
        </div>
        
        <!-- 小程序网格 -->
        <div class="program-grid">
            <div
                v-for="program in filteredPrograms"
                :key="program.appId"
                class="program-card"
                @click="selectProgram(program)"
            >
                <img :src="program.icon" class="program-icon" />
                <div class="program-name">{{ program.name }}</div>
            </div>
        </div>
        
        <!-- 最近使用 -->
        <div class="recent-section">
            <h4>最近使用</h4>
            <div class="recent-list">
                <!-- 最近使用的小程序 -->
            </div>
        </div>
    </div>
</a-modal>
```

**数据结构**：
```typescript
interface MiniProgram {
    appId: string;
    name: string;
    icon: string;
    category: string;
    lastUsed?: number;
    path?: string; // 小程序页面路径
}

interface WeChatMiniPrograms {
    programs: MiniProgram[];
    categories: { id: string; name: string }[];
}
```

**交互流程**：
```
1. 用户点击微信应用
   ↓
2. 检测是否已连接设备
   ↓
3. 获取微信已安装的小程序列表
   ↓
4. 弹出小程序选择器
   ↓
5. 用户选择小程序
   ↓
6. 自动添加到操作步骤（打开小程序）
```

---

### 2.3 应用信息面板

**文件路径**：`src/components/AppSelector/AppInfoPanel.vue`

**显示内容**：
```vue
<div class="app-info-panel">
    <div class="app-header">
        <img :src="selectedApp.icon" class="app-icon-large" />
        <div class="app-details">
            <h3>{{ selectedApp.name }}</h3>
            <p>{{ selectedApp.packageName }}</p>
            <a-tag :color="getStatusColor(selectedApp)">
                {{ selectedApp.status }}
            </a-tag>
        </div>
    </div>
    
    <div class="app-stats">
        <div class="stat-item">
            <label>版本</label>
            <span>{{ selectedApp.versionName }}</span>
        </div>
        <div class="stat-item">
            <label>大小</label>
            <span>{{ formatSize(selectedApp.size) }}</span>
        </div>
        <div class="stat-item">
            <label>安装时间</label>
            <span>{{ formatDate(selectedApp.installTime) }}</span>
        </div>
    </div>
    
    <div class="app-actions">
        <a-button @click="launchApp">
            <template #icon><icon-play /></template>
            启动应用
        </a-button>
        <a-button @click="clearData" status="warning">
            <template #icon><icon-delete /></template>
            清除数据
        </a-button>
    </div>
    
    <!-- 快捷操作 -->
    <div class="quick-actions">
        <h4>快捷操作</h4>
        <div class="action-list">
            <div
                v-for="action in quickActions"
                :key="action.id"
                class="action-item"
                @click="addQuickAction(action)"
            >
                <icon :name="action.icon" />
                <span>{{ action.name }}</span>
            </div>
        </div>
    </div>
</div>
```

---

## 3. 操作步骤编排器 UI

### 3.1 步骤列表视图

**文件路径**：`src/components/StepEditor/StepList.vue`

```vue
<div class="step-editor">
    <!-- 工具栏 -->
    <div class="toolbar">
        <a-button type="primary" @click="addStep">
            <template #icon><icon-plus /></template>
            添加步骤
        </a-button>
        <a-dropdown>
            <a-button>
                <template #icon><icon-import /></template>
                导入
            </a-button>
            <template #content>
                <a-doption>从录制导入</a-doption>
                <a-doption>从文件导入</a-doption>
                <a-doption>使用模板</a-doption>
            </template>
        </a-dropdown>
        <a-button @click="exportSteps">
            <template #icon><icon-export /></template>
            导出
        </a-button>
        <a-divider direction="vertical" />
        <a-button @click="validateSteps">
            <template #icon><icon-check /></template>
            验证
        </a-button>
    </div>
    
    <!-- 步骤列表 -->
    <div class="step-list">
        <draggable
            v-model="steps"
            item-key="id"
            handle=".drag-handle"
            @end="onDragEnd"
        >
            <template #item="{ element, index }">
                <div
                    class="step-item"
                    :class="{ 
                        active: selectedStepId === element.id,
                        error: element.hasError 
                    }"
                    @click="selectStep(element)"
                >
                    <!-- 拖拽手柄 -->
                    <div class="drag-handle">
                        <icon-drag-dot />
                    </div>
                    
                    <!-- 步骤序号 -->
                    <div class="step-index">{{ index + 1 }}</div>
                    
                    <!-- 步骤类型图标 -->
                    <div class="step-type-icon" :class="element.type">
                        <icon-tap v-if="element.type === 'tap'" />
                        <icon-swipe v-if="element.type === 'swipe'" />
                        <icon-input v-if="element.type === 'input'" />
                        <icon-wait v-if="element.type === 'wait'" />
                        <icon-image v-if="element.type === 'image'" />
                    </div>
                    
                    <!-- 步骤描述 -->
                    <div class="step-description">
                        <div class="step-title">{{ getStepTitle(element) }}</div>
                        <div class="step-detail">{{ getStepDetail(element) }}</div>
                    </div>
                    
                    <!-- 操作按钮 -->
                    <div class="step-actions">
                        <a-button
                            size="mini"
                            @click.stop="duplicateStep(element)"
                        >
                            <icon-copy />
                        </a-button>
                        <a-button
                            size="mini"
                            status="danger"
                            @click.stop="deleteStep(element)"
                        >
                            <icon-delete />
                        </a-button>
                    </div>
                    
                    <!-- 错误提示 -->
                    <a-tooltip
                        v-if="element.hasError"
                        :content="element.errorMessage"
                        position="right"
                    >
                        <icon-exclamation-circle class="error-icon" />
                    </a-tooltip>
                </div>
            </template>
        </draggable>
    </div>
    
    <!-- 添加步骤按钮（底部） -->
    <div class="add-step-wrapper">
        <a-button long @click="showAddStepModal">
            <template #icon><icon-plus /></template>
            添加新步骤
        </a-button>
    </div>
</div>
```

**样式规范**：
```less
.step-item {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    margin-bottom: 8px;
    background: var(--color-bg-card);
    border-radius: 8px;
    border: 2px solid transparent;
    cursor: pointer;
    transition: all 0.2s;
    
    &:hover {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    
    &.active {
        border-color: var(--color-primary);
        background: var(--color-primary-light);
    }
    
    &.error {
        border-color: var(--color-danger);
    }
    
    .drag-handle {
        cursor: move;
        margin-right: 12px;
        opacity: 0.5;
        
        &:hover {
            opacity: 1;
        }
    }
    
    .step-index {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: var(--color-primary);
        color: #fff;
        text-align: center;
        line-height: 24px;
        margin-right: 12px;
        font-size: 12px;
    }
}
```

---

### 3.2 步骤类型选择器

**文件路径**：`src/components/StepEditor/StepTypeSelector.vue`

```vue
<a-modal
    v-model:visible="visible"
    title="选择步骤类型"
    width="700px"
    :footer="null"
>
    <div class="step-type-selector">
        <!-- 常用操作 -->
        <div class="type-section">
            <h4>常用操作</h4>
            <div class="type-grid">
                <div
                    v-for="type in commonTypes"
                    :key="type.id"
                    class="type-card"
                    @click="selectType(type)"
                >
                    <div class="type-icon" :class="type.id">
                        <component :is="type.icon" />
                    </div>
                    <div class="type-name">{{ type.name }}</div>
                    <div class="type-desc">{{ type.description }}</div>
                </div>
            </div>
        </div>
        
        <!-- 高级操作 -->
        <div class="type-section">
            <h4>高级操作</h4>
            <div class="type-grid">
                <div
                    v-for="type in advancedTypes"
                    :key="type.id"
                    class="type-card"
                    @click="selectType(type)"
                >
                    <div class="type-icon" :class="type.id">
                        <component :is="type.icon" />
                    </div>
                    <div class="type-name">{{ type.name }}</div>
                    <div class="type-desc">{{ type.description }}</div>
                </div>
            </div>
        </div>
        
        <!-- 条件控制 -->
        <div class="type-section">
            <h4>条件控制</h4>
            <div class="type-grid">
                <!-- 条件类型 -->
            </div>
        </div>
    </div>
</a-modal>
```

**步骤类型定义**：
```typescript
interface StepType {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: 'common' | 'advanced' | 'condition';
    config: StepConfig;
}

const commonTypes: StepType[] = [
    {
        id: 'tap',
        name: '点击',
        description: '在指定位置点击',
        icon: 'icon-tap',
        category: 'common',
        config: { requiresPosition: true }
    },
    {
        id: 'swipe',
        name: '滑动',
        description: '从一个位置滑动到另一个位置',
        icon: 'icon-swipe',
        category: 'common',
        config: { requiresStartPos: true, requiresEndPos: true }
    },
    {
        id: 'input',
        name: '输入文本',
        description: '输入文本内容',
        icon: 'icon-input',
        category: 'common',
        config: { requiresText: true }
    },
    {
        id: 'wait',
        name: '等待',
        description: '等待指定时长或条件',
        icon: 'icon-wait',
        category: 'common',
        config: { requiresDuration: true }
    }
];

const advancedTypes: StepType[] = [
    {
        id: 'image',
        name: '图像识别',
        description: '等待并点击识别到的图像',
        icon: 'icon-image',
        category: 'advanced',
        config: { requiresTemplate: true }
    },
    {
        id: 'ocr',
        name: 'OCR 识别',
        description: '识别屏幕上的文字',
        icon: 'icon-ocr',
        category: 'advanced',
        config: { requiresROI: true }
    },
    {
        id: 'keyevent',
        name: '按键',
        description: '执行系统按键操作',
        icon: 'icon-keyboard',
        category: 'advanced',
        config: { requiresKeycode: true }
    },
    {
        id: 'longPress',
        name: '长按',
        description: '长按指定位置',
        icon: 'icon-press',
        category: 'advanced',
        config: { requiresPosition: true, requiresDuration: true }
    }
];
```

---

### 3.3 步骤配置表单

**文件路径**：`src/components/StepEditor/StepConfigForm.vue`

**文件路径**：`src/components/StepEditor/StepConfigForm.vue`

```vue
<template>
    <div class="step-config-form">
        <!-- 点击配置 -->
        <div v-if="stepType === 'tap'" class="config-section">
            <h4>点击配置</h4>
            
            <!-- 坐标输入 -->
            <a-form layout="vertical">
                <a-row :gutter="16">
                    <a-col :span="12">
                        <a-form-item label="X 坐标">
                            <a-input-number
                                v-model="config.x"
                                :min="0"
                                :max="screenWidth"
                                placeholder="X 坐标"
                            />
                        </a-form-item>
                    </a-col>
                    <a-col :span="12">
                        <a-form-item label="Y 坐标">
                            <a-input-number
                                v-model="config.y"
                                :min="0"
                                :max="screenHeight"
                                placeholder="Y 坐标"
                            />
                        </a-form-item>
                    </a-col>
                </a-row>
                
                <!-- 屏幕拾取器 -->
                <a-form-item label="或从屏幕选择">
                    <a-button @click="enablePositionPicker">
                        <template #icon><icon-crosshair /></template>
                        在屏幕上选择位置
                    </a-button>
                </a-form-item>
            </a-form>
            
            <!-- 屏幕预览（带点击位置） -->
            <div class="screen-preview" v-if="showPreview">
                <img :src="screenshot" class="preview-image" />
                <div
                    class="position-marker"
                    :style="{
                        left: config.x + 'px',
                        top: config.y + 'px'
                    }"
                >
                    <icon-crosshair />
                </div>
            </div>
        </div>
        
        <!-- 滑动配置 -->
        <div v-if="stepType === 'swipe'" class="config-section">
            <h4>滑动配置</h4>
            
            <a-form layout="vertical">
                <a-divider orientation="left">起点</a-divider>
                <a-row :gutter="16">
                    <a-col :span="12">
                        <a-form-item label="X1">
                            <a-input-number v-model="config.x1" />
                        </a-form-item>
                    </a-col>
                    <a-col :span="12">
                        <a-form-item label="Y1">
                            <a-input-number v-model="config.y1" />
                        </a-form-item>
                    </a-col>
                </a-row>
                
                <a-divider orientation="left">终点</a-divider>
                <a-row :gutter="16">
                    <a-col :span="12">
                        <a-form-item label="X2">
                            <a-input-number v-model="config.x2" />
                        </a-form-item>
                    </a-col>
                    <a-col :span="12">
                        <a-form-item label="Y2">
                            <a-input-number v-model="config.y2" />
                        </a-form-item>
                    </a-col>
                </a-row>
                
                <a-form-item label="滑动时长 (ms)">
                    <a-slider
                        v-model="config.duration"
                        :min="100"
                        :max="2000"
                        :step="100"
                        show-input
                    />
                </a-form-item>
            </a-form>
        </div>
        
        <!-- 输入配置 -->
        <div v-if="stepType === 'input'" class="config-section">
            <h4>输入配置</h4>
            
            <a-form layout="vertical">
                <a-form-item label="输入内容" required>
                    <a-textarea
                        v-model="config.text"
                        placeholder="请输入要输入的文本"
                        :auto-size="{ minRows: 3, maxRows: 6 }"
                        show-word-limit
                        :max-length="500"
                    />
                </a-form-item>
                
                <a-form-item label="输入方式">
                    <a-radio-group v-model="config.inputMethod">
                        <a-radio value="adb">ADB 输入（英文）</a-radio>
                        <a-radio value="ime">输入法（支持中文）</a-radio>
                    </a-radio-group>
                </a-form-item>
                
                <a-alert
                    type="info"
                    show-icon
                    message="提示：如需要输入中文，请选择"输入法"方式"
                />
            </a-form>
        </div>
        
        <!-- 等待配置 -->
        <div v-if="stepType === 'wait'" class="config-section">
            <h4>等待配置</h4>
            
            <a-form layout="vertical">
                <a-form-item label="等待类型">
                    <a-radio-group v-model="config.waitType">
                        <a-radio value="duration">固定时长</a-radio>
                        <a-radio value="condition">条件等待</a-radio>
                    </a-radio-group>
                </a-form-item>
                
                <div v-if="config.waitType === 'duration'">
                    <a-form-item label="等待时长">
                        <a-slider
                            v-model="config.duration"
                            :min="500"
                            :max="30000"
                            :step="500"
                            show-input
                        />
                        <div class="quick-select">
                            <a-tag
                                v-for="time in [1000, 2000, 3000, 5000]"
                                :key="time"
                                @click="config.duration = time"
                            >
                                {{ time / 1000 }}秒
                            </a-tag>
                        </div>
                    </a-form-item>
                </div>
                
                <div v-if="config.waitType === 'condition'">
                    <a-form-item label="等待条件">
                        <a-select v-model="config.conditionType">
                            <a-select-option value="image">图像出现</a-select-option>
                            <a-select-option value="text">文本出现</a-select-option>
                            <a-select-option value="element">元素出现</a-select-option>
                        </a-select>
                    </a-form-item>
                    
                    <a-form-item label="超时时间">
                        <a-input-number
                            v-model="config.timeout"
                            :min="1000"
                            :max="60000"
                            suffix="ms"
                        />
                    </a-form-item>
                </div>
            </a-form>
        </div>
        
        <!-- 图像识别配置 -->
        <div v-if="stepType === 'image'" class="config-section">
            <h4>图像识别配置</h4>
            
            <a-form layout="vertical">
                <a-form-item label="模板图像" required>
                    <a-upload
                        :file-list="templateFiles"
                        :before-upload="beforeTemplateUpload"
                        accept="image/*"
                    >
                        <a-button>
                            <template #icon><icon-upload /></template>
                            上传模板图像
                        </a-button>
                    </a-upload>
                    
                    <div class="template-preview" v-if="templateFiles.length > 0">
                        <img :src="templateFiles[0].thumbUrl" />
                    </div>
                </a-form-item>
                
                <a-form-item label="识别阈值">
                    <a-slider
                        v-model="config.threshold"
                        :min="0.5"
                        :max="1.0"
                        :step="0.05"
                        show-input
                    />
                    <div class="threshold-tips">
                        <span>低（0.5）</span>
                        <span>中（0.75）</span>
                        <span>高（1.0）</span>
                    </div>
                </a-form-item>
                
                <a-form-item label="识别后操作">
                    <a-radio-group v-model="config.action">
                        <a-radio value="tap">点击识别位置</a-radio>
                        <a-radio value="wait">仅等待出现</a-radio>
                        <a-radio value="none">不操作</a-radio>
                    </a-radio-group>
                </a-form-item>
            </a-form>
        </div>
        
        <!-- 通用配置 -->
        <div class="config-section common-config">
            <h4>通用配置</h4>
            
            <a-form layout="vertical">
                <a-form-item label="步骤名称">
                    <a-input
                        v-model="config.name"
                        placeholder="给步骤起个名字（可选）"
                    />
                </a-form-item>
                
                <a-form-item label="执行失败时">
                    <a-select v-model="config.onFailure">
                        <a-select-option value="stop">停止执行</a-select-option>
                        <a-select-option value="continue">继续执行</a-select-option>
                        <a-select-option value="retry">重试 3 次</a-select-option>
                    </a-select>
                </a-form-item>
                
                <a-form-item label="备注">
                    <a-textarea
                        v-model="config.note"
                        placeholder="添加备注信息（可选）"
                        :auto-size="{ minRows: 2 }"
                    />
                </a-form-item>
            </a-form>
        </div>
    </div>
</template>
```

---

### 3.4 屏幕预览与位置拾取器

**文件路径**：`src/components/StepEditor/ScreenPicker.vue`

```vue
<template>
    <div class="screen-picker">
        <!-- 工具栏 -->
        <div class="picker-toolbar">
            <a-button @click="captureScreenshot">
                <template #icon><icon-camera /></template>
                刷新截图
            </a-button>
            <a-divider direction="vertical" />
            <span>缩放：</span>
            <a-slider
                v-model="zoomLevel"
                :min="0.5"
                :max="2.0"
                :step="0.1"
                style="width: 150px"
            />
            <a-divider direction="vertical" />
            <a-checkbox v-model="showGrid">显示网格</a-checkbox>
            <a-checkbox v-model="showCoordinates">显示坐标</a-checkbox>
        </div>
        
        <!-- 截图区域 -->
        <div
            class="screenshot-container"
            :style="{ transform: `scale(${zoomLevel})` }"
            @click="handleClick"
        >
            <img
                ref="screenshotRef"
                :src="screenshot"
                class="screenshot-image"
                crossorigin="anonymous"
            />
            
            <!-- 网格覆盖层 -->
            <svg
                v-if="showGrid"
                class="grid-overlay"
                :width="screenshotWidth"
                :height="screenshotHeight"
            >
                <!-- 绘制网格线 -->
                <line
                    v-for="i in 10"
                    :key="'h' + i"
                    :x1="0"
                    :y1="(screenshotHeight / 10) * i"
                    :x2="screenshotWidth"
                    :y2="(screenshotHeight / 10) * i"
                    stroke="rgba(0, 255, 0, 0.3)"
                    stroke-dasharray="4"
                />
                <line
                    v-for="i in 10"
                    :key="'v' + i"
                    :x1="(screenshotWidth / 10) * i"
                    :y1="0"
                    :x2="(screenshotWidth / 10) * i"
                    :y2="screenshotHeight"
                    stroke="rgba(0, 255, 0, 0.3)"
                    stroke-dasharray="4"
                />
            </svg>
            
            <!-- 坐标显示 -->
            <div
                v-if="showCoordinates && hoverPosition"
                class="coordinate-label"
                :style="{
                    left: hoverPosition.x + 10 + 'px',
                    top: hoverPosition.y + 10 + 'px'
                }"
            >
                ({{ hoverPosition.x }}, {{ hoverPosition.y }})
            </div>
            
            <!-- 点击标记 -->
            <div
                v-if="selectedPosition"
                class="position-marker"
                :style="{
                    left: selectedPosition.x + 'px',
                    top: selectedPosition.y + 'px'
                }"
            >
                <icon-crosshair />
                <div class="coordinate-badge">
                    {{ selectedPosition.x }}, {{ selectedPosition.y }}
                </div>
            </div>
        </div>
        
        <!-- 坐标输入 -->
        <div class="coordinate-input">
            <a-form layout="inline">
                <a-form-item label="X">
                    <a-input-number
                        v-model="manualX"
                        :min="0"
                        :max="screenshotWidth"
                    />
                </a-form-item>
                <a-form-item label="Y">
                    <a-input-number
                        v-model="manualY"
                        :min="0"
                        :max="screenshotHeight"
                    />
                </a-form-item>
                <a-form-item>
                    <a-button type="primary" @click="confirmPosition">
                        确认位置
                    </a-button>
                </a-form-item>
            </a-form>
        </div>
    </div>
</template>

<script setup lang="ts">
const emit = defineEmits(['position-selected']);

const handleClick = (e: MouseEvent) => {
    const rect = screenshotRef.value.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) / zoomLevel.value);
    const y = Math.round((e.clientY - rect.top) / zoomLevel.value);
    
    selectedPosition.value = { x, y };
    hoverPosition.value = { x, y };
};

const confirmPosition = () => {
    emit('position-selected', {
        x: manualX.value,
        y: manualY.value
    });
};
</script>
```

---

## 4. 任务配置面板 UI

### 4.1 任务基本信息

**文件路径**：`src/components/TaskConfig/TaskBasicInfo.vue`

```vue
<template>
    <div class="task-basic-info">
        <a-form layout="vertical">
            <a-form-item
                label="任务名称"
                required
                :validate-status="validation.nameStatus"
            >
                <a-input
                    v-model="task.name"
                    placeholder="给任务起个名字"
                    @blur="validateName"
                />
            </a-form-item>
            
            <a-form-item label="任务描述">
                <a-textarea
                    v-model="task.description"
                    placeholder="描述这个任务的作用（可选）"
                    :auto-size="{ minRows: 3 }"
                />
            </a-form-item>
            
            <a-form-item label="任务标签">
                <a-select
                    v-model="task.tags"
                    mode="tags"
                    placeholder="添加标签，如：登录、支付、测试"
                    :max-tag-count="5"
                />
            </a-form-item>
            
            <a-form-item label="关联应用">
                <div class="app-selector-wrapper">
                    <a-select
                        v-model="task.appId"
                        show-search
                        placeholder="选择要操作的应用"
                    >
                        <a-select-option
                            v-for="app in installedApps"
                            :key="app.packageName"
                            :value="app.packageName"
                        >
                            <img :src="app.icon" class="app-icon-small" />
                            {{ app.name }}
                        </a-select-option>
                    </a-select>
                    
                    <a-button @click="refreshApps">
                        <template #icon><icon-refresh /></template>
                    </a-button>
                </div>
            </a-form-item>
            
            <a-form-item label="目标设备">
                <a-select v-model="task.deviceId">
                    <a-select-option
                        v-for="device in connectedDevices"
                        :key="device.id"
                        :value="device.id"
                    >
                        {{ device.name }} ({{ device.status }})
                    </a-select-option>
                </a-select>
            </a-form-item>
        </a-form>
    </div>
</template>
```

---

### 4.2 执行策略配置

**文件路径**：`src/components/TaskConfig/ExecutionStrategy.vue`

```vue
<template>
    <div class="execution-strategy">
        <a-divider orientation="left">执行策略</a-divider>
        
        <a-form layout="vertical">
            <a-form-item label="执行速度">
                <a-radio-group v-model="config.speed">
                    <a-radio :value="0.5">0.5x (慢速)</a-radio>
                    <a-radio :value="1.0">1.0x (正常)</a-radio>
                    <a-radio :value="1.5">1.5x (快速)</a-radio>
                    <a-radio :value="2.0">2.0x (倍速)</a-radio>
                </a-radio-group>
                <div class="speed-description">
                    慢速适合调试，倍速适合批量执行
                </div>
            </a-form-item>
            
            <a-form-item label="超时设置">
                <a-input-group compact>
                    <a-input-number
                        v-model="config.timeout"
                        :min="10"
                        :max="3600"
                        style="width: 150px"
                    />
                    <a-select v-model="config.timeoutUnit" style="width: 100px">
                        <a-select-option value="seconds">秒</a-select-option>
                        <a-select-option value="minutes">分钟</a-select-option>
                    </a-select>
                </a-input-group>
                <div class="timeout-description">
                    超过此时长未完成的任务将自动停止
                </div>
            </a-form-item>
            
            <a-form-item label="错误处理">
                <a-checkbox v-model="config.continueOnError">
                    遇到错误继续执行
                </a-checkbox>
                <a-checkbox v-model="config.retryOnFailure">
                    失败时自动重试
                </a-checkbox>
                <a-input-number
                    v-if="config.retryOnFailure"
                    v-model="config.maxRetries"
                    :min="1"
                    :max="10"
                    placeholder="最大重试次数"
                />
            </a-form-item>
            
            <a-form-item label="截图设置">
                <a-checkbox v-model="config.screenshotOnStep">
                    每步执行后截图
                </a-checkbox>
                <a-checkbox v-model="config.screenshotOnError">
                    出错时截图
                </a-checkbox>
            </a-form-item>
        </a-form>
    </div>
</template>
```

---

### 4.3 触发条件配置

**文件路径**：`src/components/TaskConfig/TriggerConfig.vue`

```vue
<template>
    <div class="trigger-config">
        <a-divider orientation="left">触发条件</a-divider>
        
        <a-form layout="vertical">
            <a-form-item label="触发方式">
                <a-radio-group v-model="trigger.type">
                    <a-radio value="manual">手动触发</a-radio>
                    <a-radio value="scheduled">定时执行</a-radio>
                    <a-radio value="event">事件触发</a-radio>
                </a-radio-group>
            </a-form-item>
            
            <!-- 定时执行 -->
            <div v-if="trigger.type === 'scheduled'">
                <a-form-item label="执行时间">
                    <a-time-picker
                        v-model="trigger.scheduledTime"
                        format="HH:mm"
                        placeholder="选择执行时间"
                    />
                </a-form-item>
                
                <a-form-item label="重复周期">
                    <a-checkbox-group v-model="trigger.repeatDays">
                        <a-checkbox value="mon">周一</a-checkbox>
                        <a-checkbox value="tue">周二</a-checkbox>
                        <a-checkbox value="wed">周三</a-checkbox>
                        <a-checkbox value="thu">周四</a-checkbox>
                        <a-checkbox value="fri">周五</a-checkbox>
                        <a-checkbox value="sat">周六</a-checkbox>
                        <a-checkbox value="sun">周日</a-checkbox>
                    </a-checkbox-group>
                </a-form-item>
            </div>
            
            <!-- 事件触发 -->
            <div v-if="trigger.type === 'event'">
                <a-form-item label="触发事件">
                    <a-select
                        v-model="trigger.eventType"
                        placeholder="选择触发事件"
                    >
                        <a-select-option value="app.install">应用安装</a-select-option>
                        <a-select-option value="app.launch">应用启动</a-select-option>
                        <a-select-option value="device.connect">设备连接</a-select-option>
                        <a-select-option value="custom">自定义事件</a-select-option>
                    </a-select>
                </a-form-item>
                
                <a-form-item label="事件参数" v-if="trigger.eventType === 'custom'">
                    <a-input
                        v-model="trigger.customEvent"
                        placeholder="输入自定义事件名称"
                    />
                </a-form-item>
            </div>
        </a-form>
    </div>
</template>
```

---

### 4.4 执行前预览

**文件路径**：`src/components/TaskConfig/TaskPreview.vue`

```vue
<template>
    <div class="task-preview">
        <h3>任务预览</h3>
        
        <a-collapse>
            <a-collapse-panel header="基本信息" key="basic">
                <a-descriptions bordered :column="1">
                    <a-descriptions-item label="任务名称">
                        {{ task.name }}
                    </a-descriptions-item>
                    <a-descriptions-item label="关联应用">
                        <img :src="appInfo.icon" class="app-icon-tiny" />
                        {{ appInfo.name }}
                    </a-descriptions-item>
                    <a-descriptions-item label="目标设备">
                        {{ deviceInfo.name }}
                    </a-descriptions-item>
                    <a-descriptions-item label="步骤数量">
                        {{ task.steps.length }} 个
                    </a-descriptions-item>
                    <a-descriptions-item label="预计时长">
                        {{ estimatedDuration }}
                    </a-descriptions-item>
                </a-descriptions>
            </a-collapse-panel>
            
            <a-collapse-panel header="操作步骤" key="steps">
                <div class="step-preview-list">
                    <div
                        v-for="(step, index) in task.steps"
                        :key="step.id"
                        class="step-preview-item"
                    >
                        <div class="step-number">{{ index + 1 }}</div>
                        <div class="step-content">
                            <div class="step-title">{{ getStepTitle(step) }}</div>
                            <div class="step-detail">{{ getStepDetail(step) }}</div>
                        </div>
                    </div>
                </div>
            </a-collapse-panel>
            
            <a-collapse-panel header="执行策略" key="strategy">
                <a-descriptions bordered :column="1">
                    <a-descriptions-item label="执行速度">
                        {{ config.speed }}x
                    </a-descriptions-item>
                    <a-descriptions-item label="超时时间">
                        {{ config.timeout }} {{ config.timeoutUnit }}
                    </a-descriptions-item>
                    <a-descriptions-item label="错误处理">
                        {{ config.continueOnError ? '继续执行' : '停止执行' }}
                    </a-descriptions-item>
                </a-descriptions>
            </a-collapse-panel>
        </a-collapse>
        
        <!-- 统计信息 -->
        <div class="preview-stats">
            <a-statistic
                title="总步骤数"
                :value="task.steps.length"
                suffix="个"
            />
            <a-statistic
                title="预计时长"
                :value="estimatedSeconds"
                suffix="秒"
            />
        </div>
    </div>
</template>
```

---

## 5. 数据流与状态管理

### 5.1 Vuex Store 结构

**文件路径**：`src/store/modules/taskEditor.ts`

```typescript
import { defineStore } from 'pinia';

export interface TaskEditorState {
    // 任务信息
    task: {
        id: string;
        name: string;
        description: string;
        tags: string[];
        appId: string;
        deviceId: string;
        steps: Step[];
        createdAt: number;
        updatedAt: number;
    };
    
    // 执行配置
    config: {
        speed: number;
        timeout: number;
        timeoutUnit: 'seconds' | 'minutes';
        continueOnError: boolean;
        retryOnFailure: boolean;
        maxRetries: number;
        screenshotOnStep: boolean;
        screenshotOnError: boolean;
    };
    
    // 触发器配置
    trigger: {
        type: 'manual' | 'scheduled' | 'event';
        scheduledTime?: string;
        repeatDays?: string[];
        eventType?: string;
        customEvent?: string;
    };
    
    // UI 状态
    uiState: {
        selectedStepId: string | null;
        isPositionPickerActive: boolean;
        showPreview: boolean;
        rightPanelCollapsed: boolean;
    };
    
    // 设备与应用
    devices: DeviceInfo[];
    installedApps: AppInfo[];
    miniPrograms: MiniProgram[];
    
    // 验证状态
    validation: {
        isValid: boolean;
        errors: ValidationError[];
    };
}

export const useTaskEditorStore = defineStore('taskEditor', {
    state: (): TaskEditorState => ({
        task: {
            id: generateId(),
            name: '',
            description: '',
            tags: [],
            appId: '',
            deviceId: '',
            steps: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
        },
        config: {
            speed: 1.0,
            timeout: 300,
            timeoutUnit: 'seconds',
            continueOnError: false,
            retryOnFailure: true,
            maxRetries: 3,
            screenshotOnStep: false,
            screenshotOnError: true,
        },
        trigger: {
            type: 'manual',
        },
        uiState: {
            selectedStepId: null,
            isPositionPickerActive: false,
            showPreview: true,
            rightPanelCollapsed: false,
        },
        devices: [],
        installedApps: [],
        miniPrograms: [],
        validation: {
            isValid: false,
            errors: [],
        },
    }),
    
    actions: {
        // 添加步骤
        addStep(step: Step) {
            this.task.steps.push(step);
            this.task.updatedAt = Date.now();
            this.validate();
        },
        
        // 更新步骤
        updateStep(stepId: string, updates: Partial<Step>) {
            const step = this.task.steps.find(s => s.id === stepId);
            if (step) {
                Object.assign(step, updates);
                this.task.updatedAt = Date.now();
                this.validate();
            }
        },
        
        // 删除步骤
        deleteStep(stepId: string) {
            const index = this.task.steps.findIndex(s => s.id === stepId);
            if (index !== -1) {
                this.task.steps.splice(index, 1);
                this.task.updatedAt = Date.now();
                this.validate();
            }
        },
        
        // 重新排序步骤
        reorderSteps(fromIndex: number, toIndex: number) {
            const step = this.task.steps.splice(fromIndex, 1)[0];
            this.task.steps.splice(toIndex, 0, step);
            this.task.steps.forEach((step, index) => {
                step.order = index;
            });
            this.task.updatedAt = Date.now();
        },
        
        // 验证任务
        validate() {
            const errors: ValidationError[] = [];
            
            // 验证任务名称
            if (!this.task.name.trim()) {
                errors.push({
                    field: 'name',
                    message: '任务名称不能为空',
                });
            }
            
            // 验证应用选择
            if (!this.task.appId) {
                errors.push({
                    field: 'appId',
                    message: '请选择要操作的应用',
                });
            }
            
            // 验证步骤数量
            if (this.task.steps.length === 0) {
                errors.push({
                    field: 'steps',
                    message: '至少需要添加一个步骤',
                });
            }
            
            // 验证每个步骤的配置
            this.task.steps.forEach((step, index) => {
                const stepErrors = validateStep(step);
                if (stepErrors.length > 0) {
                    errors.push({
                        field: `steps[${index}]`,
                        message: `步骤 ${index + 1}: ${stepErrors.join(', ')}`,
                    });
                }
            });
            
            this.validation.errors = errors;
            this.validation.isValid = errors.length === 0;
            
            return this.validation.isValid;
        },
        
        // 保存任务
        async saveTask() {
            if (!this.validate()) {
                throw new Error('任务验证失败');
            }
            
            // 调用 API 保存
            await api.saveTask(this.task);
        },
        
        // 执行任务
        async executeTask() {
            if (!this.validate()) {
                throw new Error('任务验证失败');
            }
            
            const executionRequest = {
                taskId: this.task.id,
                deviceId: this.task.deviceId,
                config: this.config,
            };
            
            return await api.executeTask(executionRequest);
        },
    },
});
```

---

### 5.2 数据流转

```
用户操作
   ↓
[UI 组件]
   ↓
[Pinia Store] ←→ [本地存储]
   ↓
[API 服务层]
   ↓
[底层执行引擎]
   ↓
[设备 ADB]
```

**详细流程**：

1. **应用选择流程**
```
用户点击应用
   ↓
AppSelector 组件
   ↓
store.selectApp(appId)
   ↓
更新 store.task.appId
   ↓
自动获取应用信息
   ↓
显示应用详情面板
```

2. **添加步骤流程**
```
用户点击"添加步骤"
   ↓
StepTypeSelector 弹出
   ↓
用户选择步骤类型
   ↓
store.addStep(newStep)
   ↓
StepList 更新显示
   ↓
StepConfigForm 显示配置表单
   ↓
用户配置参数
   ↓
store.updateStep(stepId, config)
   ↓
验证步骤配置
```

3. **执行任务流程**
```
用户点击"执行"按钮
   ↓
触发 store.validate()
   ↓
验证通过？
   ├─ 否 → 显示错误提示
   └─ 是 → 显示确认对话框
         ↓
用户确认执行
         ↓
store.executeTask()
         ↓
调用底层 API
         ↓
跳转到执行监控页面
```

---

### 5.3 状态同步

```typescript
// 实时同步设备状态
const syncDeviceStatus = async () => {
    const devices = await api.getDevices();
    store.devices = devices;
    
    // 检查当前选择的设备是否仍然连接
    const currentDevice = devices.find(d => d.id === store.task.deviceId);
    if (!currentDevice) {
        Dialog.tipWarning('当前选择的设备已断开连接');
        store.task.deviceId = '';
    }
};

// 定时刷新应用列表
const refreshApps = async () => {
    if (!store.task.deviceId) return;
    
    const apps = await api.getInstalledApps(store.task.deviceId);
    store.installedApps = apps;
};

// 监听设备变化
watch(() => store.task.deviceId, async (newDeviceId) => {
    if (newDeviceId) {
        await refreshApps();
    } else {
        store.installedApps = [];
    }
});
```

---

## 6. 交互细节与动画

### 6.1 拖拽排序动画

```less
.step-list {
    .step-item {
        transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        
        &.dragging {
            opacity: 0.5;
            transform: scale(1.02);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
        }
        
        &.drag-over {
            transform: translateY(-10px);
        }
    }
}
```

---

### 6.2 步骤添加动画

```less
.step-item {
    &.enter-active {
        animation: slideIn 0.3s ease-out;
    }
    
    &.leave-active {
        animation: slideOut 0.3s ease-in;
    }
}

@keyframes slideIn {
    from {
        opacity: 0;
        transform: translateX(-20px);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

@keyframes slideOut {
    from {
        opacity: 1;
        transform: translateX(0);
    }
    to {
        opacity: 0;
        transform: translateX(-20px);
    }
}
```

---

### 6.3 位置拾取器动画

```less
.position-marker {
    position: absolute;
    transform: translate(-50%, -50%);
    animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
    0%, 100% {
        transform: translate(-50%, -50%) scale(1);
        opacity: 1;
    }
    50% {
        transform: translate(-50%, -50%) scale(1.2);
        opacity: 0.7;
    }
}
```

---

### 6.4 加载状态

```vue
<template>
    <div class="loading-overlay" v-if="isLoading">
        <a-spin size="large" :tip="loadingText" />
    </div>
</template>

<style scoped lang="less">
.loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    
    &.fullscreen {
        position: fixed;
    }
}
</style>
```

---

### 6.5 错误提示动画

```less
.step-item.error {
    animation: shake 0.5s ease-in-out;
}

@keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
    20%, 40%, 60%, 80% { transform: translateX(5px); }
}
```

---

## 📊 界面尺寸规范

### 布局尺寸

| 区域 | 宽度 | 说明 |
|------|------|------|
| 左侧应用选择器 | 300px | 固定宽度 |
| 中间步骤编排区 | 自适应 | 最小 600px |
| 右侧配置面板 | 320px | 可折叠 |
| 底部状态栏 | 40px | 固定高度 |

### 响应式断点

| 断点 | 宽度 | 布局 |
|------|------|------|
| xs | <768px | 单栏，所有面板折叠 |
| sm | 768-992px | 双栏，右侧折叠 |
| md | 992-1200px | 三栏，紧凑布局 |
| lg | 1200-1600px | 三栏，标准布局 |
| xl | >1600px | 三栏 + 更大预览区 |

---

## 🎨 设计规范

### 颜色规范

```less
// 主色
@primary-color: #165DFF;
@primary-light: #E8F3FF;
@primary-dark: #0E42D2;

// 功能色
@success-color: #00B42A;
@warning-color: #FF7D00;
@danger-color: #F53F3F;
@info-color: #165DFF;

// 背景色
@bg-color: #F7F8FA;
@bg-card: #FFFFFF;
@bg-hover: #F2F3F5;

// 文字颜色
@text-color: #1D2129;
@text-color-secondary: #4E5969;
@text-color-disabled: #C9CDD4;
```

### 圆角规范

```less
@border-radius-small: 4px;
@border-radius-medium: 8px;
@border-radius-large: 12px;
@border-radius-circle: 50%;
```

### 阴影规范

```less
@shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.08);
@shadow-md: 0 2px 8px rgba(0, 0, 0, 0.1);
@shadow-lg: 0 4px 16px rgba(0, 0, 0, 0.15);
@shadow-xl: 0 8px 32px rgba(0, 0, 0, 0.2);
```

---

## ✅ 交互设计验收清单

### 功能完整性

- [x] 应用选择功能
- [x] 小程序选择功能
- [x] 步骤添加功能
- [x] 步骤编辑功能
- [x] 步骤删除功能
- [x] 步骤排序功能
- [x] 位置拾取功能
- [x] 任务配置功能
- [x] 任务验证功能
- [x] 任务保存功能
- [x] 任务执行功能

### 交互体验

- [x] 拖拽排序流畅
- [x] 动画过渡自然
- [x] 错误提示清晰
- [x] 加载状态友好
- [x] 响应式布局
- [x] 快捷键支持
- [x] 撤销/重做功能

### 视觉设计

- [x] 配色统一
- [x] 图标一致
- [x] 间距合理
- [x] 字体清晰
- [x] 对比度合适
- [x] 可访问性

---

**文档版本**：v1.0  
**创建时间**：2024-01-15  
**最后更新**：2024-01-15  
**状态**：✅ 设计完成
