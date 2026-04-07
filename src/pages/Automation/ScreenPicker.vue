<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { t } from '../../lang';

interface Props {
    screenshot?: string;
}

const props = withDefaults(defineProps<Props>(), {
    screenshot: '',
});

const emit = defineEmits(['position-selected', 'cancel']);

const selectedPosition = ref<{ x: number; y: number } | null>(null);
const hoverPosition = ref<{ x: number; y: number } | null>(null);
const manualX = ref(0);
const manualY = ref(0);
const isPicking = ref(false);
const screenshotRef = ref<HTMLImageElement | null>(null);

// 本地状态（替代 props 的 v-model）
const localShowGrid = ref(true);
const localShowCoordinates = ref(true);
const localZoomLevel = ref(1);

// 处理点击
const handleClick = (e: MouseEvent) => {
    if (!screenshotRef.value) return;
    
    const rect = screenshotRef.value.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) / props.zoomLevel);
    const y = Math.round((e.clientY - rect.top) / props.zoomLevel);
    
    selectedPosition.value = { x, y };
    hoverPosition.value = { x, y };
    manualX.value = x;
    manualY.value = y;
};

// 处理鼠标移动
const handleMouseMove = (e: MouseEvent) => {
    if (!screenshotRef.value) return;
    
    const rect = screenshotRef.value.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) / props.zoomLevel);
    const y = Math.round((e.clientY - rect.top) / props.zoomLevel);
    
    hoverPosition.value = { x, y };
};

// 启用拾取
const enablePicker = () => {
    isPicking.value = true;
    selectedPosition.value = null;
};

// 确认位置
const confirmPosition = () => {
    if (selectedPosition.value) {
        emit('position-selected', selectedPosition.value);
        isPicking.value = false;
    }
};

// 取消拾取
const cancelPicker = () => {
    isPicking.value = false;
    emit('cancel');
};

// 手动输入坐标
const onManualInput = () => {
    selectedPosition.value = { x: manualX.value, y: manualY.value };
};

// 暴露方法给父组件
defineExpose({
    enablePicker,
    cancelPicker,
});

// 键盘事件
const handleKeydown = (e: KeyboardEvent) => {
    if (!isPicking.value) return;
    
    if (e.key === 'Enter') {
        confirmPosition();
    } else if (e.key === 'Escape') {
        cancelPicker();
    }
};

