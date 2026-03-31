import { EnumDeviceStatus } from './Device';

/**
 * 设备统一标识（基于硬件信息）
 */
export interface DeviceUnifiedIdentity {
    /** 硬件序列号（USB 设备）或 MAC 地址（网络设备） */
    hardwareId: string;
    
    /** 设备型号 */
    model: string;
    
    /** 设备品牌 */
    brand: string;
    
    /** Android 版本 */
    androidVersion: string;
    
    /** SDK 版本 */
    sdkVersion: number;
    
    /** 设备指纹（用于快速匹配） */
    fingerprint: string;
}

/**
 * 连接方式枚举
 */
export enum EnumConnectionType {
    /** USB 连接 */
    USB = "usb",
    
    /** WiFi 调试 */
    WIFI_DEBUG = "wifi_debug",
    
    /** 网络设备（adb connect） */
    NETWORK = "network",
}

/**
 * 单个连接实例
 */
export interface DeviceConnection {
    /** 连接 ID（当前 ADB ID） */
    id: string;
    
    /** 连接类型 */
    type: EnumConnectionType;
    
    /** 连接状态 */
    status: EnumDeviceStatus;
    
    /** 连接地址（USB 设备为空，WiFi 为 IP:端口） */
    address: string;
    
    /** 连接时间 */
    connectedAt: Date;
    
    /** 最后活跃时间 */
    lastActiveAt: Date;
    
    /** 是否为默认连接 */
    isDefault: boolean;
}

/**
 * 设备配置接口
 */
export interface DeviceUnifiedSetting {
    /** 投屏时是否 dim */
    dimWhenMirror?: string;
    
    /** 是否置顶 */
    alwaysTop?: string;
    
    /** 投屏时转发声音 */
    mirrorSound?: string;
    
    /** 视频码率 */
    videoBitRate?: string;
    
    /** 最大帧率 */
    maxFps?: string;
    
    /** 视频编码 */
    videoCodec?: string;
    
    /** 视频缓冲区 */
    videoBuffer?: string;
    
    /** 最大尺寸 */
    maxSize?: string;
    
    /** Scrcpy 额外参数 */
    scrcpyArgs?: string;
    
    /** 是否自动连接 */
    autoConnect?: boolean;
    
    /** 是否自动备份 */
    autoBackup?: boolean;
    
    /** 备份路径 */
    backupPath?: string;
    
    /** 设备备注 */
    notes?: string;
}

/**
 * 统一的设备记录
 */
export interface DeviceUnifiedRecord {
    /** 统一设备 ID（UUID） */
    unifiedId: string;
    
    /** 设备身份信息 */
    identity: DeviceUnifiedIdentity;
    
    /** 用户自定义名称 */
    name: string;
    
    /** 设备头像/图标 */
    avatar?: string;
    
    /** 所有连接实例 */
    connections: DeviceConnection[];
    
    /** 当前活跃连接 ID */
    activeConnectionId?: string;
    
    /** 设备配置 */
    setting: DeviceUnifiedSetting;
    
    /** 设备标签 */
    tags: string[];
    
    /** 总连接次数 */
    totalConnections: number;
    
    /** 首次连接时间 */
    firstConnectedAt: Date;
    
    /** 最后连接时间 */
    lastConnectedAt: Date;
    
    /** 创建时间 */
    createdAt: Date;
    
    /** 更新时间 */
    updatedAt: Date;
}

/**
 * 设备连接创建参数
 */
export interface DeviceConnectionCreateParams {
    unifiedId: string;
    connectionId: string;
    type: EnumConnectionType;
    status: EnumDeviceStatus;
    address?: string;
    isDefault?: boolean;
}

/**
 * 设备更新参数
 */
export interface DeviceUnifiedUpdateParams {
    name?: string;
    avatar?: string;
    setting?: Partial<DeviceUnifiedSetting>;
    tags?: string[];
    activeConnectionId?: string;
}

/**
 * 设备筛选条件
 */
export interface DeviceUnifiedFilter {
    /** 搜索关键词 */
    keywords?: string;
    
    /** 连接状态筛选 */
    status?: EnumDeviceStatus;
    
    /** 连接类型筛选 */
    connectionType?: EnumConnectionType;
    
    /** 标签筛选 */
    tags?: string[];
}
