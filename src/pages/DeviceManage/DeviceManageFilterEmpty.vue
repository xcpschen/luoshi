<script setup lang="ts">
import { t } from "../../lang";
</script>

<template>
    <div class="flex flex-col items-center justify-center py-20 text-gray-500 dark:text-gray-400">
        <div class="w-32 h-32 mb-6 opacity-50">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 18H14V22H10V18ZM4 18H8V22H4V18ZM16 18H20V22H16V18ZM4 2H8V16H4V2ZM10 2H14V16H10V2ZM16 2H20V16H16V2Z" fill="currentColor"/>
            </svg>
        </div>
        <div class="text-xl font-semibold mb-2">
            {{ t("deviceManage.filterEmpty.title") }}
        </div>
        <div class="text-sm mb-6">
            {{ t("deviceManage.filterEmpty.description") }}
        </div>
        <a-button @click="$emit('clear')">
            <template #icon>
                <icon-clear/>
            </template>
            {{ t("deviceManage.filterEmpty.clearFilters") }}
        </a-button>
    </div>
</template>

<style scoped lang="less">
// 筛选空状态组件样式
</style>
