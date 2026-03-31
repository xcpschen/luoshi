<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from "vue";
import { t } from "../lang";
import { Dialog } from "../lib/dialog";
import { mapError } from "../lib/error";
import { useDeviceUnifiedStore } from "../store/modules/deviceUnified";
import { useDeviceStore } from "../store/modules/device";
import { EnumDeviceStatus } from "../types/Device";
import DeviceUnifiedCard from "./DeviceManage/DeviceUnifiedCard.vue";
import DeviceManageEmpty from "./DeviceManage/DeviceManageEmpty.vue";
import DeviceManageFilterEmpty from "./DeviceManage/DeviceManageFilterEmpty.vue";
import BatchOperationToolbar from "./DeviceManage/BatchOperationToolbar.vue";
import BatchUploadDialog from "./DeviceManage/BatchUploadDialog.vue";
import BatchInstallDialog from "./DeviceManage/BatchInstallDialog.vue";
import DeviceImportDialog from "./DeviceManage/DeviceImportDialog.vue";
import type { DeviceUnifiedRecord, DeviceConnection } from "../types/DeviceUnified";

const deviceUnifiedStore = useDeviceUnifiedStore();
const deviceStore = useDeviceStore();

// 监听设备 store 的变化，实现实时更新
let stopWatchingDevices: (() => void) | null = null

const searchKeywords = ref("");
const filterConnectionType = ref<string>("all");

// 批量操作对话框
const showBatchUploadDialog = ref(false);
const showBatchInstallDialog = ref(false);
const showImportDialog = ref(false);
const importDialog = ref<InstanceType<typeof DeviceImportDialog> | null>(null);

const filterRecords = computed(() => {
    return deviceUnifiedStore.unifiedDevices.filter((device: DeviceUnifiedRecord) => {
        const keywords = searchKeywords.value.toLowerCase();
        let matches = true;
        
        // 关键词筛选
        if (keywords) {
            matches = device.name?.toLowerCase().includes(keywords) ||
                     device.identity.model?.toLowerCase().includes(keywords) ||
                     device.identity.brand?.toLowerCase().includes(keywords);
            
            if (!matches) {
                return false;
            }
        }
        
        // 连接类型筛选
        if (filterConnectionType.value !== "all") {
            const hasConnectionType = device.connections.some(
                (conn: DeviceConnection) => conn.type === filterConnectionType.value
            );
            if (!hasConnectionType) {
                return false;
            }
        }
        
        return true;
    });
});

const connectedCount = computed(() => deviceUnifiedStore.connectedDevices.length);
const usbCount = computed(() => deviceUnifiedStore.usbDevices.length);
const wifiCount = computed(() => deviceUnifiedStore.wifiDevices.length);

// 批量上传文件
const handleBatchUpload = () => {
    showBatchUploadDialog.value = true;
};

// 批量删除文件（已隐藏）
const handleBatchDelete = () => {
    Dialog.confirm(t("batchOperation.deleteConfirm")).then(() => {
        Dialog.tipSuccess(t("batchOperation.deleteSuccess"));
    });
};

// 批量安装应用
const handleBatchInstall = () => {
    showBatchInstallDialog.value = true;
};

// 批量卸载应用（已隐藏）
const handleBatchUninstall = () => {
    Dialog.confirm(t("batchOperation.uninstallConfirm")).then(() => {
        Dialog.tipSuccess(t("batchOperation.uninstallSuccess"));
    });
};

const doRefresh = async () => {
    Dialog.loadingOn(t("device.refreshing"));
    try {
        await deviceUnifiedStore.syncDevices(true);  // 主动刷新时显示加载状态
        Dialog.tipSuccess(t("device.refreshSuccess"));
    } catch (e: any) {
        Dialog.tipError(mapError(e));
    } finally {
        Dialog.loadingOff();
    }
};

const doLoadFromDatabase = async () => {
    try {
        await deviceUnifiedStore.loadFromDatabase();
    } catch (e: any) {
        console.error("[DeviceManage] 加载数据库失败:", e);
    }
};

// 删除设备连接方式
const handleRemoveConnection = async (unifiedId: string, connectionId: string) => {
    try {
        await Dialog.confirm(t('deviceManage.confirmRemoveConnection'));
        await deviceUnifiedStore.removeDeviceConnection(unifiedId, connectionId);
        Dialog.tipSuccess(t('deviceManage.removeConnectionSuccess'));
    } catch (e: any) {
        if (e !== 'cancel') {
            Dialog.tipError(mapError(e));
        }
    }
};

// 删除设备
const handleDeleteDevice = async (unifiedId: string, deviceName: string) => {
    try {
        await Dialog.confirm(t('deviceManage.confirmDeleteDeviceDesc', { name: deviceName }));
        await deviceUnifiedStore.deleteDevice(unifiedId);
        Dialog.tipSuccess(t('deviceManage.deleteDeviceSuccess'));
    } catch (e: any) {
        if (e !== 'cancel') {
            Dialog.tipError(mapError(e));
        }
    }
};

