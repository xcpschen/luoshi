<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { t } from "../../lang";
import { Dialog } from "../../lib/dialog";
import type {
    ClusterConfig,
    EnumDeployMode,
    ServerConfig,
    WorkerNodeConfig,
    CoordinatorConfig,
    LoadBalancerConfig,
    RedisConfig,
    EnumServerRole,
    ClusterStatus,
} from "../../types/ClusterConfig";
import { EnumDeployMode as DeployModeEnum } from "../../types/ClusterConfig";

const loading = ref(false);
const clusterConfig = ref<ClusterConfig>({
    deployMode: DeployModeEnum.STANDALONE,
    deployModeName: t("setting.cluster.standalone"),
    coordinators: [],
    workers: [],
    loadBalancers: [],
    advanced: {
        taskQueue: {
            maxSize: 1000,
            retryTimes: 3,
            timeout: 30000,
        },
        concurrency: {
            maxConcurrentTasks: 10,
            maxTasksPerWorker: 5,
        },
        failover: {
            enabled: true,
            maxRetries: 3,
            retryDelay: 1000,
        },
        logging: {
            level: "info",
            enableAudit: true,
        },
    },
});

const clusterStatus = ref<ClusterStatus | null>(null);
const showNodeDialog = ref(false);
const editingNode = ref<ServerConfig | null>(null);
const nodeForm = ref<Partial<ServerConfig>>({
    role: "worker",
    enabled: true,
    gpuCount: 1,
    weight: 1,
    algorithm: "round_robin",
});

// 部署模式选项
const deployModeOptions = [
    { value: DeployModeEnum.STANDALONE, label: t("setting.cluster.standalone"), desc: "适用：1-5 台设备", icon: "icon-desktop" },
    { value: DeployModeEnum.DISTRIBUTED, label: t("setting.cluster.distributed"), desc: "适用：6-15 台设备", icon: "icon-network" },
    { value: DeployModeEnum.CLUSTER, label: t("setting.cluster.cluster"), desc: "适用：16-30 台设备", icon: "icon-cluster" },
];

// 判断是否显示工作节点配置
const showWorkers = computed(() => {
    return clusterConfig.value.deployMode === DeployModeEnum.DISTRIBUTED || 
           clusterConfig.value.deployMode === DeployModeEnum.CLUSTER;
});

// 判断是否显示负载均衡器配置
const showLoadBalancers = computed(() => {
    return clusterConfig.value.deployMode === DeployModeEnum.CLUSTER;
});

// 判断是否显示协调器配置
const showCoordinators = computed(() => {
    return clusterConfig.value.deployMode === DeployModeEnum.CLUSTER;
});

// 加载配置
const loadConfig = async () => {
    loading.value = true;
    try {
        clusterConfig.value = await window.$mapi.clusterConfig.get();
        await loadStatus();
    } catch (error) {
        Dialog.tipError(t("setting.cluster.saveError"));
    } finally {
        loading.value = false;
    }
};

// 加载状态
const loadStatus = async () => {
    try {
        clusterStatus.value = await window.$mapi.clusterConfig.getStatus();
    } catch (error) {
        console.error("Failed to load cluster status:", error);
    }
};

// 保存配置
const saveConfig = async () => {
    loading.value = true;
    try {
        const success = await window.$mapi.clusterConfig.save(clusterConfig.value);
        if (success) {
            Dialog.tipSuccess(t("setting.cluster.saveSuccess"));
            await loadStatus();
        } else {
            Dialog.tipError(t("setting.cluster.saveError"));
        }
    } catch (error) {
        Dialog.tipError(t("setting.cluster.saveError"));
    } finally {
        loading.value = false;
    }
};

// 添加节点
const addNode = (role: EnumServerRole) => {
    editingNode.value = null;
    nodeForm.value = {
        id: crypto.randomUUID(),
        role,
        name: `New ${role}`,
        host: "127.0.0.1",
        port: 8080,
        enabled: true,
        gpuCount: role === "worker" ? 1 : undefined,
        weight: role === "load_balancer" ? 1 : undefined,
        algorithm: role === "load_balancer" ? "round_robin" : undefined,
    };
    showNodeDialog.value = true;
};

// 编辑节点
const editNode = (node: ServerConfig) => {
    editingNode.value = node;
    nodeForm.value = { ...node };
    showNodeDialog.value = true;
};

