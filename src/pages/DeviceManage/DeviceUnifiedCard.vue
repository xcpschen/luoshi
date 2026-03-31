<script setup lang="ts">
import { computed, ref } from "vue";
import { t } from "../../lang";
import { Dialog } from "../../lib/dialog";
import { mapError } from "../../lib/error";
import { useDeviceUnifiedStore } from "../../store/modules/deviceUnified";
import { useDeviceStore } from "../../store/modules/device";
import type { DeviceUnifiedRecord, DeviceConnection } from "../../types/DeviceUnified";
import { EnumDeviceStatus } from "../../types/Device";
import { EnumDeviceType } from "../../types/Device";
import { EnumConnectionType } from "../../types/DeviceUnified";
import InputInlineEditor from "../../components/common/InputInlineEditor.vue";
import { getOrCreateConnection } from "../../lib/deviceConnection";

// 对话框组件引用
import DeviceFileUploadDialog from "../Device/DeviceFileUploadDialog.vue";
import DeviceAppManagerDialog from "../Device/DeviceAppManagerDialog.vue";
import DeviceAppInstallDialog from "../Device/DeviceAppInstallDialog.vue";
import DeviceSettingDialog from "../Device/DeviceSettingDialog.vue";
import DeviceAdbShellDialog from "../Device/DeviceAdbShellDialog.vue";
import DeviceActionConnect from "../Device/DeviceActionConnect.vue";
import DeviceActionDisconnect from "../Device/DeviceActionDisconnect.vue";
import DeviceActionWifiOn from "../Device/DeviceActionWifiOn.vue";
import DeviceActionWifiOff from "../Device/DeviceActionWifiOff.vue";

const props = defineProps<{
    device: DeviceUnifiedRecord
}>();

const emit = defineEmits<{
    (e: "setting"): void;
    (e: "rename"): void;
    (e: "delete"): void;
}>();

const deviceUnifiedStore = useDeviceUnifiedStore();
const deviceStore = useDeviceStore();

// 对话框引用
const fileUploadDialog = ref<InstanceType<typeof DeviceFileUploadDialog> | null>(null);
const appManagerDialog = ref<InstanceType<typeof DeviceAppManagerDialog> | null>(null);
const appInstallDialog = ref<InstanceType<typeof DeviceAppInstallDialog> | null>(null);
const settingDialog = ref<InstanceType<typeof DeviceSettingDialog> | null>(null);
const adbShellDialog = ref<InstanceType<typeof DeviceAdbShellDialog> | null>(null);

const isExpanded = ref(false);

// 获取默认连接 ID（第一个在线的连接，如果没有则取第一个）
const defaultConnectionId = computed(() => {
    // 优先查找第一个在线的连接
    const connected = props.device.connections.find(
        conn => conn.status === EnumDeviceStatus.DEVICE
    );
    // 如果没有在线的，就取第一个连接
    return connected?.id || props.device.connections[0]?.id;
});

// 判断是否是默认连接
const isDefaultConnection = (conn: DeviceConnection) => {
    return conn.id === defaultConnectionId.value;
};

// 处理删除事件（传递给父组件）
const handleDelete = () => {
    emit('delete');
};

// 获取设备状态（基于所有连接）
const deviceStatus = computed(() => {
    const onlineConnections = props.device.connections.filter(
        conn => conn.status === "device" as EnumDeviceStatus
    );
    if (onlineConnections.length === 0) {
        return "offline";
    } else if (onlineConnections.length < props.device.connections.length) {
        return "partial";
    }
    return "online";
});

// 获取设备的 EnumDeviceStatus（用于显示）
const getDeviceStatus = () => {
    const onlineConnections = props.device.connections.filter(
        conn => conn.status === "device" as EnumDeviceStatus
    );
    if (onlineConnections.length === 0) {
        return EnumDeviceStatus.DISCONNECTED;
    } else if (onlineConnections.length < props.device.connections.length) {
        return EnumDeviceStatus.WAIT_CONNECTING;
    }
    return EnumDeviceStatus.CONNECTED;
};

// 获取用于操作的设备记录（转换为 DeviceRecord 格式）
const getDeviceRecordForAction = () => {
    const firstConnection = props.device.connections[0];
    return {
        id: firstConnection?.address || props.device.unifiedId,
        name: props.device.name,
        type: firstConnection?.type === 'usb' ? EnumDeviceType.USB : EnumDeviceType.WIFI,
        status: getDeviceStatus(),
        setting: props.device.setting,
    } as any;
};

