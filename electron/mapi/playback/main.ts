import { ipcMain } from 'electron';
import { RecordedScript, RecordedAction } from '../../../src/types/Recorder';
import { PlaybackResult, PlaybackOptions } from '../../../src/types/Playback';
import adb from '../adb/render';

/**
 * 脚本播放器
 */
class ScriptPlayer {
    private isPlaying = false;
    private isPaused = false;
    private currentStep = 0;
    private startTime = 0;
    private pauseStartTime = 0;
    private totalPauseTime = 0;

    /**
     * 播放脚本
     */
    async play(
        script: RecordedScript,
        deviceId: string,
        options: PlaybackOptions = {}
    ): Promise<PlaybackResult> {
        const {
            speed = 1.0,
            debug = false,
            timeout = 60000,
            continueOnError = false,
        } = options;

        this.isPlaying = true;
        this.isPaused = false;
        this.currentStep = 0;
        this.startTime = Date.now();
        this.totalPauseTime = 0;

        if (debug) {
            console.log(`[Playback] Starting playback of script with ${script.actions.length} actions`);
        }

        try {
            for (let i = 0; i < script.actions.length; i++) {
                if (!this.isPlaying) {
                    return {
                        success: false,
                        executedSteps: i,
                        error: 'Playback stopped by user',
                        totalDuration: Date.now() - this.startTime,
                    };
                }

                // 检查超时
                const elapsed = Date.now() - this.startTime - this.totalPauseTime;
                if (elapsed > timeout) {
                    return {
                        success: false,
                        executedSteps: i,
                        error: 'Playback timeout',
                        totalDuration: elapsed,
                    };
                }

                this.currentStep = i;
                const action = script.actions[i];

                if (debug) {
                    console.log(`[Playback] Executing action ${i}: ${action.type}`);
                }

                try {
                    await this.executeAction(action, deviceId, speed);
                } catch (error: any) {
                    if (!continueOnError) {
                        throw error;
                    }
                    console.warn(`[Playback] Action ${i} failed, continuing:`, error.message);
                }

                // 等待到下一个操作的时间（考虑速度倍率）
                if (i < script.actions.length - 1) {
                    const nextAction = script.actions[i + 1];
                    const waitTime = (nextAction.timestamp - action.timestamp) / speed;
                    await this.sleep(waitTime);
                }
            }

            return {
                success: true,
                executedSteps: script.actions.length,
                totalDuration: Date.now() - this.startTime,
            };
        } catch (error: any) {
            return {
                success: false,
                executedSteps: this.currentStep,
                failedStep: this.currentStep,
                error: error.message,
                totalDuration: Date.now() - this.startTime,
            };
        } finally {
            this.isPlaying = false;
        }
    }

    /**
     * 执行单个操作
     */
    private async executeAction(
        action: RecordedAction,
        deviceId: string,
        speed: number
    ): Promise<void> {
        switch (action.type) {
            case 'tap':
                await this.executeTap(action, deviceId);
                break;

            case 'swipe':
                await this.executeSwipe(action, deviceId);
                break;

            case 'input':
                await this.executeInput(action, deviceId);
                break;

            case 'wait':
                await this.executeWait(action, speed);
                break;

            case 'image':
                await this.executeImage(action, deviceId);
                break;
        }
    }

    /**
     * 执行点击
     */
    private async executeTap(action: RecordedAction, deviceId: string): Promise<void> {
        if (action.position) {
            await adb.tap(deviceId, action.position.x, action.position.y);
        } else {
            throw new Error('Tap action missing position');
        }
    }

    /**
     * 执行滑动
     */
    private async executeSwipe(action: RecordedAction, deviceId: string): Promise<void> {
        if (!action.position || !action.endPosition) {
            throw new Error('Swipe action missing position');
        }

        await adb.swipe(
            deviceId,
            action.position.x,
            action.position.y,
            action.endPosition.x,
            action.endPosition.y,
            action.parameters?.duration || 300
        );
    }

    /**
     * 执行输入
     */
    private async executeInput(action: RecordedAction, deviceId: string): Promise<void> {
        if (!action.parameters?.text) {
            throw new Error('Input action missing text');
        }

        await adb.text(deviceId, action.parameters.text);
    }

    /**
     * 执行等待
     */
    private async executeWait(action: RecordedAction, speed: number): Promise<void> {
        const duration = action.parameters?.waitDuration || 1000;
        await this.sleep(duration / speed);
    }

    /**
     * 执行图像识别等待
     */
    private async executeImage(action: RecordedAction, deviceId: string): Promise<void> {
        // TODO: 集成图像识别
        throw new Error('Image recognition not yet implemented');
    }

    /**
     * 暂停播放
     */
    pause(): void {
        if (!this.isPlaying || this.isPaused) return;
        this.isPaused = true;
        this.pauseStartTime = Date.now();
    }

    /**
     * 恢复播放
     */
    resume(): void {
        if (!this.isPaused) return;
        this.isPaused = false;
        this.totalPauseTime += Date.now() - this.pauseStartTime;
    }

    /**
     * 停止播放
     */
    stop(): void {
        this.isPlaying = false;
        this.isPaused = false;
    }

    /**
     * 获取进度
     */
    getProgress(script: RecordedScript): {
        currentStep: number;
        totalSteps: number;
        percentage: number;
    } {
        return {
            currentStep: this.currentStep,
            totalSteps: script.actions.length,
            percentage: Math.round((this.currentStep / script.actions.length) * 100),
        };
    }

    /**
     * 睡眠辅助函数
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 单例
const player = new ScriptPlayer();

// IPC Handlers
export function registerPlaybackHandlers() {
    ipcMain.handle('playback:play', async (event, script, deviceId, options) => {
        return await player.play(script, deviceId, options);
    });

    ipcMain.handle('playback:stop', async () => {
        player.stop();
        return { success: true };
    });

    ipcMain.handle('playback:pause', async () => {
        player.pause();
        return { success: true };
    });

    ipcMain.handle('playback:resume', async () => {
        player.resume();
        return { success: true };
    });

    ipcMain.handle('playback:get-progress', async (event, script) => {
        return player.getProgress(script);
    });
}

export default player;
