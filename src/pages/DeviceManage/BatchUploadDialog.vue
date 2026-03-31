<script setup lang="ts">
import { ref, computed } from "vue";
import { t } from "../../lang";
import type { DeviceUnifiedRecord } from "../../types/DeviceUnified";

const props = defineProps<{
    visible: boolean;
    allDevices: DeviceUnifiedRecord[];  // 所有可用设备
}>();

const emit = defineEmits<{
    (e: "update:visible", value: boolean): void;
    (e: "close"): void;
}>();

// 预设的上传路径配置
const presetPaths = [
    { label: t('batchUpload.path.downloads'), value: '/sdcard/Downloads', key: 'downloads' },
    { label: t('batchUpload.path.pictures'), value: '/sdcard/Pictures', key: 'pictures' },
    { label: t('batchUpload.path.videos'), value: '/sdcard/Videos', key: 'videos' },
    { label: t('batchUpload.path.music'), value: '/sdcard/Music', key: 'music' },
    { label: t('batchUpload.path.documents'), value: '/sdcard/Documents', key: 'documents' },
];

const selectedFiles = ref<File[]>([]);
const uploadPath = ref('/sdcard/Downloads');
const isUploading = ref(false);

// 设备选择
const selectedDeviceIds = ref<Set<string>>(new Set());
const uploadProgress = ref<Map<string, {
    status: 'pending' | 'uploading' | 'success' | 'error';
    progress: number;
    error?: string;
}>>(new Map());

const visible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
});

// 选中的设备记录
const selectedDevices = computed(() => {
    return props.allDevices.filter(device => selectedDeviceIds.value.has(device.unifiedId));
});

// 当前使用的上传路径
const currentUploadPath = computed(() => {
    return uploadPath.value;
});

// 获取路径显示名称（根据当前语言）
const getPathDisplayName = (path: string) => {
    const pathKeyMap: Record<string, string> = {
        '/sdcard/Downloads': 'batchUpload.path.downloads',
        '/sdcard/Pictures': 'batchUpload.path.pictures',
        '/sdcard/Videos': 'batchUpload.path.videos',
        '/sdcard/Music': 'batchUpload.path.music',
        '/sdcard/Documents': 'batchUpload.path.documents',
    };
    const key = pathKeyMap[path];
    if (key) {
        return t(key);
    }
    return path;
};

// 全选/取消全选
const toggleSelectAll = () => {
    if (selectedDeviceIds.value.size === props.allDevices.length) {
        selectedDeviceIds.value.clear();
    } else {
        props.allDevices.forEach(device => {
            selectedDeviceIds.value.add(device.unifiedId);
        });
    }
};

// 切换单个设备选择
const toggleDeviceSelection = (deviceId: string) => {
    if (selectedDeviceIds.value.has(deviceId)) {
        selectedDeviceIds.value.delete(deviceId);
    } else {
        selectedDeviceIds.value.add(deviceId);
    }
};

// 选择文件
const handleSelectFiles = async () => {
    try {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.onchange = (e: Event) => {
            const target = e.target as HTMLInputElement;
            if (target.files) {
                selectedFiles.value = Array.from(target.files);
            }
        };
        input.click();
    } catch (error) {
        console.error('Failed to select files:', error);
    }
};

// 开始上传
const startUpload = async () => {
    if (selectedFiles.value.length === 0) {
        alert('请选择要上传的文件');
        return;
    }
    
    if (selectedDevices.value.length === 0) {
        alert('请选择至少一个设备');
        return;
    }
    
    const targetPath = uploadPath.value;
    if (!targetPath) {
        alert('请设置上传路径');
        return;
    }
    
    isUploading.value = true;
    
    // 初始化进度
    selectedDevices.value.forEach(device => {
        uploadProgress.value.set(device.unifiedId, {
            status: 'pending',
            progress: 0
        });
    });
    
    // 逐个设备上传
    for (const device of selectedDevices.value) {
        try {
            uploadProgress.value.set(device.unifiedId, {
                status: 'uploading',
                progress: 0
            });
            
            // TODO: 调用实际的上传 API
            // 这里模拟上传过程
            for (let i = 0; i <= 100; i += 10) {
                uploadProgress.value.set(device.unifiedId, {
                    status: 'uploading',
                    progress: i
                });
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            uploadProgress.value.set(device.unifiedId, {
                status: 'success',
                progress: 100
            });
        } catch (error) {
            uploadProgress.value.set(device.unifiedId, {
                status: 'error',
                progress: 0,
                error: (error as Error).message
            });
        }
    }
    
    isUploading.value = false;
};

// 关闭对话框
const handleClose = () => {
    emit('close');
};

// 获取状态文本
const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
        'pending': 'batchOperation.status.pending',
        'uploading': 'batchOperation.status.uploading',
        'success': 'batchOperation.status.success',
        'error': 'batchOperation.status.error',
    };
    const key = statusMap[status];
    if (key) {
        return t(key);
    }
    return status;
};
</script>

