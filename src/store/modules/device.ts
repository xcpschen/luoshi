import { cloneDeep } from "lodash-es";
import { defineStore } from "pinia";
import { computed, ComputedRef, ref, toRaw } from "vue";
import { t } from "../../lang";
import { Dialog } from "../../lib/dialog";
import { mapError } from "../../lib/error";
import { isIPWithPort } from "../../lib/linkandroid";
import { DeviceRecord, DeviceRuntime, EnumDeviceStatus, EnumDeviceType,ForwardInfo } from "../../types/Device";
import store from "../index";
import { useSettingStore } from "./setting";

const getEmptySetting = () => {
    return JSON.parse(
        JSON.stringify({
            dimWhenMirror: "yes",
            alwaysTop: "no",
            mirrorSound: "no",
            previewImage: "",
            videoBitRate: "2M",
            maxFps: "60",
            scrcpyArgs: "",
            videoCodec: "h265",
            videoBuffer: "50",
            maxSize: "720",
        })
    );
};

const deviceRuntime = ref<Map<string, DeviceRuntime>>(new Map());
const setting = useSettingStore();
const previewImageDefault = setting.configGet("Device.previewImage", "yes");
const deviceforwardInfos = ref<Map<string, ForwardInfo>>(new Map());

// WebSocket 客户端管理
let ws: WebSocket | null = null;
let wsReconnectTimer: any = null;
let wsReconnectAttempts = 0;
const wsMaxReconnectAttempts = 10;
const wsReconnectDelay = 3000;

const deviceControllers = new Map<string, any>();
const deviceConnectErrorTimes = new Map<string, number>();

const createDeviceStatus = (record: DeviceRecord): ComputedRef<EnumDeviceStatus> => {
    const id = record.id;
    return computed(() => {
        return deviceRuntime.value?.get(id)?.status || EnumDeviceStatus.WAIT_CONNECTING;
    });
};

const getDeviceRuntime = (record: DeviceRecord): ComputedRef<DeviceRuntime> => {
    const id = record.id;
    return computed(() => {
        const value = deviceRuntime.value?.get(id);
        if (value) {
            return value;
        }
        deviceRuntime.value?.set(id, {
            forwardPort: false,
            status: EnumDeviceStatus.WAIT_CONNECTING,
            mirrorController: null,
            previewImage: record.setting?.previewImage || previewImageDefault,
        } as DeviceRuntime);
        return deviceRuntime.value?.get(id) as DeviceRuntime;
    });
};

const updateDeviceRuntime = (record: DeviceRecord) => {
    const id = record.id;
    const runtime = deviceRuntime.value?.get(id);
    if (!runtime) {
        return;
    }
    deviceRuntime.value?.set(id, {
        ...runtime,
        previewImage: record.setting?.previewImage || previewImageDefault,
    });
};

const deleteDeviceRuntime = (record: DeviceRecord) => {
    deviceRuntime.value?.delete(record.id);
};

