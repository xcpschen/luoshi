<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';
import { Dialog } from '../../lib/dialog';
import { t } from '../../lang';
import { useDeviceStore } from '../../store/modules/device';
import { RecordedScript } from '../../types/Recorder';
import { PlaybackResult } from '../../types/Playback';

const deviceStore = useDeviceStore();

const isPlaying = ref(false);
const isPaused = ref(false);
const progress = ref(0);
const currentStep = ref(0);
const totalSteps = ref(0);
const speed = ref(1.0);

const selectedScript = ref<RecordedScript | null>(null);

const startPlayback = async () => {
    if (!deviceStore.selectedDevice) {
        Dialog.tipError(t('device.notSelected'));
        return;
    }

    if (!selectedScript.value) {
        Dialog.tipError(t('playback.noScriptSelected'));
        return;
    }

    try {
        isPlaying.value = true;
        isPaused.value = false;

        const result = await window.$mapi.playback.play(
            selectedScript.value,
            deviceStore.selectedDevice.id,
            {
                speed: speed.value,
                debug: true,
                timeout: 60000,
                continueOnError: false,
            }
        );

        handlePlaybackResult(result);
    } catch (error: any) {
        Dialog.tipError(t('playback.startFailed') + ': ' + error.message);
        isPlaying.value = false;
    }
};

const stopPlayback = async () => {
    try {
        await window.$mapi.playback.stop();
        isPlaying.value = false;
        isPaused.value = false;
        Dialog.tipSuccess(t('playback.stopped'));
    } catch (error: any) {
        Dialog.tipError(t('playback.stopFailed') + ': ' + error.message);
    }
};

const pausePlayback = async () => {
    try {
        await window.$mapi.playback.pause();
        isPaused.value = true;
        Dialog.tipSuccess(t('playback.paused'));
    } catch (error: any) {
        Dialog.tipError(t('playback.pauseFailed') + ': ' + error.message);
    }
};

const resumePlayback = async () => {
    try {
        await window.$mapi.playback.resume();
        isPaused.value = false;
        Dialog.tipSuccess(t('playback.resumed'));
    } catch (error: any) {
        Dialog.tipError(t('playback.resumeFailed') + ': ' + error.message);
    }
};

const handlePlaybackResult = (result: PlaybackResult) => {
    isPlaying.value = false;

    if (result.success) {
        Dialog.tipSuccess(
            t('playback.completed', {
                steps: result.executedSteps,
                duration: (result.totalDuration / 1000).toFixed(1),
            })
        );
    } else {
        Dialog.tipError(
            t('playback.failed', {
                step: result.failedStep,
                error: result.error,
            })
        );
    }
};

const loadScript = (script: RecordedScript) => {
    selectedScript.value = script;
    totalSteps.value = script.actions.length;
    currentStep.value = 0;
    progress.value = 0;
};

const formatProgress = (percentage: number) => {
    return `${percentage.toFixed(1)}%`;
};

onUnmounted(() => {
    if (isPlaying.value) {
        stopPlayback();
    }
});
</script>

<template>
    <div class="playback-panel">
        <div class="playback-header">
            <h3>{{ $t('playback.title') }}</h3>
            <div class="playback-status">
                <a-tag v-if="isPlaying && !isPaused" color="blue">
                    <icon-loading />
                    {{ $t('playback.playing') }}
                </a-tag>
                <a-tag v-else-if="isPaused" color="orange">
                    {{ $t('playback.paused') }}
                </a-tag>
                <a-tag v-else color="green">
                    {{ $t('playback.stopped') }}
                </a-tag>
            </div>
        </div>

        <div class="playback-info">
            <div class="info-item">
                <label>{{ $t('playback.progress') }}</label>
                <a-progress
                    :percent="progress"
                    :format="formatProgress"
                    :show-text="false"
                />
            </div>
            <div class="info-item">
                <label>{{ $t('playback.step') }}</label>
                <span>{{ currentStep }} / {{ totalSteps }}</span>
            </div>
        </div>

        <div class="playback-controls">
            <a-space>
                <a-button
                    v-if="!isPlaying"
                    type="primary"
                    status="success"
                    @click="startPlayback"
                    :disabled="!selectedScript"
                >
                    <template #icon>
                        <icon-play-arrow />
                    </template>
                    {{ $t('playback.play') }}
                </a-button>

                <a-button
                    v-else-if="!isPaused"
                    type="primary"
                    status="warning"
                    @click="pausePlayback"
                >
                    <template #icon>
                        <icon-pause />
                    </template>
                    {{ $t('playback.pause') }}
                </a-button>

                <a-button
                    v-else
                    type="primary"
                    status="success"
                    @click="resumePlayback"
                >
                    <template #icon>
                        <icon-play-arrow />
                    </template>
                    {{ $t('playback.resume') }}
                </a-button>

                <a-button
                    type="primary"
                    status="danger"
                    @click="stopPlayback"
                    :disabled="!isPlaying"
                >
                    <template #icon>
                        <icon-stop />
                    </template>
                    {{ $t('playback.stop') }}
                </a-button>
            </a-space>
        </div>

        <div class="playback-speed">
            <label>{{ $t('playback.speed') }}:</label>
            <a-select v-model="speed" style="width: 100px">
                <a-option :value="0.5">0.5x</a-option>
                <a-option :value="1.0">1.0x</a-option>
                <a-option :value="1.5">1.5x</a-option>
                <a-option :value="2.0">2.0x</a-option>
            </a-select>
        </div>

        <div class="playback-script-info" v-if="selectedScript">
            <h4>{{ $t('playback.selectedScript') }}</h4>
            <div class="script-details">
                <p><strong>{{ $t('playback.scriptName') }}:</strong> {{ selectedScript.name }}</p>
                <p><strong>{{ $t('playback.scriptSteps') }}:</strong> {{ selectedScript.actions.length }}</p>
                <p><strong>{{ $t('playback.scriptDuration') }}:</strong> {{ (selectedScript.duration / 1000).toFixed(1) }}s</p>
            </div>
        </div>
    </div>
</template>

<style scoped lang="less">
.playback-panel {
    padding: 20px;

    .playback-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
    }

    .playback-info {
        margin-bottom: 20px;

        .info-item {
            display: flex;
            flex-direction: column;
            gap: 5px;
            margin-bottom: 15px;

            label {
                font-size: 12px;
                color: var(--color-text-2);
            }
        }
    }

    .playback-controls {
        margin-bottom: 20px;
    }

    .playback-speed {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 20px;

        label {
            font-weight: bold;
        }
    }

    .playback-script-info {
        h4 {
            margin-bottom: 10px;
        }

        .script-details {
            padding: 15px;
            background: var(--color-bg-2);
            border-radius: 4px;

            p {
                margin: 5px 0;
            }
        }
    }
}
</style>
