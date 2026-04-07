import { ipcRenderer } from 'electron';
import { RecordedScript } from '../../../src/types/Recorder';
import { PlaybackResult, PlaybackOptions, PlaybackProgress } from '../../../src/types/Playback';

/**
 * 播放脚本
 */
export const play = async (
    script: RecordedScript,
    deviceId: string,
    options?: PlaybackOptions
): Promise<PlaybackResult> => {
    return await ipcRenderer.invoke('playback:play', script, deviceId, options);
};

/**
 * 停止播放
 */
export const stop = async (): Promise<void> => {
    await ipcRenderer.invoke('playback:stop');
};

/**
 * 暂停播放
 */
export const pause = async (): Promise<void> => {
    await ipcRenderer.invoke('playback:pause');
};

/**
 * 恢复播放
 */
export const resume = async (): Promise<void> => {
    await ipcRenderer.invoke('playback:resume');
};

/**
 * 获取进度
 */
export const getProgress = async (script: RecordedScript): Promise<PlaybackProgress> => {
    return await ipcRenderer.invoke('playback:get-progress', script);
};

export default {
    play,
    stop,
    pause,
    resume,
    getProgress,
};
