<script setup lang="ts">
import { ref, computed } from "vue";
import { t } from "../../lang";
import { Dialog } from "../../lib/dialog";
import type { DeviceUnifiedRecord } from "../../types/DeviceUnified";

const props = defineProps<{
    selectedDevices?: DeviceUnifiedRecord[];
}>();

const emit = defineEmits<{
    (e: "batch-upload"): void;
    (e: "batch-delete"): void;
    (e: "batch-install"): void;
    (e: "batch-uninstall"): void;
    (e: "import-network-device"): void;
    (e: "scan-mdns"): void;
}>();

const showBatchMenu = ref(false);

const selectionCount = computed(() => props.selectedDevices?.length || 0);

// 批量上传文件
const handleBatchUpload = () => {
    emit("batch-upload");
    showBatchMenu.value = false;
};

// 批量删除文件
const handleBatchDelete = () => {
    Dialog.confirm(t("batchOperation.deleteConfirm")).then(() => {
        emit("batch-delete");
        showBatchMenu.value = false;
    });
};

// 批量安装应用
const handleBatchInstall = () => {
    emit("batch-install");
    showBatchMenu.value = false;
};

// 批量卸载应用
const handleBatchUninstall = () => {
    emit("batch-uninstall");
    showBatchMenu.value = false;
};

// 导入网络设备
const handleImportNetworkDevice = () => {
    emit("import-network-device");
    showBatchMenu.value = false;
};

// 扫描 mDNS
const handleScanMdns = () => {
    emit("scan-mdns");
    showBatchMenu.value = false;
};
</script>

<template>
    <div class="batch-operation-toolbar">
        <a-popover
            v-model:popup-visible="showBatchMenu"
            trigger="click"
            position="bottom"
        >
            <a-button type="primary">
                    <template #icon>
                        <div class="flex items-center gap-1">
                            <icon-apps/>
                            <icon-caret-down/>
                        </div>
                    </template>
                    {{ t("operation.title") }}
                    <span v-if="selectionCount > 0" class="ml-1 text-xs">
                        ({{ selectionCount }})
                    </span>
                </a-button>
            
            <template #content>
                <div class="batch-operation-menu">
                    <a-doption @click="handleScanMdns">
                        <template #icon>
                            <icon-scan/>
                        </template>
                        {{ t("deviceManage.scanMdns") }}
                    </a-doption>
                    
                    <a-doption @click="handleImportNetworkDevice">
                        <template #icon>
                            <icon-import/>
                        </template>
                        {{ t("deviceManage.importNetworkDevice") }}
                    </a-doption>
                    
                    <a-doption @click="handleBatchUpload">
                        <template #icon>
                            <icon-upload/>
                        </template>
                        {{ t("batchOperation.uploadFiles") }}
                    </a-doption>
                    
                    <!-- 隐藏批量删除功能 -->
                    <!-- <a-doption @click="handleBatchDelete">
                        <template #icon>
                            <icon-delete/>
                        </template>
                        {{ t("batchOperation.deleteFiles") }}
                    </a-doption> -->
                    
                    <a-doption @click="handleBatchInstall">
                        <template #icon>
                            <icon-download/>
                        </template>
                        {{ t("batchOperation.installApps") }}
                    </a-doption>
                    
                    <!-- 隐藏批量卸载功能 -->
                    <!-- <a-doption @click="handleBatchUninstall">
                        <template #icon>
                            <icon-delete/>
                        </template>
                        {{ t("batchOperation.uninstallApps") }}
                    </a-doption> -->
                </div>
            </template>
        </a-popover>
    </div>
</template>

<style scoped lang="less">
.batch-operation-toolbar {
    .batch-operation-menu {
        min-width: 200px;
    }
}
</style>
