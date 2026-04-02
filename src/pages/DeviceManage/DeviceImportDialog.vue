<template>
    <a-modal
        v-model:visible="visible"
        :title="t('deviceManage.importNetworkDevice')"
        width="600px"
        :footer="false"
        :esc-to-close="false"
        :mask-closable="false"
    >
        <div class="import-dialog-content">
            <!-- 文件上传区域 -->
            <div class="upload-container"
                 :class="[selectedFiles.length > 0 ? 'has-files' : 'no-files']"
                 @dragover.prevent="dragOver = true"
                 @dragleave.prevent="dragOver = false"
                 @drop.prevent="onDrop">
                <input 
                    type="file" 
                    ref="fileInput"
                    @change="onFileSelect"
                    accept=".csv,.xlsx,.xls"
                    multiple
                    class="file-input"
                    :disabled="isImporting"
                />
                <div class="upload-button-area" @click="fileInput?.click()">
                    <icon-upload class="upload-icon"/>
                    <div class="upload-hint">{{ t('deviceManage.importHint') }}</div>
                    <div class="upload-format">{{ t('deviceManage.supportFormat') }}: CSV, Excel</div>
                </div>
            </div>

            <!-- 已选择的文件列表 -->
            <div v-if="selectedFiles.length > 0" class="file-list">
                <div v-for="(file, index) in selectedFiles" :key="index" class="file-item">
                    <div class="file-info">
                        <icon-file class="file-icon"/>
                        <span class="file-name">{{ file.name }}</span>
                    </div>
                    <div class="file-actions">
                        <a-button type="text" size="mini" @click="removeFile(index)" :disabled="isImporting">
                            <template #icon>
                                <icon-delete/>
                            </template>
                        </a-button>
                    </div>
                </div>
            </div>

            <!-- 信息提示区域（导入失败情况） -->
            <div v-if="failedDevices.length > 0 && !isImporting" class="failed-area">
                <div class="failed-header">
                    <icon-info-circle class="failed-icon"/>
                    <div class="failed-title">
                        {{ t('deviceManage.importFailedCount', { count: failedDevices.length }) }}
                    </div>
                </div>
                <div class="failed-list">
                    <div v-for="(device, index) in failedDevices" :key="index" class="failed-item">
                        <span class="device-address">{{ device.ip }}:{{ device.port }}</span>
                        <span>{{ device.error }}</span>
                    </div>
                </div>
            </div>

            <!-- 导入进度区域 -->
            <div v-if="isImporting" class="progress-area">
                <div class="progress-header">
                    <span>{{ t('deviceManage.importing') }}</span>
                    <span>{{ processedCount }} / {{ totalDevices }}</span>
                </div>
                <a-progress :percent="(processedCount / totalDevices) * 100" :show-text="false"/>
            </div>

            <!-- 全部导入按钮 -->
            <div class="import-button-container">
                <a-button type="primary" @click="startImport()" size="large" block>
                    <template #icon>
                        <icon-import/>
                    </template>
                    全部导入
                </a-button>
            </div>

        </div>
    </a-modal>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue';
import { t } from '../../lang';
import { Dialog } from '../../lib/dialog';
import { mapError } from '../../lib/error';
import { useDeviceUnifiedStore } from '../../store/modules/deviceUnified';
import * as XLSX from 'xlsx';

const visible = ref(false);
const uploadFileList = ref<any[]>([]);
const selectedFiles = ref<File[]>([]);
const deviceList = ref<any[]>([]);
const failedDevices = ref<any[]>([]);
const processedCount = ref(0);
const totalDevices = ref(0);
const isImporting = ref(false);
const dragOver = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

const deviceUnifiedStore = useDeviceUnifiedStore();

// 显示对话框
const show = () => {
    visible.value = true;
    resetImport();
};

// 文件拖拽放置
const onDrop = (e: DragEvent) => {
    dragOver.value = false;
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
        handleFiles(Array.from(files));
    }
};

// 文件选择
const onFileSelect = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const files = target.files;
    if (files && files.length > 0) {
        handleFiles(Array.from(files));
    }
    // 清空 input，允许重复选择同一文件
    target.value = '';
};

// 处理文件
const handleFiles = (files: File[]) => {
    console.log('[DeviceImport] handleFiles:', files.length);
    
    const newFiles: File[] = [];
    files.forEach(file => {
        // 检查文件扩展名
        if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
            return;
        }
        
        // 检查是否已存在相同文件
        const exists = selectedFiles.value.some(f => f.name === file.name && f.size === file.size);
        if (!exists) {
            newFiles.push(file);
        }
    });
    
    if (newFiles.length === 0) {
        if (files.length > 0) {
            Dialog.tipWarning('文件已存在或格式不正确');
        }
        return;
    }

    selectedFiles.value = [...selectedFiles.value, ...newFiles];
    
    console.log('[DeviceImport] selectedFiles:', selectedFiles.value.length);
    
    // 立即解析文件
    parseAllFiles(newFiles);
};

