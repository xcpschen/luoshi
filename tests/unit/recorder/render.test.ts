import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock ipcRenderer
const mockInvoke = vi.fn();
vi.mock('electron', () => ({
    ipcRenderer: {
        invoke: mockInvoke,
    },
}));

describe('RecorderService', () => {
    let recorder: any;

    beforeEach(async () => {
        vi.clearAllMocks();
        // 重新导入以使用 mock
        recorder = await import('../../../electron/mapi/recorder/render');
    });

    describe('startRecording', () => {
        it('should invoke recorder:start with deviceId', async () => {
            mockInvoke.mockResolvedValue({ success: true });
            
            await recorder.startRecording('device-123');
            
            expect(mockInvoke).toHaveBeenCalledWith('recorder:start', 'device-123');
        });
    });

    describe('stopRecording', () => {
        it('should invoke recorder:stop and return script', async () => {
            const mockScript = {
                id: 'script-1',
                actions: [],
                duration: 1000,
            };
            mockInvoke.mockResolvedValue({ success: true, script: mockScript });
            
            const result = await recorder.stopRecording();
            
            expect(mockInvoke).toHaveBeenCalledWith('recorder:stop');
            expect(result).toEqual(mockScript);
        });
    });

    describe('recordAction', () => {
        it('should invoke recorder:record-action with action data', async () => {
            mockInvoke.mockResolvedValue({ success: true });
            
            const action = {
                type: 'tap' as const,
                position: { x: 100, y: 200 },
            };
            
            await recorder.recordAction(action);
            
            expect(mockInvoke).toHaveBeenCalledWith('recorder:record-action', action);
        });
    });

    describe('getRecordingStatus', () => {
        it('should invoke recorder:get-status and return status', async () => {
            const mockStatus = {
                isRecording: true,
                actionCount: 5,
                duration: 30000,
            };
            mockInvoke.mockResolvedValue(mockStatus);
            
            const result = await recorder.getRecordingStatus();
            
            expect(mockInvoke).toHaveBeenCalledWith('recorder:get-status');
            expect(result).toEqual(mockStatus);
        });
    });

    describe('helper functions', () => {
        it('recordTap should record tap action', async () => {
            mockInvoke.mockResolvedValue({ success: true });
            
            await recorder.recordTap(100, 200);
            
            expect(mockInvoke).toHaveBeenCalledWith('recorder:record-action', {
                type: 'tap',
                position: { x: 100, y: 200 },
            });
        });

        it('recordSwipe should record swipe action', async () => {
            mockInvoke.mockResolvedValue({ success: true });
            
            await recorder.recordSwipe(100, 200, 300, 400, 500);
            
            expect(mockInvoke).toHaveBeenCalledWith('recorder:record-action', {
                type: 'swipe',
                position: { x: 100, y: 200 },
                endPosition: { x: 300, y: 400 },
                parameters: { duration: 500 },
            });
        });

        it('recordInput should record input action', async () => {
            mockInvoke.mockResolvedValue({ success: true });
            
            await recorder.recordInput('Hello World');
            
            expect(mockInvoke).toHaveBeenCalledWith('recorder:record-action', {
                type: 'input',
                parameters: { text: 'Hello World' },
            });
        });

        it('recordWait should record wait action', async () => {
            mockInvoke.mockResolvedValue({ success: true });
            
            await recorder.recordWait(1000, 'image_found');
            
            expect(mockInvoke).toHaveBeenCalledWith('recorder:record-action', {
                type: 'wait',
                parameters: {
                    waitDuration: 1000,
                    waitCondition: 'image_found',
                },
            });
        });
    });
});
