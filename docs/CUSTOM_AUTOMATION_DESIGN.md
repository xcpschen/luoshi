# 完全自定义自动化操作设计说明

> 🎯 **零预设操作，用户自定义一切** - 完全自定义自动化操作能力设计

**版本**：v1.0  
**创建时间**：2024-01-15  
**核心理念**：不提供任何预设操作流程，用户从零开始定义自己的自动化场景

---

## 📋 设计原则

### 1. 零预设操作原则

**不做任何预设**：
- ❌ 不提供预设的操作模板
- ❌ 不提供预设的操作流程
- ❌ 不提供预设的应用配置
- ❌ 不提供预设的步骤序列
- ✅ **用户从零开始创建每一个操作**

**为什么？**
1. **灵活性最大化** - 每个用户的使用场景都不同
2. **避免误导** - 预设操作可能不适合用户的实际需求
3. **鼓励思考** - 让用户明确每一步操作的目的
4. **减少依赖** - 用户完全掌控自己的自动化流程

---

### 2. 空白画布理念

**初始状态**：
```
┌─────────────────────────────────────┐
│  新任务                             │
├─────────────────────────────────────┤
│                                     │
│  📋 操作步骤                        │
│                                     │
│  ┌─────────────────────────────┐   │
│  │                             │   │
│  │   暂无操作步骤              │   │
│  │                             │   │
│  │   [+ 添加第一个步骤]        │   │
│  │                             │   │
│  └─────────────────────────────┘   │
│                                     │
│  💡 提示：                          │
│  从添加第一个步骤开始               │
│  定义您的自动化操作                 │
│                                     │
└─────────────────────────────────────┘
```

**设计要点**：
- 初始状态**完全空白**
- 没有任何预设步骤
- 用户主动添加每一个操作
- 引导式提示，但不强制

---

### 3. 用户自定义场景

**典型使用场景**：

#### 场景 A：游戏自动化
```
用户目标：自动完成游戏日常任务

用户自定义步骤：
1. 打开游戏应用
2. 等待 3 秒（加载）
3. 点击"日常任务"按钮（坐标：500, 300）
4. 等待 2 秒
5. 点击"开始任务"按钮（坐标：600, 400）
6. 等待 30 秒（任务执行）
7. 点击"领取奖励"按钮（坐标：400, 500）
8. 重复步骤 3-7（循环 5 次）
9. 关闭游戏
```

**系统不提供**：
- ❌ 预设的游戏操作流程
- ❌ 预设的任务模板
- ❌ 预设的循环配置

**系统提供**：
- ✅ 添加步骤的工具
- ✅ 设置坐标的拾取器
- ✅ 配置等待时长的滑块
- ✅ 设置循环的逻辑组件

---

#### 场景 B：微信自动化
```
用户目标：自动发送消息给好友

用户自定义步骤：
1. 打开微信应用
2. 等待 2 秒
3. 点击"通讯录"（坐标：300, 100）
4. 点击特定好友（坐标：400, 200）
5. 点击输入框（坐标：300, 800）
6. 输入文本"你好"
7. 点击发送按钮（坐标：900, 800）
8. 等待 1 秒
9. 返回（按键：BACK）
```

**系统不提供**：
- ❌ 预设的微信操作流程
- ❌ 预设的聊天对象
- ❌ 预设的消息内容

**系统提供**：
- ✅ 精确的坐标拾取
- ✅ 文本输入功能
- ✅ 系统按键功能
- ✅ 步骤顺序控制

---

#### 场景 C：数据采集自动化
```
用户目标：自动采集应用中的数据

用户自定义步骤：
1. 打开目标应用
2. 滚动到指定位置（滑动：200,800 → 200,200）
3. 截图保存
4. 点击第一个数据项（坐标：300, 400）
5. 等待 1 秒
6. 截图保存
7. 返回（按键：BACK）
8. 点击第二个数据项（坐标：300, 500）
9. 重复步骤 5-8（直到列表末尾）
```

**系统不提供**：
- ❌ 预设的数据采集模板
- ❌ 预设的滚动策略
- ❌ 预设的截图规则

**系统提供**：
- ✅ 滑动操作配置
- ✅ 截图功能调用
- ✅ 循环条件设置
- ✅ 步骤跳转逻辑

