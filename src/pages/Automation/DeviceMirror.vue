<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const props = defineProps<{
    deviceId: string;
}>();

console.log('[DeviceMirror] 组件创建，deviceId:', props.deviceId);

const mirrorImage = ref<string | null>(null);
const mirrorLoading = ref(false);
const mirrorError = ref<string | null>(null);
let ws: WebSocket | null = null;

// 操作记录相关
let isRecording = false; // 是否正在录制
let lastScreenshotTime = 0;
const SCREENSHOT_INTERVAL = 100; // 截图最小间隔 100ms

// 记录操作开始时间
const operationStartTime = ref<number | null>(null);
const operationStartPos = ref<{x: number, y: number} | null>(null);

// 连接 WebSocket 接收投屏画面
const connectMirror = async () => {
    try {
        console.log('[DeviceMirror] 开始连接，deviceId:', props.deviceId);
        mirrorLoading.value = true;
        mirrorError.value = null;
        
        // 获取 WebSocket 地址
        const wsAddress = await window.$mapi.serve.getAddress();
        const wsUrl = `${wsAddress}/server?type=DeviceMirror&deviceId=${props.deviceId}`;
        console.log('[DeviceMirror] WebSocket 地址:', wsUrl);
        
        ws = new WebSocket(wsUrl.replace('http', 'ws'));
        
        ws.onopen = () => {
            console.log('[DeviceMirror] WebSocket 已连接');
            // 发送 ready 消息
            ws?.send(JSON.stringify({ type: 'ready' }));
            // 连接成功后停止加载
            mirrorLoading.value = false;
        };
        
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('[DeviceMirror] 收到消息:', data.type);
                
                if (data.type === 'screenshot' && data.image) {
                    mirrorImage.value = `data:image/jpeg;base64,${data.image}`;
                    mirrorLoading.value = false;
                } else if (data.type === 'panel_config') {
                    console.log('[DeviceMirror] 面板配置:', data);
                }
            } catch (error) {
                console.error('[DeviceMirror] 解析消息失败:', error);
            }
        };
        
        ws.onerror = (error) => {
            console.error('[DeviceMirror] WebSocket 错误:', error);
            mirrorError.value = 'WebSocket 连接失败';
            mirrorLoading.value = false;
        };
        
        ws.onclose = () => {
            console.log('[DeviceMirror] WebSocket 已关闭');
            // 只在没有画面时才显示错误
            if (!mirrorImage.value) {
                mirrorError.value = '投屏连接已断开';
                mirrorLoading.value = false;
            }
        };
        
    } catch (error: any) {
        console.error('[DeviceMirror] 连接失败:', error);
        mirrorError.value = error.message;
        mirrorLoading.value = false;
    }
};

// 截取当前画面
const captureScreenshot = async (): Promise<string | null> => {
    const now = Date.now();
    if (now - lastScreenshotTime < SCREENSHOT_INTERVAL) {
        return null; // 避免过于频繁的截图
    }
    
    try {
        // @ts-ignore - screencap API exists
        const screenshot = await window.$mapi.adb.screencap(props.deviceId);
        if (screenshot) {
            lastScreenshotTime = now;
            return `data:image/png;base64,${screenshot}`;
        }
    } catch (error) {
        console.error('[DeviceMirror] 截图失败:', error);
    }
    return null;
};

// 记录点击操作
const recordTap = async (x: number, y: number) => {
    if (!isRecording) return;
    
    const screenshot = await captureScreenshot();
    if (!screenshot) return;
    
    // @ts-ignore - recorder API exists
    await window.$mapi.recorder.recordTap(x, y, screenshot);
    console.log('[DeviceMirror] 记录点击操作:', { x, y, hasScreenshot: !!screenshot });
};

// 记录滑动操作
const recordSwipe = async (x1: number, y1: number, x2: number, y2: number, duration: number) => {
    if (!isRecording) return;
    
    const screenshot = await captureScreenshot();
    if (!screenshot) return;
    
    // @ts-ignore - recorder API exists
    await window.$mapi.recorder.recordSwipe(x1, y1, x2, y2, duration, screenshot);
    console.log('[DeviceMirror] 记录滑动操作:', { x1, y1, x2, y2, duration, hasScreenshot: !!screenshot });
};

// 处理投屏点击
const handleMirrorClick = async (event: MouseEvent) => {
    const imgElement = event.currentTarget as HTMLImageElement;
    const rect = imgElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const naturalWidth = imgElement.naturalWidth || 1080;
    const naturalHeight = imgElement.naturalHeight || 1920;
    const scaleX = naturalWidth / rect.width;
    const scaleY = naturalHeight / rect.height;
    
    const deviceX = Math.round(x * scaleX);
    const deviceY = Math.round(y * scaleY);
    
    // 记录点击操作
    await recordTap(deviceX, deviceY);
};

