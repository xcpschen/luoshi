<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';
import { useAutomationStore } from '../../store/modules/automation';
import { useDeviceUnifiedStore } from '../../store/modules/deviceUnified';
import { useDeviceStore } from '../../store/modules/device';
import { Dialog } from '../../lib/dialog';
import { t } from '../../lang';
import type { Step } from '../../types/Automation';
import type { DeviceUnifiedRecord } from '../../types/DeviceUnified';
import { EnumDeviceStatus } from '../../types/Device';

const props = defineProps<{}>();

console.log('[RecorderPanel] 组件创建');

const automationStore = useAutomationStore();
const deviceUnifiedStore = useDeviceUnifiedStore();
const deviceStore = useDeviceStore();

const isRecording = computed(() => automationStore.isRecording);
const recordedSteps = computed(() => automationStore.recording.steps);
const recordingTime = ref(0);
const selectedDeviceId = ref('');

// 设备列表（使用 computed 确保响应式更新）
const devices = computed(() => deviceUnifiedStore.unifiedDevices);

// 设备选项（用于下拉菜单）
const deviceOptions = computed(() => {
    return devices.value.map(device => ({
        value: device.unifiedId,
        label: `${device.name} (${getDeviceStatusText(device)})`,
        disabled: device.connections.every(conn => conn.status !== EnumDeviceStatus.DEVICE)
    }));
});

// 搜索过滤函数
const filterDeviceOption = (inputValue: string, option: any) => {
    const searchText = inputValue.toLowerCase();
    const label = option.label.toLowerCase();
    return label.includes(searchText);
};

// 页面加载时刷新设备列表
const loadDevices = async () => {
    try {
        await deviceStore.refresh();
        await deviceUnifiedStore.syncDevices(false);
    } catch (error: any) {
        console.error('Failed to load devices:', error);
    }
};

// 刷新设备列表
const refreshDevices = async () => {
    try {
        await deviceStore.refresh();
        await deviceUnifiedStore.syncDevices(true);
        Dialog.tipSuccess('设备列表已刷新');
    } catch (error: any) {
        Dialog.tipError('刷新设备列表失败：' + error.message);
    }
};

// 获取设备状态文本
const getDeviceStatusText = (device: DeviceUnifiedRecord) => {
    const onlineConnections = device.connections.filter(
        conn => conn.status === EnumDeviceStatus.DEVICE
    );
    
    if (onlineConnections.length > 0) {
        return t('device.status.CONNECTED');
    } else {
        return t('device.status.DISCONNECTED');
    }
};

// 页面加载时自动加载设备
loadDevices();

// 开始录制
const startRecording = async () => {
    if (!selectedDeviceId.value) {
        Dialog.tipError(t('device.notSelected'));
        return;
    }
    
    const device = deviceUnifiedStore.unifiedDevices.find(d => d.unifiedId === selectedDeviceId.value);
    if (!device) {
        Dialog.tipError('设备不存在');
        return;
    }
    
    // 复用设备管理页面的判断逻辑：优先查找第一个在线的连接
    const onlineConnection = device.connections.find(
        conn => conn.status === EnumDeviceStatus.DEVICE
    );
    
    if (!onlineConnection) {
        Dialog.tipError('设备未连接');
        return;
    }
    
    // 使用 connection.address 作为 ADB 设备 ID
    const adbDeviceId = onlineConnection.address;
    
    console.log('[Recorder] onlineConnection:', {
        id: onlineConnection.id,
        address: onlineConnection.address,
        type: onlineConnection.type,
        status: onlineConnection.status
    });
    
    if (!adbDeviceId) {
        console.error('[Recorder] ADB 设备 ID 为空！');
        Dialog.tipError('设备连接信息不完整');
        return;
    }
    
    console.log('[Recorder] 开始录制 - 设备 ID:', adbDeviceId);
    console.log('[Recorder] 设备信息:', {
        name: device.name,
        unifiedId: device.unifiedId,
        connectionId: onlineConnection.id,
        connectionAddress: onlineConnection.address,
        status: onlineConnection.status
    });
    
    try {
        automationStore.startRecording(adbDeviceId);
        recordingTime.value = 0;
        
        // @ts-ignore - recorder API exists
        await window.$mapi.recorder.startRecording(adbDeviceId);
        
        Dialog.tipSuccess(t('automation.recordingStarted'));
    } catch (error: any) {
        Dialog.tipError(t('automation.recordingFailed'));
        console.error('Failed to start recording:', error);
    }
};

// 停止录制
const stopRecording = async () => {
    try {
        // @ts-ignore - recorder API exists
        await window.$mapi.recorder.stopRecording();
        
        automationStore.stopRecording();
        
        Dialog.tipSuccess(t('automation.recordingStopped', { count: recordedSteps.value.length }));
    } catch (error: any) {
        Dialog.tipError(t('automation.recordingStopFailed'));
        console.error('Failed to stop recording:', error);
    }
};