---

## 🎯 核心功能设计

### 1. 空白任务创建

**创建流程**：
```
用户点击"新建任务"
   ↓
弹出命名对话框
   ↓
用户输入任务名称（必填）
   ↓
用户输入描述（可选）
   ↓
创建成功 → 进入空白编辑界面
   ↓
显示提示："从添加第一个步骤开始"
```

**界面状态**：
```vue
<template>
    <div class="empty-task-state">
        <icon-empty />
        <h3>暂无操作步骤</h3>
        <p>从零开始定义您的自动化流程</p>
        <a-button type="primary" @click="addFirstStep">
            <template #icon><icon-plus /></template>
            添加第一个步骤
        </a-button>
        
        <div class="tips">
            <h4>💡 使用建议</h4>
            <ul>
                <li>第一步通常是"打开应用"</li>
                <li>使用"等待"步骤确保页面加载完成</li>
                <li>使用屏幕拾取器精确定位点击位置</li>
                <li>复杂流程可以添加循环和条件判断</li>
            </ul>
        </div>
    </div>
</template>
```

---

### 2. 步骤类型工具箱

**完全由用户选择**，系统只提供工具：

```vue
<div class="step-toolbox">
    <h4>选择操作类型</h4>
    
    <!-- 基础操作 -->
    <div class="toolbox-section">
        <h5>基础操作</h5>
        <div class="toolbox-grid">
            <div class="toolbox-item" @click="addStep('tap')">
                <icon-tap />
                <span>点击</span>
                <small>在指定位置点击</small>
            </div>
            <div class="toolbox-item" @click="addStep('swipe')">
                <icon-swipe />
                <span>滑动</span>
                <small>从一个位置滑动到另一个位置</small>
            </div>
            <div class="toolbox-item" @click="addStep('input')">
                <icon-input />
                <span>输入</span>
                <small>输入文本内容</small>
            </div>
            <div class="toolbox-item" @click="addStep('wait')">
                <icon-wait />
                <span>等待</span>
                <small>等待指定时长</small>
            </div>
        </div>
    </div>
    
    <!-- 高级操作 -->
    <div class="toolbox-section">
        <h5>高级操作</h5>
        <div class="toolbox-grid">
            <div class="toolbox-item" @click="addStep('keyevent')">
                <icon-keyboard />
                <span>按键</span>
                <small>执行系统按键（HOME/BACK 等）</small>
            </div>
            <div class="toolbox-item" @click="addStep('longPress')">
                <icon-press />
                <span>长按</span>
                <small>长按指定位置</small>
            </div>
            <div class="toolbox-item" @click="addStep('screenshot')">
                <icon-camera />
                <span>截图</span>
                <small>保存当前屏幕截图</small>
            </div>
            <div class="toolbox-item" @click="addStep('image')">
                <icon-image />
                <span>图像识别</span>
                <small>识别并点击图像</small>
            </div>
        </div>
    </div>
    
    <!-- 流程控制 -->
    <div class="toolbox-section">
        <h5>流程控制</h5>
        <div class="toolbox-grid">
            <div class="toolbox-item" @click="addStep('loop')">
                <icon-loop />
                <span>循环</span>
                <small>重复执行指定步骤</small>
            </div>
            <div class="toolbox-item" @click="addStep('condition')">
                <icon-branch />
                <span>条件</span>
                <small>根据条件执行不同分支</small>
            </div>
        </div>
    </div>
</div>
```

**设计要点**：
- 按功能分类组织
- 每个类型都有清晰的图标和说明
- 用户完全自主选择
- 不推荐、不引导、不预设

---

### 3. 完全自定义配置

**每个步骤的配置都由用户决定**：

