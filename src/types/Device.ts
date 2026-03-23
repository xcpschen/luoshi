import {ComputedRef} from "vue";

export enum EnumDeviceStatus {
    WAIT_CONNECTING = "waitConnecting",
    CONNECTED = "connected",
    DISCONNECTED = "disconnected",
}

export enum EnumDeviceType {
    USB = "usb",
    WIFI = "wifi",
}

export type DeviceRecord = {
    id: string;
    type: EnumDeviceType;
    name: string | null;
    raw: any;
    forwardPort?: boolean;
    status?: any;
    runtime?: any;
    screenshot?: string | null;
    setting?: {
        dimWhenMirror?: any;
        alwaysTop?: any;
        mirrorSound?: any;
        previewImage?: any;
        videoBitRate?: any;
        maxFps?: any;
        scrcpyArgs?: any;
        videoCodec?: any;
        videoBuffer?: any;
        maxSize?: any;
    };
};

export type DeviceRuntime = {
    forwardPort: boolean;
    status: EnumDeviceStatus;
    mirrorController: any;
    screenBrightness?: number;
    previewImage: any;
};

export type ForwardInfo = {
    id: string;
    from: number;
    to: number;
}