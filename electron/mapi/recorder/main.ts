import { ipcMain } from 'electron';
import { RecordedAction, RecordedScript, RecorderOptions } from '../../../src/types/Recorder';

/**
 * 操作录制器
 */
class ActionRecorder {
    private isRecording = false;
    private actions: RecordedAction[] = [];
    private startTime = 0;
    private currentDeviceId: string | null = null;
    private actionIdCounter = 0;
    private options: RecorderOptions;

    constructor(options: RecorderOptions = {}) {
        this.options = {
            autoScreenshot: true,
            screenshotInterval: 1000,
            enableOCR: false,
            ...options,
        };
    }

    /**
     * 开始录制
     */
    startRecording(deviceId: string): void {
        this.isRecording = true;
        this.actions = [];
        this.startTime = Date.now();
        this.currentDeviceId = deviceId;
        this.actionIdCounter = 0;
        
        console.log(`[Recorder] Started recording on device ${deviceId}`);
    }

    /**
     * 停止录制
     */
    stopRecording(): RecordedScript {
        this.isRecording = false;
        
        const script: RecordedScript = {
            id: this.generateScriptId(),
            name: `Recording_${new Date().toISOString()}`,
            deviceId: this.currentDeviceId!,
            actions: [...this.actions],
            createdAt: Date.now(),
            duration: Date.now() - this.startTime,
        };
        
        console.log(`[Recorder] Stopped recording, ${script.actions.length} actions recorded`);
        
        this.currentDeviceId = null;
        return script;
    }

    /**
     * 记录操作
     */
    recordAction(action: Omit<RecordedAction, 'id' | 'timestamp'>): void {
        if (!this.isRecording) {
            return;
        }
        
        const recordedAction: RecordedAction = {
            ...action,
            id: `action_${++this.actionIdCounter}`,
            timestamp: Date.now() - this.startTime,
        };
        
        this.actions.push(recordedAction);
        
        console.log(`[Recorder] Recorded action: ${action.type} at ${recordedAction.timestamp}ms`);
    }

    /**
     * 获取当前状态
     */
    getStatus(): { isRecording: boolean; actionCount: number; duration: number } {
        return {
            isRecording: this.isRecording,
            actionCount: this.actions.length,
            duration: this.isRecording ? Date.now() - this.startTime : 0,
        };
    }

    /**
     * 生成脚本 ID
     */
    private generateScriptId(): string {
        return `script_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    /**
     * 清空录制
     */
    clear(): void {
        this.actions = [];
        this.actionIdCounter = 0;
    }
}

// 单例
const recorder = new ActionRecorder();

// IPC Handlers
export function registerRecorderHandlers() {
    ipcMain.handle('recorder:start', async (event, deviceId: string) => {
        recorder.startRecording(deviceId);
        return { success: true };
    });

    ipcMain.handle('recorder:stop', async () => {
        const script = recorder.stopRecording();
        return { success: true, script };
    });

    ipcMain.handle('recorder:record-action', async (event, action) => {
        recorder.recordAction(action);
        return { success: true };
    });

    ipcMain.handle('recorder:get-status', async () => {
        return recorder.getStatus();
    });

    ipcMain.handle('recorder:clear', async () => {
        recorder.clear();
        return { success: true };
    });
}

export default recorder;
