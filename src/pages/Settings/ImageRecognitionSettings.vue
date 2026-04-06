<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { t } from '../../lang';
import { Dialog } from '../../lib/dialog';
import type { 
    ImageRecognitionConfig,
    ImageRecognitionServiceType 
} from '../../types/ImageRecognition';

const loading = ref(false);
const enabled = ref(true);
const serviceType = ref<ImageRecognitionServiceType>('local' as ImageRecognitionServiceType);

// 各服务配置
const remoteConfig = ref({
    serverUrl: 'ws://localhost:8765',
    defaultThreshold: 0.8,
    defaultTimeout: 30000,
    maxRetries: 3,
});

const localConfig = ref({
    defaultThreshold: 0.8,
    defaultTimeout: 30000,
    maxRetries: 0,
});

const cloudConfig = ref({
    apiKey: '',
    apiSecret: '',
    endpoint: '',
    defaultThreshold: 0.8,
    defaultTimeout: 10000,
    maxRetries: 1,
});

// 加载配置
const loadConfig = async () => {
    loading.value = true;
    try {
        // 检查图像识别服务是否可用
        if (!window.$mapi.imageRecognition || !window.$mapi.imageRecognition.config) {
            console.warn('[ImageRecognitionSettings] Image recognition service is not available');
            // 使用默认配置
            enabled.value = true;
            serviceType.value = 'local';
            return;
        }
        
        const config = await window.$mapi.imageRecognition.config.getConfig();
        if (config) {
            enabled.value = config.enabled ?? true;
            serviceType.value = config.serviceType ?? 'local';
            
            if (config.services) {
                remoteConfig.value = { ...remoteConfig.value, ...config.services.remote };
                localConfig.value = { ...localConfig.value, ...config.services.local };
                cloudConfig.value = { ...cloudConfig.value, ...config.services.cloud };
            }
        }
    } catch (error: any) {
        console.error('[ImageRecognitionSettings] Failed to load config:', error);
        Dialog.tipError(t('common.loadFailed'));
    } finally {
        loading.value = false;
    }
};

// 保存配置
const saveConfig = async () => {
    loading.value = true;
    try {
        // 检查图像识别服务是否可用
        if (!window.$mapi.imageRecognition || !window.$mapi.imageRecognition.config) {
            Dialog.tipWarning('图像识别服务未启用，无法保存配置');
            loading.value = false;
            return;
        }
        
        const config: ImageRecognitionConfig = {
            enabled: enabled.value,
            serviceType: serviceType.value,
            services: {
                remote: remoteConfig.value,
                local: localConfig.value,
                cloud: cloudConfig.value,
            },
            fallbackServices: getFallbackServices(),
        };
        
        await window.$mapi.imageRecognition.config.setConfig(config);
        
        // 提示用户需要重启
        Dialog.tipSuccess(t('common.saveSuccess'));
        
        // 询问是否立即重启服务
        const confirmed = await Dialog.confirm(
            t('setting.imageRecognition.restartRequired'),
            t('setting.imageRecognition.restartNow')
        );
        
        if (confirmed) {
            await restartService();
        }
    } catch (error: any) {
        console.error('[ImageRecognitionSettings] Failed to save config:', error);
        Dialog.tipError(t('common.saveFailed'));
    } finally {
        loading.value = false;
    }
};

// 获取降级服务列表
const getFallbackServices = (): ImageRecognitionServiceType[] => {
    const fallbacks: ImageRecognitionServiceType[] = [];
    
    // 添加非当前服务的其他服务作为降级
    const allServices: ImageRecognitionServiceType[] = ['local' as ImageRecognitionServiceType, 'remote' as ImageRecognitionServiceType, 'cloud' as ImageRecognitionServiceType];
    for (const service of allServices) {
        if (service !== serviceType.value) {
            fallbacks.push(service);
        }
    }
    
    return fallbacks;
};

// 重启服务
const restartService = async () => {
    try {
        await window.$mapi.imageRecognition.switchService(serviceType.value);
        Dialog.tipSuccess(t('setting.imageRecognition.serviceRestarted'));
    } catch (error: any) {
        console.error('[ImageRecognitionSettings] Failed to restart service:', error);
        Dialog.tipError(t('setting.imageRecognition.restartFailed'));
    }
};

