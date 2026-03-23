<script setup lang="ts">
import {DeviceRecord, EnumDeviceStatus, EnumDeviceType} from "../../types/Device";
import {deviceStore} from "../../store/modules/device";
import {Dialog} from "../../lib/dialog";
import {t} from "../../lang";
import {parseIPPort} from "../../lib/linkandroid";

const props = defineProps<{
    device: DeviceRecord;
}>();
const doUnForwardPort = async () => {
    if (props.device.status !== EnumDeviceStatus.CONNECTED) {
        Dialog.tipError(t("device.statusAbnormal"));
        return;
    }
    if (props.device.type !== EnumDeviceType.WIFI) {
        Dialog.tipError(t("device.forwardUSBPortError"));
        return;
    }
    Dialog.loadingOn(t("device.unForwardPort"));
    try {
        const {ip, port} = parseIPPort(props.device.id);
        await window.$mapi.adb.removeForwardPort(ip, port);
        deviceStore().updateForwardPorts(props.device.id, false);
        
        Dialog.tipSuccess(t("device.unForwardPortSuccess"));
    } catch (e) {
        Dialog.tipError(t("device.unForwardPortFailed"));
    } finally {
        Dialog.loadingOff();
    }
};
</script>

<template>
    <a-doption @click="doUnForwardPort">
        {{ $t("device.unForwardPort") }}
    </a-doption>
</template>

<style scoped></style>
