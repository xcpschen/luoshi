<script setup lang="ts">
import { ref, computed } from "vue";
import { t } from "../../lang";
import type { DeviceUnifiedRecord } from "../../types/DeviceUnified";
import DeviceSelector from "./DeviceSelector.vue";

const props = defineProps<{
    visible: boolean;
    allDevices: DeviceUnifiedRecord[];
}>();

const emit = defineEmits<{
    (e: "update:visible", value: boolean): void;
    (e: "close"): void;
}>();

const selectedApkFiles = ref<File[]>([]);
const selectedDeviceIds = ref<Set<string>>(new Set());
const isInstalling = ref(false);

const installProgress = ref<Map<string, {
    status: 'pending' | 'installing' | 'success' | 'error';
    progress: number;
    error?: string;
}>>(new Map());

const visible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
});

// 处理 APK 文件选择
const handleSelectApkFiles = async () => {
    try {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = '.apk';
        input.onchange = (e: Event) => {
            const target = e.target as HTMLInputElement;
            if (target.files) {
                selectedApkFiles.value = Array.from(target.files);
            }
        };
        input.click();
    } catch (error) {
        console.error('Failed to select APK files:', error);
    }
};

// 处理设备选择
const handleDeviceSelect = (deviceIds: string[]) => {
    selectedDeviceIds.value = new Set(deviceIds);
};

// 开始安装
const startInstall = async () => {
    if (selectedApkFiles.value.length === 0) {
        alert('请选择要安装的 APK 文件');
        return;
    }
    
    if (selectedDeviceIds.value.size === 0) {
        alert('请选择至少一个设备');
        return;
    }
    
    isInstalling.value = true;
    
    // 初始化进度
    selectedDeviceIds.value.forEach(deviceId => {
        installProgress.value.set(deviceId, {
            status: 'pending',
            progress: 0
        });
    });
    
    // 逐个设备安装
    for (const deviceId of selectedDeviceIds.value) {
        try {
            installProgress.value.set(deviceId, {
                status: 'installing',
                progress: 0
            });
            
            // TODO: 调用实际的安装 API
            // 这里模拟安装过程
            for (let i = 0; i <= 100; i += 10) {
                installProgress.value.set(deviceId, {
                    status: 'installing',
                    progress: i
                });
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            installProgress.value.set(deviceId, {
                status: 'success',
                progress: 100
            });
        } catch (error) {
            installProgress.value.set(deviceId, {
                status: 'error',
                progress: 0,
                error: (error as Error).message
            });
        }
    }
    
    isInstalling.value = false;
};

// 关闭对话框
const handleClose = () => {
    emit('close');
};

// 获取状态文本
const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
        'pending': 'batchOperation.status.pending',
        'installing': 'batchOperation.status.installing',
        'success': 'batchOperation.status.success',
        'error': 'batchOperation.status.error',
    };

    const key = statusMap[status];
    if (key) {
        return t(key);
    }
    return status;
};

// 获取进度状态（用于 Arco Design 组件）
const getProgressStatus = (status: string) => {
    if (status === 'error') {
        return 'danger';
    }
    return 'normal';
};

// 根据设备 ID 获取设备名称
const getDeviceName = (deviceId: string) => {
    const device = props.allDevices.find(d => d.unifiedId === deviceId);
    return device?.name || 'Unknown Device';
};
</script>

<template>
    <a-modal
        v-model:visible="visible"
        :title="t('batchOperation.installApps')"
        width="900px"
        :footer="false"
        @close="handleClose"
    >
        <div class="batch-install-dialog">
            <!-- 设备选择 -->
            <div class="section">
                <div class="section-title">{{ t('deviceManage.selectDevices') }}</div>
                <DeviceSelector
                    :visible="visible"
                    :allDevices="allDevices"
                    :multiple="true"
                    maxHeight="200px"
                    @select="handleDeviceSelect"
                />
            </div>
            
            <!-- APK 文件选择 -->
            <div class="section">
                <div class="section-title">{{ t('batchOperation.installApps') }}</div>
                <a-button @click="handleSelectApkFiles" :disabled="isInstalling">
                    <template #icon><icon-file/></template>
                    {{ t('batchOperation.installApps') }} ({{ selectedApkFiles.length }})
                </a-button>
                <div v-if="selectedApkFiles.length > 0" class="file-list">
                    <div v-for="(file, index) in selectedApkFiles" :key="index" class="file-item">
                        <icon-file/>
                        <span class="file-name">{{ file.name }}</span>
                        <span class="file-size">{{ (file.size / 1024 / 1024).toFixed(2) }} MB</span>
                    </div>
                </div>
            </div>
            
            <!-- 安装进度 -->
            <div v-if="isInstalling || installProgress.size > 0" class="section">
                <div class="section-title">{{ t('batchOperation.progress') }}</div>
                <div class="progress-list">
                    <div
                        v-for="deviceId in installProgress.keys()"
                        :key="deviceId"
                        class="progress-item"
                    >
                        <div class="device-name">{{ getDeviceName(deviceId) }}</div>
                        <div class="progress-info">
                            <span>{{ getStatusText(installProgress.get(deviceId)?.status || 'pending') }}</span>
                            <span>{{ installProgress.get(deviceId)?.progress || 0 }}%</span>
                        </div>
                        <a-progress
                            :percent="installProgress.get(deviceId)?.progress || 0"
                            :status="getProgressStatus(installProgress.get(deviceId)?.status || 'pending')"
                            size="small"
                        />
                        <div v-if="installProgress.get(deviceId)?.error" class="error-message">
                            {{ installProgress.get(deviceId)?.error }}
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- 操作按钮 -->
            <div class="actions">
                <a-button @click="handleClose" :disabled="isInstalling">{{ t('common.cancel') }}</a-button>
                <a-button
                    type="primary"
                    @click="startInstall"
                    :disabled="selectedApkFiles.length === 0 || selectedDeviceIds.size === 0 || isInstalling"
                    :loading="isInstalling"
                >
                    {{ isInstalling ? t('batchOperation.installing') : t('batchOperation.installApps') }}
                </a-button>
            </div>
        </div>
    </a-modal>
</template>

<style scoped lang="less">
.batch-install-dialog {
    .section {
        margin-bottom: 20px;
    }
        
    .section-title {
        font-weight: 600;
        margin-bottom: 10px;
        color: var(--color-text-1);
    }
        
    .file-list {
        margin-top: 10px;
        max-height: 150px;
        overflow-y: auto;
            
        .file-item {
            display: flex;
            align-items: center;
            padding: 8px;
            background: var(--color-fill-2);
            border-radius: 4px;
            margin-bottom: 5px;
            
            .icon-file {
                margin-right: 8px;
                color: var(--color-primary);
            }
            
            .file-name {
                flex: 1;
                font-size: 13px;
            }
            
            .file-size {
                font-size: 12px;
                color: var(--color-text-3);
            }
        }
    }
        
    .progress-list {
        max-height: 300px;
        overflow-y: auto;
            
        .progress-item {
            padding: 10px;
            border: 1px solid var(--color-border-2);
            border-radius: 4px;
            margin-bottom: 8px;
            
            .device-name {
                font-weight: 500;
                margin-bottom: 8px;
                width: 200px;
                flex-shrink: 0;
            }
            
            .progress-info {
                display: flex;
                justify-content: space-between;
                font-size: 12px;
                margin-bottom: 4px;
            }
            
            .error-message {
                margin-top: 4px;
                font-size: 12px;
                color: var(--color-danger);
            }
        }
    }
    
    .actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 20px;
    }
}
</style>