// 解析所有文件
const parseAllFiles = async (files: File[]) => {
    console.log('[DeviceImport] parseAllFiles, files:', files.length);
    const allDevices: any[] = [];
    
    try {
        for (const file of files) {
            console.log('[DeviceImport] 解析文件:', file.name);
            const content = await readFile(file);
            const devices = parseFileContent(content, file.name);
            console.log('[DeviceImport] 解析结果:', devices.length, '个设备');
            allDevices.push(...devices);
        }
        
        console.log('[DeviceImport] 总共解析到设备:', allDevices.length);
        
        if (allDevices.length === 0) {
            Dialog.tipWarning(t('deviceManage.noValidDevice'));
            return;
        }

        deviceList.value = allDevices.map((d: any) => ({
            ...d,
            status: '' // pending
        }));
        totalDevices.value = allDevices.length;
        
        console.log('[DeviceImport] deviceList:', deviceList.value.length, 'totalDevices:', totalDevices.value);
    } catch (error: any) {
        Dialog.tipError(mapError(error));
        console.error('[DeviceImport] 解析文件失败:', error);
    }
};

// 移除文件
const removeFile = (index: number) => {
    selectedFiles.value.splice(index, 1);
    uploadFileList.value.splice(index, 1);
    
    if (selectedFiles.value.length === 0) {
        deviceList.value = [];
        totalDevices.value = 0;
    } else {
        // 重新解析剩余文件
        parseAllFiles(selectedFiles.value);
    }
};

// 读取文件
const readFile = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
        reader.onerror = () => reject(new Error(t('deviceManage.readFileError')));
        reader.readAsArrayBuffer(file);
    });
};

// 解析文件内容
const parseFileContent = (buffer: ArrayBuffer, filename: string) => {
    const devices: any[] = [];
    const isCSV = filename.endsWith('.csv');

    if (isCSV) {
        // 解析 CSV
        const content = new TextDecoder('utf-8').decode(buffer);
        const lines = content.split('\n');
        lines.forEach((line, index) => {
            if (index === 0) return; // 跳过标题行
            const parts = line.trim().split(',');
            if (parts.length >= 1) {
                const ip = parts[0].trim();
                const port = parts[1]?.trim() || '5555';
                if (ip) {
                    devices.push({ ip, port });
                }
            }
        });
    } else {
        // 解析 Excel
        try {
            const data = new Uint8Array(buffer);
            const workbook = XLSX.read(data, { type: 'array' });
            
            // 读取第一个工作表
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // 转换为 JSON
            const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            // 跳过标题行（第一行），从第二行开始读取
            jsonData.forEach((row, index) => {
                if (index === 0) return; // 跳过标题行
                
                if (row.length >= 1) {
                    const ip = String(row[0] || '').trim();
                    const port = String(row[1] || '5555').trim() || '5555';
                    
                    if (ip) {
                        devices.push({ ip, port });
                    }
                }
            });
        } catch (error: any) {
            console.error('[DeviceImport] Excel 解析失败:', error);
            throw new Error(t('deviceManage.parseExcelError'));
        }
    }

    return devices;
};

// 清除文件
const clearFile = () => {
    uploadFileList.value = [];
    selectedFiles.value = [];
    deviceList.value = [];
    failedDevices.value = [];
    processedCount.value = 0;
    totalDevices.value = 0;
};

// 重置导入
const resetImport = () => {
    clearFile();
    isImporting.value = false;
};

// 开始导入
const startImport = async () => {
    console.log('[DeviceImport] startImport called, deviceList.length:', deviceList.value.length);
    
    if (deviceList.value.length === 0) {
        Dialog.tipWarning(t('deviceManage.noValidDevice'));
        console.warn('[DeviceImport] 没有设备数据，无法导入');
        return;
    }

    isImporting.value = true;
    failedDevices.value = [];
    processedCount.value = 0;

    console.log('[DeviceImport] 开始导入，设备数量:', deviceList.value.length);

    try {
        for (let i = 0; i < deviceList.value.length; i++) {
            const device = deviceList.value[i];
            device.status = 'connecting';
            console.log('[DeviceImport] 正在连接设备:', device.ip, device.port);

            try {
                // 连接设备
                await window.$mapi.adb.connect(device.ip, parseInt(device.port));
                
                // 等待设备连接
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // 获取设备信息
                await window.$mapi.adb.info(device.ip);
                
                device.status = 'success';
                processedCount.value++;
                console.log('[DeviceImport] 设备连接成功:', device.ip);
            } catch (error: any) {
                device.status = 'failed';
                device.error = error.message || t('deviceManage.connectError');
                failedDevices.value.push(device);
                processedCount.value++;
                console.error('[DeviceImport] 设备连接失败:', device.ip, error);
            }
        }

        // 所有设备处理完成后，统一同步到数据库
        await deviceUnifiedStore.syncDevices();
        console.log('[DeviceImport] 设备已同步到数据库');

        // 导入完成
        if (failedDevices.value.length === 0) {
            Dialog.tipSuccess(t('deviceManage.importAllSuccess', { count: deviceList.value.length }));
            // 清空文件列表并关闭对话框
            resetImport();
            nextTick(() => {
                visible.value = false;
            });
        } else {
            Dialog.tipWarning(t('deviceManage.importPartialSuccess', { 
                success: deviceList.value.length - failedDevices.value.length,
                total: deviceList.value.length
            }));
        }
    } catch (error: any) {
        console.error('[DeviceImport] 导入失败:', error);
        Dialog.tipError(mapError(error));
    } finally {
        isImporting.value = false;
    }
};