// 重置为默认值
const resetToDefault = () => {
    enabled.value = true;
    serviceType.value = 'local' as ImageRecognitionServiceType;
    
    remoteConfig.value = {
        serverUrl: 'ws://localhost:8765',
        defaultThreshold: 0.8,
        defaultTimeout: 30000,
        maxRetries: 3,
    };
    
    localConfig.value = {
        defaultThreshold: 0.8,
        defaultTimeout: 30000,
        maxRetries: 0,
    };
    
    cloudConfig.value = {
        apiKey: '',
        apiSecret: '',
        endpoint: '',
        defaultThreshold: 0.8,
        defaultTimeout: 10000,
        maxRetries: 1,
    };
};

onMounted(() => {
    loadConfig();
});
</script>

<template>
    <div class="image-recognition-settings">
        <div class="settings-section">
            <!-- 总开关 -->
            <a-form layout="vertical">
                <a-form-item :label="t('setting.imageRecognition.enabled')">
                    <a-switch 
                        v-model="enabled" 
                        :disabled="loading"
                        checked-text="ON"
                        unchecked-text="OFF"
                    />
                    <div class="form-item-desc">
                        {{ t('setting.imageRecognition.enabledDesc') }}
                    </div>
                </a-form-item>
                
                <!-- 服务类型选择 -->
                <a-form-item :label="t('setting.imageRecognition.serviceType')" :disabled="!enabled">
                    <a-radio-group v-model="serviceType" :disabled="loading || !enabled">
                        <a-radio value="local">
                            <div class="radio-content">
                                <div class="radio-title">{{ t('setting.imageRecognition.serviceLocal') }}</div>
                                <div class="radio-desc">{{ t('setting.imageRecognition.serviceLocalDesc') }}</div>
                            </div>
                        </a-radio>
                        <a-radio value="remote">
                            <div class="radio-content">
                                <div class="radio-title">{{ t('setting.imageRecognition.serviceRemote') }}</div>
                                <div class="radio-desc">{{ t('setting.imageRecognition.serviceRemoteDesc') }}</div>
                            </div>
                        </a-radio>
                        <a-radio value="cloud">
                            <div class="radio-content">
                                <div class="radio-title">{{ t('setting.imageRecognition.serviceCloud') }}</div>
                                <div class="radio-desc">{{ t('setting.imageRecognition.serviceCloudDesc') }}</div>
                            </div>
                        </a-radio>
                    </a-radio-group>
                </a-form-item>
            </a-form>
            
            <!-- 远程服务配置 -->
            <div v-if="serviceType === 'remote' && enabled" class="service-config">
                <h4 class="service-config-title">
                    {{ t('setting.imageRecognition.serviceRemote') }}
                </h4>
                <a-form layout="vertical">
                    <a-form-item :label="t('setting.imageRecognition.serverUrl')">
                        <a-input 
                            v-model="remoteConfig.serverUrl" 
                            placeholder="ws://localhost:8765"
                            :disabled="loading || !enabled"
                        />
                    </a-form-item>
                    <a-form-item :label="t('setting.imageRecognition.threshold')">
                        <a-slider 
                            v-model="remoteConfig.defaultThreshold" 
                            :min="0.1" 
                            :max="1.0" 
                            :step="0.05"
                            :disabled="loading || !enabled"
                        />
                        <div class="slider-value">{{ remoteConfig.defaultThreshold }}</div>
                    </a-form-item>
                    <a-form-item :label="t('setting.imageRecognition.timeout')">
                        <a-input-number 
                            v-model="remoteConfig.defaultTimeout" 
                            :min="1000"
                            :step="1000"
                            :disabled="loading || !enabled"
                        >
                            <template #suffix>ms</template>
                        </a-input-number>
                    </a-form-item>
                    <a-form-item :label="t('setting.imageRecognition.maxRetries')">
                        <a-input-number 
                            v-model="remoteConfig.maxRetries" 
                            :min="0"
                            :max="10"
                            :disabled="loading || !enabled"
                        />
                    </a-form-item>
                </a-form>
            </div>
            
            <!-- 本地服务配置 -->
            <div v-if="serviceType === 'local' && enabled" class="service-config">
                <h4 class="service-config-title">
                    {{ t('setting.imageRecognition.serviceLocal') }}
                </h4>
                <a-form layout="vertical">
                    <a-form-item :label="t('setting.imageRecognition.threshold')">
                        <a-slider 
                            v-model="localConfig.defaultThreshold" 
                            :min="0.1" 
                            :max="1.0" 
                            :step="0.05"
                            :disabled="loading || !enabled"
                        />
                        <div class="slider-value">{{ localConfig.defaultThreshold }}</div>
                    </a-form-item>
                    <a-form-item :label="t('setting.imageRecognition.timeout')">
                        <a-input-number 
                            v-model="localConfig.defaultTimeout" 
                            :min="1000"
                            :step="1000"
                            :disabled="loading || !enabled"
                        >
                            <template #suffix>ms</template>
                        </a-input-number>
                    </a-form-item>
                    <a-form-item :label="t('setting.imageRecognition.maxRetries')">
                        <a-input-number 
                            v-model="localConfig.maxRetries" 
                            :min="0"
                            :max="10"
                            :disabled="loading || !enabled"
                        />
                    </a-form-item>
                </a-form>
            </div>
            
            <!-- 云服务配置 -->
            <div v-if="serviceType === 'cloud' && enabled" class="service-config">
                <h4 class="service-config-title">
                    {{ t('setting.imageRecognition.serviceCloud') }}
                </h4>
                <a-form layout="vertical">
                    <a-form-item :label="t('setting.imageRecognition.apiKey')">
                        <a-input 
                            v-model="cloudConfig.apiKey" 
                            :disabled="loading || !enabled"
                            type="password"
                            show-password
                        />
                    </a-form-item>
                    <a-form-item :label="t('setting.imageRecognition.apiSecret')">
                        <a-input 
                            v-model="cloudConfig.apiSecret" 
                            :disabled="loading || !enabled"
                            type="password"
                            show-password
                        />
                    </a-form-item>
                    <a-form-item :label="t('setting.imageRecognition.endpoint')">
                        <a-input 
                            v-model="cloudConfig.endpoint" 
                            :disabled="loading || !enabled"
                            placeholder="https://api.example.com/v1/recognition"
                        />
                    </a-form-item>
                    <a-form-item :label="t('setting.imageRecognition.threshold')">
                        <a-slider 
                            v-model="cloudConfig.defaultThreshold" 
                            :min="0.1" 
                            :max="1.0" 
                            :step="0.05"
                            :disabled="loading || !enabled"
                        />
                        <div class="slider-value">{{ cloudConfig.defaultThreshold }}</div>
                    </a-form-item>
                    <a-form-item :label="t('setting.imageRecognition.timeout')">
                        <a-input-number 
                            v-model="cloudConfig.defaultTimeout" 
                            :min="1000"
                            :step="1000"
                            :disabled="loading || !enabled"
                        >
                            <template #suffix>ms</template>
                        </a-input-number>
                    </a-form-item>
                    <a-form-item :label="t('setting.imageRecognition.maxRetries')">
                        <a-input-number 
                            v-model="cloudConfig.maxRetries" 
                            :min="0"
                            :max="10"
                            :disabled="loading || !enabled"
                        />
                    </a-form-item>
                </a-form>
            </div>
            
            <!-- 操作按钮 -->
            <div class="actions">
                <a-button 
                    @click="resetToDefault" 
                    :disabled="loading || !enabled"
                >
                    {{ t('common.reset') }}
                </a-button>
                <a-button 
                    type="primary" 
                    @click="saveConfig"
                    :loading="loading"
                    :disabled="!enabled"
                >
                    {{ t('common.save') }}
                </a-button>
            </div>
        </div>
    </div>
</template>

<style scoped lang="less">
.image-recognition-settings {
    .settings-section {
        .section-title {
            margin-bottom: 20px;
            font-size: 16px;
            font-weight: 600;
            color: var(--color-text-1);
        }
        
        :deep(.arco-form-item) {
            margin-bottom: 20px;
        }
        
        .form-item-desc {
            font-size: 12px;
            color: var(--color-text-3);
            margin-top: 4px;
        }
        
        .radio-content {
            .radio-title {
                font-weight: 500;
                margin-bottom: 4px;
            }
            
            .radio-desc {
                font-size: 12px;
                color: var(--color-text-3);
            }
        }
        
        .service-config {
            margin: 20px 0;
            padding: 16px;
            background: var(--color-fill-1);
            border-radius: 4px;
            
            .service-config-title {
                margin: 0 0 16px 0;
                font-size: 14px;
                font-weight: 600;
                color: var(--color-text-1);
            }
            
            .slider-value {
                margin-top: 8px;
                font-size: 12px;
                color: var(--color-text-2);
            }
        }
        
        .actions {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            margin-top: 24px;
            padding-top: 20px;
            border-top: 1px solid var(--color-border-2);
        }
    }
}
</style>