#### 点击步骤配置
```vue
<div class="step-config">
    <h4>配置点击操作</h4>
    
    <!-- 坐标获取方式由用户选择 -->
    <a-form-item label="坐标获取方式">
        <a-radio-group v-model="coordMethod">
            <a-radio value="picker">屏幕拾取器</a-radio>
            <a-radio value="manual">手动输入</a-radio>
            <a-radio value="image">图像识别定位</a-radio>
        </a-radio-group>
    </a-form-item>
    
    <!-- 如果选择屏幕拾取器 -->
    <div v-if="coordMethod === 'picker'">
        <ScreenPicker @position-selected="onPositionSelected" />
    </div>
    
    <!-- 如果选择手动输入 -->
    <div v-if="coordMethod === 'manual'">
        <a-row :gutter="16">
            <a-col :span="12">
                <a-input-number v-model="config.x" placeholder="X 坐标" />
            </a-col>
            <a-col :span="12">
                <a-input-number v-model="config.y" placeholder="Y 坐标" />
            </a-col>
        </a-row>
    </div>
    
    <!-- 如果选择图像识别定位 -->
    <div v-if="coordMethod === 'image'">
        <a-upload accept="image/*">
            <a-button>上传模板图像</a-button>
        </a-upload>
        <a-input-number v-model="config.threshold" placeholder="识别阈值" />
    </div>
    
    <!-- 高级选项（可选） -->
    <a-collapse>
        <a-collapse-panel header="高级选项" key="advanced">
            <a-form-item label="点击次数">
                <a-input-number v-model="config.tapCount" :min="1" />
            </a-form-item>
            <a-form-item label="点击间隔 (ms)">
                <a-input-number v-model="config.tapInterval" />
            </a-form-item>
        </a-collapse-panel>
    </a-collapse>
</div>
```

**设计要点**：
- 提供多种实现方式，用户自行选择
- 基础配置必填，高级配置可选
- 不预设任何值（除了安全的最小/最大值）
- 用户明确知道每一步的配置

---

### 4. 流程控制自定义

**循环和条件完全由用户定义**：

#### 循环配置
```vue
<div class="loop-config">
    <h4>配置循环</h4>
    
    <!-- 循环类型由用户选择 -->
    <a-form-item label="循环类型">
        <a-select v-model="loopType">
            <a-select-option value="fixed">固定次数</a-select-option>
            <a-select-option value="condition">条件循环</a-select-option>
            <a-select-option value="infinite">无限循环（手动停止）</a-select-option>
        </a-select>
    </a-form-item>
    
    <!-- 固定次数 -->
    <div v-if="loopType === 'fixed'">
        <a-form-item label="循环次数">
            <a-input-number v-model="loopCount" :min="1" :max="1000" />
        </a-form-item>
    </div>
    
    <!-- 条件循环 -->
    <div v-if="loopType === 'condition'">
        <a-form-item label="结束条件">
            <a-select v-model="conditionType">
                <a-select-option value="image">图像消失</a-select-option>
                <a-select-option value="text">文本出现</a-select-option>
                <a-select-option value="element">元素出现</a-select-option>
            </a-select>
        </a-form-item>
        <a-form-item label="最大循环次数">
            <a-input-number v-model="maxLoops" placeholder="防止死循环" />
        </a-form-item>
    </div>
    
    <!-- 循环体（用户添加的步骤） -->
    <div class="loop-body">
        <h5>循环内的操作</h5>
        <StepList :steps="loopSteps" />
        <a-button @click="addLoopStep">
            <template #icon><icon-plus /></template>
            添加循环内步骤
        </a-button>
    </div>
</div>
```

#### 条件分支配置
```vue
<div class="condition-config">
    <h4>配置条件分支</h4>
    
    <!-- 条件类型由用户选择 -->
    <a-form-item label="判断条件">
        <a-select v-model="conditionType">
            <a-select-option value="image">图像是否存在</a-select-option>
            <a-select-option value="text">文本是否匹配</a-select-option>
            <a-select-option value="color">颜色是否匹配</a-select-option>
        </a-select>
    </a-form-item>
    
    <!-- 条件参数 -->
    <a-form-item label="条件参数">
        <!-- 根据条件类型显示不同配置 -->
        <template v-if="conditionType === 'image'">
            <a-upload accept="image/*">
                <a-button>上传模板图像</a-button>
            </a-upload>
        </template>
        <template v-if="conditionType === 'text'">
            <a-input v-model="conditionText" placeholder="输入要匹配的文本" />
        </template>
    </a-form-item>
    
    <!-- 分支操作 -->
    <div class="condition-branches">
        <div class="branch">
            <h5>如果条件为真（True）</h5>
            <StepList :steps="trueBranchSteps" />
            <a-button @click="addTrueBranchStep">
                <template #icon><icon-plus /></template>
                添加步骤
            </a-button>
        </div>
        
        <a-divider>否则（False）</a-divider>
        
        <div class="branch">
            <h5>如果条件为假（False）</h5>
            <StepList :steps="falseBranchSteps" />
            <a-button @click="addFalseBranchStep">
                <template #icon><icon-plus /></template>
                添加步骤
            </a-button>
        </div>
    </div>
</div>
```

