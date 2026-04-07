<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAutomationStore } from '../../store/modules/automation';
import { Dialog } from '../../lib/dialog';
import { t } from '../../lang';

const automationStore = useAutomationStore();
const tasks = computed(() => automationStore.tasks);
const selectedTaskId = ref('');

const isPlaying = computed(() => automationStore.isPlaying);
const progress = computed(() => automationStore.playback.progress);

// 开始执行
const startPlayback = async () => {
    if (!selectedTaskId.value) {
        Dialog.tipError('请选择任务');
        return;
    }
    
    try {
        automationStore.startPlayback(selectedTaskId.value);
        
        // TODO: 调用底层回放 API
        // const result = await window.$mapi.playback.play(...)
        
        Dialog.tipSuccess('任务执行完成');
    } catch (error: any) {
        Dialog.tipError(`执行失败：${error.message}`);
    } finally {
        automationStore.stopPlayback();
    }
};

// 暂停/恢复
const togglePause = () => {
    if (automationStore.playback.isPaused) {
        automationStore.resumePlayback();
    } else {
        automationStore.pausePlayback();
    }
};

// 停止
const stopPlayback = () => {
    automationStore.stopPlayback();
    Dialog.tipSuccess('已停止执行');
};

// 格式化时间
const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};
</script>

<template>
    <div class="playback-panel">
        <!-- 任务选择 -->
        <div class="task-selector">
            <a-form layout="vertical">
                <a-form-item :label="$t('automation.selectTask')">
                    <a-select
                        v-model="selectedTaskId"
                        :placeholder="$t('automation.selectTaskPlaceholder')"
                        :disabled="isPlaying"
                    >
                        <a-select-option
                            v-for="task in tasks"
                            :key="task.id"
                            :value="task.id"
                        >
                            {{ task.name }} ({{ task.steps.length }}步)
                        </a-select-option>
                    </a-select>
                </a-form-item>
            </a-form>
        </div>
        
        <!-- 执行控制 -->
        <div class="playback-controls">
            <a-button
                v-if="!isPlaying"
                type="primary"
                long
                @click="startPlayback"
                :disabled="!selectedTaskId"
            >
                <template #icon><icon-play /></template>
                {{ $t('automation.startPlayback') }}
            </a-button>
            
            <div v-else class="playing-controls">
                <a-button
                    status="warning"
                    @click="togglePause"
                >
                    <template #icon>
                        <icon-pause v-if="!automationStore.playback.isPaused" />
                        <icon-play v-else />
                    </template>
                    {{ automationStore.playback.isPaused ? '继续' : '暂停' }}
                </a-button>
                
                <a-button
                    status="danger"
                    @click="stopPlayback"
                >
                    <template #icon><icon-stop /></template>
                    停止
                </a-button>
            </div>
        </div>
        
        <!-- 进度显示 -->
        <div class="progress-display" v-if="isPlaying">
            <a-progress
                :percent="progress.percentage"
                :status="progress.percentage === 100 ? 'success' : 'normal'"
            />
            
            <div class="progress-info">
                <span>步骤：{{ progress.currentStep }} / {{ progress.totalSteps }}</span>
                <span>时间：{{ formatTime(progress.elapsed) }}</span>
            </div>
        </div>
        
        <!-- 执行日志 -->
        <div class="execution-log">
            <h4>执行日志</h4>
            <div class="log-list">
                <div class="log-item info">
                    <span class="log-time">00:00</span>
                    <span class="log-message">准备执行任务...</span>
                </div>
                <!-- TODO: 实时日志 -->
            </div>
        </div>
    </div>
</template>

<style scoped lang="less">
.playback-panel {
    padding: 20px;
    height: 100%;
    display: flex;
    flex-direction: column;
    
    .task-selector {
        margin-bottom: 20px;
    }
    
    .playback-controls {
        margin-bottom: 20px;
        
        .playing-controls {
            display: flex;
            gap: 12px;
        }
    }
    
    .progress-display {
        margin-bottom: 20px;
        
        .progress-info {
            display: flex;
            justify-content: space-between;
            margin-top: 8px;
            font-size: 12px;
            color: var(--color-text-secondary);
        }
    }
    
    .execution-log {
        flex: 1;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        
        h4 {
            margin: 0 0 12px 0;
            font-size: 14px;
            color: var(--color-text-secondary);
        }
        
        .log-list {
            flex: 1;
            overflow-y: auto;
            background: var(--color-bg-hover);
            border-radius: 8px;
            padding: 12px;
        }
        
        .log-item {
            display: flex;
            gap: 12px;
            padding: 8px;
            margin-bottom: 8px;
            font-size: 12px;
            
            &.info {
                color: var(--color-text);
            }
            
            &.success {
                color: var(--color-success);
            }
            
            &.error {
                color: var(--color-danger);
            }
            
            .log-time {
                font-family: monospace;
                color: var(--color-text-disabled);
            }
        }
    }
}
</style>
