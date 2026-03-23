<script setup lang="ts">
import {computed, ref} from "vue";
import FileExt from "../../components/common/FileExt.vue";
import {Dialog} from "../../lib/dialog";
import {t} from "../../lang";
import {DeviceRecord, EnumDeviceStatus} from "../../types/Device";

// const props = defineProps<{
//     device: DeviceRecord;
// }>();
// const device = ref({} as DeviceRecord);

const emit = defineEmits<{
    (e: "close"): void;
}>();

const visible = ref(false);
const currentDevice = ref({} as DeviceRecord);
const currentPath = ref("");
const fileRecords = ref([] as any[]);
const selectedFiles = ref<string[]>([]);
const isUploading = ref(false);
const uploadProgress = ref(0);
const isListView = ref(true);
const sortOrderName = ref("asc");
const sortOrderModifiedTime = ref("asc");
const currentSortField = ref("name");

const show = (d: DeviceRecord) => {
    if (d.status !== EnumDeviceStatus.CONNECTED) {
        Dialog.tipError(t("device.notConnected"));
        return;
    }
    visible.value = true;
    currentDevice.value = d;
    currentPath.value = "";
    selectedFiles.value = [];
    uploadProgress.value = 0;
    doRefresh();
};

const hide = () => {
    visible.value = false;
    currentDevice.value = {} as DeviceRecord;
    currentPath.value = "";
    selectedFiles.value = [];
    uploadProgress.value = 0;
};

const pathSeg = computed(() => {
    return currentPath.value.split("/").filter(s => s);
});

const allowedDirectories = [
    {
        name: "Downloads",
        path: "/sdcard/Downloads",
        icon: "icon-download"
    },
    {
        name: "Download",
        path: "/sdcard/Download",
        icon: "icon-download"
    },
    {
        name: "Pictures",
        path: "/sdcard/Pictures",
        icon: "icon-image"
    },
    {
        name: "Videos",
        path: "/sdcard/Videos",
        icon: "icon-video-camera"
    },
    {
        name: "Music",
        path: "/sdcard/Music",
        icon: "icon-sound"
    },
    {
        name: "Documents",
        path: "/sdcard/Documents",
        icon: "icon-file"
    }
];

const currentDirectory = computed(() => {
    if (currentPath.value === "") {
        return null;
    }
    return allowedDirectories.find(dir => dir.path === currentPath.value);
});

const sortedFileRecords = computed(() => {
    const sortField = currentSortField.value;
    const sortOrder = sortField === "updateTime" ? sortOrderModifiedTime.value : sortOrderName.value;

    return [...fileRecords.value].sort((a, b) => {
        if (sortField === "updateTime") {
            const timeA = new Date(a.updateTime).getTime();
            const timeB = new Date(b.updateTime).getTime();
            return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
        } else {
            return sortOrder === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
        }
    });
});

const doRefresh = async () => {
    console.log("doRefresh called");
    console.log("currentPath:", currentPath.value);
    console.log("currentDevice.id:", currentDevice.value.id);
    
    Dialog.loadingOn();
    try {
        if (currentPath.value === "") {
            console.log("Loading root directory (allowed directories)");
            fileRecords.value = allowedDirectories.map(dir => ({
                name: dir.name,
                path: dir.path,
                icon: dir.icon,
                isDirectory: true,
                size: 0,
                updateTime: ""
            }));
        } else {
            console.log("Loading directory:", currentPath.value);
            const files = await window.$mapi.adb.fileList(currentDevice.value.id, currentPath.value);
            console.log("Files received from API:", files);
            fileRecords.value = files.map(f => ({
                name: f.name,
                path: currentPath.value + "/" + f.name,
                isDirectory: f.type === "directory",
                size: f.size,
                updateTime: f.updateTime
            }));
        }
    } catch (error) {
        console.error("Refresh error:", error);
        Dialog.tipError(t("device.fileListFailed"));
    } finally {
        Dialog.loadingOff();
    }
};