// 监听设备 store 的变化，自动同步到设备管理页面
const setupDeviceWatcher = () => {
    console.log('[DeviceManage] ===== 设置设备监听器 =====');
    console.log('[DeviceManage] 当前设备 store 记录数:', deviceStore.records.length);
    
    // 防抖计时器
    let syncTimer: NodeJS.Timeout | null = null
    
    // 保存上一次的状态快照，用于比较
    let lastRecordsSnapshot = new Map<string, EnumDeviceStatus>()
    
    // 监听设备 store 的 records 变化
    stopWatchingDevices = watch(
        () => deviceStore.records,
        async (newRecords) => {
            console.log('[DeviceManage] ===== 检测到设备变化 =====');
            console.log('[DeviceManage] 新记录数:', newRecords.length);
            
            // 清除之前的同步任务
            if (syncTimer) {
                clearTimeout(syncTimer)
                syncTimer = null
            }
            
            // 检查设备状态是否发生变化
            const hasChanges = newRecords.some((newRecord) => {
                const deviceId = newRecord.id
                const currentStatus = newRecord.runtime?.value?.status || newRecord.status?.value
                const lastStatus = lastRecordsSnapshot.get(deviceId)
                
                console.log(`[DeviceManage] 检查设备 ${deviceId}: 当前状态=${currentStatus}, 上次状态=${lastStatus}`)
                
                // 状态发生变化
                if (currentStatus !== lastStatus) {
                    console.log(`[DeviceManage] 设备 ${deviceId} 状态变化：${lastStatus} -> ${currentStatus}`)
                    // 更新快照
                    lastRecordsSnapshot.set(deviceId, currentStatus)
                    return true
                }
                
                return false
            })
            
            // 设备数量变化或状态变化时，重新同步
            if (newRecords.length !== lastRecordsSnapshot.size || hasChanges) {
                console.log('[DeviceManage] 设备发生变化，重新同步')
                syncTimer = setTimeout(() => {
                    deviceUnifiedStore.syncDevices(false)  // 监听触发时不显示加载状态
                    // 同步完成后更新快照，避免重复触发
                    setTimeout(() => {
                        newRecords.forEach((record) => {
                            const deviceId = record.id
                            const status = record.runtime?.value?.status || record.status?.value
                            lastRecordsSnapshot.set(deviceId, status)
                        })
                        console.log('[DeviceManage] 状态快照已更新')
                    }, 50)
                }, 100)
            } else {
                console.log('[DeviceManage] 设备未发生变化，跳过同步')
            }
        },
        { deep: true }
    )
    
    console.log('[DeviceManage] 设备监听器已设置')
}

// 清理监听器
const cleanupDeviceWatcher = () => {
    if (stopWatchingDevices) {
        stopWatchingDevices()
        stopWatchingDevices = null
        console.log('[DeviceManage] 设备监听器已清理')
    }
}

onMounted(() => {
    // 确保 ADB watch 已启动（用于监听 USB 设备插入）
    deviceStore.ensureWatch().then(() => {
        console.log('[DeviceManage] ADB watch 已就绪');
    }).catch(err => {
        console.error('[DeviceManage] 初始化设备监听失败:', err);
    });
    
    // 立即刷新一次设备列表，检测当前已连接的设备
    deviceStore.refresh().then(() => {
        console.log('[DeviceManage] 设备列表已刷新');
    }).catch(err => {
        console.error('[DeviceManage] 刷新设备列表失败:', err);
    });
    
    // 初始化设备管理（包括从数据库加载和同步当前状态）
    deviceUnifiedStore.initialize().then(() => {
        console.log('[DeviceManage] 初始化完成')
    }).catch(err => {
        console.error('[DeviceManage] 初始化失败:', err)
    })
    
    // 设置设备监听器，实现实时更新
    setupDeviceWatcher()
});

onUnmounted(() => {
    // 清理监听器
    cleanupDeviceWatcher()
});
</script>

