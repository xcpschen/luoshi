<script setup lang="ts">
import { t } from "../../lang";
</script>

<template>
    <div class="flex flex-col items-center justify-center py-20 text-gray-500 dark:text-gray-400">
        <div class="w-32 h-32 mb-6 opacity-50">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z" fill="currentColor"/>
                <path d="M12 6C10.34 6 9 7.34 9 9C9 10.66 10.34 12 12 12C13.66 12 15 10.66 15 9C15 7.34 13.66 6 12 6ZM12 14C9.33 14 7 15.34 7 17V18H17V17C17 15.34 14.67 14 12 14Z" fill="currentColor"/>
            </svg>
        </div>
        <div class="text-xl font-semibold mb-2">
            {{ t("deviceManage.empty.title") }}
        </div>
        <div class="text-sm mb-6">
            {{ t("deviceManage.empty.description") }}
        </div>
        <div class="text-xs text-gray-400">
            {{ t("deviceManage.empty.hint") }}
        </div>
    </div>
</template>

<style scoped lang="less">
// 空状态组件样式
</style>
