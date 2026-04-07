<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useAutomationStore } from '../../store/modules/automation';
import { Dialog } from '../../lib/dialog';
import RecorderPanel from './RecorderPanel.vue';
import StepEditor from './StepEditor.vue';
import PlaybackPanel from './PlaybackPanel.vue';
import StepConfigPanel from './StepConfigPanel.vue';
import DeviceMirror from './DeviceMirror.vue';

const automationStore = useAutomationStore();

const activeTab = ref('editor');
const showNewTaskModal = ref(false);
const newTaskName = ref('');
const newTaskDescription = ref('');
const showRightPanel = ref(true);
const deviceMirrorRef = ref<InstanceType<typeof DeviceMirror> | null>(null);

const tasks = computed(() => automationStore.tasks);
const selectedTask = computed(() => automationStore.selectedTask);

// 快捷键处理
const handleKeydown = (e: KeyboardEvent) => {
    // Ctrl + N - 新建任务
    if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        showNewTaskModal.value = true;
    }
    
    // Ctrl + S - 保存任务
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        automationStore.saveTask();
        Dialog.tipSuccess('任务已保存');
    }
    
    // Delete - 删除步骤
    if (e.key === 'Delete' && automationStore.uiState.selectedStepId) {
        const stepId = automationStore.uiState.selectedStepId;
        automationStore.deleteStep(stepId);
        automationStore.setSelectedStepId(null);
    }
    
    // F5 - 刷新设备列表
    if (e.key === 'F5') {
        e.preventDefault();
        // TODO: 刷新设备列表
    }
    
    // F9 - 开始/停止录制
    if (e.key === 'F9') {
        e.preventDefault();
        // TODO: 切换录制状态
    }
    
    // F5 (回放时) - 开始执行
    if (e.key === 'F5' && activeTab.value === 'playback') {
        e.preventDefault();
        // TODO: 开始执行
    }
};

onMounted(() => {
    window.addEventListener('keydown', handleKeydown);
    
    // 监听录制状态变化，通知 DeviceMirror 组件
    watch(() => automationStore.isRecording, (newVal) => {
        if (deviceMirrorRef.value) {
            deviceMirrorRef.value.setRecording(newVal);
        }
    });
});

onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown);
});

// 创建新任务
const createTask = () => {
    if (!newTaskName.value.trim()) {
        Dialog.tipError('请输入任务名称');
        return;
    }
    
    automationStore.createTask(newTaskName.value, newTaskDescription.value || undefined);
    showNewTaskModal.value = false;
    newTaskName.value = '';
    newTaskDescription.value = '';
    
    Dialog.tipSuccess('任务创建成功');
};

// 删除任务
const deleteTask = (taskId: string) => {
    Dialog.confirm({
        content: '确定要删除这个任务吗？',
        onOk: () => {
            automationStore.deleteTask(taskId);
        }
    });
};
</script>

<template>
    <div class="automation-page">
        <!-- 顶部工具栏 -->
        <div class="page-header">
            <div class="header-left">
                <h2>{{ $t('automation.title') }}</h2>
            </div>
            <div class="header-right">
                <a-button
                    size="small"
                    @click="showRightPanel = !showRightPanel"
                >
                    <template #icon>
                        <icon-apps v-if="!showRightPanel" />
                        <icon-close v-else />
                    </template>
                    {{ showRightPanel ? '隐藏属性' : '显示属性' }}
                </a-button>
                <a-button type="primary" @click="showNewTaskModal = true" style="margin-left: 12px">
                    <template #icon><icon-plus /></template>
                    新建任务
                </a-button>
            </div>
        </div>
        
        <div class="page-content">
            <!-- 左侧任务列表 -->
            <div class="task-list-panel">
                <div class="task-list-header">
                    <h3>任务列表</h3>
                    <a-badge :count="tasks.length" />
                </div>
                
                <div class="task-list">
                    <div
                        v-for="task in tasks"
                        :key="task.id"
                        class="task-item"
                        :class="{ active: automationStore.selectedTaskId === task.id }"
                        @click="automationStore.selectTask(task.id)"
                    >
                        <div class="task-info">
                            <div class="task-name">{{ task.name }}</div>
                            <div class="task-meta">
                                <span>{{ task.steps.length }}步</span>
                            </div>
                        </div>
                        <a-dropdown trigger="contextMenu">
                            <a-button size="mini" @click.stop>
                                <template #icon><icon-more /></template>
                            </a-button>
                            <template #content>
                                <a-doption @click="deleteTask(task.id)">
                                    <template #icon><icon-delete /></template>
                                    删除
                                </a-doption>
                            </template>
                        </a-dropdown>
                    </div>
                    
                    <div class="empty-state" v-if="tasks.length === 0">
                        <icon-empty />
                        <p>暂无任务</p>
                        <small>点击"新建任务"开始创建</small>
                    </div>
                </div>
            </div>
            
            <!-- 中间工作区 -->
            <div class="workspace">
                <!-- 标签页 -->
                <div class="workspace-tabs">
                    <div class="tabs-wrapper">
                        <a-tabs v-model="activeTab" type="rounded">
                            <a-tab-pane key="recorder" title="录制">
                                <RecorderPanel />
                            </a-tab-pane>
                            <a-tab-pane key="editor" title="编排">
                                <StepEditor />
                            </a-tab-pane>
                            <a-tab-pane key="playback" title="回放">
                                <PlaybackPanel />
                            </a-tab-pane>
                        </a-tabs>
                    </div>
                </div>
            </div>
            
            <!-- 右侧面板（录制时显示投屏，否则显示属性配置） -->
            <div class="config-panel" v-if="showRightPanel || automationStore.isRecording">
                <div class="config-panel-header">
                    <h3 v-if="!automationStore.isRecording">属性配置</h3>
                    <h3 v-else>设备投屏</h3>
                    <a-button 
                        v-if="!automationStore.isRecording"
                        size="mini" 
                        @click="showRightPanel = false"
                    >
                        <template #icon><icon-close /></template>
                    </a-button>
                </div>
                
                <!-- 录制时显示投屏画面 -->
                <div v-if="automationStore.isRecording" class="mirror-wrapper">
                    <DeviceMirror 
                        ref="deviceMirrorRef"
                        :deviceId="automationStore.recording.deviceId"
                    />
                </div>
                
                <!-- 否则显示属性配置 -->
                <StepConfigPanel v-else />
            </div>
        </div>
        
        <!-- 新建任务对话框 -->
        <a-modal
            v-model:visible="showNewTaskModal"
            title="新建自动化任务"
            width="500px"
            @ok="createTask"
        >
            <a-form layout="vertical">
                <a-form-item
                    label="任务名称"
                    required
                    :rules="[{ required: true, message: '请输入任务名称' }]"
                >
                    <a-input
                        v-model="newTaskName"
                        placeholder="给任务起个名字"
                        allow-clear
                    />
                </a-form-item>
                
                <a-form-item label="任务描述">
                    <a-textarea
                        v-model="newTaskDescription"
                        placeholder="描述这个任务的作用（可选）"
                        :auto-size="{ minRows: 3 }"
                    />
                </a-form-item>
                
                <a-alert
                    type="info"
                    show-icon
                    message="提示"
                    description="创建任务后，您可以通过录制或手动编排的方式添加操作步骤"
                />
            </a-form>
        </a-modal>
    </div>
