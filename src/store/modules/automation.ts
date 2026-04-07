import { defineStore } from 'pinia';
import type {
    AutomationTask,
    Step,
    StepType,
    StepConfig,
    ExecutionStrategy,
    TaskTrigger,
    TaskExecutionResult,
    TaskExecutionProgress,
    RecordingState,
    PlaybackState,
    AppInfo,
} from '../types/Automation';

interface AutomationState {
    // 任务列表
    tasks: AutomationTask[];
    selectedTaskId: string | null;
    
    // 当前编辑的任务
    editingTask: Partial<AutomationTask> | null;
    
    // 录制状态
    recording: RecordingState;
    
    // 回放状态
    playback: PlaybackState;
    
    // 设备应用列表
    installedApps: AppInfo[];
    
    // UI 状态
    uiState: {
        showRecorder: boolean;
        showEditor: boolean;
        showPlayback: boolean;
        selectedStepId: string | null;
    };
}

function generateId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function generateStepId(): string {
    return `step_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function createDefaultStrategy(): ExecutionStrategy {
    return {
        speed: 1.0,
        timeout: 300,
        timeoutUnit: 'seconds',
        continueOnError: false,
        retryOnFailure: true,
        maxRetries: 3,
        screenshotOnStep: false,
        screenshotOnError: true,
    };
}

function createDefaultTrigger(): TaskTrigger {
    return {
        type: 'manual',
    };
}

export const useAutomationStore = defineStore('automation', {
    state: (): AutomationState => ({
        tasks: [],
        selectedTaskId: null,
        editingTask: null,
        recording: {
            isRecording: false,
            deviceId: null,
            startTime: 0,
            steps: [],
            actionCount: 0,
        },
        playback: {
            isPlaying: false,
            isPaused: false,
            taskId: null,
            currentStep: 0,
            startTime: 0,
            progress: {
                currentStep: 0,
                totalSteps: 0,
                percentage: 0,
                elapsed: 0,
            },
        },
        installedApps: [],
        uiState: {
            showRecorder: false,
            showEditor: false,
            showPlayback: false,
            selectedStepId: null,
        },
    }),
    
    getters: {
        // 获取选中的任务
        selectedTask: (state) => {
            return state.tasks.find(t => t.id === state.selectedTaskId) || null;
        },
        
        // 获取任务数量
        taskCount: (state) => state.tasks.length,
        
        // 获取录制中的步骤数
        recordingStepCount: (state) => state.recording.steps.length,
        
        // 检查是否正在录制
        isRecording: (state) => state.recording.isRecording,
        
        // 检查是否正在回放
        isPlaying: (state) => state.playback.isPlaying,
    },
    
    actions: {
        // ========== 任务管理 ==========
        
        /**
         * 创建新任务
         */
        createTask(name: string, description?: string) {
            const task: AutomationTask = {
                id: generateId(),
                name,
                description,
                tags: [],
                steps: [],
                strategy: createDefaultStrategy(),
                trigger: createDefaultTrigger(),
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };
            
            this.tasks.push(task);
            this.selectedTaskId = task.id;
            this.editingTask = { ...task };
            
            return task;
        },
        
        /**
         * 保存任务
         */
        saveTask() {
            if (!this.editingTask || !this.editingTask.id) {
                throw new Error('没有可保存的任务');
            }
            
            const index = this.tasks.findIndex(t => t.id === this.editingTask!.id);
            if (index !== -1) {
                // 更新现有任务
                this.tasks[index] = {
                    ...this.tasks[index],
                    ...this.editingTask,
                    updatedAt: Date.now(),
                } as AutomationTask;
            } else {
                // 添加新任务
                this.tasks.push(this.editingTask as AutomationTask);
            }
            
            this.selectedTaskId = this.editingTask.id;
        },
        
        /**
         * 删除任务
         */
        deleteTask(taskId: string) {
            const index = this.tasks.findIndex(t => t.id === taskId);
            if (index !== -1) {
                this.tasks.splice(index, 1);
                if (this.selectedTaskId === taskId) {
                    this.selectedTaskId = null;
                }
                if (this.editingTask?.id === taskId) {
                    this.editingTask = null;
                }
            }
        },
        
        /**
         * 选择任务
         */
        selectTask(taskId: string) {
            this.selectedTaskId = taskId;
            const task = this.tasks.find(t => t.id === taskId);
            if (task) {
                this.editingTask = { ...task };
            }
        },
        
        // ========== 步骤管理 ==========
        
        /**
         * 添加步骤
         */
        addStep(type: StepType, config: StepConfig = {}) {
            if (!this.editingTask) {
                throw new Error('没有正在编辑的任务');
            }
            
            const step: Step = {
                id: generateStepId(),
                type,
                config,
                order: this.editingTask.steps?.length || 0,
            };
            
            if (!this.editingTask.steps) {
                this.editingTask.steps = [];
            }
            
            this.editingTask.steps.push(step);
            this.updateTaskTimestamp();
            
            return step;
        },
        
        /**
         * 更新步骤
         */
        updateStep(stepId: string, config: Partial<StepConfig>) {
            if (!this.editingTask?.steps) {
                return;
            }
            
            const step = this.editingTask.steps.find(s => s.id === stepId);
            if (step) {
                step.config = { ...step.config, ...config };
                this.updateTaskTimestamp();
            }
        },
        
        /**
         * 删除步骤
         */
        deleteStep(stepId: string) {
            if (!this.editingTask?.steps) {
                return;
            }
            
            const index = this.editingTask.steps.findIndex(s => s.id === stepId);
            if (index !== -1) {
                this.editingTask.steps.splice(index, 1);
                // 重新排序
                this.editingTask.steps.forEach((step, i) => {
                    step.order = i;
                });
                this.updateTaskTimestamp();
            }
        },
        
        /**
         * 重新排序步骤
         */
        reorderSteps(fromIndex: number, toIndex: number) {
            if (!this.editingTask?.steps) {
                return;
            }
            
            const step = this.editingTask.steps.splice(fromIndex, 1)[0];
            this.editingTask.steps.splice(toIndex, 0, step);
            
            // 重新排序
            this.editingTask.steps.forEach((s, i) => {
                s.order = i;
            });
            
            this.updateTaskTimestamp();
        },
        
        /**
         * 更新任务时间戳
         */
        updateTaskTimestamp() {
            if (this.editingTask) {
                this.editingTask.updatedAt = Date.now();
            }
        },
        
        // ========== 录制控制 ==========
        
        /**
         * 开始录制
         */
        startRecording(deviceId: string) {
            this.recording = {
                isRecording: true,
                deviceId,
                startTime: Date.now(),
                steps: [],
                actionCount: 0,
            };
            this.uiState.showRecorder = true;
        },
        
        /**
         * 停止录制
         */
        stopRecording() {
            this.recording.isRecording = false;
            this.uiState.showRecorder = false;
            
            return {
                steps: [...this.recording.steps],
                duration: Date.now() - this.recording.startTime,
                actionCount: this.recording.actionCount,
            };
        },
        
        /**
         * 添加录制的操作
         */
        addRecordedAction(step: Step) {
            this.recording.steps.push(step);
            this.recording.actionCount++;
        },
        
        // ========== 回放控制 ==========
        
        /**
         * 开始回放
         */
        startPlayback(taskId: string) {
            const task = this.tasks.find(t => t.id === taskId);
            if (!task) {
                throw new Error('任务不存在');
            }
            
            this.playback = {
                isPlaying: true,
                isPaused: false,
                taskId,
                currentStep: 0,
                startTime: Date.now(),
                progress: {
                    currentStep: 0,
                    totalSteps: task.steps.length,
                    percentage: 0,
                    elapsed: 0,
                },
            };
            this.uiState.showPlayback = true;
        },
        
        /**
         * 更新回放进度
         */
        updatePlaybackProgress(progress: TaskExecutionProgress) {
            this.playback.progress = progress;
            this.playback.currentStep = progress.currentStep;
        },
        
        /**
         * 停止回放
         */
        stopPlayback() {
            this.playback.isPlaying = false;
            this.playback.isPaused = false;
            this.uiState.showPlayback = false;
        },
        
        /**
         * 暂停回放
         */
        pausePlayback() {
            this.playback.isPaused = true;
        },
        
        /**
         * 恢复回放
         */
        resumePlayback() {
            this.playback.isPaused = false;
        },
        
        // ========== 应用管理 ==========
        
        /**
         * 设置已安装应用列表
         */
        setInstalledApps(apps: AppInfo[]) {
            this.installedApps = apps;
        },
        
        // ========== UI 控制 ==========
        
        /**
         * 设置选中的步骤
         */
        setSelectedStepId(stepId: string | null) {
            this.uiState.selectedStepId = stepId;
        },
        
        /**
         * 显示编辑器
         */
        showEditor() {
            this.uiState.showEditor = true;
            this.uiState.showRecorder = false;
            this.uiState.showPlayback = false;
        },
        
        /**
         * 显示录制器
         */
        showRecorder() {
            this.uiState.showRecorder = true;
            this.uiState.showEditor = false;
            this.uiState.showPlayback = false;
        },
        
        /**
         * 显示回放器
         */
        showPlayback() {
            this.uiState.showPlayback = true;
            this.uiState.showRecorder = false;
            this.uiState.showEditor = false;
        },
    },
});
