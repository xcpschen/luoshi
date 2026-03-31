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

const selectedApks = ref<File[]>([]);
const isInstalling = ref(false);
const installProgress = ref<Map<string, {
    status: 'pending' | 'installing' | 'success' | 'error';
    progress: number;
    error?: string;
}>>(new Map());

// 设备选择状态
const selectedDeviceIds = ref<Set<string>>(new Set());

const visible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
});

// 选中的设备
const selectedDevices = computed(() => {
    return props.allDevices.filter(device => selectedDeviceIds.value.has(device.unifiedId));
});

// 切换全选
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

// 检查设备是否在线
const isDeviceOnline = (device: DeviceUnifiedRecord) => {
    return device.connections.some(c => c.status === 'connected');
};

// 选择 APK 文件
const handleSelectApks = async () => {
    try {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = '.apk';
        input.onchange = (e: Event) => {
            const target = e.target as HTMLInputElement;
            if (target.files) {
                selectedApks.value = Array.from(target.files);
            }
        };
        input.click();
    } catch (error) {
        console.error('Failed to select APKs:', error);
    }
};

// 开始安装
const startInstall = async () => {
    if (selectedApks.value.length === 0) {
        alert('请选择要安装的 APK 文件');
        return;
    }
    
    if (selectedDevices.value.length === 0) {
        alert('请选择设备');
        return;
    }
    
    isInstalling.value = true;
    
    // 初始化进度
    selectedDevices.value.forEach(device => {
        installProgress.value.set(device.unifiedId, {
            status: 'pending',
            progress: 0
        });
    });
    
    // 逐个设备安装
    for (const device of selectedDevices.value) {
        try {
            installProgress.value.set(device.unifiedId, {
                status: 'installing',
                progress: 0
            });
            
            // TODO: 调用实际的安装 API
            // 这里模拟安装过程
            for (let i = 0; i <= 100; i += 10) {
                installProgress.value.set(device.unifiedId, {
                    status: 'installing',
                    progress: i
                });
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            
            installProgress.value.set(device.unifiedId, {
                status: 'success',
                progress: 100
            });
        } catch (error) {
            installProgress.value.set(device.unifiedId, {
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
    switch (status) {
        case 'pending': return '等待中';
        case 'installing': return '安装中';
        case 'success': return '成功';
        case 'error': return '失败';
        default: return '未知';
    }
};

// 获取进度状态（用于 Arco Design 组件）
const getProgressStatus = (status: string) => {
    if (status === 'error') {
        return 'danger';
    }
    return 'normal';
};
</script>

<template>
    <a-modal
        v-model:visible="visible"
        title="批量安装应用"
        width="800px"
        :footer="false"
        @close="handleClose"
    >
        <div class="batch-install-dialog">
            <!-- 设备选择 -->
            <div class="section">
                <div class="section-header">
                    <div class="section-title">选择设备 ({{ selectedDeviceIds.size }}/{{ allDevices.length }})</div>
                    <a-button size="mini" @click="toggleSelectAll">
                        {{ selectedDeviceIds.size === allDevices.length ? '取消全选' : '全选' }}
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
                            <span class="status-dot" :class="isDeviceOnline(device) ? 'online' : 'offline'"></span>
                            {{ isDeviceOnline(device) ? '在线' : '离线' }}
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- APK 选择 -->
            <div class="section">
                <div class="section-title">选择 APK 文件</div>
                <a-button @click="handleSelectApks" :disabled="selectedDevices.length === 0 || isInstalling">
                    <template #icon><icon-upload/></template>
                    选择 APK (已选 {{ selectedApks.length }} 个)
                </a-button>
                <div v-if="selectedApks.length > 0" class="file-list">
                    <div v-for="(file, index) in selectedApks" :key="index" class="file-item">
                        <i class="iconfont icon-android"/>
                        <span class="file-name">{{ file.name }}</span>
                        <span class="file-size">{{ (file.size / 1024 / 1024).toFixed(2) }} MB</span>
                    </div>
                </div>
            </div>
            
            <!-- 安装进度 -->
            <div v-if="isInstalling || installProgress.size > 0" class="section">
                <div class="section-title">安装进度</div>
                <div class="progress-list">
                    <div
                        v-for="device in selectedDevices"
                        :key="device.unifiedId"
                        class="progress-item"
                    >
                        <div class="device-name">{{ device.name || 'Unknown Device' }}</div>
                        <div class="progress-content">
                            <div class="progress-info">
                                <span>{{ getStatusText(installProgress.get(device.unifiedId)?.status || 'pending') }}</span>
                                <span>{{ installProgress.get(device.unifiedId)?.progress || 0 }}%</span>
                            </div>
                            <a-progress
                                :percent="installProgress.get(device.unifiedId)?.progress || 0"
                                :status="getProgressStatus(installProgress.get(device.unifiedId)?.status || 'pending')"
                                size="small"
                            />
                            <div v-if="installProgress.get(device.unifiedId)?.error" class="error-message">
                                {{ installProgress.get(device.unifiedId)?.error }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- 操作按钮 -->
            <div class="actions">
                <a-button @click="handleClose" :disabled="isInstalling">取消</a-button>
                <a-button
                    type="primary"
                    @click="startInstall"
                    :disabled="selectedApks.length === 0 || selectedDevices.length === 0 || isInstalling"
                    :loading="isInstalling"
                >
                    {{ isInstalling ? '安装中...' : '开始安装' }}
                </a-button>
            </div>
        </div>
    </a-modal>
</template>

<style scoped lang="less">
.batch-install-dialog {
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
            padding: 8px;
            
            .device-item {
                display: flex;
                align-items: center;
                padding: 8px 12px;
                border-radius: 4px;
                margin-bottom: 4px;
                cursor: pointer;
                transition: all 0.2s;
                border: 1px solid transparent;
                
                &:hover {
                    background: var(--color-fill-2);
                }
                
                &.selected {
                    background: var(--color-fill-2);
                    border-color: var(--color-primary);
                }
                
                .device-checkbox {
                    margin-right: 12px;
                    display: flex;
                    align-items: center;
                    
                    .checked {
                        font-size: 20px;
                        color: var(--color-primary);
                    }
                    
                    .unchecked {
                        width: 18px;
                        height: 18px;
                        border: 2px solid var(--color-border-3);
                        border-radius: 3px;
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
                
                .icon-android {
                    margin-right: 8px;
                    color: var(--color-success);
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
                display: flex;
                align-items: flex-start;
                padding: 12px;
                background: var(--color-fill-1);
                border-radius: 4px;
                margin-bottom: 8px;
                
                .device-name {
                    width: 200px;
                    font-weight: 500;
                    flex-shrink: 0;
                }
                
                .progress-content {
                    flex: 1;
                    
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
    }
    
    .actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 20px;
    }
}
</style>
