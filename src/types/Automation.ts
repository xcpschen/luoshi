/**
 * 自动化任务类型定义
 */

/**
 * 操作步骤类型
 */
export type StepType = 
    | 'tap'           // 点击
    | 'swipe'         // 滑动
    | 'input'         // 输入文本
    | 'wait'          // 等待
    | 'keyevent'      // 按键
    | 'longPress'     // 长按
    | 'image'         // 图像识别
    | 'screenshot';   // 截图

/**
 * 操作步骤配置
 */
export interface StepConfig {
    // 点击配置
    x?: number;
    y?: number;
    
    // 滑动配置
    x1?: number;
    y1?: number;
    x2?: number;
    y2?: number;
    duration?: number;
    
    // 输入配置
    text?: string;
    inputMethod?: 'adb' | 'ime';
    
    // 等待配置
    waitDuration?: number;
    waitCondition?: string;
    timeout?: number;
    
    // 按键配置
    keycode?: number;
    
    // 图像识别配置
    templatePath?: string;
    threshold?: number;
    imageAction?: 'tap' | 'wait' | 'none';
    
    // 通用配置
    name?: string;
    note?: string;
    onFailure?: 'stop' | 'continue' | 'retry';
    maxRetries?: number;
}

/**
 * 操作步骤
 */
export interface Step {
    id: string;
    type: StepType;
    config: StepConfig;
    order: number;
    
    // 运行时信息
    executed?: boolean;
    executedAt?: number;
    result?: any;
    error?: string;
}

/**
 * 任务执行策略
 */
export interface ExecutionStrategy {
    speed: number;              // 执行速度（0.5, 1.0, 1.5, 2.0）
    timeout: number;            // 超时时间
    timeoutUnit: 'seconds' | 'minutes';
    continueOnError: boolean;   // 失败后继续
    retryOnFailure: boolean;    // 失败重试
    maxRetries: number;         // 最大重试次数
    screenshotOnStep: boolean;  // 每步截图
    screenshotOnError: boolean; // 出错截图
}

/**
 * 任务触发器
 */
export interface TaskTrigger {
    type: 'manual' | 'scheduled' | 'event';
    scheduledTime?: string;     // HH:mm 格式
    repeatDays?: string[];      // ['mon', 'tue', ...]
    eventType?: string;
    customEvent?: string;
}

/**
 * 自动化任务
 */
export interface AutomationTask {
    id: string;
    name: string;
    description?: string;
    tags?: string[];
    
    // 关联信息
    appId?: string;             // 包名
    appName?: string;           // 应用名称
    deviceId?: string;          // 设备 ID
    
    // 步骤序列
    steps: Step[];
    
    // 执行策略
    strategy: ExecutionStrategy;
    
    // 触发器
    trigger: TaskTrigger;
    
    // 元数据
    createdAt: number;
    updatedAt: number;
    createdBy?: string;
    lastExecutedAt?: number;
    executionCount?: number;
}

/**
 * 任务执行结果
 */
export interface TaskExecutionResult {
    success: boolean;
    taskId: string;
    executedSteps: number;
    totalSteps: number;
    failedStep?: number;
    error?: string;
    duration: number;
    screenshots?: string[];
}

/**
 * 任务执行进度
 */
export interface TaskExecutionProgress {
    currentStep: number;
    totalSteps: number;
    percentage: number;
    elapsed: number;
    currentAction?: string;
}

/**
 * 录制状态
 */
export interface RecordingState {
    isRecording: boolean;
    deviceId: string | null;
    startTime: number;
    steps: Step[];
    actionCount: number;
}

/**
 * 回放状态
 */
export interface PlaybackState {
    isPlaying: boolean;
    isPaused: boolean;
    taskId: string | null;
    currentStep: number;
    startTime: number;
    progress: TaskExecutionProgress;
}

/**
 * 屏幕坐标
 */
export interface ScreenCoords {
    x: number;
    y: number;
}

/**
 * 应用信息
 */
export interface AppInfo {
    packageName: string;
    name: string;
    icon: string;
    versionName?: string;
    versionCode?: number;
    size?: number;
    installTime?: number;
    isSystem?: boolean;
}

/**
 * 小程序信息
 */
export interface MiniProgramInfo {
    appId: string;
    name: string;
    icon: string;
    packageId?: string;
    lastUsed?: number;
}
