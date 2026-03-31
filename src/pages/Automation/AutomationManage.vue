<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { t } from "../../lang";
import { Dialog } from "../../lib/dialog";
import type { AutomationScript } from "../../types/ImageRecognition";
import AutomationEditor from "./AutomationEditor.vue";

const scripts = ref<AutomationScript[]>([]);
const showEditor = ref(false);
const editingScript = ref<AutomationScript | null>(null);
const searchKeywords = ref("");

const filteredScripts = computed(() => {
    if (!searchKeywords.value.trim()) {
        return scripts.value;
    }
    
    const keywords = searchKeywords.value.toLowerCase();
    return scripts.value.filter(script => 
        script.name.toLowerCase().includes(keywords) ||
        script.description?.toLowerCase().includes(keywords)
    );
});

// 打开创建对话框
const openCreateDialog = () => {
    editingScript.value = null;
    showEditor.value = true;
};

// 打开编辑对话框
const openEditDialog = (script: AutomationScript) => {
    editingScript.value = script;
    showEditor.value = true;
};

// 保存脚本
const onSaveScript = (script: AutomationScript) => {
    if (editingScript.value) {
        // 更新现有脚本
        const index = scripts.value.findIndex(s => s.id === script.id);
        if (index > -1) {
            scripts.value[index] = script;
        }
    } else {
        // 添加新脚本
        scripts.value.push(script);
    }
};

// 删除脚本
const deleteScript = (script: AutomationScript) => {
    Dialog.confirm(`确定要删除脚本 "${script.name}" 吗？`).then(() => {
        const index = scripts.value.findIndex(s => s.id === script.id);
        if (index > -1) {
            scripts.value.splice(index, 1);
        }
        Dialog.tipSuccess("脚本已删除");
    });
};

// 运行脚本
const runScript = (script: AutomationScript) => {
    Dialog.tipInfo(`开始运行脚本：${script.name}`);
    // TODO: 实际执行脚本
    console.log("运行脚本:", script);
};

// 导出脚本
const exportScript = (script: AutomationScript) => {
    const dataStr = JSON.stringify(script, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${script.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
    Dialog.tipSuccess("脚本已导出");
};

// 导入脚本
const importScript = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const script = JSON.parse(event.target?.result as string) as AutomationScript;
                    scripts.value.push(script);
                    Dialog.tipSuccess("脚本已导入");
                } catch (error: any) {
                    Dialog.tipError(`导入失败：${error.message}`);
                }
            };
            reader.readAsText(file);
        }
    };
    input.click();
};

onMounted(() => {
    // 加载示例脚本
    scripts.value = [
        {
            id: "demo-1",
            name: "示例脚本 - 打开应用",
            description: "演示如何打开应用并点击按钮",
            actions: [
                {
                    id: "action-1",
                    type: "touch",
                    params: { actionType: "tap", x: 100, y: 200 },
                    description: "点击首页按钮",
                    delay: 500,
                },
                {
                    id: "action-2",
                    type: "wait",
                    params: { duration: 2000 },
                    description: "等待页面加载",
                    delay: 0,
                },
                {
                    id: "action-3",
                    type: "text",
                    params: { text: "Hello", clear: true },
                    description: "输入文本",
                    delay: 300,
                },
            ],
            createdAt: new Date(),
            updatedAt: new Date(),
            version: "1.0.0",
        },
    ];
});
</script>

<template>
    <div class="automation-manage-container min-h-[calc(100vh-4rem)] p-8">
        <!-- 头部 -->
        <div class="flex items-center justify-between mb-6">
            <div>
                <h1 class="text-3xl font-bold">{{ t("automation.title") }}</h1>
                <p class="text-gray-500 mt-1">
                    {{ t("automation.description") }}
                    <span class="text-blue-500">{{ scripts.length }}</span>
                    个脚本
                </p>
            </div>

            <div class="flex items-center gap-2">
                <a-input-search
                    v-model="searchKeywords"
                    placeholder="搜索脚本..."
                    class="w-64"
                    allow-clear
                />
                
                <a-button @click="importScript">
                    <template #icon>
                        <icon-upload/>
                    </template>
                    导入
                </a-button>
                
                <a-button type="primary" @click="openCreateDialog">
                    <template #icon>
                        <icon-plus/>
                    </template>
                    创建脚本
                </a-button>
            </div>
        </div>

        <!-- 脚本列表 -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div
                v-for="script in filteredScripts"
                :key="script.id"
                class="script-card bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-lg transition-shadow cursor-pointer"
                @click="openEditDialog(script)"
            >
                <div class="flex items-start justify-between mb-3">
                    <h3 class="text-lg font-semibold truncate flex-1">
                        {{ script.name }}
                    </h3>
                    <a-tag color="blue" size="small">
                        v{{ script.version }}
                    </a-tag>
                </div>

                <p class="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                    {{ script.description || "暂无描述" }}
                </p>

                <div class="flex items-center justify-between text-xs text-gray-500">
                    <div class="flex items-center gap-3">
                        <span class="flex items-center gap-1">
                            <icon-play-arrow/>
                            {{ script.actions.length }} 个操作
                        </span>
                        <span class="flex items-center gap-1">
                            <icon-clock-circle/>
                            {{ new Date(script.updatedAt).toLocaleDateString() }}
                        </span>
                    </div>
                </div>

                <!-- 操作按钮 -->
                <div class="flex items-center gap-2 mt-4 pt-4 border-t">
                    <a-button size="small" type="primary" @click.stop="runScript(script)">
                        <template #icon>
                            <icon-play-arrow/>
                        </template>
                        运行
                    </a-button>
                    <a-button size="small" @click.stop="openEditDialog(script)">
                        <template #icon>
                            <icon-edit/>
                        </template>
                        编辑
                    </a-button>
                    <a-button size="small" @click.stop="exportScript(script)">
                        <template #icon>
                            <icon-download/>
                        </template>
                        导出
                    </a-button>
                    <a-popconfirm
                        content="确定要删除吗？"
                        @ok="deleteScript(script)"
                    >
                        <a-button size="small" status="danger">
                            <template #icon>
                                <icon-delete/>
                            </template>
                        </a-button>
                    </a-popconfirm>
                </div>
            </div>
        </div>

        <!-- 空状态 -->
        <div v-if="filteredScripts.length === 0" class="text-center py-20">
            <icon-empty class="text-6xl text-gray-300 mb-4"/>
            <div class="text-gray-500">
                {{ searchKeywords ? "没有找到匹配的脚本" : "暂无脚本，请创建一个新脚本" }}
            </div>
            <a-button 
                v-if="!searchKeywords"
                type="primary" 
                class="mt-4"
                @click="openCreateDialog"
            >
                <template #icon>
                    <icon-plus/>
                </template>
                创建第一个脚本
            </a-button>
        </div>

        <!-- 编辑器对话框 -->
        <AutomationEditor
            v-model:visible="showEditor"
            :script="editingScript"
            @save="onSaveScript"
        />
    </div>
</template>

<style scoped lang="less">
.automation-manage-container {
    .script-card {
        transition: all 0.2s;
        
        &:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
    }
}
</style>