// 检查是否有 USB 连接
const hasUSBConnection = () => {
    return props.device.connections.some(conn => conn.type === 'usb');
};

// 检查是否有 WiFi 连接
const hasWiFiConnection = () => {
    return props.device.connections.some(conn => conn.type === 'wifi_debug');
};

// 获取连接类型图标
const connectionTypeIcon = computed(() => {
    const types = props.device.connections.map(c => c.type);
    
    if (types.includes(EnumConnectionType.USB) && types.includes(EnumConnectionType.WIFI_DEBUG)) {
        return "icon-link"; // 混合连接
    } else if (types.includes(EnumConnectionType.USB)) {
        return "icon-usb";
    } else {
        return "icon-wifi";
    }
});

// 获取活跃连接数
const activeConnectionCount = computed(() => {
    return props.device.connections.filter(
        conn => conn.status ==="device" as EnumDeviceStatus
    ).length;
});

// 更新设备名称
const onEditName = async (newName: string) => {
    try {
        await deviceUnifiedStore.updateDeviceName(props.device.unifiedId, newName);
        Dialog.tipSuccess(t("device.editSuccess"));
        emit("rename");
    } catch (e: any) {
        Dialog.tipError(mapError(e));
    }
};

// 添加标签
const onAddTag = async () => {
    try {
        const tagName = await Dialog.prompt(t("deviceManage.enterTagName"), "");
        if (!tagName) return;
        
        await deviceUnifiedStore.addDeviceTag(props.device.unifiedId, tagName.trim());
        Dialog.tipSuccess(t("deviceManage.tagAdded"));
    } catch (e: any) {
        if (e !== 'cancel') {
            Dialog.tipError(mapError(e));
        }
    }
};

// 移除标签
const onRemoveTag = async (tag: string) => {
    try {
        await deviceUnifiedStore.removeDeviceTag(props.device.unifiedId, tag);
        Dialog.tipSuccess(t("deviceManage.tagRemoved"));
    } catch (e: any) {
        Dialog.tipError(mapError(e));
    }
};

// 复制设备信息
const onCopyDeviceInfo = () => {
    const info = `${props.device.name}\n${props.device.identity.model}\nAndroid ${props.device.identity.androidVersion} (SDK ${props.device.identity.sdkVersion})`;
    navigator.clipboard.writeText(info);
    Dialog.tipSuccess(t("deviceManage.copied"));
};

// 切换连接展开/收起
const toggleConnections = () => {
    isExpanded.value = !isExpanded.value;
};

// 删除设备连接
const handleRemoveConnection = async (connectionId: string) => {
    try {
        await Dialog.confirm(t('deviceManage.confirmRemoveConnection'));
        await deviceUnifiedStore.removeDeviceConnection(props.device.unifiedId, connectionId);
        Dialog.tipSuccess(t('deviceManage.removeConnectionSuccess'));
        emit('delete');
    } catch (e: any) {
        if (e !== 'cancel') {
            Dialog.tipError(mapError(e));
        }
    }
};

// 删除设备
const handleDeleteDevice = async () => {
    try {
        await Dialog.confirm(t('deviceManage.confirmDeleteDeviceDesc', { name: props.device.name }));
        await deviceUnifiedStore.deleteDevice(props.device.unifiedId);
        Dialog.tipSuccess(t('deviceManage.deleteDeviceSuccess'));
        emit('delete');
    } catch (e: any) {
        if (e !== 'cancel') {
            Dialog.tipError(mapError(e));
        }
    }
};

/**
 * 获取或连接设备，返回可用的设备 ID
 */
const getOrCreateDeviceId = async (): Promise<string | null> => {
    const connection = await getOrCreateConnection(
        props.device.connections,
        (conn, success) => {
            if (!success) {
                console.warn('[DeviceUnifiedCard] 连接失败:', conn.address);
            }
        }
    );
    
    if (!connection) {
        return null;
    }
    
    return connection.address;
};

/**
 * 投屏到电脑
 */
const handleMirror = async () => {
    try {
        const deviceId = await getOrCreateDeviceId();
        if (!deviceId) {
            Dialog.tipError(t('deviceManage.noConnectionAvailable'));
            return;
        }
        
        // 在 device store 中查找对应的设备
        const deviceRecord = deviceStore.records.find(r => r.id === deviceId);
        if (!deviceRecord) {
            Dialog.tipError(t('deviceManage.deviceNotFound'));
            return;
        }
        
        // 调用 device store 的投屏功能
        await deviceStore.doMirror(deviceRecord);
    } catch (error: any) {
        console.error('[DeviceUnifiedCard] 投屏失败:', error);
        Dialog.tipError(mapError(error));
    }
};