</template>

<style scoped lang="less">
.automation-page {
    height: 100%;
    display: flex;
    flex-direction: column;
    background: var(--color-bg);
    
    .page-header {
        height: 60px;
        padding: 0 20px;
        border-bottom: 1px solid var(--color-border);
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: var(--color-bg-card);
        
        .header-left {
            h2 {
                margin: 0;
                font-size: 18px;
            }
        }
    }
    
    .page-content {
        flex: 1;
        display: flex;
        overflow: hidden;
        
        .task-list-panel {
            width: 300px;
            border-right: 1px solid var(--color-border);
            display: flex;
            flex-direction: column;
            background: var(--color-bg-card);
            
            .task-list-header {
                padding: 16px 20px;
                border-bottom: 1px solid var(--color-border);
                display: flex;
                align-items: center;
                justify-content: space-between;
                
                h3 {
                    margin: 0;
                    font-size: 14px;
                }
            }
            
            .task-list {
                flex: 1;
                overflow-y: auto;
                padding: 12px;
                
                .task-item {
                    padding: 12px 16px;
                    margin-bottom: 8px;
                    background: var(--color-bg-hover);
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    
                    &:hover {
                        background: var(--color-bg-active);
                    }
                    
                    &.active {
                        background: var(--color-primary-light);
                        border: 1px solid var(--color-primary);
                    }
                    
                    .task-info {
                        flex: 1;
                        
                        .task-name {
                            font-size: 14px;
                            font-weight: 500;
                            margin-bottom: 4px;
                        }
                        
                        .task-meta {
                            font-size: 12px;
                            color: var(--color-text-secondary);
                        }
                    }
                }
                
                .empty-state {
                    height: 200px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    color: var(--color-text-disabled);
                    text-align: center;
                    
                    :deep(.icon-empty) {
                        font-size: 48px;
                        margin-bottom: 12px;
                    }
                    
                    p {
                        margin: 0 0 8px 0;
                        font-size: 14px;
                    }
                    
                    small {
                        font-size: 12px;
                    }
                }
            }
        }
        
        .workspace {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            
            .workspace-tabs {
                padding: 12px 20px 0;
                background: var(--color-bg-card);
                border-bottom: 1px solid var(--color-border);
                width: 100%;
                
                .tabs-wrapper {
                    flex: 1;
                    
                    :deep(.arco-tabs) {
                        height: 100%;
                        
                        .arco-tabs-nav {
                            padding: 0 0 12px 0;
                        }
                        
                        .arco-tabs-content {
                            height: calc(100% - 50px);
                            overflow: hidden;
                        }
                        
                        .arco-tabs-pane {
                            height: 100%;
                        }
                    }
                }
            }
        }
        
        .config-panel {
            width: 400px;
            border-left: 1px solid var(--color-border);
            display: flex;
            flex-direction: column;
            background: var(--color-bg-card);
            height: 100%;
            
            .mirror-wrapper {
                flex: 1;
                overflow: hidden;
                min-height: 0;
            }
            
            .config-panel-header {
                padding: 16px 20px;
                border-bottom: 1px solid var(--color-border);
                display: flex;
                justify-content: space-between;
                align-items: center;
                
                h3 {
                    margin: 0;
                    font-size: 14px;
                }
            }
        }
    }
}
</style>