// 删除步骤
const removeStep = (index: number) => {
    const steps = [...recordedSteps.value];
    steps.splice(index, 1);
    Dialog.tipSuccess(t('common.deleted'));
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
            return `等待 ${step.config.waitDuration || 1000}ms`;
        case 'keyevent':
            return `按键 (${step.config.keycode})`;
        default:
            return step.type;
    }
};

// 格式化时间
const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// 清理
onUnmounted(() => {
    // 清理工作已在 index.vue 中处理
});
</script>

<template>
    <div class="recorder-panel">
        <!-- 录制控制 -->
        <div class="recorder-header">
                <h3>{{ $t('automation.recorder') }}</h3>
                <a-tag v-if="isRecording" color="red">
                    <icon-loading />
                    {{ $t('automation.recording') }}
                </a-tag>
                <a-tag v-else color="green">
                    {{ $t('automation.ready') }}
                </a-tag>
            </div>
            
            <!-- 设备选择 -->
            <div class="device-selector" v-if="!isRecording">
                <a-select
                    v-model="selectedDeviceId"
                    :placeholder="$t('device.selectPlaceholder')"
                    :options="deviceOptions"
                    show-search
                    allow-search
                    allow-clear
                    style="width: 100%"
                    :filter-option="filterDeviceOption"
                />
            </div>
            
            <!-- 录制控制按钮 -->
            <div class="recorder-controls">
                <a-button
                    v-if="!isRecording"
                    type="primary"
                    status="success"
                    long
                    @click="startRecording"
                    :disabled="!selectedDeviceId"
                >
                    <template #icon><icon-record /></template>
                    {{ $t('automation.startRecording') }}
                </a-button>
                
                <a-button
                    v-else
                    type="primary"
                    status="danger"
                    long
                    @click="stopRecording"
                >
                    <template #icon><icon-stop /></template>
                    {{ $t('automation.stopRecording') }} ({{ recordedSteps.length }})
                </a-button>
            </div>
            
            <!-- 录制信息 -->
            <div class="recorder-info" v-if="isRecording">
                <div class="info-item">
                    <label>{{ $t('automation.time') }}</label>
                    <span>{{ formatTime(recordingTime) }}</span>
                </div>
                <div class="info-item">
                    <label>{{ $t('automation.actions') }}</label>
                    <span>{{ recordedSteps.length }}</span>
                </div>
            </div>
            
            <!-- 步骤列表 -->
            <div class="steps-list" v-if="recordedSteps.length > 0">
                <h4>{{ $t('automation.recordedSteps') }}</h4>
                
                <div class="step-list-wrapper">
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
            
            <!-- 空状态 -->
            <div class="empty-state" v-if="!isRecording && recordedSteps.length === 0">
                <icon-empty />
                <p>{{ $t('automation.noRecordedSteps') }}</p>
                <small>{{ $t('automation.clickStartToRecord') }}</small>
            </div>
    </div>
</template>

<style scoped lang="less">
.recorder-panel {
    padding: 20px;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    
    .recorder-header {
        flex-shrink: 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        
        h3 {
            margin: 0;
            font-size: 16px;
        }
    }
    
    .device-selector {
        flex-shrink: 0;
        margin-bottom: 20px;
        
        .arco-select {
            width: 100%;
        }
    }
    
    .recorder-controls {
        flex-shrink: 0;
        width: 100%;
        margin-bottom: 20px;
        
        .arco-btn {
            width: 100%;
        }
    }
    
    .recorder-info {
        flex-shrink: 0;
        display: flex;
        gap: 20px;
        margin-bottom: 20px;
        padding: 12px;
        background: var(--color-bg-hover);
        border-radius: 8px;
        
        .info-item {
            display: flex;
            flex-direction: column;
            gap: 4px;
            
            label {
                font-size: 12px;
                color: var(--color-text-secondary);
            }
            
            span {
                font-size: 18px;
                font-weight: bold;
            }
        }
    }
    
    .steps-list {
        flex: 1;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        min-height: 0;
        
        h4 {
            flex-shrink: 0;
            margin: 0 0 12px 0;
            font-size: 14px;
            color: var(--color-text-secondary);
        }
        
        .step-list-wrapper {
            flex: 1;
            overflow-y: auto;
            min-height: 0;
        }
        
        .step-item {
            display: flex;
            align-items: center;
            padding: 12px;
            margin-bottom: 8px;
            background: var(--color-bg-card);
            border-radius: 8px;
            border: 1px solid var(--color-border);
            
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
            
            .step-desc {
                flex: 1;
                font-size: 13px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            
            .arco-btn {
                flex-shrink: 0;
            }
        }
    }
    
    .empty-state {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: var(--color-text-disabled);
        text-align: center;
        min-height: 200px;
        
        :deep(.icon-empty) {
            font-size: 64px;
            margin-bottom: 16px;
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
</style>
