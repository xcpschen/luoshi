<script setup lang="ts">
import { ref, computed } from "vue";
import { t } from "../../lang";
import { Dialog } from "../../lib/dialog";
import type { DeviceUnifiedRecord } from "../../types/DeviceUnified";
import DeviceSelector from "./DeviceSelector.vue";
import { EnumDeviceStatus } from "../../types/Device";

const props = defineProps<{
    visible: boolean;
    allDevices: DeviceUnifiedRecord[];
}>();

const emit = defineEmits<{
    (e: "update:visible", value: boolean): void;
    (e: "close"): void;
}>();

const selectedFiles = ref<string[]>([]);
const selectedDeviceIds = ref<Set<string>>(new Set());
const uploadPath = ref('/sdcard/Downloads');
const isUploading = ref(false);

const uploadProgress = ref<Map<string, {
    status: 'pending' | 'uploading' | 'success' | 'error';
    progress: number;
    error?: string;
}>>(new Map());

const visible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
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

// 选择文件
const handleSelectFiles = async () => {
    try {
        Dialog.loadingOn(t("common.addFile"));
        const paths = await window.$mapi.file.openFile({ properties: ["multiSelections"] });
        if (paths) {
            selectedFiles.value = [...selectedFiles.value, ...paths];
        }
    } catch (error) {
        console.error('Failed to select files:', error);
    } finally {
        Dialog.loadingOff();
    }
};

// 处理设备选择
const handleDeviceSelect = (deviceIds: string[]) => {
    selectedDeviceIds.value = new Set(deviceIds);
};