// 删除节点
const deleteNode = async (node: ServerConfig) => {
    await Dialog.confirm(t("setting.cluster.deleteConfirm"));
    try {
        await window.$mapi.clusterConfig.deleteNode(node.id);
        await loadConfig();
        Dialog.tipSuccess("Node deleted");
    } catch (error) {
        Dialog.tipError("Failed to delete node");
    }
};

// 测试节点连接
const testNode = async (node: ServerConfig) => {
    try {
        const result = await window.$mapi.clusterConfig.testNode(node);
        if (result.success) {
            Dialog.tipSuccess(result.message);
        } else {
            Dialog.tipError(result.message);
        }
    } catch (error) {
        Dialog.tipError(t("setting.cluster.testError"));
    }
};

// 保存节点
const saveNode = async () => {
    try {
        // 创建纯 JSON 对象，避免响应式对象和 Date 对象
        const node: ServerConfig = {
            id: nodeForm.value.id!,
            name: nodeForm.value.name!,
            role: nodeForm.value.role!,
            host: nodeForm.value.host!,
            port: Number(nodeForm.value.port),
            enabled: Boolean(nodeForm.value.enabled),
        } as ServerConfig;
        
        // 添加可选字段
        if (nodeForm.value.gpuCount !== undefined) {
            (node as any).gpuCount = Number(nodeForm.value.gpuCount);
        }
        if (nodeForm.value.weight !== undefined) {
            (node as any).weight = Number(nodeForm.value.weight);
        }
        if (nodeForm.value.algorithm) {
            (node as any).algorithm = nodeForm.value.algorithm;
        }
        if (nodeForm.value.isPrimary !== undefined) {
            (node as any).isPrimary = Boolean(nodeForm.value.isPrimary);
        }
        
        console.log('Saving node (serialized):', JSON.parse(JSON.stringify(node)));
        
        // 验证必填字段
        if (!node.id || !node.name || !node.role || !node.host || !node.port) {
            Dialog.tipError("Missing required fields");
            console.error('Missing fields:', {
                id: !!node.id,
                name: !!node.name,
                role: !!node.role,
                host: !!node.host,
                port: !!node.port
            });
            return;
        }
        
        if (editingNode.value) {
            await window.$mapi.clusterConfig.updateNode(node);
        } else {
            await window.$mapi.clusterConfig.addNode(node);
        }
        showNodeDialog.value = false;
        await loadConfig();
        Dialog.tipSuccess(editingNode.value ? "Node updated" : "Node added");
    } catch (error) {
        console.error('Failed to save node:', error);
        Dialog.tipError("Failed to save node: " + (error as Error).message);
    }
};

// 刷新状态
const refreshStatus = async () => {
    await loadStatus();
    Dialog.tipSuccess(t("common.refresh") + t("common.success"));
};

onMounted(() => {
    loadConfig();
});
</script>

