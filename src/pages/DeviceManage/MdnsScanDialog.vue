<script setup lang="ts">
import { ref, computed } from "vue";
import { t } from "../../lang";
import { Dialog } from "../../lib/dialog";
import { EnumDeviceStatus } from "../../types/Device";
import type { DeviceConnection } from "../../types/DeviceUnified";

const props = defineProps<{
    visible: boolean;
}>();

const emit = defineEmits<{
    (e: "update:visible", value: boolean): void;
    (e: "close"): void;
}>();

const isScanning = ref(false);
const discoveredDevices = ref<Array<{
    id: string;
    address: string;
    port: string;
    model?: string;
    selected: boolean;
}>>([]);
const currentPage = ref(1);
const pageSize = 10;
const selectedDeviceIds = ref<Set<string>>(new Set());

const visible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
});

// 分页后的设备列表
const paginatedDevices = computed(() => {
    const start = (currentPage.value - 1) * pageSize;
    const end = start + pageSize;
    return discoveredDevices.value.slice(start, end);
});

// 总页数
const totalPages = computed(() => {
    return Math.ceil(discoveredDevices.value.length / pageSize);
});

// 当前页选中的设备
const currentPageSelectedDevices = computed(() => {
    return paginatedDevices.value.filter(device => selectedDeviceIds.value.has(device.id));
});

// 开始扫描 mDNS
const startScan = async () => {
    isScanning.value = true;
    discoveredDevices.value = [];
    selectedDeviceIds.value.clear();
    currentPage.value = 1;
    
    try {
        // 调用 ADB mDNS 扫描
        const result = await window.$mapi.adb.scanMdns();
        
        if (result && result.devices) {
            discoveredDevices.value = result.devices.map((device: any) => ({
                id: device.id || device.address,
                address: device.address,
                port: device.port || '5555',
                model: device.model,
                selected: false
            }));
            
            if (discoveredDevices.value.length > 0) {
                Dialog.tipSuccess(t('deviceManage.mdnsScanSuccess', { count: discoveredDevices.value.length }));
            } else {
                Dialog.tipWarning(t('deviceManage.mdnsScanNoDevice'));
            }
        }
    } catch (error: any) {
        console.error('[MdnsScan] 扫描失败:', error);
        Dialog.tipError(t('deviceManage.mdnsScanFailed'));
    } finally {
        isScanning.value = false;
    }
};