/**
 * 文件上传
 */
const handleFileUpload = async () => {
    try {
        const deviceId = await getOrCreateDeviceId();
        if (!deviceId) {
            Dialog.tipError(t('deviceManage.noConnectionAvailable'));
            return;
        }
        
        // 在 device store 中查找对应的设备
        const deviceRecord = deviceStore.records.find(r => r.id === deviceId);
        if (!deviceRecord) {
            Dialog.tipError(t('deviceManage.deviceNotFound'));
            return;
        }
        
        // 打开文件上传对话框
        fileUploadDialog.value?.show(deviceRecord);
    } catch (error: any) {
        console.error('[DeviceUnifiedCard] 文件上传失败:', error);
        Dialog.tipError(mapError(error));
    }
};

/**
 * 应用管理
 */
const handleAppManage = async () => {
    try {
        const deviceId = await getOrCreateDeviceId();
        if (!deviceId) {
            Dialog.tipError(t('deviceManage.noConnectionAvailable'));
            return;
        }
        
        // 在 device store 中查找对应的设备
        const deviceRecord = deviceStore.records.find(r => r.id === deviceId);
        if (!deviceRecord) {
            Dialog.tipError(t('deviceManage.deviceNotFound'));
            return;
        }
        
        // 打开应用管理对话框
        appManagerDialog.value?.show(deviceRecord);
    } catch (error: any) {
        console.error('[DeviceUnifiedCard] 应用管理失败:', error);
        Dialog.tipError(mapError(error));
    }
};

/**
 * 安装应用
 */
const handleAppInstall = async () => {
    try {
        const deviceId = await getOrCreateDeviceId();
        if (!deviceId) {
            Dialog.tipError(t('deviceManage.noConnectionAvailable'));
            return;
        }
        
        // 在 device store 中查找对应的设备
        const deviceRecord = deviceStore.records.find(r => r.id === deviceId);
        if (!deviceRecord) {
            Dialog.tipError(t('deviceManage.deviceNotFound'));
            return;
        }
        
        // 打开应用安装对话框
        appInstallDialog.value?.show(deviceRecord);
    } catch (error: any) {
        console.error('[DeviceUnifiedCard] 应用安装失败:', error);
        Dialog.tipError(mapError(error));
    }
};

/**
 * ADB Shell（命令行）
 */
const handleAdbShell = async () => {
    try {
        const deviceId = await getOrCreateDeviceId();
        if (!deviceId) {
            Dialog.tipError(t('deviceManage.noConnectionAvailable'));
            return;
        }
        
        // 在 device store 中查找对应的设备
        const deviceRecord = deviceStore.records.find(r => r.id === deviceId);
        if (!deviceRecord) {
            Dialog.tipError(t('deviceManage.deviceNotFound'));
            return;
        }
        
        // 打开 ADB Shell 对话框
        adbShellDialog.value?.show(deviceRecord);
    } catch (error: any) {
        console.error('[DeviceUnifiedCard] ADB Shell 失败:', error);
        Dialog.tipError(mapError(error));
    }
};

/**
 * 设备设置
 * 不需要设备在线，直接打开设置对话框
 */
const handleSettings = async () => {
    try {
        // 创建一个临时的设备记录，包含必要的信息
        const tempDeviceRecord: any = {
            id: props.device.connections[0]?.address || props.device.unifiedId,
            name: props.device.name,
            setting: { ...props.device.setting },  // 复制当前设置
        };
        
        // 打开设置对话框
        settingDialog.value?.show(tempDeviceRecord);
    } catch (error: any) {
        console.error('[DeviceUnifiedCard] 设置失败:', error);
        Dialog.tipError(mapError(error));
    }
};
</script>