defineExpose({
    show
});
</script>

<style scoped lang="less">
.import-dialog-content {
    width: 100%;
}

// 上传容器
.upload-container {
    width: 100%;
    min-height: 200px;
    border: 2px dashed #e5e7eb;
    border-radius: 8px;
    display: block;
    position: relative;
    transition: all 0.3s ease;
    background-color: #f9fafb;
    
    // 无文件状态
    &.no-files {
        border-color: #e5e7eb;
        background-color: #f9fafb;
    }
    
    // 有文件状态
    &.has-files {
        border-color: #10b981;
        background-color: #f0fdf4;
    }
    
    // 拖拽状态
    &.drag-over {
        border-color: #bfdbfe;
        background-color: #eff6ff;
    }
}

// 隐藏文件输入
.file-input {
    display: none;
}

// 上传按钮区域
.upload-button-area {
    width: 100%;
    min-height: 200px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    cursor: pointer;
    
    &:hover {
        opacity: 0.8;
    }
}

// 上传图标
.upload-icon {
    font-size: 64px;
    color: #9ca3af;
    margin-bottom: 16px;
    
    .dark & {
        color: #6b7280;
    }
}

// 上传提示文字
.upload-hint {
    font-size: 16px;
    color: #4b5563;
    text-align: center;
    font-weight: 500;
    
    .dark & {
        color: #d1d5db;
    }
}

// 格式说明
.upload-format {
    font-size: 14px;
    color: #6b7280;
    margin-top: 8px;
    text-align: center;
    
    .dark & {
        color: #9ca3af;
    }
}

// 文件列表
.file-list {
    width: 100%;
    margin-top: 12px;
}

.file-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background-color: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 12px 16px;
    margin-top: 8px;
    color: #000000;
    
    .dark & {
        background-color: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.1);
        color: #f8f8f8;
    }
}

.file-info {
    display: flex;
    align-items: center;
    gap: 8px;
    
    .file-icon {
        color: #10b981;
        font-size: 20px;
    }
    
    .file-name {
        font-size: 14px;
        color: #1f2937;
        
        .dark & {
            color: #f8f8f8;
        }
    }
}

.file-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    
    .check-icon {
        color: #10b981;
        font-size: 18px;
    }
}

// 导入按钮容器
.import-button-container {
    display: flex;
    justify-content: flex-end;
    padding-top: 12px;
    margin-top: 12px;
    border-top: 1px solid #d1fae5;
    
    .dark & {
        border-top-color: #065f46;
    }
}

// 失败提示区域
.failed-area {
    border: 1px solid #fca5a5;
    border-radius: 8px;
    padding: 12px;
    background-color: #fef2f2;
    
    .dark & {
        border-color: #dc2626;
        background-color: rgba(220, 38, 38, 0.2);
    }
}

.failed-header {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    
    .failed-icon {
        color: #dc2626;
        margin-top: 2px;
    }
}

.failed-title {
    font-size: 14px;
    font-weight: 600;
    color: #dc2626;
    
    .dark & {
        color: #fca5a5;
    }
}

.failed-list {
    max-height: 128px;
    overflow-y: auto;
    font-size: 12px;
    color: #dc2626;
    
    .dark & {
        color: #fca5a5;
    }
    
    .failed-item {
        display: flex;
        justify-content: space-between;
        padding: 4px 0;
        
        .device-address {
            font-family: 'Courier New', monospace;
        }
    }
}

// 进度区域
.progress-area {
    border: 1px solid #bfdbfe;
    border-radius: 8px;
    padding: 12px;
    background-color: #eff6ff;
    
    .dark & {
        border-color: #1e40af;
        background-color: rgba(30, 64, 175, 0.2);
    }
}

.progress-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    
    span {
        font-size: 14px;
        font-weight: 600;
    }
}
</style>

<style lang="less">
// 深色模式下的上传容器（非 scoped 样式）
.dark .import-dialog-content .upload-container {
    background-color: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.2);
    
    &.no-files {
        border-color: rgba(255, 255, 255, 0.2);
        background-color: rgba(255, 255, 255, 0.05);
    }
    
    &.has-files {
        border-color: rgba(16, 185, 129, 0.4);
        background-color: rgba(16, 185, 129, 0.1);
    }
    
    &.drag-over {
        border-color: rgba(59, 130, 246, 0.5);
        background-color: rgba(59, 130, 246, 0.15);
    }
}
</style>