// 全选/取消全选当前页
const toggleSelectAll = () => {
    if (currentPageSelectedDevices.value.length === paginatedDevices.value.length) {
        // 取消全选
        paginatedDevices.value.forEach(device => {
            selectedDeviceIds.value.delete(device.id);
        });
    } else {
        // 全选
        paginatedDevices.value.forEach(device => {
            selectedDeviceIds.value.add(device.id);
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

// 翻页
const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages.value) {
        currentPage.value = page;
    }
};

const prevPage = () => {
    if (currentPage.value > 1) {
        currentPage.value--;
    }
};

const nextPage = () => {
    if (currentPage.value < totalPages.value) {
        currentPage.value++;
    }
};

// 保存并连接
const saveAndConnect = async () => {
    if (selectedDeviceIds.value.size === 0) {
        Dialog.tipWarning(t('deviceManage.selectDevicesFirst'));
        return;
    }
    
    try {
        Dialog.loadingOn(t('deviceManage.connectingDevices'));
        
        const selectedDevices = discoveredDevices.value.filter(d => 
            selectedDeviceIds.value.has(d.id)
        );
        
        // 逐个连接并保存设备
        for (const device of selectedDevices) {
            try {
                // 调用 ADB 连接
                await window.$mapi.adb.connect(device.address, parseInt(device.port));
                
                // 获取设备详细信息
                const devices = await window.$mapi.adb.devices();
                const connectedDevice = devices.find((d: any) => 
                    d.id === `${device.address}:${device.port}` || 
                    d.id === device.address
                );
                
                if (!connectedDevice) {
                    console.warn(`[MdnsScan] 未找到设备 ${device.address} 的详细信息`);
                    continue;
                }
                
                // 生成硬件 ID
                const hardwareId = device.id;
                const fingerprint = `${device.model || 'Unknown'}-${device.address}-${device.port}`;
                const unifiedId = crypto.randomUUID();
                const now = new Date();
                
                // 保存到 device_unified 表
                await window.$mapi.db.execute(
                    `INSERT OR REPLACE INTO device_unified (
                        unified_id, hardware_id, model, brand, android_version, sdk_version, fingerprint,
                        name, setting, tags, total_connections, first_connected_at, last_connected_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        unifiedId,
                        hardwareId,
                        device.model || 'Unknown',
                        'Unknown',
                        'Unknown',
                        0,
                        fingerprint,
                        device.model || `${device.address}:${device.port}`,
                        JSON.stringify({
                            dimWhenMirror: 'false',
                            alwaysTop: 'false',
                            mirrorSound: 'false',
                            videoBitRate: '8000000',
                            maxFps: '60',
                            videoCodec: 'h264',
                            videoBuffer: '0'
                        }),
                        JSON.stringify([]),
                        1,
                        now.toISOString(),
                        now.toISOString()
                    ]
                );
                
                // 保存连接信息到 device_connection 表
                const connectionId = crypto.randomUUID();
                await window.$mapi.db.execute(
                    `INSERT OR REPLACE INTO device_connection (
                        unified_id, connection_id, connection_type, status, address,
                        connected_at, last_active_at, is_default
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        unifiedId,
                        connectionId,
                        'wifi_debug',
                        EnumDeviceStatus.CONNECTED,
                        `${device.address}:${device.port}`,
                        now.toISOString(),
                        now.toISOString(),
                        1
                    ]
                );
                
                console.log('[MdnsScan] 设备已保存:', unifiedId, device.address);
            } catch (error: any) {
                console.error(`[MdnsScan] 连接并保存设备 ${device.address} 失败:`, error);
            }
        }
        
        Dialog.tipSuccess(t('deviceManage.connectSuccess'));
        
        // 清空数据
        discoveredDevices.value = [];
        selectedDeviceIds.value.clear();
        currentPage.value = 1;
        
        // 关闭对话框
        emit('close');
        emit('update:visible', false);
        
        // 触发设备列表刷新（使用 deviceUnifiedStore 的 syncDevices）
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    } catch (error: any) {
        console.error('[MdnsScan] 保存并连接失败:', error);
        Dialog.tipError(t('deviceManage.connectFailed'));
    } finally {
        Dialog.loadingOff();
    }
};

// 关闭对话框
const handleClose = () => {
    discoveredDevices.value = [];
    selectedDeviceIds.value.clear();
    currentPage.value = 1;
    emit('close');
    emit('update:visible', false);
};

// 初始化扫描
const handleOpen = () => {
    startScan();
};
</script>

<template>
    <a-modal
        v-model:visible="visible"
        :title="t('deviceManage.scanMdns')"
        width="900px"
        :footer="false"
        @open="handleOpen"
        @close="handleClose"
    >
        <div class="mdns-scan-dialog">
            <!-- 扫描状态 -->
            <div v-if="isScanning" class="scanning-state">
                <div class="scanning-icon">
                    <icon-loading size="40"/>
                </div>
                <div class="scanning-text">{{ t('deviceManage.mdnsScanning') }}</div>
            </div>
            
            <!-- 设备列表 -->
            <div v-else-if="discoveredDevices.length > 0" class="device-list-section">
                <div class="device-list-header">
                    <div class="device-checkbox">
                        <a-checkbox
                            :model-value="currentPageSelectedDevices.length === paginatedDevices.length && paginatedDevices.length > 0"
                            @change="toggleSelectAll"
                        >
                            {{ t('common.selectAll') }}
                        </a-checkbox>
                    </div>
                    <div class="device-info">
                        <span>{{ t('deviceManage.deviceInfo') }}</span>
                    </div>
                    <div class="device-status">
                        <span>{{ t('device.status.title') }}</span>
                    </div>
                </div>
                
                <div class="device-list" :style="{ maxHeight: '400px' }">
                    <div
                        v-for="device in paginatedDevices"
                        :key="device.id"
                        class="device-item"
                        :class="{ selected: selectedDeviceIds.has(device.id) }"
                        @click="toggleDeviceSelection(device.id)"
                    >
                        <div class="device-checkbox">
                            <a-checkbox :model-value="selectedDeviceIds.has(device.id)"/>
                        </div>
                        <div class="device-info">
                            <div class="device-name">
                                {{ device.model || 'Unknown Device' }}
                            </div>
                            <div class="device-address">
                                {{ device.address }}:{{ device.port }}
                            </div>
                        </div>
                        <div class="device-status">
                            <span class="status-dot online"></span>
                            {{ t('device.status.online') }}
                        </div>
                    </div>
                </div>
                
                <!-- 分页控制 -->
                <div class="pagination-section">
                    <div class="pagination-info">
                        <span>{{ (currentPage - 1) * pageSize + 1 }} - {{ Math.min(currentPage * pageSize, discoveredDevices.length) }} / {{ discoveredDevices.length }}</span>
                        <span class="selected-count">{{ selectedDeviceIds.size }} {{ t('deviceManage.selectedCount') }}</span>
                    </div>
                    <div class="pagination-controls">
                        <a-button
                            size="mini"
                            :disabled="currentPage === 1"
                            @click="prevPage"
                        >
                            <template #icon><icon-left/></template>
                            {{ t('common.prev') }}
                        </a-button>
                        <div class="page-numbers">
                            <a-button
                                v-for="page in totalPages"
                                :key="page"
                                size="mini"
                                :type="currentPage === page ? 'primary' : 'outline'"
                                @click="goToPage(page)"
                            >
                                {{ page }}
                            </a-button>
                        </div>
                        <a-button
                            size="mini"
                            :disabled="currentPage === totalPages"
                            @click="nextPage"
                        >
                            {{ t('common.next') }}
                            <template #icon><icon-right/></template>
                        </a-button>
                    </div>
                </div>
            </div>
            
            <!-- 空状态 -->
            <div v-else class="empty-state">
                <icon-empty size="80"/>
                <div class="empty-text">{{ t('deviceManage.mdnsNoDevice') }}</div>
            </div>
            
            <!-- 操作按钮 -->
            <div class="actions">
                <a-button @click="handleClose" :disabled="isScanning">{{ t('common.cancel') }}</a-button>
                <a-button
                    v-if="!isScanning && discoveredDevices.length > 0"
                    type="primary"
                    @click="saveAndConnect"
                    :disabled="selectedDeviceIds.size === 0"
                >
                    {{ t('deviceManage.saveAndConnect') }} ({{ selectedDeviceIds.size }})
                </a-button>
            </div>
        </div>
    </a-modal>
</template>

<style scoped lang="less">
.mdns-scan-dialog {
    .scanning-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 60px 20px;
        
        .scanning-icon {
            margin-bottom: 20px;
            color: var(--color-primary);
        }
        
        .scanning-text {
            font-size: 16px;
            color: var(--color-text-2);
        }
    }
    
    .device-list-section {
        .device-list-header {
            display: flex;
            align-items: center;
            padding: 12px;
            background: var(--color-fill-2);
            border-radius: 4px;
            margin-bottom: 10px;
            font-weight: 600;
            
            .device-checkbox {
                width: 40px;
            }
            
            .device-info {
                flex: 1;
            }
            
            .device-status {
                width: 100px;
                text-align: center;
            }
        }
    }
    
    .device-list {
        max-height: 400px;
        overflow-y: auto;
        border: 1px solid var(--color-border-2);
        border-radius: 4px;
        padding: 8px;
        
        .device-item {
            display: flex;
            align-items: center;
            padding: 10px 12px;
            border-bottom: 1px solid var(--color-border-2);
            cursor: pointer;
            transition: all 0.2s;
            
            &:last-child {
                border-bottom: none;
            }
            
            &:hover {
                background: var(--color-fill-2);
            }
            
            &.selected {
                background: var(--color-primary-light-1);
                border-color: var(--color-primary);
            }
            
            .device-checkbox {
                width: 40px;
                margin-right: 12px;
            }
            
            .device-info {
                flex: 1;
                
                .device-name {
                    font-weight: 500;
                    margin-bottom: 4px;
                }
                
                .device-address {
                    font-size: 12px;
                    color: var(--color-text-3);
                    font-family: 'Courier New', monospace;
                }
            }
            
            .device-status {
                width: 100px;
                text-align: center;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                font-size: 13px;
                
                .status-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    
                    &.online {
                        background: var(--color-success);
                    }
                }
            }
        }
    }
    
    .pagination-section {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 20px;
        border-top: 1px solid var(--color-border-2);
        margin-top: 20px;
        
        .pagination-info {
            display: flex;
            align-items: center;
            gap: 15px;
            font-size: 13px;
            color: var(--color-text-2);
            
            .selected-count {
                color: var(--color-primary);
                font-weight: 500;
            }
        }
        
        .pagination-controls {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .page-numbers {
            display: flex;
            gap: 4px;
        }
    }
    
    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 60px 20px;
        
        .empty-text {
            margin-top: 20px;
            font-size: 16px;
            color: var(--color-text-3);
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