---

### 5. 数据输入完全自定义

**所有数据都由用户提供**：

```vue
<div class="data-input-section">
    <h4>数据输入</h4>
    
    <!-- 方式 1：硬编码 -->
    <a-form-item label="输入方式">
        <a-radio-group v-model="inputMethod">
            <a-radio value="hardcoded">直接输入</a-radio>
            <a-radio value="variable">使用变量</a-radio>
            <a-radio value="file">从文件读取</a-radio>
            <a-radio value="api">从 API 获取</a-radio>
        </a-radio-group>
    </a-form-item>
    
    <!-- 直接输入 -->
    <div v-if="inputMethod === 'hardcoded'">
        <a-textarea
            v-model="inputText"
            placeholder="输入要输入的文本"
            :auto-size="{ minRows: 3 }"
        />
    </div>
    
    <!-- 使用变量 -->
    <div v-if="inputMethod === 'variable'">
        <a-select v-model="selectedVariable" placeholder="选择变量">
            <a-select-option
                v-for="variable in variables"
                :key="variable.name"
                :value="variable.name"
            >
                {{ variable.name }} ({{ variable.type }})
            </a-select-option>
        </a-select>
        <a-button @click="createVariable">
            <template #icon><icon-plus /></template>
            新建变量
        </a-button>
    </div>
    
    <!-- 从文件读取 -->
    <div v-if="inputMethod === 'file'">
        <a-upload :file-list="inputFiles">
            <a-button>选择文件</a-button>
        </a-upload>
        <small>支持 TXT、CSV 格式</small>
    </div>
    
    <!-- 从 API 获取 -->
    <div v-if="inputMethod === 'api'">
        <a-input v-model="apiUrl" placeholder="输入 API 地址" />
        <a-input v-model="apiParam" placeholder="参数名" />
    </div>
</div>
```

---

## 🎯 用户体验设计

### 1. 引导而不预设

**好的引导**：
```
💡 提示：
这是您的第一个步骤
通常第一步是打开要操作的应用

[选择操作类型]
```

**不好的预设**：
```
❌ 已为您添加：
Step 1: 打开微信（预设）
Step 2: 点击发现（预设）
Step 3: 点击小程序（预设）
```

---

### 2. 提示而不强制

**使用场景提示**：
```vue
<div class="context-tips">
    <h4>💡 使用建议</h4>
    
    <div class="tip-item">
        <icon-info />
        <span>添加应用启动步骤后，建议等待 2-3 秒确保应用完全加载</span>
    </div>
    
    <div class="tip-item">
        <icon-info />
        <span>使用屏幕拾取器可以精确定位点击位置</span>
    </div>
    
    <div class="tip-item">
        <icon-info />
        <span>复杂操作建议使用循环和条件判断</span>
    </div>
</div>
```

**设计原则**：
- ✅ 提供建议，但不强制
- ✅ 说明原因，让用户理解
- ✅ 用户可以选择忽略

---

### 3. 验证而不阻止

**验证提示**：
```vue
<div class="validation-warning">
    <icon-exclamation-circle />
    <div class="warning-content">
        <h4>发现以下问题</h4>
        <ul>
            <li>步骤 1 缺少点击坐标配置</li>
            <li>步骤 3 的等待时间为 0</li>
            <li>未选择目标应用</li>
        </ul>
        <p>这些问题可能导致执行失败，您确定要继续吗？</p>
        <div class="warning-actions">
            <a-button @click="fixIssues">修复问题</a-button>
            <a-button status="primary" @click="confirmExecute">
                仍要执行
            </a-button>
        </div>
    </div>
</div>
```

