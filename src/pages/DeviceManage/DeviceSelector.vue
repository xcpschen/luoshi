<script setup lang="ts">
import { ref, computed } from "vue";
import { t } from "../../lang";
import { EnumDeviceStatus } from "../../types/Device";
import type { DeviceUnifiedRecord } from "../../types/DeviceUnified";

const props = defineProps<{
    allDevices: DeviceUnifiedRecord[];
    multiple?: boolean;
    maxHeight?: string;
}>();

const emit = defineEmits<{
    (e: "select", deviceIds: string[]): void;
}>();

const selectedDeviceIds = ref<Set<string>>(new Set());
const searchKeywords = ref("");
const filterTags = ref<string[]>([]);
const currentPage = ref(1);
const pageSize = 10;

const filteredDevices = computed(() => {
    return props.allDevices.filter((device: DeviceUnifiedRecord) => {
        // 标签筛选
        if (filterTags.value.length > 0) {
            const deviceTags = device.tags || [];
            const hasAllTags = filterTags.value.every(tag => deviceTags.includes(tag));
            if (!hasAllTags) {
                return false;
            }
        }
        
        // 关键词筛选
        if (searchKeywords.value) {
            const keywords = searchKeywords.value.toLowerCase();
            const matches = device.name?.toLowerCase().includes(keywords) ||
                             device.identity.model?.toLowerCase().includes(keywords) ||
                             device.identity.brand?.toLowerCase().includes(keywords) ||
                             device.unifiedId?.toLowerCase().includes(keywords) ||
                             (device.tags && device.tags.some(tag => tag.toLowerCase().includes(keywords)));
            if (!matches) {
                return false;
            }
        }
        
        return true;
    });
});

const paginatedDevices = computed(() => {
    const start = (currentPage.value - 1) * pageSize;
    const end = start + pageSize;
    return filteredDevices.value.slice(start, end);
});

const totalPages = computed(() => {
    return Math.ceil(filteredDevices.value.length / pageSize);
});

const selectedDevices = computed(() => {
    return props.allDevices.filter(device => selectedDeviceIds.value.has(device.unifiedId));
});

const currentPageSelectedDevices = computed(() => {
    return paginatedDevices.value.filter(device => selectedDeviceIds.value.has(device.unifiedId));
});

// 收集所有设备的标签
const availableTags = computed(() => {
    const tags = new Set<string>();
    props.allDevices.forEach(device => {
        if (device.tags && device.tags.length > 0) {
            device.tags.forEach(tag => tags.add(tag));
        }
    });
    return Array.from(tags);
});

const toggleSelectAll = () => {
    if (currentPageSelectedDevices.value.length === paginatedDevices.value.length) {
        paginatedDevices.value.forEach(device => {
            selectedDeviceIds.value.delete(device.unifiedId);
        });
    } else {
        paginatedDevices.value.forEach(device => {
            selectedDeviceIds.value.add(device.unifiedId);
        });
    }
    emitSelection();
};

const toggleDeviceSelection = (deviceId: string) => {
    if (selectedDeviceIds.value.has(deviceId)) {
        selectedDeviceIds.value.delete(deviceId);
    } else {
        selectedDeviceIds.value.add(deviceId);
    }
    emitSelection();
};

const hasOnlineConnection = (device: DeviceUnifiedRecord) => {
    return device.connections.some(conn => 
        conn.status === EnumDeviceStatus.CONNECTED || 
        conn.status === EnumDeviceStatus.DEVICE ||
        conn.status === EnumDeviceStatus.ONLINE ||
        conn.status === EnumDeviceStatus.PARTIAL
    );
};

const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages.value) {
        currentPage.value = page;
    }
};

const prevPage = () => {
    if (currentPage.value > 1) {
        currentPage.value--;
    }
};

const nextPage = () => {
    if (currentPage.value < totalPages.value) {
        currentPage.value++;
    }
};

const toggleTag = (tag: string) => {
    if (filterTags.value.includes(tag)) {
        filterTags.value = filterTags.value.filter(t => t !== tag);
    } else {
        filterTags.value.push(tag);
    }
    currentPage.value = 1;
};

const resetFilters = () => {
    searchKeywords.value = "";
    filterTags.value = [];
    currentPage.value = 1;
};

const emitSelection = () => {
    emit('select', Array.from(selectedDeviceIds.value));
};
</script>