onMounted(() => {
    window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
    <div class="screen-picker">
        <!-- 工具栏 -->
        <div class="picker-toolbar">
            <div class="toolbar-left">
                <a-tag v-if="isPicking" color="red">
                    <icon-loading />
                    {{ $t('automation.pickingPosition') }}
                </a-tag>
                <span v-else class="status-text">{{ $t('automation.clickToPick') }}</span>
            </div>
            
            <div class="toolbar-right">
                <a-checkbox v-model="localShowGrid">{{ $t('automation.showGrid') }}</a-checkbox>
                <a-checkbox v-model="localShowCoordinates">{{ $t('automation.showCoordinates') }}</a-checkbox>
                <a-divider direction="vertical" />
                <span>{{ $t('automation.zoom') }}: </span>
                <a-slider
                    v-model="localZoomLevel"
                    :min="0.5"
                    :max="2.0"
                    :step="0.1"
                    style="width: 100px"
                />
            </div>
        </div>
        
        <!-- 截图区域 -->
        <div
            class="screenshot-container"
            :style="{ transform: `scale(${localZoomLevel})` }"
            @click="handleClick"
            @mousemove="handleMouseMove"
        >
            <img
                v-if="screenshot"
                ref="screenshotRef"
                :src="screenshot"
                class="screenshot-image"
                crossorigin="anonymous"
            />
            <div v-else class="no-screenshot">
                <icon-image />
                <p>{{ $t('automation.noScreenshot') }}</p>
            </div>
            
            <!-- 网格覆盖层 -->
            <svg
                v-if="localShowGrid && screenshot"
                class="grid-overlay"
                :width="800"
                :height="600"
            >
                <line
                    v-for="i in 10"
                    :key="'h' + i"
                    :x1="0"
                    :y1="(600 / 10) * i"
                    :x2="800"
                    :y2="(600 / 10) * i"
                    stroke="rgba(0, 255, 0, 0.3)"
                    stroke-dasharray="4"
                />
                <line
                    v-for="i in 10"
                    :key="'v' + i"
                    :x1="(800 / 10) * i"
                    :y1="0"
                    :x2="(800 / 10) * i"
                    :y2="600"
                    stroke="rgba(0, 255, 0, 0.3)"
                    stroke-dasharray="4"
                />
            </svg>
            
            <!-- 坐标显示 -->
            <div
                v-if="localShowCoordinates && hoverPosition"
                class="coordinate-label"
                :style="{
                    left: Math.min(hoverPosition.x + 10, 700) + 'px',
                    top: Math.min(hoverPosition.y + 10, 500) + 'px'
                }"
            >
                ({{ hoverPosition.x }}, {{ hoverPosition.y }})
            </div>
            
            <!-- 点击标记 -->
            <div
                v-if="selectedPosition"
                class="position-marker"
                :style="{
                    left: selectedPosition.x + 'px',
                    top: selectedPosition.y + 'px'
                }"
            >
                <div class="marker-center">
                    <icon-crosshair />
                </div>
                <div class="coordinate-badge">
                    {{ selectedPosition.x }}, {{ selectedPosition.y }}
                </div>
            </div>
        </div>
        
        <!-- 坐标输入 -->
        <div class="coordinate-input-section">
            <a-form layout="inline">
                <a-form-item :label="$t('automation.xCoordinate')">
                    <a-input-number
                        v-model="manualX"
                        :min="0"
                        :max="800"
                        :placeholder="$t('automation.xCoordinate')"
                        @change="onManualInput"
                    />
                </a-form-item>
                <a-form-item :label="$t('automation.yCoordinate')">
                    <a-input-number
                        v-model="manualY"
                        :min="0"
                        :max="600"
                        :placeholder="$t('automation.yCoordinate')"
                        @change="onManualInput"
                    />
                </a-form-item>
                <a-form-item>
                    <a-button type="primary" @click="confirmPosition" :disabled="!selectedPosition">
                        <template #icon><icon-check /></template>
                        {{ $t('automation.confirmPosition') }}
                    </a-button>
                </a-form-item>
                <a-form-item v-if="isPicking">
                    <a-button @click="cancelPicker">
                        <template #icon><icon-close /></template>
                        {{ $t('automation.cancel') }}
                    </a-button>
                </a-form-item>
            </a-form>
        </div>
    </div>
</template>

<style scoped lang="less">
.screen-picker {
    height: 100%;
    display: flex;
    flex-direction: column;
    
    .picker-toolbar {
        padding: 12px 16px;
        border-bottom: 1px solid var(--color-border);
        display: flex;
        justify-content: space-between;
        align-items: center;
        
        .toolbar-left {
            .status-text {
                font-size: 13px;
                color: var(--color-text-secondary);
            }
        }
        
        .toolbar-right {
            display: flex;
            align-items: center;
            gap: 12px;
        }
    }
    
    .screenshot-container {
        flex: 1;
        position: relative;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--color-bg-hover);
        transform-origin: center center;
        
        .screenshot-image {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
        }
        
        .no-screenshot {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: var(--color-text-disabled);
            
            :deep(.icon-image) {
                font-size: 64px;
                margin-bottom: 16px;
            }
            
            p {
                margin: 0;
                font-size: 14px;
            }
        }
        
        .grid-overlay {
            position: absolute;
            top: 0;
            left: 0;
            pointer-events: none;
        }
        
        .coordinate-label {
            position: absolute;
            background: rgba(0, 0, 0, 0.7);
            color: #fff;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-family: monospace;
            pointer-events: none;
            white-space: nowrap;
        }
        
        .position-marker {
            position: absolute;
            transform: translate(-50%, -50%);
            display: flex;
            flex-direction: column;
            align-items: center;
            
            .marker-center {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                background: rgba(22, 93, 255, 0.3);
                border: 2px solid var(--color-primary);
                display: flex;
                align-items: center;
                justify-content: center;
                color: var(--color-primary);
                font-size: 16px;
                animation: pulse 1.5s ease-in-out infinite;
            }
            
            .coordinate-badge {
                margin-top: 4px;
                background: var(--color-primary);
                color: #fff;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 11px;
                font-family: monospace;
                white-space: nowrap;
            }
        }
    }
    
    .coordinate-input-section {
        padding: 12px 16px;
        border-top: 1px solid var(--color-border);
        background: var(--color-bg-card);
    }
}

@keyframes pulse {
    0%, 100% {
        transform: translate(-50%, -50%) scale(1);
        opacity: 1;
    }
    50% {
        transform: translate(-50%, -50%) scale(1.2);
        opacity: 0.7;
    }
}
</style>
