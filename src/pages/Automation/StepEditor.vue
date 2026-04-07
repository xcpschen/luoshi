<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAutomationStore } from '../../store/modules/automation';
import type { StepType, StepConfig, Step } from '../../types/Automation';

const automationStore = useAutomationStore();
const editingTask = computed(() => automationStore.editingTask);
const steps = computed(() => editingTask.value?.steps || []);

// 工具箱
const toolboxVisible = ref(false);
const currentTool = ref<StepType | null>(null);

// 步骤类型图标
const stepTypeIcons: Record<StepType, string> = {
    tap: 'icon-tap',
    swipe: 'icon-swipe',
    input: 'icon-input',
    wait: 'icon-wait',
    keyevent: 'icon-keyboard',
    longPress: 'icon-press',
    image: 'icon-image',
    screenshot: 'icon-camera',
};

// 步骤类型名称
const stepTypeNames: Record<StepType, string> = {
    tap: '点击',
    swipe: '滑动',
    input: '输入',
    wait: '等待',
    keyevent: '按键',
    longPress: '长按',
    image: '图像识别',
    screenshot: '截图',
};

// 添加步骤
const addStep = (type: StepType) => {
    const config: StepConfig = getDefaultConfig(type);
    automationStore.addStep(type, config);
    toolboxVisible.value = false;
};

// 获取默认配置
const getDefaultConfig = (type: StepType): StepConfig => {
    switch (type) {
        case 'tap':
            return { x: 0, y: 0 };
        case 'swipe':
            return { x1: 0, y1: 0, x2: 0, y2: 0, duration: 300 };
        case 'input':
            return { text: '', inputMethod: 'adb' };
        case 'wait':
            return { waitDuration: 1000 };
        case 'keyevent':
            return { keycode: 4 }; // BACK
        case 'longPress':
            return { x: 0, y: 0, duration: 1000 };
        case 'image':
            return { threshold: 0.8, imageAction: 'tap' };
        case 'screenshot':
            return {};
        default:
            return {};
    }
};

// 删除步骤
const deleteStep = (index: number) => {
    if (!editingTask.value?.steps) return;
    const step = editingTask.value.steps[index];
    automationStore.deleteStep(step.id);
};

// 编辑步骤
const editStep = (step: Step) => {
    automationStore.setSelectedStepId(step.id);
    // TODO: 打开属性面板
};

// 获取步骤描述
const getStepDescription = (step: Step) => {
    switch (step.type) {
        case 'tap':
            return `点击 (${step.config.x}, ${step.config.y})`;
        case 'swipe':
            return `滑动 (${step.config.x1},${step.config.y1} → ${step.config.x2},${step.config.y2})`;
        case 'input':
            return `输入 "${step.config.text}"`;
        case 'wait':
            return `等待 ${(step.config.waitDuration || 1000) / 1000}秒`;
        case 'keyevent':
            return `按键 (代码：${step.config.keycode})`;
        case 'longPress':
            return `长按 (${step.config.x}, ${step.config.y})`;
        case 'image':
            return '图像识别';
        case 'screenshot':
            return '截图';
        default:
            return step.type;
    }
};

// 拖拽排序
const onDragEnd = (result: any) => {
    if (!result.destination) return;
    automationStore.reorderSteps(result.source.index, result.destination.index);
};
</script>