**设计要点**：
- 明确指出问题
- 说明可能的后果
- 让用户做最终决定
- 提供快速修复入口

---

### 4. 记录而不限制

**历史记录**：
```vue
<div class="history-panel">
    <h4>最近操作</h4>
    
    <div class="history-list">
        <div class="history-item" v-for="item in recentActions">
            <span class="time">{{ item.timestamp }}</span>
            <span class="action">{{ item.description }}</span>
            <a-button size="mini" @click="reuseAction(item)">
                重用
            </a-button>
        </div>
    </div>
    
    <small>
        💡 点击"重用"可以快速添加类似操作
        <br>
        但这只是快捷方式，您可以完全自定义配置
    </small>
</div>
```

**设计要点**：
- 记录历史操作方便复用
- 但明确说明这是"快捷方式"
- 用户可以修改所有参数
- 不限制只能使用历史记录

---

## 📊 数据结构设计

### 完全自定义的任务结构

```typescript
interface Task {
    id: string;
    name: string;  // 用户自定义
    description?: string;  // 用户自定义
    appId?: string;  // 用户选择
    deviceId?: string;  // 用户选择
    
    // 步骤序列 - 完全由用户定义
    steps: Step[];
    
    // 执行配置 - 完全由用户设置
    config: {
        speed: number;
        timeout: number;
        continueOnError: boolean;
        // ... 所有配置都由用户决定
    };
    
    // 变量定义 - 用户自定义
    variables: Variable[];
    
    // 元数据
    createdAt: number;
    updatedAt: number;
    createdBy: string;
}

interface Step {
    id: string;
    type: StepType;  // 用户选择类型
    config: any;  // 用户配置参数
    name?: string;  // 用户自定义名称
    note?: string;  // 用户自定义备注
    
    // 流程控制（可选）
    loop?: LoopConfig;  // 用户定义循环
    condition?: ConditionConfig;  // 用户定义条件
    
    // 执行结果（运行时填充）
    executed?: boolean;
    executedAt?: number;
    result?: any;
}

// 所有配置都没有默认值（除了安全相关的）
interface TapConfig {
    x?: number;  // 必填，无默认值
    y?: number;  // 必填，无默认值
    method: 'picker' | 'manual' | 'image';  // 用户选择
    threshold?: number;  // 仅 image 方法需要
}

interface WaitConfig {
    duration?: number;  // 用户自定义，无默认值
    condition?: string;  // 可选
    timeout?: number;  // 用户自定义，无默认值
}
```

---

## ✅ 设计验收清单

### 零预设原则

- [x] 不预设任何操作步骤
- [x] 不预设任何操作流程
- [x] 不预设任何应用配置
- [x] 不预设任何循环条件
- [x] 不预设任何数据输入

### 完全自定义

- [x] 用户自定义所有步骤
- [x] 用户自定义所有参数
- [x] 用户自定义所有流程
- [x] 用户自定义所有条件
- [x] 用户自定义所有数据

### 引导而不强制

- [x] 提供使用建议
- [x] 提供操作提示
- [x] 提供快捷方式
- [x] 提供历史记录
- [x] 但不强制使用

### 验证而不阻止

- [x] 验证配置完整性
- [x] 提示潜在问题
- [x] 说明可能后果
- [x] 让用户最终决定
- [x] 提供快速修复

---

## 🎯 总结

### 核心理念

**零预设操作，用户自定义一切**

1. ❌ **不做预设** - 不预设任何操作流程
2. ✅ **提供工具** - 提供完整的操作工具集
3. ✅ **引导使用** - 提供建议但不强制
4. ✅ **完全掌控** - 用户定义每一个步骤

### 用户价值

1. **灵活性** - 适应任何使用场景
2. **可控性** - 完全掌控自动化流程
3. **可理解** - 清楚每一步的作用
4. **可扩展** - 随时添加新的操作

### 技术实现

1. **空白画布** - 初始状态完全空白
2. **工具箱** - 提供所有必需的操作类型
3. **配置器** - 每个操作都可详细配置
4. **验证器** - 验证但不阻止执行

---

**文档版本**：v1.0  
**创建时间**：2024-01-15  
**状态**：✅ 设计完成