<template>
    <div
        class="hover:shadow-lg bg-white dark:bg-gray-800 shadow border border-solid border-gray-100 dark:border-gray-800 rounded-lg overflow-hidden transition-all duration-200"
        :class="{'border-blue-400': deviceStatus === 'online'}"
    >
        <!-- 卡片头部 -->
        <div class="flex items-center p-4 border-b border-gray-100 dark:border-gray-700">
            <!-- 设备图标和状态 -->
            <div class="flex-shrink-0 mr-4">
                <div class="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white">
                    <component :is="connectionTypeIcon" class="text-xl"/>
                </div>
            </div>
            
            <!-- 设备信息 -->
            <div class="flex-grow min-w-0">
                <div class="flex items-center gap-2">
                    <InputInlineEditor :value="device.name" @change="onEditName">
                        <h3 class="text-lg font-semibold truncate cursor-pointer hover:text-blue-500">
                            {{ device.name }}
                        </h3>
                        <template #action>
                            <icon-pen class="text-xs text-gray-400 hover:text-blue-500 ml-1"/>
                        </template>
                    </InputInlineEditor>
                    
                    <!-- 状态指示器 -->
                    <a-tooltip :content="t(`deviceManage.status.${deviceStatus}`)">
                        <span
                            class="w-2 h-2 rounded-full"
                            :class="{
                                'bg-green-500': deviceStatus === 'online',
                                'bg-yellow-500': deviceStatus === 'partial',
                                'bg-gray-400': deviceStatus === 'offline'
                            }"
                        ></span>
                    </a-tooltip>
                </div>
                
                <div class="text-sm text-gray-600 dark:text-gray-400 truncate">
                    {{ device.identity.brand }} {{ device.identity.model }}
                    <span class="mx-1">•</span>
                    Android {{ device.identity.androidVersion }}
                    <span class="mx-1">•</span>
                    SDK {{ device.identity.sdkVersion }}
                </div>
                
                <!-- 连接信息 -->
                <div class="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    <span v-if="activeConnectionCount > 0">
                        {{ activeConnectionCount }}/{{ device.connections.length }} 
                        {{ t("deviceManage.connectionsActive") }}
                    </span>
                    <span v-else>
                        {{ t("deviceManage.noActiveConnection") }}
                    </span>
                </div>
            </div>
            
            <!-- 操作按钮 -->
            <div class="flex-shrink-0 flex items-center gap-1 ml-4">
                <a-tooltip :content="t('deviceManage.copyInfo')">
                    <a-button size="small" @click="onCopyDeviceInfo">
                        <template #icon>
                            <icon-copy class="text-gray-500"/>
                        </template>
                    </a-button>
                </a-tooltip>
                
                <a-tooltip :content="t('deviceManage.showConnectionDetails')">
                    <a-button size="small" @click="toggleConnections">
                        <template #icon>
                            <icon-eye class="text-gray-500"/>
                        </template>
                    </a-button>
                </a-tooltip>
                
                <a-popconfirm
                    :content="t('deviceManage.confirmDeleteDeviceDesc', { name: device.name })"
                    @ok="handleDeleteDevice"
                    type="error"
                >
                    <a-tooltip :content="t('deviceManage.deleteDevice')">
                        <a-button size="small">
                            <template #icon>
                                <icon-delete class="text-red-500"/>
                            </template>
                        </a-button>
                    </a-tooltip>
                </a-popconfirm>
            </div>
        </div>
        
        <!-- 标签区域 -->
        <div class="px-4 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
            <div class="flex flex-wrap items-center gap-1">
                <a-tag
                    v-for="tag in device.tags"
                    :key="tag"
                    closable
                    @close="onRemoveTag(tag)"
                    class="text-xs"
                >
                    {{ tag }}
                </a-tag>
                
                <!-- 添加标签按钮 -->
                <a-button size="mini" @click="onAddTag" class="text-xs">
                    <template #icon>
                        <icon-plus/>
                    </template>
                    {{ t("deviceManage.addTag") }}
                </a-button>
            </div>
        </div>
        
        <!-- 连接详情（可展开） -->
        <div v-show="isExpanded" class="p-4 border-t border-gray-100 dark:border-gray-700">
            <h4 class="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">
                {{ t("deviceManage.connectionDetails") }}
            </h4>
            
            <div class="space-y-2">
                <div
                    v-for="conn in device.connections"
                    :key="conn.id"
                    class="flex items-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                    :class="{'border-l-4 border-green-500': isDefaultConnection(conn)}"
                >
                    <!-- 连接类型图标 -->
                    <div class="flex-shrink-0 mr-3">
                        <i v-if="conn.type === EnumConnectionType.USB" class="iconfont icon-usb text-gray-500"/>
                        <i v-else-if="conn.type === EnumConnectionType.WIFI_DEBUG" class="iconfont icon-network text-gray-500"/>
                        <icon-link v-else class="text-gray-500"/>
                    </div>
                    
                    <!-- 连接信息 -->
                    <div class="flex-grow">
                        <div class="flex items-center justify-between">
                            <div class="text-sm font-medium">
                                {{ t(`deviceManage.connectionType.${conn.type}`) }}
                                <span v-if="isDefaultConnection(conn)" class="ml-2 text-xs text-blue-500">
                                    {{ t("deviceManage.default") }}
                                </span>
                            </div>
                            <div class="flex items-center gap-2">
                                <span
                                    class="text-xs px-2 py-1 rounded"
                                    :class="{
                                        'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300': conn.status === EnumDeviceStatus.DEVICE,
                                        'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300': conn.status === EnumDeviceStatus.WAIT_CONNECTING,
                                        'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300': conn.status === EnumDeviceStatus.DISCONNECTED
                                    }"
                                >
                                    {{ t(`device.status.${conn.status}`) }}
                                </span>
                                <a-button size="mini" @click="handleRemoveConnection(conn.id)" class="text-red-500">
                                    <template #icon>
                                        <icon-delete/>
                                    </template>
                                </a-button>
                            </div>
                        </div>
                        <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {{ conn.address }}
                            <span class="mx-1">•</span>
                            {{ t("deviceManage.lastActive") }}: {{ new Date(conn.lastActiveAt).toLocaleString() }}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- 卡片底部 -->
        <div class="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <div class="text-xs text-gray-500 dark:text-gray-400">
                {{ t("deviceManage.firstConnected") }}: {{ new Date(device.firstConnectedAt).toLocaleDateString() }}
                <span class="mx-1">•</span>
                {{ t("deviceManage.totalConnections") }}: {{ device.totalConnections }}
            </div>
            
            <div class="flex items-center gap-2">
                <a-button size="small" @click="handleMirror">
                    <template #icon>
                        <i class="iconfont icon-mirror"/>
                    </template>
                    {{ t("deviceManage.mirror") }}
                </a-button>
                
                <a-button size="small" @click="handleFileUpload">
                    <template #icon>
                        <icon-upload/>
                    </template>
                    {{ t("deviceManage.fileUpload") }}
                </a-button>
                
                <a-dropdown trigger="hover" :popup-max-height="false">
                    <a-button size="small">
                        <template #icon>
                            <i class="iconfont icon-apk"/>
                        </template>
                        {{ t("deviceManage.apps") }}
                    </a-button>
                    <template #content>
                        <a-doption @click="handleAppManage">
                            <icon-apps class="mr-2"/>
                            {{ t("deviceManage.appManager") }}
                        </a-doption>
                        <a-doption @click="handleAppInstall">
                            <icon-plus class="mr-2"/>
                            {{ t("deviceManage.appInstall") }}
                        </a-doption>
                    </template>
                </a-dropdown>
                
                <a-dropdown trigger="hover" :popup-max-height="false">
                    <a-button size="small">
                        <template #icon>
                            <icon-settings/>
                        </template>
                        {{ t("deviceManage.settings") }}
                    </a-button>
                    <template #content>
                        <!-- 连接设备（设备离线时显示） -->
                        <DeviceActionConnect
                            v-if="getDeviceStatus() === EnumDeviceStatus.DISCONNECTED"
                            :device="getDeviceRecordForAction()"
                        />
                        
                        <!-- 断开连接（设备在线时显示） -->
                        <DeviceActionDisconnect
                            v-if="getDeviceStatus() === EnumDeviceStatus.CONNECTED"
                            :device="getDeviceRecordForAction()"
                        />
                        
                        <!-- 添加为网络设备（USB 设备在线时显示） -->
                        <DeviceActionWifiOn
                            v-if="hasUSBConnection() && getDeviceStatus() === EnumDeviceStatus.CONNECTED"
                            :device="getDeviceRecordForAction()"
                        />
                        
                        <!-- 移除网络设备（WiFi 设备时显示） -->
                        <DeviceActionWifiOff
                            v-if="hasWiFiConnection()"
                            :device="getDeviceRecordForAction()"
                        />
                        
                        <a-doption @click="handleAdbShell">
                            <icon-command class="mr-2"/>
                            {{ t("deviceManage.commandLine") }}
                        </a-doption>
                        
                        <a-doption @click="handleSettings">
                            <icon-settings class="mr-2"/>
                            {{ t("deviceManage.deviceSettings") }}
                        </a-doption>
                    </template>
                </a-dropdown>
                
            </div>
        </div>
    </div>
    
    <!-- 对话框组件 -->
    <DeviceFileUploadDialog ref="fileUploadDialog"/>
    <DeviceAppManagerDialog ref="appManagerDialog"/>
    <DeviceAppInstallDialog ref="appInstallDialog"/>
    <DeviceSettingDialog ref="settingDialog"/>
    <DeviceAdbShellDialog ref="adbShellDialog"/>
</template>

<style scoped lang="less">
.rotate-180 {
    transform: rotate(180deg);
}
</style>
