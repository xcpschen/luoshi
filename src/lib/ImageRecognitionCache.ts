/**
 * 图像识别缓存管理器
 * 优化图像识别性能，减少重复识别
 */

import * as crypto from 'crypto';

/**
 * 缓存条目
 */
interface CacheEntry<T> {
    /** 缓存的数据 */
    data: T;
    /** 创建时间 */
    timestamp: number;
    /** 过期时间 */
    ttl: number;
    /** 访问次数 */
    accessCount: number;
    /** 最后访问时间 */
    lastAccessTime: number;
}

/**
 * 缓存配置
 */
export interface CacheConfig {
    /** 最大缓存条目数 */
    maxEntries: number;
    /** 默认过期时间（毫秒） */
    defaultTTL: number;
    /** 是否启用 LRU 淘汰 */
    enableLRU: boolean;
    /** 是否启用统计 */
    enableStats: boolean;
}

/**
 * 缓存统计信息
 */
export interface CacheStats {
    /** 总命中次数 */
    hits: number;
    /** 总未命中次数 */
    misses: number;
    /** 命中率 */
    hitRate: number;
    /** 当前缓存条目数 */
    size: number;
    /** 淘汰次数 */
    evictions: number;
}

/**
 * 图像识别缓存类
 */
export class ImageRecognitionCache {
    private cache: Map<string, CacheEntry<any>> = new Map();
    private config: CacheConfig;
    private stats: { hits: number; misses: number; evictions: number } = {
        hits: 0,
        misses: 0,
        evictions: 0,
    };

    constructor(config: Partial<CacheConfig> = {}) {
        this.config = {
            maxEntries: config.maxEntries || 1000,
            defaultTTL: config.defaultTTL || 5 * 60 * 1000, // 5 分钟
            enableLRU: config.enableLRU !== false,
            enableStats: config.enableStats !== false,
        };
    }

    /**
     * 生成缓存键
     */
    generateKey(imagePath: string, params?: any): string {
        const keyData = JSON.stringify({
            imagePath,
            ...params,
        });
        return crypto.createHash('md5').update(keyData).digest('hex');
    }

    /**
     * 获取缓存
     */
    get<T>(key: string): T | null {
        const entry = this.cache.get(key);
        
        if (!entry) {
            if (this.config.enableStats) {
                this.stats.misses++;
            }
            return null;
        }

        // 检查是否过期
        if (Date.now() - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            if (this.config.enableStats) {
                this.stats.misses++;
            }
            return null;
        }

        // 更新访问信息
        entry.accessCount++;
        entry.lastAccessTime = Date.now();

        if (this.config.enableStats) {
            this.stats.hits++;
        }

        return entry.data as T;
    }

    /**
     * 设置缓存
     */
    set<T>(key: string, data: T, ttl?: number): void {
        // 检查是否需要淘汰
        if (this.cache.size >= this.config.maxEntries) {
            this.evict();
        }

        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            ttl: ttl || this.config.defaultTTL,
            accessCount: 0,
            lastAccessTime: Date.now(),
        };

