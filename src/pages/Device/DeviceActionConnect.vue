<script setup lang="ts">
import {DeviceRecord, EnumDeviceStatus, EnumDeviceType} from "../../types/Device";
import {Dialog} from "../../lib/dialog";
import {t} from "../../lang";
import {parseIPPort} from "../../lib/linkandroid";

const props = defineProps<{
    device: DeviceRecord;
}>();
const doConnect = async () => {
    if (props.device.status !== EnumDeviceStatus.DISCONNECTED) {
        Dialog.tipError(t("device.statusAbnormal"));
        return;
    }
    Dialog.loadingOn(t("device.connecting"));
    try {
        if (props.device.type === EnumDeviceType.USB) {   
            await window.$mapi.adb.connectUSB(props.device.id);
        } else {
           const {ip, port} = parseIPPort(props.device.id);
            await window.$mapi.adb.connect(ip, port);
        }
        
        Dialog.tipSuccess(t("device.connectSuccess"));
    } catch (e) {
        Dialog.tipError(t("device.connectFailed"));
    } finally {
        Dialog.loadingOff();
    }
};
</script>

<template>
    <a-doption @click="doConnect">
        {{ $t("device.connect") }}
    </a-doption>
</template>

<style scoped></style>
