/**
 * 录制的操作类型
 */
export type ActionType = 'tap' | 'swipe' | 'input' | 'wait' | 'image';

/**
 * 单个操作记录
 */
export interface RecordedAction {
    /** 操作 ID */
    id: string;
    /** 操作类型 */
    type: ActionType;
    /** 时间戳（相对于录制开始） */
    timestamp: number;
    /** 位置信息 */
    position?: {
        x: number;
        y: number;
    };
    /** 滑动结束位置 */
    endPosition?: {
        x: number;
        y: number;
    };
    /** 截图模板（Base64） */
    imageTemplate?: string;
    /** OCR 识别的文字 */
    ocrText?: string;
    /** 参数 */
    parameters?: {
        /** 输入文本 */
        text?: string;
        /** 滑动时长 */
        duration?: number;
        /** 等待时长 */
        waitDuration?: number;
        /** 等待条件 */
        waitCondition?: string;
    };
}

/**
 * 录制的脚本
 */
export interface RecordedScript {
    /** 脚本 ID */
    id: string;
    /** 脚本名称 */
    name: string;
    /** 设备 ID */
    deviceId: string;
    /** 操作序列 */
    actions: RecordedAction[];
    /** 创建时间 */
    createdAt: number;
    /** 总时长（毫秒） */
    duration: number;
    /** 描述 */
    description?: string;
    /** 标签 */
    tags?: string[];
}

/**
 * 录制状态
 */
export type RecorderStatus = 'idle' | 'recording' | 'paused' | 'stopped';

/**
 * 录制选项
 */
export interface RecorderOptions {
    /** 自动截图 */
    autoScreenshot?: boolean;
    /** 截图间隔（毫秒） */
    screenshotInterval?: number;
    /** 是否记录 OCR */
    enableOCR?: boolean;
}