<template>
    <div class="device-selector">
        <div class="filter-section">
            <div class="search-box">
                <a-input-search
                    v-model="searchKeywords"
                    :placeholder="t('device.searchPlaceholder')"
                    allow-clear
                    style="width: 100%"
                />
            </div>
            
            <div class="tags-filter" v-if="availableTags.length > 0">
                <span class="filter-label">{{ t('deviceManage.tags') }}:</span>
                <div class="tags-list">
                    <a-tag
                        v-for="tag in availableTags"
                        :key="tag"
                        :color="filterTags.includes(tag) ? 'blue' : 'gray'"
                        closable
                        @close="toggleTag(tag)"
                    >
                        {{ tag }}
                    </a-tag>
                    <a-button
                        v-if="filterTags.length > 0"
                        size="mini"
                        @click="resetFilters"
                    >
                        {{ t('common.reset') }}
                    </a-button>
                </div>
            </div>
        </div>
        
        <div class="device-list-section" :style="{ maxHeight: maxHeight || '400px' }">
            <div class="device-list">
                <div
                    v-for="device in paginatedDevices"
                    :key="device.unifiedId"
                    class="device-item"
                    :class="{ selected: selectedDeviceIds.has(device.unifiedId) }"
                    @click="toggleDeviceSelection(device.unifiedId)"
                >
                    <div class="device-checkbox">
                        <icon-check-circle v-if="selectedDeviceIds.has(device.unifiedId)" class="checked"/>
                        <div v-else class="unchecked"/>
                    </div>
                    <div class="device-info">
                        <div class="device-name">{{ device.name || 'Unknown Device' }}</div>
                        <div class="device-id">{{ device.unifiedId }}</div>
                        <div class="device-tags" v-if="device.tags && device.tags.length > 0">
                            <a-tag
                                v-for="tag in device.tags.slice(0, 2)"
                                :key="tag"
                                size="small"
                            >
                                {{ tag }}
                            </a-tag>
                            <span v-if="device.tags.length > 2" class="more-tags">+{{ device.tags.length - 2 }}</span>
                        </div>
                    </div>
                    <div class="device-status">
                        <span class="status-dot" :class="hasOnlineConnection(device) ? 'online' : 'offline'"></span>
                        {{ hasOnlineConnection(device) ? t('device.status.online') : t('device.status.offline') }}
                    </div>
                </div>
            </div>
        </div>
        
        <div class="pagination-section">
            <div class="pagination-info">
                <span>{{ (currentPage - 1) * pageSize + 1 }} - {{ Math.min(currentPage * pageSize, filteredDevices.length) }} / {{ filteredDevices.length }}</span>
                <span class="selected-count">{{ selectedDeviceIds.size }} {{ t('deviceManage.selectedCount') }}</span>
            </div>
            <div class="pagination-controls">
                <a-button
                    size="mini"
                    :disabled="currentPage === 1"
                    @click="prevPage"
                >
                    <template #icon><icon-left/></template>
                    {{ t('common.prev') }}
                </a-button>
                <div class="page-numbers">
                    <a-button
                        v-for="page in totalPages"
                        :key="page"
                        size="mini"
                        :type="currentPage === page ? 'primary' : 'outline'"
                        @click="goToPage(page)"
                    >
                        {{ page }}
                    </a-button>
                </div>
                <a-button
                    size="mini"
                    :disabled="currentPage === totalPages"
                    @click="nextPage"
                >
                    {{ t('common.next') }}
                    <template #icon><icon-right/></template>
                </a-button>
            </div>
        </div>
    </div>
</template>

<style scoped lang="less">
.device-selector {
    .filter-section {
        margin-bottom: 20px;
        padding-bottom: 20px;
        border-bottom: 1px solid var(--color-border-2);
        
        .search-box {
            margin-bottom: 15px;
        }
        
        .tags-filter {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
            
            .filter-label {
                font-weight: 500;
                color: var(--color-text-1);
                margin-right: 10px;
            }
            
            .tags-list {
                display: flex;
                align-items: center;
                gap: 8px;
                flex-wrap: wrap;
            }
        }
    }
    
    .device-list-section {
        margin-bottom: 20px;
    }
    
    .device-list {
        max-height: inherit;
        overflow-y: auto;
        border: 1px solid var(--color-border-2);
        border-radius: 4px;
        padding: 8px;
        
        .device-item {
            display: flex;
            align-items: center;
            padding: 10px 12px;
            border-bottom: 1px solid var(--color-border-2);
            cursor: pointer;
            transition: all 0.2s;
            
            &:last-child {
                border-bottom: none;
            }
            
            &:hover {
                background: var(--color-fill-2);
            }
            
            &.selected {
                background: var(--color-primary-light-1);
                border-color: var(--color-primary);
            }
            
            .device-checkbox {
                margin-right: 12px;
                display: flex;
                align-items: center;
                
                .checked {
                    color: var(--color-primary);
                    font-size: 20px;
                }
                
                .unchecked {
                    width: 20px;
                    height: 20px;
                    border: 2px solid var(--color-border-3);
                    border-radius: 50%;
                }
            }
            
            .device-info {
                flex: 1;
                
                .device-name {
                    font-weight: 500;
                    margin-bottom: 4px;
                }
                
                .device-id {
                    font-size: 12px;
                    color: var(--color-text-3);
                    margin-bottom: 4px;
                }
                
                .device-tags {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 12px;
                    color: var(--color-text-3);
                    
                    .more-tags {
                        color: var(--color-text-2);
                    }
                }
            }
            
            .device-status {
                display: flex;
                align-items: center;
                font-size: 13px;
                
                .status-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    margin-right: 6px;
                    
                    &.online {
                        background: var(--color-success);
                    }
                    
                    &.offline {
                        background: var(--color-text-4);
                    }
                }
            }
        }
    }
    
    .pagination-section {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 20px;
        border-top: 1px solid var(--color-border-2);
        
        .pagination-info {
            display: flex;
            align-items: center;
            gap: 15px;
            font-size: 13px;
            color: var(--color-text-2);
            
            .selected-count {
                color: var(--color-primary);
                font-weight: 500;
            }
        }
        
        .pagination-controls {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .page-numbers {
            display: flex;
            gap: 4px;
        }
    }
}
</style>