const doOpen = (f: any) => {
    console.log("doOpen called with:", f);
    if (f.isDirectory) {
        console.log("Opening directory:", f.path);
        currentPath.value = f.path;
        doRefresh();
    } else {
        console.log("Clicked on file, not directory:", f);
    }
};

const doUp = () => {
    if (currentPath.value !== "") {
        currentPath.value = "";
        doRefresh();
    }
};

// const handleFileSelect = (event: Event) => {
//     const target = event.target as HTMLInputElement;
//     const files = Array.from(target.files || []);
//     console.log("File selected:", files.length, "files:", files);
//     if (files.length > 0) {
//         selectedFiles.value = [...selectedFiles.value, ...files];
//         console.log("Selected files updated:", selectedFiles.value.length);
//     }
// };

const doUpload = async () => {
    console.log("doUpload called");
    console.log("currentPath:", currentPath.value);
    console.log("selectedFiles.length:", selectedFiles.value.length);
    console.log("isUploading:", isUploading.value);
    Dialog.loadingOn("openFileSelector");
    await openFileSelector();
    Dialog.loadingOff();
    if (currentPath.value === "") {
        Dialog.tipError(t("device.fileSelectDirectory"));
        return;
    }

    if (selectedFiles.value.length === 0) {
        Dialog.tipError(t("device.fileSelectFirst"));
        return;
    }
    isUploading.value = true;
    uploadProgress.value = 0;
    try {
        for (let i = 0; i < selectedFiles.value.length; i++) {
            Dialog.loadingOn(t("device.fileUploading"));
            const path = selectedFiles.value[i];
            const fileName = window.$mapi.app.isPlatform("win") ? path.split("\\").pop() : path.split("/").pop();
            const devicePath = currentPath.value + "/" + fileName;
            // const file = selectedFiles.value[i];
            // const targetPath = currentPath.value + "/" + file.name;
            await window.$mapi.adb.filePush(currentDevice.value.id, path, devicePath);
            
            uploadProgress.value = Math.round(((i + 1) / selectedFiles.value.length) * 100);
            Dialog.loadingOff();
            Dialog.tipSuccess(t("common.success"));
            doRefresh().then();
        }

        Dialog.tipSuccess(t("device.fileUploadSuccess"));
        selectedFiles.value = [];
        uploadProgress.value = 0;
        doRefresh();
    } catch (error) {
        console.error("Upload error=====:", error);
        window.$mapi.log.error("Upload error=======",error);
        Dialog.tipError(t("device.fileUploadFailed"));
    } finally {
        isUploading.value = false;
    }
};

const openFileSelector = async () => {
    const path = await window.$mapi.file.openFile({properties:["multiSelections"]});
    if (path) {
        selectedFiles.value = [...selectedFiles.value, ...path];
        console.log("Selected files updated:", selectedFiles.value.length);
    }
};

const toggleView = () => {
    isListView.value = !isListView.value;
};

const toggleSortByName = () => {
    currentSortField.value = "name";
    sortOrderName.value = sortOrderName.value === "asc" ? "desc" : "asc";
};

const toggleSortByModifiedTime = () => {
    currentSortField.value = "updateTime";
    sortOrderModifiedTime.value = sortOrderModifiedTime.value === "asc" ? "desc" : "asc";
};

defineExpose({
    show,
    hide,
});
</script>

