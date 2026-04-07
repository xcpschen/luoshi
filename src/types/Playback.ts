import { RecordedScript } from './Recorder';

/**
 * 回放状态
 */
export type PlaybackStatus = 'idle' | 'playing' | 'paused' | 'stopped' | 'completed' | 'failed';

/**
 * 回放进度
 */
export interface PlaybackProgress {
    /** 当前步骤 */
    currentStep: number;
    /** 总步骤数 */
    totalSteps: number;
    /** 执行百分比 */
    percentage: number;
    /** 已执行时长（毫秒） */
    elapsed: number;
}

/**
 * 回放结果
 */
export interface PlaybackResult {
    /** 是否成功 */
    success: boolean;
    /** 执行的步骤数 */
    executedSteps: number;
    /** 失败的步骤 */
    failedStep?: number;
    /** 错误信息 */
    error?: string;
    /** 总耗时（毫秒） */
    totalDuration: number;
}

/**
 * 回放选项
 */
export interface PlaybackOptions {
    /** 执行速度（1.0 = 正常，0.5 = 半速，2.0 = 倍速） */
    speed?: number;
    /** 是否显示调试信息 */
    debug?: boolean;
    /** 超时时间（毫秒） */
    timeout?: number;
    /** 失败后是否继续 */
    continueOnError?: boolean;
}
