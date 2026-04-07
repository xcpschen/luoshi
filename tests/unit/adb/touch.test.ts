import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock adb module (default export)
const mockAdbShell = vi.fn();
const mockSwipe = vi.fn();

vi.mock('../../../electron/mapi/adb/render', () => ({
    default: {
        adbShell: mockAdbShell,
        swipe: mockSwipe,
    },
}));

// 需要重新导入以使用 mock
const touch = await import('../../../electron/mapi/adb/touch');

describe('TouchService', () => {
    const mockDeviceId = 'test-device-123';

    beforeEach(() => {
        vi.clearAllMocks();
        mockAdbShell.mockResolvedValue('success');
    });

    describe('tap', () => {
        it('should execute tap command with correct coordinates', async () => {
            await touch.default.tap(mockDeviceId, 100, 200);

            expect(mockAdbShell).toHaveBeenCalledWith([
                '-s', mockDeviceId,
                'shell', 'input', 'tap',
                '100', '200'
            ]);
        });
    });

    describe('swipe', () => {
        it('should execute swipe command with default duration', async () => {
            await touch.default.swipe(mockDeviceId, 100, 200, 300, 400);

            expect(mockAdbShell).toHaveBeenCalledWith([
                '-s', mockDeviceId,
                'shell', 'input', 'swipe',
                '100', '200', '300', '400',
                '300'
            ]);
        });

        it('should execute swipe command with custom duration', async () => {
            await touch.default.swipe(mockDeviceId, 100, 200, 300, 400, 500);

            expect(mockAdbShell).toHaveBeenCalledWith([
                '-s', mockDeviceId,
                'shell', 'input', 'swipe',
                '100', '200', '300', '400',
                '500'
            ]);
        });
    });

    describe('text', () => {
        it('should execute text input command', async () => {
            await touch.default.text(mockDeviceId, 'Hello');

            expect(mockAdbShell).toHaveBeenCalledWith([
                '-s', mockDeviceId,
                'shell', 'input', 'text',
                'Hello'
            ]);
        });

        it('should handle spaces in text', async () => {
            await touch.default.text(mockDeviceId, 'Hello World');

            expect(mockAdbShell).toHaveBeenCalledWith([
                '-s', mockDeviceId,
                'shell', 'input', 'text',
                'Hello%sWorld'
            ]);
        });
    });

    describe('keyevent', () => {
        it('should execute keyevent command', async () => {
            await touch.default.keyevent(mockDeviceId, 3);

            expect(mockAdbShell).toHaveBeenCalledWith([
                '-s', mockDeviceId,
                'shell', 'input', 'keyevent',
                '3'
            ]);
        });

        it('should execute BACK key event', async () => {
            await touch.default.keyevent(mockDeviceId, 4);

            expect(mockAdbShell).toHaveBeenCalledWith([
                '-s', mockDeviceId,
                'shell', 'input', 'keyevent',
                '4'
            ]);
        });
    });

    describe('longPress', () => {
        it('should execute long press with default duration', async () => {
            await touch.default.longPress(mockDeviceId, 100, 200);

            expect(mockSwipe).toHaveBeenCalledWith(
                mockDeviceId,
                100, 200, 100, 200,
                1000
            );
        });

        it('should execute long press with custom duration', async () => {
            await touch.default.longPress(mockDeviceId, 100, 200, 2000);

            expect(mockSwipe).toHaveBeenCalledWith(
                mockDeviceId,
                100, 200, 100, 200,
                2000
            );
        });
    });
});