<template>
    <a-modal v-model:visible="visible" width="80vw" :footer="false" title-align="start">
        <template #title>
            {{ $t("device.fileUpload") }}
        </template>

        <div style="height: 60vh; margin: -0.5rem;" class="">
            <div class="flex flex-col h-full">
                <div class="flex-shrink-0 flex items-center">
                    <div class="border px-2 w-full h-10 border-solid border-gray-200 rounded flex items-center">
                        <a-button type="text" style="color: #999" @click="doUp" :disabled="currentPath === ''">
                            <template #icon>
                                <icon-home />
                            </template>
                        </a-button>
                        <a-breadcrumb :max-count="4" class="flex-grow min-h-10">
                            <a-breadcrumb-item v-for="s in pathSeg" :key="s">
                                {{ s }}
                            </a-breadcrumb-item>
                        </a-breadcrumb>
                    </div>
                </div>

                <div class="py-2 flex items-center">
                    <a-button class="mr-1" @click="doUp" :disabled="pathSeg.length === 0">
                        <template #icon>
                            <icon-left />
                        </template>
                    </a-button>
                    <a-button class="mr-1" @click="doUpload" >
                        <template #icon>
                            <icon-upload />
                        </template>
                        {{ $t("common.addFile") }}
                    </a-button>
                    <a-button class="mr-1" @click="toggleView">
                        <template #icon>
                            <icon-list v-if="isListView" />
                            <icon-apps v-else />
                        </template>
                        {{ isListView ? $t("common.viewGrid") : $t("common.viewList") }}
                    </a-button>
                    <a-button class="mr-1" @click="toggleSortByName">
                        <template #icon>
                            <component :is="sortOrderName === 'asc' ? 'icon-down' : 'icon-up'" />
                        </template>
                        {{ $t("common.sortByName") }} ({{ sortOrderName === "asc" ? $t("common.sortDesc") : $t("common.sortAsc") }})
                    </a-button>
                    <a-button class="mr-1" @click="toggleSortByModifiedTime">
                        <template #icon>
                            <component :is="sortOrderModifiedTime === 'asc' ? 'icon-down' : 'icon-up'" />
                        </template>
                        {{ $t("common.sortByTime") }} ({{ sortOrderModifiedTime === "asc" ? $t("common.sortDesc") : $t("common.sortAsc") }})
                    </a-button>
                </div>

                <div class="flex-grow overflow-auto border border-solid border-gray-200 rounded p-2">
                    <div v-if="isListView" class="flex flex-col">
                        <div
                            v-for="f in sortedFileRecords"
                            class="flex items-center border-b border-gray-200 p-2"
                            :key="f.name"
                        >
                            <div class="flex items-center flex-grow" @click="doOpen(f)" style="cursor: pointer">
                                <FileExt :is-folder="f.isDirectory" :name="f.name" size="30px" class="mr-2" />
                                <div class="flex-grow">
                                    <span class="font-medium">{{ f.name }}</span>
                                    <span v-if="!f.isDirectory" class="text-gray-500 text-sm ml-2">({{ f.size }} bytes)</span>
                                    <span v-if="f.updateTime" class="text-gray-400 text-sm ml-2">| {{ f.updateTime }}</span>
                                </div>
                            </div>
                            <div>
                                <a-checkbox v-model="f.checked" class="mr-2" />
                            </div>
                        </div>
                    </div>
                    <div v-else class="flex flex-wrap">
                        <div v-for="f in sortedFileRecords" class="w-1/6 p-2" :key="f.name">
                            <div class="border border-solid border-gray-200 rounded-lg mb-2 p-2 relative">
                                <div class="text-center p-3 cursor-pointer" @click="doOpen(f)">
                                    <FileExt :is-folder="f.isDirectory" :name="f.name" size="60%" />
                                </div>
                                <div class="text-center text-sm" style="overflow: scroll">
                                    {{ f.name }}
                                </div>
                                <div class="absolute right-2 top-2">
                                    <a-checkbox v-model="f.checked" class="mr-2" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div v-if="isUploading" class="flex-shrink-0 border-t border-solid border-gray-200 p-4">
                    <div class="flex items-center justify-center">
                        <a-button type="primary" loading>
                            {{ $t("device.fileUploading") }} ({{ uploadProgress }}%)
                        </a-button>
                    </div>
                </div>
            </div>
        </div>
    </a-modal>
</template>

<style scoped lang="less">
</style>