// 连接 WebSocket
const connectWebSocket = async () => {
    try {
        const wsAddress = await $mapi.serve.getAddress();

        if (ws && ws.readyState === WebSocket.OPEN) {
            return;
        }

        // 添加查询参数标识为 Render 客户端
        const wsUrl = `${wsAddress}/server?type=Render`;
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log("WebSocket connected to server as Render client");
            wsReconnectAttempts = 0;
        };

        ws.onmessage = (event) => {
            // console.log('WebSocket message received:', event.data);
            try {
                const data = JSON.parse(event.data);

                if (data.type === "DeviceConnect") {
                    console.log("Device connected:", data.deviceId);
                    deviceStore().refresh();
                    return;
                }

                if (data.type === "DeviceDisconnect") {
                    console.log("Device disconnected:", data.deviceId);
                    deviceStore().refresh();
                    return;
                }

                if (data.type === "DevicePreview") {
                    const {deviceId, data: previewData} = data;
                    const device = deviceStore().records.find(r => r.id === deviceId);
                    if (device && previewData) {
                        deviceStore().edit(device, {
                            screenshot: previewData,
                        }, false);
                    }
                    return;
                }

                if (data.type === "DevicePanelButtonClick") {
                    handlePanelButtonClick(data.deviceId, data.data.id);
                    return;
                }

                if (data.type === "DeviceStatus") {
                    return;
                }

                console.log("WebSocket message:", data);
            } catch (error) {
                console.error("WebSocket message parse error:", error);
            }
        };

        ws.onclose = () => {
            console.log("WebSocket disconnected, will retry...");
            ws = null;

            // 自动重连
            if (wsReconnectAttempts < wsMaxReconnectAttempts) {
                wsReconnectAttempts++;
                const delay = Math.min(wsReconnectDelay * wsReconnectAttempts, 30000); // 最长30秒
                console.log(`WebSocket reconnecting in ${delay}ms (attempt ${wsReconnectAttempts}/${wsMaxReconnectAttempts})`);
                wsReconnectTimer = setTimeout(() => {
                    connectWebSocket();
                }, delay);
            } else {
                console.error("WebSocket max reconnection attempts reached");
            }
        };

        ws.onerror = (error) => {
            console.error("WebSocket error:", error);
        };
    } catch (error) {
        console.error("Failed to connect WebSocket:", error);
    }
};

// 断开 WebSocket
const disconnectWebSocket = () => {
    if (wsReconnectTimer) {
        clearTimeout(wsReconnectTimer);
        wsReconnectTimer = null;
    }
    if (ws) {
        ws.close();
        ws = null;
    }
};

const handlePanelButtonClick = async (deviceId: string, buttonId: string) => {
    console.log(`Handling panel button click: device=${deviceId}, button=${buttonId}`);

    let args: string[] = [];

    switch (buttonId) {
        case "home":
            args = ["shell", "input", "keyevent", "KEYCODE_HOME"];
            await $mapi.adb.spawnShell(args, {}, deviceId);
            break;
        case "back":
            args = ["shell", "input", "keyevent", "KEYCODE_BACK"];
            await $mapi.adb.spawnShell(args, {}, deviceId);
            break;
        case "recent":
            args = ["shell", "input", "keyevent", "KEYCODE_APP_SWITCH"];
            await $mapi.adb.spawnShell(args, {}, deviceId);
            break;
        case "volume_up":
            args = ["shell", "input", "keyevent", "KEYCODE_VOLUME_UP"];
            await $mapi.adb.spawnShell(args, {}, deviceId);
            break;
        case "volume_down":
            args = ["shell", "input", "keyevent", "KEYCODE_VOLUME_DOWN"];
            await $mapi.adb.spawnShell(args, {}, deviceId);
            break;
        case "screenshot":
            args = ["shell", "input", "keyevent", "KEYCODE_SYSRQ"];
            await $mapi.adb.spawnShell(args, {}, deviceId);
            break;
        case "close":
            await stopDeviceManage(deviceId);
            break;
        default:
            console.log(`Unknown button: ${buttonId}`);
            break;
    }
};

