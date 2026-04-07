import { ipcRenderer } from 'electron';
import { RecordedAction, RecordedScript } from '../../../src/types/Recorder';

/**
 * 开始录制
 */
export const startRecording = async (deviceId: string): Promise<void> => {
    await ipcRenderer.invoke('recorder:start', deviceId);
};

/**
 * 停止录制
 */
export const stopRecording = async (): Promise<RecordedScript> => {
    const result = await ipcRenderer.invoke('recorder:stop');
    return result.script;
};

/**
 * 记录操作
 */
export const recordAction = async (action: Omit<RecordedAction, 'id' | 'timestamp'>): Promise<void> => {
    await ipcRenderer.invoke('recorder:record-action', action);
};

/**
 * 获取录制状态
 */
export const getRecordingStatus = async (): Promise<{
    isRecording: boolean;
    actionCount: number;
    duration: number;
}> => {
    return await ipcRenderer.invoke('recorder:get-status');
};

/**
 * 清空录制
 */
export const clearRecording = async (): Promise<void> => {
    await ipcRenderer.invoke('recorder:clear');
};

/**
 * 辅助函数：记录点击
 */
export const recordTap = async (x: number, y: number, imageTemplate?: string): Promise<void> => {
    await recordAction({
        type: 'tap',
        position: { x, y },
        imageTemplate,
    });
};

/**
 * 辅助函数：记录滑动
 */
export const recordSwipe = async (
    x1: number, y1: number,
    x2: number, y2: number,
    duration: number = 300,
    imageTemplate?: string
): Promise<void> => {
    await recordAction({
        type: 'swipe',
        position: { x: x1, y: y1 },
        endPosition: { x: x2, y: y2 },
        parameters: { duration },
        imageTemplate,
    });
};

/**
 * 辅助函数：记录输入
 */
export const recordInput = async (text: string): Promise<void> => {
    await recordAction({
        type: 'input',
        parameters: { text },
    });
};

/**
 * 辅助函数：记录等待
 */
export const recordWait = async (duration: number, condition?: string): Promise<void> => {
    await recordAction({
        type: 'wait',
        parameters: {
            waitDuration: duration,
            waitCondition: condition,
        },
    });
};

export default {
    startRecording,
    stopRecording,
    recordAction,
    getRecordingStatus,
    clearRecording,
    recordTap,
    recordSwipe,
    recordInput,
    recordWait,
};
