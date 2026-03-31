<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { t } from "../../lang";
import { Dialog } from "../../lib/dialog";
import type { AutomationScript, AutomationAction, TouchActionParams } from "../../types/ImageRecognition";
import { EnumTouchActionType } from "../../types/ImageRecognition";

const props = defineProps<{
    visible: boolean;
    script?: AutomationScript | null;
}>();

const emit = defineEmits<{
    (e: "update:visible", value: boolean): void;
    (e: "save", script: AutomationScript): void;
}>();

// 使用 computed 实现 v-model:visible 的双向绑定
const visibleModel = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
});

const scriptName = ref("");
const scriptDescription = ref("");
const actions = ref<AutomationAction[]>([]);
const selectedActionId = ref<string | null>(null);

// 当前选中的操作
const selectedAction = computed(() => {
    return actions.value.find(a => a.id === selectedActionId.value);
});

// 操作类型选项
const actionTypeOptions = [
    { label: "点击", value: "touch", actionType: "tap" },
    { label: "长按", value: "touch", actionType: "long_press" },
    { label: "滑动", value: "touch", actionType: "swipe" },
    { label: "文本输入", value: "text" },
    { label: "等待", value: "wait" },
];

// 添加操作
const addTouchAction = (actionType: string) => {
    const newAction: AutomationAction = {
        id: crypto.randomUUID(),
        type: "touch",
        params: {
            actionType: actionType as any,
            x: 0,
            y: 0,
            duration: actionType === "long_press" ? 1000 : undefined,
        },
        description: `${actionType}操作`,
        delay: 0,
    };
    actions.value.push(newAction);
    selectedActionId.value = newAction.id;
};

const addTextAction = () => {
    const newAction: AutomationAction = {
        id: crypto.randomUUID(),
        type: "text",
        params: {
            text: "",
            clear: false,
        },
        description: "文本输入",
        delay: 0,
    };
    actions.value.push(newAction);
    selectedActionId.value = newAction.id;
};

const addWaitAction = () => {
    const newAction: AutomationAction = {
        id: crypto.randomUUID(),
        type: "wait",
        params: {
            duration: 1000,
        },
        description: "等待",
        delay: 0,
    };
    actions.value.push(newAction);
    selectedActionId.value = newAction.id;
};

// 删除操作
const deleteAction = (actionId: string) => {
    const index = actions.value.findIndex(a => a.id === actionId);
    if (index > -1) {
        actions.value.splice(index, 1);
        if (selectedActionId.value === actionId) {
            selectedActionId.value = null;
        }
    }
};

// 上移操作
const moveActionUp = (actionId: string) => {
    const index = actions.value.findIndex(a => a.id === actionId);
    if (index > 0) {
        [actions.value[index - 1], actions.value[index]] = 
        [actions.value[index], actions.value[index - 1]];
    }
};

// 下移操作
const moveActionDown = (actionId: string) => {
    const index = actions.value.findIndex(a => a.id === actionId);
    if (index < actions.value.length - 1) {
        [actions.value[index], actions.value[index + 1]] = 
        [actions.value[index + 1], actions.value[index]];
    }
};

// 保存脚本
const saveScript = () => {
    if (!scriptName.value.trim()) {
        Dialog.tipWarning("请输入脚本名称");
        return;
    }

    if (actions.value.length === 0) {
        Dialog.tipWarning("请至少添加一个操作");
        return;
    }

    const script: AutomationScript = {
        id: props.script?.id || crypto.randomUUID(),
        name: scriptName.value,
        description: scriptDescription.value,
        actions: actions.value,
        createdAt: props.script?.createdAt || new Date(),
        updatedAt: new Date(),
        version: props.script?.version || "1.0.0",
        tags: props.script?.tags || [],
    };

    emit("save", script);
    emit("update:visible", false);
    Dialog.tipSuccess("脚本已保存");
};

