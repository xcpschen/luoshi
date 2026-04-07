<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useAutomationStore } from '../../store/modules/automation';
import type { Step, StepType, StepConfig } from '../../types/Automation';
import ScreenPicker from './ScreenPicker.vue';

const automationStore = useAutomationStore();
const selectedStep = computed(() => {
    const stepId = automationStore.uiState.selectedStepId;
    if (!stepId || !automationStore.editingTask?.steps) return null;
    return automationStore.editingTask.steps.find(s => s.id === stepId);
});

const showScreenPicker = ref(false);
const pickerMode = ref<'start' | 'end'>('start');
const stepConfig = ref<StepConfig>({});

// 步骤类型名称
const stepTypeNames: Record<StepType, string> = {
    tap: '点击',
    swipe: '滑动',
    input: '输入',
    wait: '等待',
    keyevent: '按键',
    longPress: '长按',
    image: '图像识别',
    screenshot: '截图',
};

// 监听选中的步骤
watch(selectedStep, (step) => {
    if (step) {
        stepConfig.value = { ...step.config };
    }
}, { immediate: true });

// 保存配置
const saveConfig = () => {
    if (!selectedStep.value) return;
    automationStore.updateStep(selectedStep.value.id, stepConfig.value);
};

// 启用屏幕拾取器
const enablePicker = (mode: 'start' | 'end') => {
    pickerMode.value = mode;
    showScreenPicker.value = true;
};

// 处理位置选择
const onPositionSelected = (position: { x: number; y: number }) => {
    if (pickerMode.value === 'start') {
        stepConfig.value.x = position.x;
        stepConfig.value.y = position.y;
    } else if (pickerMode.value === 'end') {
        stepConfig.value.x2 = position.x;
        stepConfig.value.y2 = position.y;
    }
    showScreenPicker.value = false;
};

// 关闭拾取器
const closePicker = () => {
    showScreenPicker.value = false;
};
</script>