<template>
    <div class="step-editor">
        <!-- 工具栏 -->
        <div class="toolbar">
            <a-button type="primary" @click="toolboxVisible = !toolboxVisible">
                <template #icon><icon-plus /></template>
                添加步骤
            </a-button>
            
            <a-divider direction="vertical" />
            
            <a-button @click="automationStore.saveTask">
                <template #icon><icon-save /></template>
                保存
            </a-button>
        </div>
        
        <!-- 步骤列表 -->
        <div class="step-list">
            <draggable
                v-model="steps"
                item-key="id"
                handle=".drag-handle"
                @end="onDragEnd"
                class="draggable-list"
            >
                <template #item="{ element, index }">
                    <div
                        class="step-item"
                        :class="{ 
                            active: automationStore.uiState.selectedStepId === element.id 
                        }"
                        @click="editStep(element)"
                    >
                        <!-- 拖拽手柄 -->
                        <div class="drag-handle">
                            <icon-drag-dot />
                        </div>
                        
                        <!-- 步骤序号 -->
                        <div class="step-index">{{ index + 1 }}</div>
                        
                        <!-- 步骤类型图标 -->
                        <div class="step-type-icon">
                            <component :is="stepTypeIcons[element.type]" />
                        </div>
                        
                        <!-- 步骤描述 -->
                        <div class="step-description">
                            <div class="step-title">
                                {{ stepTypeNames[element.type] }}
                            </div>
                            <div class="step-detail">
                                {{ getStepDescription(element) }}
                            </div>
                        </div>
                        
                        <!-- 操作按钮 -->
                        <div class="step-actions">
                            <a-button
                                size="mini"
                                @click.stop="deleteStep(index)"
                            >
                                <template #icon><icon-delete /></template>
                            </a-button>
                        </div>
                    </div>
                </template>
            </draggable>
            
            <!-- 空状态 -->
            <div class="empty-state" v-if="steps.length === 0">
                <icon-empty />
                <p>暂无操作步骤</p>
                <a-button type="primary" @click="toolboxVisible = true">
                    <template #icon><icon-plus /></template>
                    添加第一个步骤
                </a-button>
                <small>💡 提示：点击"添加步骤"开始创建自动化流程</small>
            </div>
        </div>
        
        <!-- 步骤工具箱 -->
        <a-drawer
            v-model:visible="toolboxVisible"
            title="选择操作类型"
            placement="bottom"
            :height="400"
        >
            <div class="toolbox">
                <!-- 常用操作 -->
                <div class="toolbox-section">
                    <h4>常用操作</h4>
                    <div class="toolbox-grid">
                        <div
                            v-for="type in ['tap', 'wait', 'input']"
                            :key="type"
                            class="toolbox-item"
                            @click="addStep(type as StepType)"
                        >
                            <div class="toolbox-icon">
                                <component :is="stepTypeIcons[type as StepType]" />
                            </div>
                            <div class="toolbox-name">
                                {{ stepTypeNames[type as StepType] }}
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 高级操作 -->
                <div class="toolbox-section">
                    <h4>高级操作</h4>
                    <div class="toolbox-grid">
                        <div
                            v-for="type in ['swipe', 'longPress', 'keyevent', 'image', 'screenshot']"
                            :key="type"
                            class="toolbox-item"
                            @click="addStep(type as StepType)"
                        >
                            <div class="toolbox-icon">
                                <component :is="stepTypeIcons[type as StepType]" />
                            </div>
                            <div class="toolbox-name">
                                {{ stepTypeNames[type as StepType] }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </a-drawer>
    </div>
</template>

<style scoped lang="less">
.step-editor {
    height: 100%;
    display: flex;
    flex-direction: column;
    
    .toolbar {
        padding: 16px;
        border-bottom: 1px solid var(--color-border);
    }
    
    .step-list {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        
        .draggable-list {
            min-height: 100%;
        }
        
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
                flex-shrink: 0;
            }
            
            .step-type-icon {
                width: 32px;
                height: 32px;
                border-radius: 8px;
                background: var(--color-bg-hover);
                display: flex;
                align-items: center;
                justify-content: center;
                margin-right: 12px;
                font-size: 16px;
                flex-shrink: 0;
            }
            
            .step-description {
                flex: 1;
                
                .step-title {
                    font-size: 14px;
                    font-weight: 500;
                    margin-bottom: 4px;
                }
                
                .step-detail {
                    font-size: 12px;
                    color: var(--color-text-secondary);
                }
            }
            
            .step-actions {
                margin-left: 12px;
            }
        }
        
        .empty-state {
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: var(--color-text-disabled);
            text-align: center;
            
            :deep(.icon-empty) {
                font-size: 64px;
                margin-bottom: 16px;
            }
            
            p {
                margin: 0 0 16px 0;
                font-size: 14px;
            }
            
            small {
                margin-top: 16px;
                font-size: 12px;
            }
        }
    }
}

.toolbox {
    .toolbox-section {
        margin-bottom: 24px;
        
        h4 {
            margin: 0 0 16px 0;
            font-size: 14px;
            color: var(--color-text-secondary);
        }
        
        .toolbox-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
            
            .toolbox-item {
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 16px;
                background: var(--color-bg-hover);
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s;
                
                &:hover {
                    background: var(--color-primary-light);
                    transform: translateY(-2px);
                }
                
                .toolbox-icon {
                    width: 48px;
                    height: 48px;
                    border-radius: 12px;
                    background: #fff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 8px;
                    font-size: 24px;
                }
                
                .toolbox-name {
                    font-size: 12px;
                    text-align: center;
                }
            }
        }
    }
}
</style>