<template>
    <div
        class="pb-device-manage-container min-h-[calc(100vh-4rem)] relative select-none"
        :class="{'has-records': deviceUnifiedStore.unifiedDevices.length > 0}"
    >
        <div class="pb-header flex items-center sticky top-0 bg-white px-8 py-2 my-4"
             style="z-index:1;">
            <div class="text-3xl font-bold flex-grow">
                {{ t("deviceManage.title") }}
                <span class="text-sm font-normal text-gray-500 ml-2">
                    ({{ connectedCount }}/{{ deviceUnifiedStore.deviceCount }})
                </span>
            </div>
            <div class="flex items-center gap-2">
                <!-- 统计信息 -->
                <div class="text-sm text-gray-600">
                    <span class="mr-3">
                        <i class="iconfont icon-usb mr-1"/>
                        USB: {{ usbCount }}
                    </span>
                    <span>
                        <i class="iconfont icon-network mr-1"/>
                        WiFi: {{ wifiCount }}
                    </span>
                </div>
                
                <!-- 搜索框 -->
                <a-input-search
                    v-if="deviceUnifiedStore.unifiedDevices.length > 0"
                    v-model="searchKeywords"
                    :placeholder="t('device.searchPlaceholder')"
                    class="w-48"
                    allow-clear
                />
                
                <!-- 连接类型筛选 -->
                <a-select
                    v-model="filterConnectionType"
                    class="w-32"
                    :placeholder="t('deviceManage.connectionType')"
                    allow-clear
                >
                    <a-option value="all">{{ t("deviceManage.all") }}</a-option>
                    <a-option value="usb">USB</a-option>
                    <a-option value="wifi_debug">WiFi</a-option>
                    <a-option value="network">Network</a-option>
                </a-select>
                
                <!-- 刷新按钮 -->
                <a-button @click="doRefresh">
                    <template #icon>
                        <icon-refresh/>
                    </template>
                    {{ t("device.refresh") }}
                </a-button>
                
                <!-- 导入网络设备按钮 -->
                <a-button @click="showImportDialog = true">
                    <template #icon>
                        <icon-import/>
                    </template>
                    {{ t("deviceManage.importNetworkDevice") }}
                </a-button>
                
                <!-- 批量操作工具栏 -->
                <BatchOperationToolbar 
                    @batch-upload="handleBatchUpload"
                    @batch-delete="handleBatchDelete"
                    @batch-install="handleBatchInstall"
                    @batch-uninstall="handleBatchUninstall"
                />
                
                <!-- 更多操作 -->
                <a-dropdown trigger="hover">
                    <a-button>
                        <template #icon>
                            <icon-caret-down/>
                        </template>
                    </a-button>
                    <template #content>
                        <a-doption @click="doLoadFromDatabase">
                            {{ t("deviceManage.loadFromDatabase") }}
                        </a-doption>
                    </template>
                </a-dropdown>
            </div>
        </div>
        
        <div class="px-8">
            <!-- 空状态 -->
            <DeviceManageEmpty v-if="!deviceUnifiedStore.unifiedDevices.length"/>
            
            <!-- 筛选空状态 -->
            <DeviceManageFilterEmpty v-else-if="!filterRecords.length"/>
            
            <!-- 设备列表 -->
            <div v-else class="flex flex-wrap">
                <div v-for="(device) in filterRecords" :key="device.unifiedId"
                     class="p-2 w-full">
                    <DeviceUnifiedCard 
                        :device="device"
                        @setting="console.log('setting', device)"
                        @rename="console.log('rename', device)"
                    />
                </div>
            </div>
        </div>
        
        <!-- 加载状态 -->
        <div v-if="deviceUnifiedStore.isLoading" class="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50">
            <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl">
                <icon-loading class="text-3xl text-blue-500 animate-spin"/>
                <div class="mt-3 text-sm text-gray-600 dark:text-gray-400">
                    {{ t("device.refreshing") }}...
                </div>
            </div>
        </div>
        
        <!-- 批量上传对话框 -->
        <BatchUploadDialog
            v-model:visible="showBatchUploadDialog"
            :all-devices="deviceUnifiedStore.unifiedDevices"
            @close="showBatchUploadDialog = false"
        />
        
        <!-- 批量安装对话框 -->
        <BatchInstallDialog
            v-model:visible="showBatchInstallDialog"
            :all-devices="deviceUnifiedStore.unifiedDevices"
            @close="showBatchInstallDialog = false"
        />
        
        <!-- 导入网络设备对话框 -->
        <DeviceImportDialog ref="importDialog" v-model:visible="showImportDialog"/>
    </div>
</template>

<style scoped lang="less">
.pb-device-manage-container {
    position: relative;
    
    &.has-records:after {
        content: '';
        position: absolute;
        bottom: 0;
        right: 0;
        width: 15rem;
        height: 15rem;
        background-image: url("./../assets/image/device-bg.svg");
        background-size: contain;
        background-position: bottom;
        background-blend-mode: lighten;
        background-color: transparent;
        background-repeat: no-repeat;
        opacity: 0.3;
        z-index: 0;
        pointer-events: none;
    }
    
    // 确保内容层在插图上层
    > div {
        position: relative;
        z-index: 1;
    }
}

[data-theme="dark"] {
    .pb-device-manage-container {
        background-color: var(--color-background);

        .pb-header {
            background-color: var(--color-background);
        }
    }
}
</style>