        this.cache.set(key, entry);
    }

    /**
     * 删除缓存
     */
    delete(key: string): boolean {
        return this.cache.delete(key);
    }

    /**
     * 清空缓存
     */
    clear(): void {
        this.cache.clear();
        if (this.config.enableStats) {
            this.stats.hits = 0;
            this.stats.misses = 0;
            this.stats.evictions = 0;
        }
    }

    /**
     * 检查缓存是否存在
     */
    has(key: string): boolean {
        const entry = this.cache.get(key);
        if (!entry) {
            return false;
        }

        // 检查是否过期
        if (Date.now() - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            return false;
        }

        return true;
    }

    /**
     * 获取缓存统计信息
     */
    getStats(): CacheStats {
        const hitRate = this.stats.hits + this.stats.misses > 0
            ? this.stats.hits / (this.stats.hits + this.stats.misses)
            : 0;

        return {
            hits: this.stats.hits,
            misses: this.stats.misses,
            hitRate,
            size: this.cache.size,
            evictions: this.stats.evictions,
        };
    }

    /**
     * 获取所有缓存键
     */
    keys(): string[] {
        return Array.from(this.cache.keys());
    }

    /**
     * 获取缓存大小
     */
    size(): number {
        return this.cache.size;
    }

    /**
     * 淘汰缓存条目
     */
    private evict(): void {
        if (!this.config.enableLRU) {
            // 简单淘汰：删除第一个
            const firstKey = this.cache.keys().next().value;
            if (firstKey) {
                this.cache.delete(firstKey);
                this.stats.evictions++;
            }
            return;
        }

        // LRU 淘汰：删除最少访问的条目
        let leastAccessedKey: string | null = null;
        let leastAccessedTime = Infinity;

        for (const [key, entry] of this.cache.entries()) {
            if (entry.lastAccessTime < leastAccessedTime) {
                leastAccessedTime = entry.lastAccessTime;
                leastAccessedKey = key;
            }
        }

        if (leastAccessedKey) {
            this.cache.delete(leastAccessedKey);
            this.stats.evictions++;
        }
    }

    /**
     * 清理过期缓存
     */
    cleanup(): number {
        let cleanedCount = 0;
        const now = Date.now();

        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > entry.ttl) {
                this.cache.delete(key);
                cleanedCount++;
            }
        }

        return cleanedCount;
    }

    /**
     * 定期清理（建议每 5 分钟调用一次）
     */
    startPeriodicCleanup(intervalMs: number = 5 * 60 * 1000): void {
        setInterval(() => {
            const cleaned = this.cleanup();
            if (cleaned > 0) {
                console.log(`[ImageRecognitionCache] 清理了 ${cleaned} 个过期缓存条目`);
            }
        }, intervalMs);
    }
}

/**
 * 图像数据缓存
 * 专门用于缓存图像 Buffer 数据
 */
export class ImageBufferCache extends ImageRecognitionCache {
    private maxMemoryUsage: number; // 最大内存使用（字节）
    private currentMemoryUsage: number = 0;

    constructor(maxMemoryMB: number = 100, config?: Partial<CacheConfig>) {
        super(config);
        this.maxMemoryUsage = maxMemoryMB * 1024 * 1024; // 转换为字节
    }

    /**
     * 设置图像缓存
     */
    set(key: string, buffer: Buffer, ttl?: number): void {
        const memoryNeeded = buffer.length;

        // 如果单个图像就超过限制，拒绝缓存
        if (memoryNeeded > this.maxMemoryUsage) {
            console.warn(`[ImageBufferCache] 图像过大 (${memoryNeeded} 字节)，拒绝缓存`);
            return;
        }

        // 检查内存使用
        while (this.currentMemoryUsage + memoryNeeded > this.maxMemoryUsage) {
            if (!this.evictOldest()) {
                break;
            }
        }

        super.set(key, buffer, ttl);
        this.currentMemoryUsage += memoryNeeded;
    }

    /**
     * 获取图像缓存
     */
    get(key: string): Buffer | null {
        const buffer = super.get<Buffer>(key);
        if (buffer) {
            return Buffer.from(buffer); // 返回副本，避免修改原始数据
        }
        return null;
    }

    /**
     * 删除缓存
     */
    delete(key: string): boolean {
        const entry = (this.cache as any).get(key) as CacheEntry<Buffer> | undefined;
        if (entry) {
            this.currentMemoryUsage -= entry.data.length;
        }
        return super.delete(key);
    }

    /**
     * 清空缓存
     */
    clear(): void {
        super.clear();
        this.currentMemoryUsage = 0;
    }

    /**
     * 获取当前内存使用
     */
    getMemoryUsage(): number {
        return this.currentMemoryUsage;
    }

    /**
     * 获取内存使用率
     */
    getMemoryUsagePercent(): number {
        return (this.currentMemoryUsage / this.maxMemoryUsage) * 100;
    }

    /**
     * 淘汰最旧的条目
     */
    private evictOldest(): boolean {
        let oldestKey: string | null = null;
        let oldestTime = Infinity;

        for (const [key, entry] of this.cache.entries()) {
            if (entry.timestamp < oldestTime) {
                oldestTime = entry.timestamp;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.delete(oldestKey);
            return true;
        }

        return false;
    }
}

/**
 * 单例缓存实例
 */
export const defaultImageCache = new ImageRecognitionCache({
    maxEntries: 1000,
    defaultTTL: 5 * 60 * 1000, // 5 分钟
    enableLRU: true,
    enableStats: true,
});

export const defaultImageBufferCache = new ImageBufferCache(100, { // 100MB
    maxEntries: 500,
    defaultTTL: 2 * 60 * 1000, // 2 分钟
    enableLRU: true,
    enableStats: true,
});