// 处理投屏按下（记录滑动起点）
const handleMirrorMousedown = async (event: MouseEvent) => {
    const imgElement = event.currentTarget as HTMLImageElement;
    const rect = imgElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const naturalWidth = imgElement.naturalWidth || 1080;
    const naturalHeight = imgElement.naturalHeight || 1920;
    const scaleX = naturalWidth / rect.width;
    const scaleY = naturalHeight / rect.height;
    
    operationStartPos.value = {
        x: Math.round(x * scaleX),
        y: Math.round(y * scaleY)
    };
    operationStartTime.value = Date.now();
};

// 处理投屏抬起（记录滑动终点）
const handleMirrorMouseup = async (event: MouseEvent) => {
    if (!operationStartPos.value || !operationStartTime.value) {
        return;
    }
    
    const imgElement = event.currentTarget as HTMLImageElement;
    const rect = imgElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const naturalWidth = imgElement.naturalWidth || 1080;
    const naturalHeight = imgElement.naturalHeight || 1920;
    const scaleX = naturalWidth / rect.width;
    const scaleY = naturalHeight / rect.height;
    
    const endX = Math.round(x * scaleX);
    const endY = Math.round(y * scaleY);
    const duration = Date.now() - operationStartTime.value;
    
    // 判断是点击还是滑动（移动距离小于 10 像素视为点击）
    const distance = Math.sqrt(
        Math.pow(endX - operationStartPos.value.x, 2) + 
        Math.pow(endY - operationStartPos.value.y, 2)
    );
    
    if (distance < 10) {
        // 点击操作
        await recordTap(operationStartPos.value.x, operationStartPos.value.y);
    } else {
        // 滑动操作
        await recordSwipe(
            operationStartPos.value.x,
            operationStartPos.value.y,
            endX,
            endY,
            duration
        );
    }
    
    // 清空起点信息
    operationStartPos.value = null;
    operationStartTime.value = null;
};

// 处理投屏右键（返回键）
const handleMirrorContextmenu = async (event: MouseEvent) => {
    event.preventDefault();
    
    // 记录返回键操作（可选：也截图）
    // @ts-ignore - keyevent API exists
    await window.$mapi.adb.keyevent(props.deviceId, 4);
    console.log('[DeviceMirror] 返回键操作');
};

// 停止投屏
const stopMirror = () => {
    if (ws) {
        ws.close();
        ws = null;
    }
    mirrorImage.value = null;
    mirrorLoading.value = false;
    mirrorError.value = null;
};

// 设置录制状态
const setRecording = (recording: boolean) => {
    isRecording = recording;
    console.log('[DeviceMirror] 录制状态:', recording ? '开始' : '停止');
};

onMounted(() => {
    console.log('[DeviceMirror] 组件已挂载');
    connectMirror();
});

onUnmounted(() => {
    stopMirror();
});

defineExpose({
    stopMirror,
    setRecording
});
</script>

<template>
    <div class="device-mirror">
        <div v-if="mirrorLoading" class="mirror-loading">
            <a-spin size="large" />
            <p>正在连接投屏...</p>
        </div>
        
        <div v-else-if="mirrorImage && !mirrorError" class="mirror-content">
            <img 
                :src="mirrorImage" 
                alt="Device Screen" 
                class="mirror-image"
                @click="handleMirrorClick"
                @mousedown="handleMirrorMousedown"
                @mouseup="handleMirrorMouseup"
                @contextmenu="handleMirrorContextmenu"
            />
        </div>
        
        <div v-else-if="mirrorError" class="mirror-error">
            <a-result status="error" :title="mirrorError" />
        </div>
        
        <div v-else class="mirror-empty">
            <icon-mobile />
            <p>等待投屏画面...</p>
        </div>
    </div>
</template>

<style scoped lang="less">
.device-mirror {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #000;
    
    .mirror-loading,
    .mirror-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
        color: #fff;
        
        p {
            margin: 0;
            font-size: 14px;
        }
        
        :deep(.icon-mobile) {
            font-size: 64px;
            opacity: 0.5;
        }
    }
    
    .mirror-content {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        
        .mirror-image {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
        }
    }
    
    .mirror-error {
        width: 100%;
        padding: 40px 20px;
        
        :deep(.arco-result) {
            color: #fff;
        }
    }
}
</style>
