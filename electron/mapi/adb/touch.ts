import adb from './render';

/**
 * 点击操作
 * @param deviceId 设备 ID
 * @param x X 坐标
 * @param y Y 坐标
 */
export const tap = async (deviceId: string, x: number, y: number): Promise<void> => {
    return await adb.adbShell([
        '-s', deviceId,
        'shell', 'input', 'tap',
        x.toString(), y.toString()
    ]);
};

/**
 * 滑动操作
 * @param deviceId 设备 ID
 * @param x1 起点 X 坐标
 * @param y1 起点 Y 坐标
 * @param x2 终点 X 坐标
 * @param y2 终点 Y 坐标
 * @param duration 滑动时长（毫秒），默认 300ms
 */
export const swipe = async (
    deviceId: string,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    duration: number = 300
): Promise<void> => {
    return await adb.adbShell([
        '-s', deviceId,
        'shell', 'input', 'swipe',
        x1.toString(), y1.toString(),
        x2.toString(), y2.toString(),
        duration.toString()
    ]);
};

/**
 * 文本输入
 * @param deviceId 设备 ID
 * @param text 输入文本
 */
export const text = async (deviceId: string, text: string): Promise<void> => {
    // 空格需要特殊处理
    const formattedText = text.replace(/ /g, '%s');
    return await adb.adbShell([
        '-s', deviceId,
        'shell', 'input', 'text',
        formattedText
    ]);
};

/**
 * 按键操作
 * @param deviceId 设备 ID
 * @param keycode 按键代码（Android KeyEvent）
 * 
 * 常用 keycode:
 * - 3: HOME
 * - 4: BACK
 * - 66: ENTER
 * - 82: MENU
 * - 122: POWER
 */
export const keyevent = async (deviceId: string, keycode: number): Promise<void> => {
    return await adb.adbShell([
        '-s', deviceId,
        'shell', 'input', 'keyevent',
        keycode.toString()
    ]);
};

/**
 * 长按操作（通过延迟实现）
 * @param deviceId 设备 ID
 * @param x X 坐标
 * @param y Y 坐标
 * @param duration 长按时长（毫秒），默认 1000ms
 */
export const longPress = async (
    deviceId: string,
    x: number,
    y: number,
    duration: number = 1000
): Promise<void> => {
    // 使用 swipe 实现长按（起点终点相同）
    await adb.swipe(deviceId, x, y, x, y, duration);
};

export default {
    tap,
    swipe,
    text,
    keyevent,
    longPress,
};