<template>
    <div class="pb-cluster-setting p-8">
        <div class="text-3xl font-bold mb-6">{{ t("setting.cluster.title") }}</div>

        <!-- 部署模式选择 -->
        <div class="mb-8">
            <h3 class="text-lg font-semibold mb-4">{{ t("setting.cluster.deployMode") }}</h3>
            <div class="grid grid-cols-3 gap-4">
                <div
                    v-for="mode in deployModeOptions"
                    :key="mode.value"
                    class="deploy-mode-card p-6 border-2 rounded-xl cursor-pointer transition-all duration-300"
                    :class="{
                        'border-primary bg-gradient-to-br from-primary-light to-white shadow-lg scale-105': clusterConfig.deployMode === mode.value,
                        'border-gray-200 hover:border-primary hover:shadow-md': clusterConfig.deployMode !== mode.value,
                    }"
                    @click="clusterConfig.deployMode = mode.value"
                >
                    <div class="flex flex-col items-center text-center">
                        <component 
                            :is="mode.icon" 
                            class="text-4xl mb-3"
                            :class="clusterConfig.deployMode === mode.value ? 'text-primary' : 'text-gray-400'"
                        />
                        <div class="font-semibold text-lg mb-2">{{ mode.label }}</div>
                        <div class="text-sm text-gray-500">{{ mode.desc }}</div>
                        <div 
                            v-if="clusterConfig.deployMode === mode.value"
                            class="mt-3 px-4 py-1 bg-primary text-white text-xs rounded-full"
                        >
                            已选择
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 服务器节点配置（分布式和集群模式显示） -->
        <div v-if="showWorkers" class="mb-8">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-semibold">{{ t("setting.cluster.workers") }}</h3>
                <a-tag color="blue" size="small">{{ clusterConfig.workers.length }} 个节点</a-tag>
            </div>
            <div class="space-y-2">
                <div
                    v-for="worker in clusterConfig.workers"
                    :key="worker.id"
                    class="node-card p-4 border rounded-lg"
                >
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <icon-server class="text-xl text-primary" />
                            <div>
                                <div class="font-semibold">{{ worker.name }}</div>
                                <div class="text-sm text-gray-500">
                                    {{ worker.host }}:{{ worker.port }} - GPU: {{ worker.gpuCount }}
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            <a-button size="small" @click="testNode(worker)">
                                <template #icon><icon-link /></template>
                                {{ t("setting.cluster.testConnection") }}
                            </a-button>
                            <a-button size="small" @click="editNode(worker)">
                                <template #icon><icon-edit /></template>
                                {{ t("setting.cluster.editNode") }}
                            </a-button>
                            <a-button size="small" status="danger" @click="deleteNode(worker)">
                                <template #icon><icon-delete /></template>
                                {{ t("setting.cluster.deleteNode") }}
                            </a-button>
                        </div>
                    </div>
                </div>
                <a-button @click="addNode('worker')" class="mt-2">
                    <template #icon><icon-plus /></template>
                    {{ t("setting.cluster.addNode") }}
                </a-button>
            </div>
        </div>

        <!-- 协调器配置（仅集群模式显示） -->
        <div v-if="showCoordinators" class="mb-8">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-semibold">{{ t("setting.cluster.coordinators") }}</h3>
                <a-tag color="green" size="small">{{ clusterConfig.coordinators.length }} 个协调器</a-tag>
            </div>
            <div class="space-y-2">
                <div
                    v-for="coordinator in clusterConfig.coordinators"
                    :key="coordinator.id"
                    class="node-card p-4 border rounded-lg"
                >
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <icon-server class="text-xl text-green-600" />
                            <div>
                                <div class="font-semibold">{{ coordinator.name }}</div>
                                <div class="text-sm text-gray-500">
                                    {{ coordinator.host }}:{{ coordinator.port }}
                                    <span v-if="coordinator.isPrimary" class="ml-2 text-green-600 font-semibold">主协调器</span>
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            <a-button size="small" @click="testNode(coordinator)">
                                <template #icon><icon-link /></template>
                                {{ t("setting.cluster.testConnection") }}
                            </a-button>
                            <a-button size="small" @click="editNode(coordinator)">
                                <template #icon><icon-edit /></template>
                                {{ t("setting.cluster.editNode") }}
                            </a-button>
                            <a-button size="small" status="danger" @click="deleteNode(coordinator)">
                                <template #icon><icon-delete /></template>
                                {{ t("setting.cluster.deleteNode") }}
                            </a-button>
                        </div>
                    </div>
                </div>
                <a-button @click="addNode('coordinator')" class="mt-2">
                    <template #icon><icon-plus /></template>
                    {{ t("setting.cluster.addNode") }}
                </a-button>
            </div>
        </div>

        <!-- 负载均衡器配置（仅集群模式显示） -->
        <div v-if="showLoadBalancers" class="mb-8">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-semibold">{{ t("setting.cluster.loadBalancers") }}</h3>
                <a-tag color="purple" size="small">{{ clusterConfig.loadBalancers.length }} 个负载均衡器</a-tag>
            </div>
            <div class="space-y-2">
                <div
                    v-for="lb in clusterConfig.loadBalancers"
                    :key="lb.id"
                    class="node-card p-4 border rounded-lg"
                >
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <icon-server class="text-xl text-purple-600" />
                            <div>
                                <div class="font-semibold">{{ lb.name }}</div>
                                <div class="text-sm text-gray-500">
                                    {{ lb.host }}:{{ lb.port }} - 
                                    算法：{{ lb.algorithm || 'round_robin' }}
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            <a-button size="small" @click="testNode(lb)">
                                <template #icon><icon-link /></template>
                                {{ t("setting.cluster.testConnection") }}
                            </a-button>
                            <a-button size="small" @click="editNode(lb)">
                                <template #icon><icon-edit /></template>
                                {{ t("setting.cluster.editNode") }}
                            </a-button>
                            <a-button size="small" status="danger" @click="deleteNode(lb)">
                                <template #icon><icon-delete /></template>
                                {{ t("setting.cluster.deleteNode") }}
                            </a-button>
                        </div>
                    </div>
                </div>
                <a-button @click="addNode('load_balancer')" class="mt-2">
                    <template #icon><icon-plus /></template>
                    {{ t("setting.cluster.addNode") }}
                </a-button>
            </div>
        </div>

        <!-- Redis 中间件配置（仅集群模式显示） -->
        <div v-if="showLoadBalancers" class="mb-8">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-semibold">{{ t("setting.cluster.redis") }}</h3>
                <a-tag v-if="clusterConfig.redis" color="orange" size="small">已配置</a-tag>
                <a-tag v-else color="gray" size="small">未配置</a-tag>
            </div>
            <div v-if="clusterConfig.redis" class="node-card p-4 border rounded-lg">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <icon-server class="text-xl text-orange-600" />
                        <div>
                            <div class="font-semibold">{{ clusterConfig.redis.name }}</div>
                            <div class="text-sm text-gray-500">
                                {{ clusterConfig.redis.host }}:{{ clusterConfig.redis.port }}
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <a-button size="small" @click="testNode(clusterConfig.redis)">
                            <template #icon><icon-link /></template>
                            {{ t("setting.cluster.testConnection") }}
                        </a-button>
                        <a-button size="small" @click="editNode(clusterConfig.redis)">
                            <template #icon><icon-edit /></template>
                            {{ t("setting.cluster.editNode") }}
                        </a-button>
                        <a-button size="small" status="danger" @click="deleteNode(clusterConfig.redis)">
                            <template #icon><icon-delete /></template>
                            {{ t("setting.cluster.deleteNode") }}
                        </a-button>
                    </div>
                </div>
            </div>
            <div v-else>
                <a-button @click="addNode('redis')">
                    <template #icon><icon-plus /></template>
                    {{ t("setting.cluster.addNode") }}
                </a-button>
            </div>
        </div>

        <!-- 高级配置 -->
        <div class="mb-8">
            <h3 class="text-lg font-semibold mb-4">{{ t("setting.cluster.advanced") }}</h3>
            <a-collapse>
                <a-collapse-item key="taskQueue" :header="t('setting.cluster.taskQueue')">
                    <a-form layout="vertical">
                        <a-form-item :label="t('setting.cluster.maxQueueSize')">
                            <a-input-number
                                v-model="clusterConfig.advanced.taskQueue.maxSize"
                                :min="100"
                                :step="100"
                                style="width: 200px"
                            />
                        </a-form-item>
                        <a-form-item :label="t('setting.cluster.retryTimes')">
                            <a-input-number
                                v-model="clusterConfig.advanced.taskQueue.retryTimes"
                                :min="0"
                                :step="1"
                                style="width: 200px"
                            />
                        </a-form-item>
                        <a-form-item :label="t('setting.cluster.timeout')">
                            <a-input-number
                                v-model="clusterConfig.advanced.taskQueue.timeout"
                                :min="1000"
                                :step="1000"
                                style="width: 200px"
                            />
                        </a-form-item>
                    </a-form>
                </a-collapse-item>

                <a-collapse-item key="concurrency" :header="t('setting.cluster.concurrency')">
                    <a-form layout="vertical">
                        <a-form-item :label="t('setting.cluster.maxConcurrentTasks')">
                            <a-input-number
                                v-model="clusterConfig.advanced.concurrency.maxConcurrentTasks"
                                :min="1"
                                :step="1"
                                style="width: 200px"
                            />
                        </a-form-item>
                        <a-form-item :label="t('setting.cluster.maxTasksPerWorker')">
                            <a-input-number
                                v-model="clusterConfig.advanced.concurrency.maxTasksPerWorker"
                                :min="1"
                                :step="1"
                                style="width: 200px"
                            />
                        </a-form-item>
                    </a-form>
                </a-collapse-item>

                <a-collapse-item key="failover" :header="t('setting.cluster.failover')">
                    <a-form layout="vertical">
                        <a-form-item>
                            <a-checkbox v-model="clusterConfig.advanced.failover.enabled">
                                {{ t("setting.cluster.enableFailover") }}
                            </a-checkbox>
                        </a-form-item>
                        <a-form-item :label="t('setting.cluster.maxRetries')">
                            <a-input-number
                                v-model="clusterConfig.advanced.failover.maxRetries"
                                :min="0"
                                :step="1"
                                style="width: 200px"
                            />
                        </a-form-item>
                        <a-form-item :label="t('setting.cluster.retryDelay')">
                            <a-input-number
                                v-model="clusterConfig.advanced.failover.retryDelay"
                                :min="0"
                                :step="100"
                                style="width: 200px"
                            />
                        </a-form-item>
                    </a-form>
                </a-collapse-item>

                <a-collapse-item key="logging" :header="t('setting.cluster.logging')">
                    <a-form layout="vertical">
                        <a-form-item :label="t('setting.cluster.logLevel')">
                            <a-select v-model="clusterConfig.advanced.logging.level" style="width: 200px">
                                <a-option value="debug">Debug</a-option>
                                <a-option value="info">Info</a-option>
                                <a-option value="warn">Warn</a-option>
                                <a-option value="error">Error</a-option>
                            </a-select>
                        </a-form-item>
                        <a-form-item>
                            <a-checkbox v-model="clusterConfig.advanced.logging.enableAudit">
                                {{ t("setting.cluster.enableAudit") }}
                            </a-checkbox>
                        </a-form-item>
                    </a-form>
                </a-collapse-item>
            </a-collapse>
        </div>

        <!-- 保存按钮 -->
        <div class="flex justify-end gap-3">
            <a-button @click="loadConfig">{{ t("common.restoreDefault") }}</a-button>
            <a-button type="primary" @click="saveConfig" :loading="loading">
                {{ t("common.save") }}
            </a-button>
        </div>

        <!-- 节点编辑对话框 -->
        <a-modal
            v-model:visible="showNodeDialog"
            :title="editingNode ? t('setting.cluster.editNode') : t('setting.cluster.addNode')"
            width="600px"
            @ok="saveNode"
        >
            <a-form layout="vertical">
                <a-form-item :label="t('setting.cluster.nodeInfo')">
                    <a-input v-model="nodeForm.name" :placeholder="t('setting.cluster.nodeInfo')" />
                </a-form-item>
                <a-form-item :label="t('setting.cluster.host')">
                    <a-input v-model="nodeForm.host" placeholder="127.0.0.1" />
                </a-form-item>
                <a-form-item :label="t('setting.cluster.port')">
                    <a-input-number v-model="nodeForm.port" :min="1" :max="65535" style="width: 200px" />
                </a-form-item>
                <a-form-item v-if="nodeForm.role === 'worker'" :label="t('setting.cluster.gpuCount')">
                    <a-input-number v-model="nodeForm.gpuCount" :min="0" :step="1" style="width: 200px" />
                </a-form-item>
                <a-form-item v-if="nodeForm.role === 'load_balancer'" :label="t('setting.cluster.weight')">
                    <a-input-number v-model="nodeForm.weight" :min="1" :step="1" style="width: 200px" />
                </a-form-item>
                <a-form-item v-if="nodeForm.role === 'load_balancer'" :label="t('setting.cluster.algorithm')">
                    <a-select v-model="nodeForm.algorithm">
                        <a-option value="round_robin">Round Robin</a-option>
                        <a-option value="least_connections">Least Connections</a-option>
                        <a-option value="ip_hash">IP Hash</a-option>
                        <a-option value="weighted">Weighted</a-option>
                    </a-select>
                </a-form-item>
                <a-form-item>
                    <a-checkbox v-model="nodeForm.enabled">{{ t("common.enable") }}</a-checkbox>
                </a-form-item>
            </a-form>
        </a-modal>
    </div>
</template>

<style scoped lang="less">
.pb-cluster-setting {
    .deploy-mode-card {
        position: relative;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        
        &:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
        }
        
        &.selected {
            transform: scale(1.05);
            box-shadow: 0 12px 24px rgba(var(--color-primary-rgb), 0.3);
        }
    }

    .node-card {
        transition: all 0.3s;
        &:hover {
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            transform: translateX(2px);
        }
    }
    
    // 平滑过渡动画
    .fade-enter-active,
    .fade-leave-active {
        transition: opacity 0.3s ease, transform 0.3s ease;
    }
    
    .fade-enter-from,
    .fade-leave-to {
        opacity: 0;
        transform: translateY(-10px);
    }
}
</style>