// 启动 debug_manage
const startDeviceManage = async (deviceId: string) => {
    try {
        // 如果已经在运行,先停止
        if (deviceControllers.has(deviceId)) {
            await stopDeviceManage(deviceId);
        }

        const wsAddress = await $mapi.serve.getAddress();

        // 启动 debug_manage (管理模式：预览+无视频音频播放)
        const wsUrl = `${wsAddress}/server?type=DeviceManage&deviceId=${deviceId}`;
        const controller = await $mapi.scrcpy.spawnShell([
            // "-V","debug",
            "--serial", deviceId,
            "--linkandroid-server", wsUrl,
            "--linkandroid-preview-interval", "1000",
            "--linkandroid-preview-ratio", "30",
            "--no-video-playback",
            "--no-audio-playback",
            "--linkandroid-skip-taskbar",
        ], {
            stdout: (data: string) => {
                window.$mapi.log.info("Render.DeviceManage.stdout", {deviceId, data});
            },
            stderr: (data: string) => {
                window.$mapi.log.error("Render.DeviceManage.stderr", {deviceId, data});
            },
            success: () => {
                window.$mapi.log.info("Render.DeviceManage.success", {deviceId});
                deviceControllers.delete(deviceId);
            },
            error: (msg: string, exitCode: number) => {
                window.$mapi.log.error("Render.DeviceManage.error", {deviceId, msg, exitCode});
                deviceControllers.delete(deviceId);
                const errorTimes = deviceConnectErrorTimes.get(deviceId) || 0;
                deviceConnectErrorTimes.set(deviceId, errorTimes + 1);
                if (errorTimes >= 5) {
                    window.$mapi.log.error("Render.DeviceManage.error.maxTimes", {deviceId, errorTimes});
                    const deviceRecord = deviceStore().records.find(r => r.id === deviceId);
                    if (deviceRecord) {
                        deviceRecord.forwardPort = false;
                        const runtime = getDeviceRuntime(deviceRecord);
                        runtime.value.forwardPort = false;
                        runtime.value.status = EnumDeviceStatus.DISCONNECTED;
                        deviceRuntime.value.set(deviceId, runtime.value);
                        updateDeviceRuntime(deviceRecord);
                    }else{
                        window.$mapi.log.error("Render.DeviceManage.error: no device record", {deviceId});
                    }
                    return;
                }else{
                    setTimeout(() => {
                    const device = deviceStore().records.find(r => r.id === deviceId);
                    if (device && device.status === EnumDeviceStatus.CONNECTED) {
                        startDeviceManage(deviceId);
                    }
                }, 5000);
                }
            },
        });
        deviceControllers.set(deviceId, controller);
    } catch (error) {
        window.$mapi.log.error("Failed to start debug_manage:", {deviceId, error});
    }
};

const stopDeviceManage = async (deviceId: string) => {
    const controller = deviceControllers.get(deviceId);
    if (controller) {
        try {
            controller.stop();
        } catch (error) {
            console.error("Failed to stop debug_manage:", deviceId, error);
        }
        deviceControllers.delete(deviceId);
    }
};

