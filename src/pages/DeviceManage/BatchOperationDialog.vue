<script setup lang="ts">
import { ref, watch, onUnmounted } from "vue";
import { t } from "../../lang";
import { 
    BatchOperationService,
    BatchOperationRecord,
    BatchOperationTask,
    EnumBatchOperationStatus,
    BatchOperationProgressEvent 
} from "../lib/BatchOperationService";
import type { DeviceUnifiedRecord } from "../types/DeviceUnified";

const props = defineProps<{
    visible: boolean;
}>();

const emit = defineEmits<{
    (e: "update:visible", value: boolean): void;
    (e: "close"): void;
}>();

const currentOperation = ref<BatchOperationRecord | null>(null);
const progressVisible = ref(false);
const progressPercent = ref(0);
const statusMessage = ref("");
const taskDetails = ref<BatchOperationTask[]>([]);

// 监听进度事件
const handleProgress = (event: BatchOperationProgressEvent) => {
    progressPercent.value = event.progress;
    statusMessage.value = event.message || "";
    
    if (currentOperation.value) {
        taskDetails.value = [...currentOperation.value.tasks];
    }
};

// 开始批量文件上传
const startFileUpload = async (devices: DeviceUnifiedRecord[], filePaths: string[], targetPath: string) => {
    try {
        progressVisible.value = true;
        progressPercent.value = 0;
        taskDetails.value = [];
        statusMessage.value = t("batchOperation.startingUpload");
        
        const result = await BatchOperationService.executeFileUpload({
            devices,
            filePaths,
            targetPath,
        });
        
        currentOperation.value = null;
        progressVisible.value = false;
        
        if (result.success) {
            emit("update:visible", false);
            emit("close");
        }
    } catch (error: any) {
        progressVisible.value = false;
        console.error("批量上传失败:", error);
    }
};

// 取消操作
const cancelOperation = () => {
    if (currentOperation.value) {
        BatchOperationService.cancelOperation(currentOperation.value.operationId);
        statusMessage.value = t("batchOperation.cancelling");
    }
};

// 监听 visible 变化
watch(() => props.visible, (newVal) => {
    if (!newVal) {
        currentOperation.value = null;
        progressVisible.value = false;
    }
});

// 清理监听器
onUnmounted(() => {
    if (currentOperation.value) {
        BatchOperationService.offProgress(currentOperation.value.operationId, handleProgress);
    }
});

// 暴露方法给父组件
defineExpose({
    startFileUpload,
});
</script>

<template>
    <a-modal
        v-model:visible="progressVisible"
        :title="t('batchOperation.progress')"
        :closable="false"
        :mask-closable="false"
        width="600px"
    >
        <div class="batch-operation-progress">
            <!-- 总体进度 -->
            <div class="mb-4">
                <div class="flex justify-between mb-2">
                    <span class="text-sm font-medium">{{ statusMessage }}</span>
                    <span class="text-sm text-gray-500">{{ progressPercent }}%</span>
                </div>
                <a-progress 
                    :percent="progressPercent" 
                    :show-text="false"
                    :stroke-width="8"
                />
            </div>
            
            <!-- 任务详情 -->
            <div class="task-details mt-4 max-h-64 overflow-y-auto">
                <div 
                    v-for="task in taskDetails" 
                    :key="task.taskId"
                    class="task-item p-2 mb-2 rounded border"
                    :class="{
                        'bg-green-50 border-green-200': task.status === EnumBatchOperationStatus.SUCCESS,
                        'bg-red-50 border-red-200': task.status === EnumBatchOperationStatus.FAILED,
                        'bg-yellow-50 border-yellow-200': task.status === EnumBatchOperationStatus.RUNNING,
                        'bg-gray-50 border-gray-200': task.status === EnumBatchOperationStatus.PENDING,
                    }"
                >
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <icon-loading v-if="task.status === EnumBatchOperationStatus.RUNNING" class="animate-spin"/>
                            <icon-check-circle v-else-if="task.status === EnumBatchOperationStatus.SUCCESS" class="text-green-500"/>
                            <icon-close-circle v-else-if="task.status === EnumBatchOperationStatus.FAILED" class="text-red-500"/>
                            <icon-minus-circle v-else class="text-gray-400"/>
                            
                            <span class="text-sm">
                                {{ task.device?.name || task.deviceId }}
                            </span>
                        </div>
                        
                        <div class="flex items-center gap-2">
                            <span class="text-xs text-gray-500">
                                {{ task.progress }}%
                            </span>
                            <a-tag v-if="task.error" color="red" size="small">
                                {{ task.error }}
                            </a-tag>
                        </div>
                    </div>
                    
                    <!-- 单个任务进度 -->
                    <a-progress 
                        v-if="task.status === EnumBatchOperationStatus.RUNNING"
                        :percent="task.progress"
                        :show-text="false"
                        :stroke-width="4"
                        class="mt-2"
                    />
                </div>
            </div>
        </div>
        
        <template #footer>
            <a-button 
                v-if="currentOperation && currentOperation.status === EnumBatchOperationStatus.RUNNING"
                @click="cancelOperation"
            >
                {{ t("common.cancel") }}
            </a-button>
            <a-button 
                v-else
                @click="progressVisible = false"
            >
                {{ t("common.close") }}
            </a-button>
        </template>
    </a-modal>
</template>

<style scoped lang="less">
.batch-operation-progress {
    .task-item {
        transition: all 0.2s;
    }
}
</style>
