<script setup lang="ts">
import {DeviceRecord, EnumDeviceStatus, EnumDeviceType} from "../../types/Device";
import {Dialog} from "../../lib/dialog";
import {t} from "../../lang";
import {parseIPPort} from "../../lib/linkandroid";
import {deviceStore} from "../../store/modules/device";

const props = defineProps<{
    device: DeviceRecord;
}>();
const doForwardPort = async () => {
    if (props.device.status !== EnumDeviceStatus.CONNECTED) {
        Dialog.tipError(t("device.statusAbnormal"));
        return;
    }
    if (props.device.type !== EnumDeviceType.WIFI) {
        Dialog.tipError(t("device.forwardUSBPortError"));
        return;
    }
    Dialog.loadingOn(t("device.forwardingPort"));
    try {
        const {ip, port} = parseIPPort(props.device.id);
        await window.$mapi.adb.forwardPort(ip, port);
        deviceStore().updateForwardPorts(props.device.id, true);
        Dialog.tipSuccess(t("device.forwardPortSuccess"));
    } catch (e) {
        Dialog.tipError(t("device.forwardPortFailed"));
    } finally {
        Dialog.loadingOff();
    }
};
</script>

<template>
    <a-doption @click="doForwardPort">
        {{ $t("device.forwardPort") }}
    </a-doption>
</template>

<style scoped></style>