// 监听 visible 变化
watch(() => props.visible, (newVal) => {
    if (newVal) {
        // 打开对话框时初始化数据
        if (props.script) {
            scriptName.value = props.script.name;
            scriptDescription.value = props.script.description || "";
            actions.value = [...props.script.actions];
        } else {
            scriptName.value = "";
            scriptDescription.value = "";
            actions.value = [];
        }
        selectedActionId.value = null;
    }
});
</script>

<template>
    <a-modal
        v-model:visible="visibleModel"
        :title="script ? '编辑脚本' : '创建脚本'"
        width="900px"
        :footer="false"
    >
        <div class="automation-editor flex gap-4" style="height: 600px;">
            <!-- 左侧：操作列表 -->
            <div class="action-list flex-1 flex flex-col border rounded-lg p-3 bg-gray-50">
                <div class="flex items-center justify-between mb-3">
                    <h3 class="font-semibold">操作序列</h3>
                    <a-dropdown>
                        <a-button size="small">
                            <template #icon>
                                <div class="flex items-center gap-1">
                                    <icon-plus/>
                                    <icon-down/>
                                </div>
                            </template>
                            添加操作
                        </a-button>
                        <template #content>
                            <a-doption @click="addTouchAction('tap')">
                                <icon-click/> 点击
                            </a-doption>
                            <a-doption @click="addTouchAction('long_press')">
                                <icon-clock-circle/> 长按
                            </a-doption>
                            <a-doption @click="addTouchAction('swipe')">
                                <icon-swap/> 滑动
                            </a-doption>
                            <a-doption @click="addTextAction">
                                <icon-edit/> 文本输入
                            </a-doption>
                            <a-doption @click="addWaitAction">
                                <icon-loading/> 等待
                            </a-doption>
                        </template>
                    </a-dropdown>
                </div>

                <div class="flex-1 overflow-y-auto">
                    <div
                        v-for="(action, index) in actions"
                        :key="action.id"
                        class="action-item p-3 mb-2 rounded-lg border cursor-pointer transition-all"
                        :class="{
                            'border-blue-500 bg-blue-50': selectedActionId === action.id,
                            'border-gray-200 bg-white hover:border-gray-300': selectedActionId !== action.id,
                        }"
                        @click="selectedActionId = action.id"
                    >
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <span class="text-xs text-gray-500 w-6">{{ index + 1 }}</span>
                                <icon-click v-if="action.type === 'touch' && (action.params as any).actionType === 'tap'" class="text-blue-500"/>
                                <icon-clock-circle v-else-if="action.type === 'touch' && (action.params as any).actionType === 'long_press'" class="text-orange-500"/>
                                <icon-swap v-else-if="action.type === 'touch' && (action.params as any).actionType === 'swipe'" class="text-green-500"/>
                                <icon-edit v-else-if="action.type === 'text'" class="text-purple-500"/>
                                <icon-loading v-else-if="action.type === 'wait'" class="text-gray-500"/>
                                
                                <span class="text-sm font-medium">
                                    {{ action.description || '未命名操作' }}
                                </span>
                            </div>

                            <div class="flex items-center gap-1">
                                <a-button size="mini" @click.stop="moveActionUp(action.id)" :disabled="index === 0">
                                    <template #icon>
                                        <icon-arrow-up/>
                                    </template>
                                </a-button>
                                <a-button size="mini" @click.stop="moveActionDown(action.id)" :disabled="index === actions.length - 1">
                                    <template #icon>
                                        <icon-arrow-down/>
                                    </template>
                                </a-button>
                                <a-button size="mini" status="danger" @click.stop="deleteAction(action.id)">
                                    <template #icon>
                                        <icon-delete/>
                                    </template>
                                </a-button>
                            </div>
                        </div>
                    </div>

                    <div v-if="actions.length === 0" class="text-center text-gray-400 py-10">
                        <icon-empty class="text-4xl mb-2"/>
                        <div class="text-sm">暂无操作，请从右上角添加</div>
                    </div>
                </div>
            </div>

            <!-- 右侧：操作详情 -->
            <div class="action-detail flex-1 flex flex-col border rounded-lg p-3">
                <h3 class="font-semibold mb-3">操作详情</h3>

                <div v-if="selectedAction" class="flex-1 overflow-y-auto">
                    <a-form layout="vertical">
                        <a-form-item label="操作描述">
                            <a-input v-model="selectedAction.description" placeholder="请输入操作描述"/>
                        </a-form-item>

                        <a-form-item label="延迟时间（毫秒）">
                            <a-input-number v-model="selectedAction.delay" :min="0" :step="100" placeholder="0"/>
                        </a-form-item>

                        <!-- 触控操作参数 -->
                        <template v-if="selectedAction.type === 'touch'">
                            <a-form-item label="操作类型">
                                <a-select v-model="(selectedAction.params as any).actionType" disabled>
                                    <a-option value="tap">点击</a-option>
                                    <a-option value="long_press">长按</a-option>
                                    <a-option value="swipe">滑动</a-option>
                                </a-select>
                            </a-form-item>

                            <template v-if="(selectedAction.params as any).actionType !== 'swipe'">
                                <a-form-item label="X 坐标">
                                    <a-input-number v-model="(selectedAction.params as TouchActionParams).x" :min="0" placeholder="0"/>
                                </a-form-item>
                                <a-form-item label="Y 坐标">
                                    <a-input-number v-model="(selectedAction.params as TouchActionParams).y" :min="0" placeholder="0"/>
                                </a-form-item>
                            </template>

                            <template v-else>
                                <a-form-item label="起始 X">
                                    <a-input-number v-model="(selectedAction.params as any).fromX" :min="0" placeholder="0"/>
                                </a-form-item>
                                <a-form-item label="起始 Y">
                                    <a-input-number v-model="(selectedAction.params as any).fromY" :min="0" placeholder="0"/>
                                </a-form-item>
                                <a-form-item label="结束 X">
                                    <a-input-number v-model="(selectedAction.params as any).toX" :min="0" placeholder="0"/>
                                </a-form-item>
                                <a-form-item label="结束 Y">
                                    <a-input-number v-model="(selectedAction.params as any).toY" :min="0" placeholder="0"/>
                                </a-form-item>
                            </template>

                            <a-form-item v-if="(selectedAction.params as any).actionType === 'long_press'" label="持续时间（毫秒）">
                                <a-input-number v-model="(selectedAction.params as any).duration" :min="0" :step="100" placeholder="1000"/>
                            </a-form-item>
                        </template>

                        <!-- 文本输入参数 -->
                        <template v-if="selectedAction.type === 'text'">
                            <a-form-item label="输入文本">
                                <a-textarea v-model="(selectedAction.params as any).text" placeholder="请输入要输入的文本" :auto-size="{ minRows: 3, maxRows: 6 }"/>
                            </a-form-item>
                            <a-form-item label="清空现有内容">
                                <a-switch v-model="(selectedAction.params as any).clear"/>
                            </a-form-item>
                        </template>

                        <!-- 等待参数 -->
                        <template v-if="selectedAction.type === 'wait'">
                            <a-form-item label="等待时间（毫秒）">
                                <a-input-number v-model="(selectedAction.params as any).duration" :min="0" :step="100" placeholder="1000"/>
                            </a-form-item>
                        </template>
                    </a-form>
                </div>

                <div v-else class="flex-1 flex items-center justify-center text-gray-400">
                    <div class="text-center">
                        <icon-click class="text-4xl mb-2"/>
                        <div class="text-sm">请选择一个操作进行编辑</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 底部按钮 -->
        <div class="flex justify-end gap-2 mt-4 pt-4 border-t">
            <a-button @click="emit('update:visible', false)">
                取消
            </a-button>
            <a-button type="primary" @click="saveScript">
                <template #icon>
                    <icon-save/>
                </template>
                保存脚本
            </a-button>
        </div>
    </a-modal>
</template>

<style scoped lang="less">
.automation-editor {
    .action-list {
        background-color: #f9fafb;
    }

    .action-item {
        &:hover {
            transform: translateX(2px);
        }
    }
}
</style>