<template>
    <a-modal
        v-model:visible="visible"
        :title="t('batchOperation.uploadFiles')"
        width="900px"
        :footer="false"
        @close="handleClose"
    >
        <div class="batch-upload-dialog">
            <!-- 设备选择 -->
            <div class="section">
                <div class="section-header">
                    <div class="section-title">{{ t('deviceManage.title') }} ({{ selectedDeviceIds.size }}/{{ allDevices.length }})</div>
                    <a-button size="mini" @click="toggleSelectAll">
                        {{ selectedDeviceIds.size === allDevices.length ? t('common.cancelSelectAll') : t('common.selectAll') }}
                    </a-button>
                </div>
                
                <div class="device-list">
                    <div
                        v-for="device in allDevices"
                        :key="device.unifiedId"
                        class="device-item"
                        :class="{ selected: selectedDeviceIds.has(device.unifiedId) }"
                        @click="toggleDeviceSelection(device.unifiedId)"
                    >
                        <div class="device-checkbox">
                            <icon-check-circle v-if="selectedDeviceIds.has(device.unifiedId)" class="checked"/>
                            <div v-else class="unchecked"/>
                        </div>
                        <div class="device-info">
                            <div class="device-name">{{ device.name || 'Unknown Device' }}</div>
                            <div class="device-id">{{ device.unifiedId }}</div>
                        </div>
                        <div class="device-status">
                            <span class="status-dot" :class="device.connections.some(c => c.status === 'connected') ? 'online' : 'offline'"></span>
                            {{ device.connections.some(c => c.status === 'connected') ? t('device.status.online') : t('device.status.offline') }}
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- 文件选择 -->
            <div class="section">
                <div class="section-header">
                    <div class="section-title">{{ t('batchOperation.uploadFiles') }}</div>
                    <div class="current-path-display" v-if="selectedDevices.length > 0">
                        <span class="label">{{ t('batchUpload.uploadTo') }}：</span>
                        <span class="path-text">{{ getPathDisplayName(currentUploadPath) }}</span>
                    </div>
                </div>
                <a-button @click="handleSelectFiles" :disabled="isUploading || selectedDevices.length === 0">
                    <template #icon><icon-upload/></template>
                    {{ t('batchOperation.uploadFiles') }} ({{ selectedFiles.length }})
                </a-button>
                <div v-if="selectedFiles.length > 0" class="file-list">
                    <div v-for="(file, index) in selectedFiles" :key="index" class="file-item">
                        <icon-file/>
                        <span class="file-name">{{ file.name }}</span>
                        <span class="file-size">{{ (file.size / 1024).toFixed(1) }} KB</span>
                    </div>
                </div>
            </div>
            
            <!-- 路径设置 -->
            <div class="section">
                <div class="section-title">{{ t('batchUpload.uploadPathSettings') }}</div>
                <div class="path-options">
                    <div class="preset-paths">
                        <a-select v-model="uploadPath" style="width: 100%">
                            <a-option
                                v-for="path in presetPaths"
                                :key="path.value"
                                :value="path.value"
                            >
                                {{ path.label }}
                            </a-option>
                        </a-select>
                    </div>
                </div>
            </div>
            
            <!-- 上传进度 -->
            <div v-if="isUploading || uploadProgress.size > 0" class="section">
                <div class="section-title">{{ t('batchOperation.progress') }}</div>
                <div class="progress-list">
                    <div
                        v-for="device in selectedDevices"
                        :key="device.unifiedId"
                        class="progress-item"
                    >
                        <div class="device-name">{{ device.name || 'Unknown Device' }}</div>
                        <div class="progress-info">
                            <span>{{ getStatusText(uploadProgress.get(device.unifiedId)?.status || 'pending') }}</span>
                            <span>{{ uploadProgress.get(device.unifiedId)?.progress || 0 }}%</span>
                        </div>
                        <a-progress
                            :percent="uploadProgress.get(device.unifiedId)?.progress || 0"
                            :status="uploadProgress.get(device.unifiedId)?.status === 'error' ? 'danger' : 'normal'"
                            size="small"
                        />
                        <div v-if="uploadProgress.get(device.unifiedId)?.error" class="error-message">
                            {{ uploadProgress.get(device.unifiedId)?.error }}
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- 操作按钮 -->
            <div class="actions">
                <a-button @click="handleClose" :disabled="isUploading">{{ t('common.cancel') }}</a-button>
                <a-button
                    type="primary"
                    @click="startUpload"
                    :disabled="selectedFiles.length === 0 || selectedDevices.length === 0 || isUploading"
                    :loading="isUploading"
                >
                    {{ isUploading ? t('batchOperation.startingUpload') : t('batchOperation.uploadFiles') }}
                </a-button>
            </div>
        </div>
    </a-modal>