<template>
    <div class="step-config-panel">
        <div v-if="selectedStep" class="config-content">
            <!-- 步骤信息 -->
            <div class="step-header">
                <h3>{{ stepTypeNames[selectedStep.type] }}</h3>
                <a-tag>{{ selectedStep.type }}</a-tag>
            </div>
            
            <!-- 点击配置 -->
            <div v-if="selectedStep.type === 'tap'" class="config-section">
                <h4>{{ $t('automation.positionConfig') }}</h4>
                <a-form layout="vertical">
                    <a-row :gutter="16">
                        <a-col :span="12">
                            <a-form-item :label="$t('automation.xCoordinate')">
                                <a-input-number
                                    v-model="stepConfig.x"
                                    :min="0"
                                    :max="800"
                                    @change="saveConfig"
                                />
                            </a-form-item>
                        </a-col>
                        <a-col :span="12">
                            <a-form-item :label="$t('automation.yCoordinate')">
                                <a-input-number
                                    v-model="stepConfig.y"
                                    :min="0"
                                    :max="600"
                                    @change="saveConfig"
                                />
                            </a-form-item>
                        </a-col>
                    </a-row>
                    <a-form-item>
                        <a-button @click="enablePicker('start')">
                            <template #icon><icon-crosshair /></template>
                            {{ $t('automation.pickOnScreen') }}
                        </a-button>
                    </a-form-item>
                </a-form>
            </div>
            
            <!-- 滑动配置 -->
            <div v-if="selectedStep.type === 'swipe'" class="config-section">
                <h4>{{ $t('automation.swipeConfig') }}</h4>
                <a-divider orientation="left">{{ $t('automation.startPosition') }}</a-divider>
                <a-row :gutter="16">
                    <a-col :span="12">
                        <a-form-item label="X1">
                            <a-input-number
                                v-model="stepConfig.x1"
                                :min="0"
                                :max="800"
                                @change="saveConfig"
                            />
                        </a-form-item>
                    </a-col>
                    <a-col :span="12">
                        <a-form-item label="Y1">
                            <a-input-number
                                v-model="stepConfig.y1"
                                :min="0"
                                :max="600"
                                @change="saveConfig"
                            />
                        </a-form-item>
                    </a-col>
                </a-row>
                
                <a-divider orientation="left">{{ $t('automation.endPosition') }}</a-divider>
                <a-row :gutter="16">
                    <a-col :span="12">
                        <a-form-item label="X2">
                            <a-input-number
                                v-model="stepConfig.x2"
                                :min="0"
                                :max="800"
                                @change="saveConfig"
                            />
                        </a-form-item>
                    </a-col>
                    <a-col :span="12">
                        <a-form-item label="Y2">
                            <a-input-number
                                v-model="stepConfig.y2"
                                :min="0"
                                :max="600"
                                @change="saveConfig"
                            />
                        </a-form-item>
                    </a-col>
                </a-row>
                
                <a-form-item :label="$t('automation.duration')">
                    <a-slider
                        v-model="stepConfig.duration"
                        :min="100"
                        :max="2000"
                        :step="100"
                        show-input
                        @change="saveConfig"
                    />
                </a-form-item>
            </div>
            
            <!-- 输入配置 -->
            <div v-if="selectedStep.type === 'input'" class="config-section">
                <h4>{{ $t('automation.inputConfig') }}</h4>
                <a-form layout="vertical">
                    <a-form-item :label="$t('automation.inputText')" required>
                        <a-textarea
                            v-model="stepConfig.text"
                            :placeholder="$t('automation.inputTextPlaceholder')"
                            :auto-size="{ minRows: 3, maxRows: 6 }"
                            show-word-limit
                            :max-length="500"
                            @change="saveConfig"
                        />
                    </a-form-item>
                    <a-form-item :label="$t('automation.inputMethod')">
                        <a-radio-group v-model="stepConfig.inputMethod" @change="saveConfig">
                            <a-radio value="adb">ADB 输入（英文）</a-radio>
                            <a-radio value="ime">输入法（支持中文）</a-radio>
                        </a-radio-group>
                    </a-form-item>
                </a-form>
            </div>
            
            <!-- 等待配置 -->
            <div v-if="selectedStep.type === 'wait'" class="config-section">
                <h4>{{ $t('automation.waitConfig') }}</h4>
                <a-form layout="vertical">
                    <a-form-item :label="$t('automation.waitDuration')">
                        <a-slider
                            v-model="stepConfig.waitDuration"
                            :min="500"
                            :max="30000"
                            :step="500"
                            show-input
                            @change="saveConfig"
                        />
                        <div class="quick-select">
                            <a-tag
                                v-for="time in [1000, 2000, 3000, 5000]"
                                :key="time"
                                @click="stepConfig.waitDuration = time; saveConfig()"
                            >
                                {{ time / 1000 }}秒
                            </a-tag>
                        </div>
                    </a-form-item>
                </a-form>
            </div>
            
            <!-- 通用配置 -->
            <div class="config-section common-config">
                <h4>{{ $t('automation.commonConfig') }}</h4>
                <a-form layout="vertical">
                    <a-form-item :label="$t('automation.stepName')">
                        <a-input
                            v-model="stepConfig.name"
                            :placeholder="$t('automation.stepNamePlaceholder')"
                            @change="saveConfig"
                        />
                    </a-form-item>
                    <a-form-item :label="$t('automation.onFailure')">
                        <a-select
                            v-model="stepConfig.onFailure"
                            @change="saveConfig"
                        >
                            <a-select-option value="stop">{{ $t('automation.stop') }}</a-select-option>
                            <a-select-option value="continue">{{ $t('automation.continue') }}</a-select-option>
                            <a-select-option value="retry">{{ $t('automation.retry') }}</a-select-option>
                        </a-select>
                    </a-form-item>
                    <a-form-item :label="$t('automation.note')">
                        <a-textarea
                            v-model="stepConfig.note"
                            :placeholder="$t('automation.notePlaceholder')"
                            :auto-size="{ minRows: 2 }"
                            @change="saveConfig"
                        />
                    </a-form-item>
                </a-form>
            </div>
        </div>
        
        <div v-else class="empty-state">
            <icon-empty />
            <p>{{ $t('automation.noStepSelected') }}</p>
            <small>{{ $t('automation.clickStepToConfig') }}</small>
        </div>
        
        <!-- 屏幕拾取器抽屉 -->
        <a-drawer
            v-model:visible="showScreenPicker"
            :title="$t('automation.pickPosition')"
            placement="right"
            width="900px"
            :closable="false"
        >
            <ScreenPicker
                @position-selected="onPositionSelected"
                @cancel="closePicker"
            />
        </a-drawer>
    </div>
</template>

<style scoped lang="less">
.step-config-panel {
    width: 100%;
    height: 100%;
    overflow-y: auto;
    background: var(--color-bg-card);
    
    .config-content {
        padding: 20px;
    }
    
    .step-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 12px;
        border-bottom: 1px solid var(--color-border);
        
        h3 {
            margin: 0;
            font-size: 16px;
        }
    }
    
    .config-section {
        margin-bottom: 24px;
        
        h4 {
            margin: 0 0 16px 0;
            font-size: 14px;
            color: var(--color-text-secondary);
        }
        
        .quick-select {
            margin-top: 8px;
            display: flex;
            gap: 8px;
            
            :deep(.arco-tag) {
                cursor: pointer;
            }
        }
        
        &.common-config {
            padding-top: 16px;
            border-top: 1px solid var(--color-border);
        }
    }
    
    .empty-state {
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: var(--color-text-disabled);
        text-align: center;
        
        :deep(.icon-empty) {
            font-size: 64px;
            margin-bottom: 16px;
        }
        
        p {
            margin: 0 0 8px 0;
            font-size: 14px;
        }
        
        small {
            font-size: 12px;
        }
    }
}
</style>
