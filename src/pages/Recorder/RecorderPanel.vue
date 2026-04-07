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
            updateStatus();
        }, 1000);
        
        Dialog.tipSuccess(t('recorder.started'));
    } catch (error: any) {
        Dialog.tipError(t('recorder.startFailed') + ': ' + error.message);
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
    } catch (error: any) {
        Dialog.tipError(t('recorder.stopFailed') + ': ' + error.message);
    }
};

const updateStatus = async () => {
    try {
        const status = await window.$mapi.recorder.getRecordingStatus();
        actionCount.value = status.actionCount;
    } catch (error) {
        console.error('Failed to get recorder status:', error);
    }
};

const saveScript = async (script: any) => {
    // TODO: 实现脚本保存逻辑
    console.log('Save script:', script);
    // 这里可以打开保存对话框，或者自动保存到默认位置
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
    
    .recorder-action-list {
        h4 {
            margin-bottom: 10px;
        }
        
        .action-list {
            max-height: 300px;
            overflow-y: auto;
            
            .action-item {
                display: flex;
                justify-content: space-between;
                padding: 8px;
                border-bottom: 1px solid var(--color-border);
                
                .action-type {
                    font-weight: bold;
                }
                
                .action-time {
                    color: var(--color-text-2);
                    font-size: 12px;
                }
            }
        }
    }
}
</style>
