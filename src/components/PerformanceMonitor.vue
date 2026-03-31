<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { t } from "../../lang";
import { defaultMemoryOptimizer, type MemoryStats } from "../../lib/MemoryOptimizer";
import { defaultConcurrencyOptimizer } from "../../lib/ConcurrencyOptimizer";
import { defaultImageCache } from "../../lib/ImageRecognitionCache";

const isVisible = ref(false);
const memoryStats = ref<MemoryStats | null>(null);
const concurrencyStats = ref<any>(null);
const cacheStats = ref<any>(null);
const updateInterval = ref<NodeJS.Timeout | null>(null);

// 更新统计信息
const updateStats = () => {
    memoryStats.value = defaultMemoryOptimizer.getMemoryStats();
    concurrencyStats.value = defaultConcurrencyOptimizer.getStats();
    cacheStats.value = defaultImageCache.getStats();
};

// 格式化数字
const formatNumber = (num: number, decimals: number = 2): string => {
    return num.toFixed(decimals);
};

// 格式化百分比
const formatPercent = (num: number): string => {
    return `${num.toFixed(1)}%`;
};

// 获取状态颜色
const getStatusColor = (value: number, warning: number, critical: number): string => {
    if (value >= critical) return 'text-red-500';
    if (value >= warning) return 'text-yellow-500';
    return 'text-green-500';
};

// 内存使用率颜色
const memoryUsageColor = computed(() => {
    if (!memoryStats.value) return 'text-gray-500';
    return getStatusColor(memoryStats.value.usagePercent, 70, 85);
});

// 缓存命中率颜色
const cacheHitRateColor = computed(() => {
    if (!cacheStats.value) return 'text-gray-500';
    const hitRate = cacheStats.value.hitRate * 100;
    return getStatusColor(hitRate, 50, 80);
});

// 开启监控
const startMonitoring = () => {
    isVisible.value = true;
    updateStats();
    
    if (!updateInterval.value) {
        updateInterval.value = setInterval(updateStats, 2000); // 每 2 秒更新一次
    }
};

// 关闭监控
const stopMonitoring = () => {
    isVisible.value = false;
};

// 手动触发垃圾回收
const triggerGC = () => {
    defaultMemoryOptimizer.triggerGC();
    updateStats();
};

// 清空缓存
const clearCache = () => {
    defaultImageCache.clear();
    updateStats();
};

// 清理组件
onUnmounted(() => {
    if (updateInterval.value) {
        clearInterval(updateInterval.value);
    }
});

// 初始更新
onMounted(() => {
    updateStats();
});
</script>

<template>
    <div class="performance-monitor">
        <!-- 悬浮按钮 -->
        <a-button
            v-if="!isVisible"
            size="small"
            type="primary"
            @click="startMonitoring"
            class="fixed bottom-4 right-4 z-50"
        >
            <template #icon>
                <icon-dashboard/>
            </template>
            性能监控
        </a-button>

        <!-- 监控面板 -->
        <div
            v-else
            class="fixed bottom-4 right-4 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 w-80"
        >
            <!-- 标题栏 -->
            <div class="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
                <h3 class="font-semibold">性能监控</h3>
                <div class="flex items-center gap-1">
                    <a-button size="mini" @click="updateStats">
                        <template #icon>
                            <icon-refresh/>
                        </template>
                    </a-button>
                    <a-button size="mini" @click="stopMonitoring">
                        <template #icon>
                            <icon-close/>
                        </template>
                    </a-button>
                </div>
            </div>

            <!-- 内容区域 -->
            <div class="p-3 space-y-4 max-h-96 overflow-y-auto">
                <!-- 内存使用 -->
                <div>
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-sm font-medium">内存使用</span>
                        <span :class="memoryUsageColor" class="text-sm font-bold">
                            {{ memoryStats ? formatPercent(memoryStats.usagePercent) : '-' }}
                        </span>
                    </div>
                    <a-progress
                        :percent="memoryStats ? memoryStats.usagePercent : 0"
                        :show-text="false"
                        :stroke-width="6"
                        :status="memoryStats && memoryStats.usagePercent >= 85 ? 'error' : memoryStats && memoryStats.usagePercent >= 70 ? 'warning' : 'success'"
                    />
                    <div class="mt-1 text-xs text-gray-500 flex justify-between">
                        <span>{{ memoryStats ? memoryStats.heapUsed : '-' }} MB / {{ memoryStats ? memoryStats.heapTotal : '-' }} MB</span>
                        <span>GC: {{ memoryStats ? memoryStats.gcCount : 0 }}</span>
                    </div>
                </div>

                <!-- 并发任务 -->
                <div v-if="concurrencyStats">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-sm font-medium">并发任务</span>
                        <span class="text-xs text-gray-500">
                            运行：{{ concurrencyStats.running }} / 
                            等待：{{ concurrencyStats.pending }}
                        </span>
                    </div>
                    <div class="grid grid-cols-3 gap-2 text-xs">
                        <div class="bg-green-50 dark:bg-green-900 p-2 rounded text-center">
                            <div class="text-green-600 dark:text-green-400 font-bold">{{ concurrencyStats.completed }}</div>
                            <div class="text-gray-500">完成</div>
                        </div>
                        <div class="bg-red-50 dark:bg-red-900 p-2 rounded text-center">
                            <div class="text-red-600 dark:text-red-400 font-bold">{{ concurrencyStats.failed }}</div>
                            <div class="text-gray-500">失败</div>
                        </div>
                        <div class="bg-blue-50 dark:bg-blue-900 p-2 rounded text-center">
                            <div class="text-blue-600 dark:text-blue-400 font-bold">{{ concurrencyStats.activeCount }}</div>
                            <div class="text-gray-500">活跃</div>
                        </div>
                    </div>
                </div>

                <!-- 缓存统计 -->
                <div v-if="cacheStats">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-sm font-medium">图像缓存</span>
                        <span :class="cacheHitRateColor" class="text-sm font-bold">
                            命中率：{{ formatPercent(cacheStats.hitRate * 100) }}
                        </span>
                    </div>
                    <div class="grid grid-cols-2 gap-2 text-xs">
                        <div class="bg-gray-50 dark:bg-gray-700 p-2 rounded text-center">
                            <div class="font-bold">{{ cacheStats.size }}</div>
                            <div class="text-gray-500">缓存数</div>
                        </div>
                        <div class="bg-gray-50 dark:bg-gray-700 p-2 rounded text-center">
                            <div class="font-bold">{{ cacheStats.hits }}</div>
                            <div class="text-gray-500">命中</div>
                        </div>
                    </div>
                </div>

                <!-- 快捷操作 -->
                <div class="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div class="flex gap-2">
                        <a-button size="small" @click="triggerGC" class="flex-1">
                            <template #icon>
                                <icon-sweep/>
                            </template>
                            GC
                        </a-button>
                        <a-button size="small" @click="clearCache" class="flex-1">
                            <template #icon>
                                <icon-delete/>
                            </template>
                            清空缓存
                        </a-button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped lang="less">
.performance-monitor {
    .fade-enter-active,
    .fade-leave-active {
        transition: opacity 0.3s;
    }
    
    .fade-enter-from,
    .fade-leave-to {
        opacity: 0;
    }
}
</style>