// 开始上传
const startUpload = async () => {
    if (selectedFiles.value.length === 0) {
        Dialog.tipError(t('batchOperation.selectFilesFirst'));
        return;
    }
    
    if (selectedDeviceIds.value.size === 0) {
        Dialog.tipError(t('batchOperation.selectDevicesFirst'));
        return;
    }
    
    const targetPath = uploadPath.value;
    if (!targetPath) {
        Dialog.tipError(t('batchUpload.uploadPathRequired'));
        return;
    }
    
    isUploading.value = true;
    
    // 初始化进度
    selectedDeviceIds.value.forEach(deviceId => {
        uploadProgress.value.set(deviceId, {
            status: 'pending',
            progress: 0
        });
    });
    
    try {
        // 逐个设备上传
        for (const deviceId of selectedDeviceIds.value) {
            try {
                uploadProgress.value.set(deviceId, {
                    status: 'uploading',
                    progress: 0
                });
                
                // 获取设备记录（用于 ADB 操作）
                const device = props.allDevices.find(d => d.unifiedId === deviceId);
                if (!device || !device.connections || device.connections.length === 0) {
                    throw new Error('Device not found or not connected');
                }
                
                // 获取在线连接（使用 EnumDeviceStatus.DEVICE 判断）
                const connection = device.connections.find(c => 
                    c.status === EnumDeviceStatus.DEVICE
                );
                
                if (!connection) {
                    throw new Error('No active connection found');
                }
                
                // 使用 connection.address 作为 ADB 设备 ID（而不是 unifiedId）
                const adbSerial = connection.address;
                
                // 上传每个文件
                for (let i = 0; i < selectedFiles.value.length; i++) {
                    const localPath = selectedFiles.value[i];
                    const fileName = localPath.split('/').pop() || localPath.split('\\').pop();
                    const devicePath = targetPath + '/' + fileName;
                    
                    console.log(`[BatchUpload] 上传文件：${localPath} -> ${adbSerial}:${devicePath}`);
                    
                    // 调用 ADB API 上传文件
                    await window.$mapi.adb.filePush(adbSerial, localPath, devicePath, {
                        progress: (type: string, data: any) => {
                            console.log(`[BatchUpload] 进度：${type}`, data, '文件索引:', i, '总文件数:', selectedFiles.value.length);
                            if (type === 'progress') {
                                // data 可能是 0-100 的百分比值，也可能是已传输字节数
                                let fileProgress: number;
                                
                                // 判断 data 的类型和范围
                                if (typeof data === 'number' && data <= 100) {
                                    // data 是百分比（0-100）
                                    fileProgress = data / 100;
                                } else if (typeof data === 'number' && data > 100) {
                                    // data 可能是已传输字节数，需要转换
                                    // 这里简单处理，假设最大值不会超过 1000%
                                    fileProgress = Math.min(1, data / 100 / 10); // 保守估计
                                } else {
                                    fileProgress = 0;
                                }
                                
                                const totalProgress = ((i + fileProgress) / selectedFiles.value.length) * 100;
                                const progress = Math.min(100, Math.round(totalProgress));
                                console.log(`[BatchUpload] 计算进度：fileProgress=${fileProgress}, totalProgress=${totalProgress}, final=${progress}`);
                                uploadProgress.value.set(deviceId, {
                                    status: 'uploading',
                                    progress: progress
                                });
                            }
                        }
                    });
                    
                    // 更新进度（文件上传完成）
                    const progress = Math.min(100, Math.round(((i + 1) / selectedFiles.value.length) * 100));
                    uploadProgress.value.set(deviceId, {
                        status: 'uploading',
                        progress: progress
                    });
                }
                
                uploadProgress.value.set(deviceId, {
                    status: 'success',
                    progress: 100
                });
                
                Dialog.tipSuccess(t('batchOperation.uploadSuccess'));
            } catch (error: any) {
                console.error(`[BatchUpload] 设备 ${deviceId} 上传失败:`, error);
                uploadProgress.value.set(deviceId, {
                    status: 'error',
                    progress: 0,
                    error: error.message || t('batchOperation.uploadFailed')
                });
            }
        }
        
        // 检查是否有成功的
        const successCount = Array.from(uploadProgress.value.values())
            .filter(p => p.status === 'success').length;
        
        if (successCount > 0) {
            Dialog.tipSuccess(t('batchOperation.uploadSuccess'));
        }
    } catch (error: any) {
        console.error('[BatchUpload] 批量上传失败:', error);
        Dialog.tipError(t('batchOperation.uploadFailed'));
    } finally {
        isUploading.value = false;
    }
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
        :title="t('batchOperation.uploadFiles')"
        width="900px"
        :footer="false"
        @close="handleClose"
    >
        <div class="batch-upload-dialog">
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
            
            <!-- 文件选择 -->
            <div class="section">
                <div class="section-header">
                    <div class="section-title">{{ t('batchOperation.uploadFiles') }}</div>
                    <div class="current-path-display" v-if="selectedFiles.length > 0">
                        <span class="label">{{ t('batchUpload.uploadTo') }}：</span>
                        <span class="path-text">{{ getPathDisplayName(currentUploadPath) }}</span>
                    </div>
                </div>
                <a-button @click="handleSelectFiles" :disabled="isUploading">
                    <template #icon><icon-upload/></template>
                    {{ t('batchOperation.uploadFiles') }} ({{ selectedFiles.length }})
                </a-button>
                <div v-if="selectedFiles.length > 0" class="file-list">
                    <div v-for="(filePath, index) in selectedFiles" :key="index" class="file-item">
                        <icon-file/>
                        <span class="file-name">{{ filePath.split('/').pop() || filePath.split('\\').pop() }}</span>
                        <span class="file-path">{{ filePath }}</span>
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
                                v-for="path in [
                                    { label: t('batchUpload.path.downloads'), value: '/sdcard/Downloads', key: 'downloads' },
                                    { label: t('batchUpload.path.pictures'), value: '/sdcard/Pictures', key: 'pictures' },
                                    { label: t('batchUpload.path.videos'), value: '/sdcard/Videos', key: 'videos' },
                                    { label: t('batchUpload.path.music'), value: '/sdcard/Music', key: 'music' },
                                    { label: t('batchUpload.path.documents'), value: '/sdcard/Documents', key: 'documents' },
                                ]"
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
                        v-for="deviceId in uploadProgress.keys()"
                        :key="deviceId"
                        class="progress-item"
                    >
                        <div class="device-name">{{ getDeviceName(deviceId) }}</div>
                        <div class="progress-info">
                            <span>{{ getStatusText(uploadProgress.get(deviceId)?.status || 'pending') }}</span>
                            <span>{{ uploadProgress.get(deviceId)?.progress || 0 }}%</span>
                        </div>
                        <a-progress
                            :percent="uploadProgress.get(deviceId)?.progress || 0"
                            :status="getProgressStatus(uploadProgress.get(deviceId)?.status || 'pending')"
                            size="small"
                        />
                        <div v-if="uploadProgress.get(deviceId)?.error" class="error-message">
                            {{ uploadProgress.get(deviceId)?.error }}
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
                    :disabled="selectedFiles.length === 0 || selectedDeviceIds.size === 0 || isUploading"
                    :loading="isUploading"
                >
                    {{ isUploading ? t('batchOperation.uploading') : t('batchOperation.uploadFiles') }}
                </a-button>
            </div>
        </div>
    </a-modal>
</template>

<style scoped lang="less">
.batch-upload-dialog {
    .section {
        margin-bottom: 20px;
    }
        
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
                font-weight: 500;
            }
            
            .file-path {
                font-size: 11px;
                color: var(--color-text-3);
                margin-left: 10px;
            }
        }
    }
        
    .path-options {
        .preset-paths, .custom-path {
            margin-top: 10px;
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
