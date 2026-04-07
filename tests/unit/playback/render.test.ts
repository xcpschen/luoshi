import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock ipcRenderer
const mockInvoke = vi.fn();
vi.mock('electron', () => ({
    ipcRenderer: {
        invoke: mockInvoke,
    },
}));

describe('PlaybackService', () => {
    let playback: any;

    beforeEach(async () => {
        vi.clearAllMocks();
        playback = await import('../../../electron/mapi/playback/render');
    });

    describe('play', () => {
        it('should invoke playback:play with script and deviceId', async () => {
            const mockScript = {
                id: 'script-1',
                actions: [],
                duration: 1000,
            };
            const mockResult = {
                success: true,
                executedSteps: 0,
                totalDuration: 100,
            };
            
            mockInvoke.mockResolvedValue(mockResult);
            
            const result = await playback.play(mockScript, 'device-123');
            
            expect(mockInvoke).toHaveBeenCalledWith(
                'playback:play',
                mockScript,
                'device-123',
                undefined // options is optional
            );
            expect(result).toEqual(mockResult);
        });

        it('should pass options to play method', async () => {
            const mockScript = {
                id: 'script-1',
                actions: [],
                duration: 1000,
            };
            
            mockInvoke.mockResolvedValue({ success: true });
            
            await playback.play(mockScript, 'device-123', {
                speed: 1.5,
                debug: true,
                timeout: 30000,
            });
            
            expect(mockInvoke).toHaveBeenCalledWith(
                'playback:play',
                mockScript,
                'device-123',
                expect.objectContaining({
                    speed: 1.5,
                    debug: true,
                    timeout: 30000,
                })
            );
        });
    });

    describe('stop', () => {
        it('should invoke playback:stop', async () => {
            mockInvoke.mockResolvedValue({ success: true });
            
            await playback.stop();
            
            expect(mockInvoke).toHaveBeenCalledWith('playback:stop');
        });
    });

    describe('pause', () => {
        it('should invoke playback:pause', async () => {
            mockInvoke.mockResolvedValue({ success: true });
            
            await playback.pause();
            
            expect(mockInvoke).toHaveBeenCalledWith('playback:pause');
        });
    });

    describe('resume', () => {
        it('should invoke playback:resume', async () => {
            mockInvoke.mockResolvedValue({ success: true });
            
            await playback.resume();
            
            expect(mockInvoke).toHaveBeenCalledWith('playback:resume');
        });
    });

    describe('getProgress', () => {
        it('should invoke playback:get-progress and return progress', async () => {
            const mockScript = {
                id: 'script-1',
                actions: [],
                duration: 1000,
            };
            const mockProgress = {
                currentStep: 5,
                totalSteps: 10,
                percentage: 50,
            };
            
            mockInvoke.mockResolvedValue(mockProgress);
            
            const result = await playback.getProgress(mockScript);
            
            expect(mockInvoke).toHaveBeenCalledWith('playback:get-progress', mockScript);
            expect(result).toEqual(mockProgress);
        });
    });
});