export const deviceStore = defineStore("device", {
    state: () => ({
        records: [] as DeviceRecord[],
    }),
    actions: {
        async init() {
            await $mapi.storage.get("device", "records", []).then(records => {
                records.forEach((record: DeviceRecord) => {
                    record.forwardPort = record.forwardPort || false;
                    record.status = createDeviceStatus(record);
                    record.runtime = getDeviceRuntime(record);
                    record.screenshot = record.screenshot || null;
                    record.setting = record.setting || getEmptySetting();
                });
                this.records = records;
            });

            // 连接 WebSocket
            await connectWebSocket();

            await this.refresh();
            setTimeout(async () => {
                await this.startWatch();
            }, 2000);
        },
        async startWatch() {
            await $mapi.adb.watch((type, data) => {
                // console.log('watch', type, data)
                this.refresh().then();
            });
        },
        async connectedDevices(): Promise<DeviceRecord[]> {
            const res = await $mapi.adb.devices();
            const data: DeviceRecord[] = [];
            for (const d of res || []) {
                data.push({
                    id: d.id,
                    type: isIPWithPort(d.id) ? EnumDeviceType.WIFI : EnumDeviceType.USB,
                    name: d.model ? d.model.split(":")[1] : d.id,
                    raw: d,
                    forwardPort: false,
                    status: createDeviceStatus(d),
                    runtime: getDeviceRuntime(d),
                    screenshot: d.screenshot || null,
                    setting: getEmptySetting(),
                });
            }
            return data;
        },
        async getForwardPorts()  {
            const adbPath = await window.$mapi.adb.getBinPath();
            await window.$mapi.adb.spawnShell([adbPath, "forward", "--list"],{
                stdout: (listOutput: string) => {
                    console.log("========================"+listOutput);
                    listOutput.split('\n').forEach(line => {
                        const parts = line.trim().split(/\s+/);
                        // 匹配格式: [serial, localPort, devicePort]`
                        deviceforwardInfos[parts[0]]=({id: parts[0], to: parts[1], from: parts[2]});
                    });
                },
                stderr: (listError: string) => {
                    console.log(listError);
                },
            });
        },
        async updateForwardPorts(id: string,enable: boolean) { 
            const record = this.records.find(record => record.id === id);
            if (record) {
                record.forwardPort = enable;
                const runtime = getDeviceRuntime(record);
                runtime.value.forwardPort = enable;
                record.runtime = runtime.value;
                if (!enable && id in deviceforwardInfos){
                    delete deviceforwardInfos[id];
                }
            }
        },
        async refresh() {
            const connectedDevices = await this.connectedDevices();
            let changed = false;
            await this.getForwardPorts();
            // 将新设备加入到列表中
            for (const device of connectedDevices) {
                let record = this.records.find(record => record.id === device.id);
                if (!record) {
                    record = {
                        id: device.id,
                        type: device.type,
                        name: device.name,
                        raw: device.raw,
                        forwardPort: device.forwardPort || false,
                        status: createDeviceStatus(device),
                        runtime: getDeviceRuntime(device),
                        screenshot: null,
                        setting: getEmptySetting(),
                    };
                    this.records.unshift(record);
                    changed = true;
                }
            }
            // 设置已连接的设备状态
            const connectedDeviceIds = connectedDevices.map(d => d.id);
            for (const record of this.records) {
                const runtime = getDeviceRuntime(record);
                if (connectedDeviceIds.includes(record.id)) {
                    if (runtime.value.status !== EnumDeviceStatus.CONNECTED) {
                        runtime.value.status = EnumDeviceStatus.CONNECTED;
                        changed = true;

                        // 自动启动 debug_manage
                        if(record.id in deviceConnectErrorTimes){
                            delete deviceConnectErrorTimes[record.id];
                        }
                        startDeviceManage(record.id);
                    }
                } else {
                    if (runtime.value.status !== EnumDeviceStatus.DISCONNECTED) {
                        runtime.value.status = EnumDeviceStatus.DISCONNECTED;
                        changed = true;

                        // 停止 debug_manage
                        stopDeviceManage(record.id);
                        deviceConnectErrorTimes.delete(record.id);
                    }
                }
                if (record.id in deviceforwardInfos){
                    record.forwardPort = true;
                    runtime.value.forwardPort = true;
                }else{
                    record.forwardPort = false;
                    runtime.value.forwardPort = false;
                }
            }
            // 将已连接的设备排在前面
            this.records.sort((a, b) => {
                if (a.status === EnumDeviceStatus.CONNECTED) {
                    return -1;
                }
                if (b.status === EnumDeviceStatus.CONNECTED) {
                    return 1;
                }
                // 剩下的按照id排序
                if (a.id && b.id && a.id < b.id) {
                    return -1;
                }
                return 0;
            });
            // 更新并保存
            if (changed) {
                await this.sync();
            }
        },
        async delete(device: DeviceRecord) {
            const index = this.records.findIndex(record => record.id === device.id);
            if (index === -1) {
                return;
            }
            deleteDeviceRuntime(device);
            
            this.records.splice(index, 1);
            await this.sync();
        },
        async edit(device: DeviceRecord, update: {}, sync: boolean = true) {
            const record = this.records.find(record => record.id === device.id);
            if (!record) {
                return;
            }
            for (let k in update) {
                record[k] = update[k];
            }
            if (sync) {
                await this.sync();
            }
        },
        async updateSetting(id: string, setting: any) {
            const record = this.records.find(record => record.id === id);
            if (!record) {
                return;
            }
            record.setting = Object.assign({}, record.setting, setting);
            updateDeviceRuntime(record);
            await this.sync();
        },
        async sync() {
            const savedRecords = toRaw(cloneDeep(this.records));
            savedRecords.forEach(record => {
                record.runtime = undefined;
                record.status = undefined;
            });
            await $mapi.storage.set("device", "records", savedRecords);
        },
        async doTop(index: number) {
            const record = this.records[index];
            this.records.splice(index, 1);
            this.records.unshift(record);
            await this.sync();
        },
        async doMirror(device: DeviceRecord) {
            const runtime = getDeviceRuntime(device);
            if (runtime.value.status !== EnumDeviceStatus.CONNECTED) {
                throw new Error("DeviceNotConnected");
            }
            if (runtime.value.mirrorController) {
                try {
                    runtime.value.mirrorController.stop();
                } catch (e) {
                }
                return;
            }
            Dialog.loadingOn(t("device.mirroring"));
            const setting = {
                dimWhenMirror: await this.settingGet(device, "dimWhenMirror", "yes"),
                alwaysTop: await this.settingGet(device, "alwaysTop", "no"),
                mirrorSound: await this.settingGet(device, "mirrorSound", "no"),
                videoBitRate: await this.settingGet(device, "videoBitRate", "2M"),
                maxFps: await this.settingGet(device, "maxFps", "60"),
                scrcpyArgs: await this.settingGet(device, "scrcpyArgs", ""),
                videoCodec: await this.settingGet(device, "videoCodec", "h265"),
                videoBuffer: await this.settingGet(device, "videoBuffer", "50"),
                maxSize: await this.settingGet(device, "maxSize", "720"),
            };

            // 构建投屏参数
            const args: string[] = [];
            args.push("--stay-awake");
            if ("yes" === setting.alwaysTop) {
                args.push("--always-on-top");
            }
            if ("no" === setting.mirrorSound) {
                args.push("--no-audio");
            }
            if (setting.videoBitRate) {
                args.push('--video-bit-rate', setting.videoBitRate);
            }
            if (setting.maxFps) {
                args.push('--max-fps', setting.maxFps);
            }
            if (setting.dimWhenMirror === "yes") {
                args.push("--turn-screen-off");
            }
            if (setting.scrcpyArgs) {
                args.push(setting.scrcpyArgs);
            }
            args.push("--video-codec", setting.videoCodec);
            args.push("--video-buffer", setting.videoBuffer);
            args.push("--max-size", setting.maxSize);
            // 添加 WebSocket 服务器和面板参数
            const wsAddress = await $mapi.serve.getAddress();
            const wsUrl = `${wsAddress}/server?type=DeviceMirror&deviceId=${device.id}`;
            // args.push("-V","debug");
            args.push("--linkandroid-server", wsUrl);
            args.push("--linkandroid-panel-show");

            let successTimer: any = null;
            try {
                runtime.value.mirrorController = await $mapi.scrcpy.mirror(device.id, {
                    title: device.name as string,
                    args,
                    stdout: (data: string, process: any) => {
                        console.log("mirror.stdout", data);
                        $mapi.log.info("Mirror.stdout", data);
                        if (!successTimer) {
                            successTimer = setTimeout(() => {
                                if (runtime.value.mirrorController) {
                                    Dialog.tipSuccess(t("device.mirrorSuccess"));
                                }
                            }, 2000);
                        }
                    },
                    stderr: (data: string, process: any) => {
                        console.log("mirror.stderr", data);
                        $mapi.log.error("Mirror.stderr", data);
                    },
                    success: (process: any) => {
                        console.log("mirror.success");
                        $mapi.log.info("Mirror.success");
                        runtime.value.mirrorController = null;
                    },
                    error: (msg: string, exitCode: number, process: any) => {
                        console.log("mirror.error", {msg, exitCode});
                        $mapi.log.error("Mirror.error", {msg, exitCode});
                        runtime.value.mirrorController = null;
                        Dialog.alertError(t("device.mirrorFailed") + ` : <code>${msg}</code>`);
                    },
                });
            } catch (error) {
                Dialog.tipError(mapError(error));
            } finally {
                Dialog.loadingOff();
            }
        },
        async settingGet(device: DeviceRecord, name: string, defaultValue: any) {
            if (device.setting && name in device.setting) {
                if ("" !== device.setting[name] && undefined !== device.setting[name]) {
                    return device.setting[name];
                }
            }
            return await $mapi.config.get(`Device.${name}`, defaultValue);
        },
    },
});

const device = deviceStore(store);
device.init().then(() => {
});

export const useDeviceStore = () => {
    return device;
};