</template>

<style scoped lang="less">
.batch-upload-dialog {
    .section {
        margin-bottom: 20px;
        
        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            
            .section-title {
                font-weight: 600;
                color: var(--color-text-1);
            }
            
            .current-path-display {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 13px;
                padding: 6px 12px;
                background: var(--color-fill-2);
                border-radius: 4px;
                
                .label {
                    color: var(--color-text-2);
                    font-weight: 500;
                }
                
                .path-text {
                    color: var(--color-primary);
                    font-weight: 600;
                }
            }
        }
        
        .section-title {
            font-weight: 600;
            margin-bottom: 10px;
            color: var(--color-text-1);
        }
        
        .device-list {
            max-height: 200px;
            overflow-y: auto;
            border: 1px solid var(--color-border-2);
            border-radius: 4px;
            
            .device-item {
                display: flex;
                align-items: center;
                padding: 10px;
                border-bottom: 1px solid var(--color-border-2);
                cursor: pointer;
                transition: all 0.3s;
                
                &:last-child {
                    border-bottom: none;
                }
                
                &.selected {
                    background: var(--color-primary-light-1);
                }
                
                &:hover {
                    background: var(--color-fill-2);
                }
                
                .device-checkbox {
                    margin-right: 10px;
                    
                    .checked {
                        color: var(--color-primary);
                        font-size: 20px;
                    }
                    
                    .unchecked {
                        width: 20px;
                        height: 20px;
                        border: 2px solid var(--color-border-3);
                        border-radius: 50%;
                    }
                }
                
                .device-info {
                    flex: 1;
                    
                    .device-name {
                        font-weight: 500;
                        margin-bottom: 4px;
                    }
                    
                    .device-id {
                        font-size: 12px;
                        color: var(--color-text-3);
                    }
                }
                
                .device-status {
                    display: flex;
                    align-items: center;
                    font-size: 13px;
                    
                    .status-dot {
                        width: 8px;
                        height: 8px;
                        border-radius: 50%;
                        margin-right: 6px;
                        
                        &.online {
                            background: var(--color-success);
                        }
                        
                        &.offline {
                            background: var(--color-text-4);
                        }
                    }
                }
            }
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
        
        .path-options {
            .preset-paths, .custom-path {
                margin-top: 10px;
            }
        }
        
        .progress-list {
            max-height: 200px;
            overflow-y: auto;
            
            .progress-item {
                padding: 10px;
                border: 1px solid var(--color-border-2);
                border-radius: 4px;
                margin-bottom: 8px;
                
                .device-name {
                    font-weight: 500;
                    margin-bottom: 8px;
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
    }
    
    .actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 20px;
    }
}
</style>
