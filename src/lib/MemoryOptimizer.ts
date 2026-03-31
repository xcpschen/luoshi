/**
 * 内存使用优化器
 * 监控和优化内存使用，防止内存泄漏
 */

import { EventEmitter } from 'events';

/**
 * 内存统计信息
 */
export interface MemoryStats {
    /** 已分配内存（MB） */
    heapUsed: number;
    /** 总内存（MB） */
    heapTotal: number;
    /** 外部内存（MB） */
    external: number;
    /** RSS 内存（MB） */
    rss: number;
    /** 内存使用率 */
    usagePercent: number;
    /** 垃圾回收次数 */
    gcCount: number;
    /** 垃圾回收总耗时（ms） */
    gcTime: number;
}

/**
 * 内存配置
 */
export interface MemoryConfig {
    /** 内存警告阈值（百分比） */
    warningThreshold: number;
    /** 内存严重警告阈值（百分比） */
    criticalThreshold: number;
    /** 自动垃圾回收间隔（毫秒） */
    autoGCInterval: number;
    /** 是否启用自动垃圾回收 */
    enableAutoGC: boolean;
    /** 最大内存限制（MB） */
    maxMemory: number;
}

/**
 * 内存使用优化器
 */
export class MemoryOptimizer extends EventEmitter {
    private config: MemoryConfig;
    private gcCount: number = 0;
    private gcTotalTime: number = 0;
    private monitoringInterval?: NodeJS.Timeout;
    private lastWarningTime: number = 0;
    private readonly WARNING_COOLDOWN = 60000; // 警告冷却时间 1 分钟

    constructor(config: Partial<MemoryConfig> = {}) {
        super();
        this.config = {
            warningThreshold: config.warningThreshold || 70,
            criticalThreshold: config.criticalThreshold || 85,
            autoGCInterval: config.autoGCInterval || 5 * 60 * 1000, // 5 分钟
            enableAutoGC: config.enableAutoGC !== false,
            maxMemory: config.maxMemory || 2048, // 默认 2GB
        };
    }

    /**
     * 获取当前内存统计
     */
    getMemoryStats(): MemoryStats {
        const memoryUsage = process.memoryUsage();
        
        return {
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100,
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100,
            external: Math.round(memoryUsage.external / 1024 / 1024 * 100) / 100,
            rss: Math.round(memoryUsage.rss / 1024 / 1024 * 100) / 100,
            usagePercent: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 10000) / 100,
            gcCount: this.gcCount,
            gcTime: this.gcTotalTime,
        };
    }

    /**
     * 开始内存监控
     */
    startMonitoring(): void {
        console.log('[MemoryOptimizer] 开始内存监控...');

        // 定期检查内存使用
        this.monitoringInterval = setInterval(() => {
            this.checkMemoryUsage();
        }, 10000); // 每 10 秒检查一次

        // 自动垃圾回收
        if (this.config.enableAutoGC) {
            this.startAutoGC();
        }
    }

    /**
     * 停止内存监控
     */
    stopMonitoring(): void {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = undefined;
        }
        console.log('[MemoryOptimizer] 停止内存监控');
    }

    /**
     * 手动触发垃圾回收
     */
    triggerGC(): void {
        if (global.gc) {
            const startTime = Date.now();
            global.gc();
            const gcTime = Date.now() - startTime;
            
            this.gcCount++;
            this.gcTotalTime += gcTime;
            
            console.log(`[MemoryOptimizer] 垃圾回收完成，耗时：${gcTime}ms`);
            this.emit('gc', { gcTime, gcCount: this.gcCount });
        } else {
            console.warn('[MemoryOptimizer] 垃圾回收不可用，请使用 --expose-gc 参数启动 Node.js');
        }
    }

    /**
     * 检查内存使用
     */
    private checkMemoryUsage(): void {
        const stats = this.getMemoryStats();
        const now = Date.now();

        // 防止过于频繁的警告
        if (now - this.lastWarningTime < this.WARNING_COOLDOWN) {
            return;
        }

        // 严重警告
        if (stats.usagePercent >= this.config.criticalThreshold) {
            console.error(
                `[MemoryOptimizer] ⚠️  严重警告：内存使用率 ${stats.usagePercent}% ` +
                `(已使用 ${stats.heapUsed}MB / 总计 ${stats.heapTotal}MB)`
            );
            
            this.emit('critical', stats);
            this.lastWarningTime = now;
            
            // 立即触发垃圾回收
            this.triggerGC();
        }
        // 普通警告
        else if (stats.usagePercent >= this.config.warningThreshold) {
            console.warn(
                `[MemoryOptimizer] ⚠️  警告：内存使用率 ${stats.usagePercent}% ` +
                `(已使用 ${stats.heapUsed}MB / 总计 ${stats.heapTotal}MB)`
            );
            
            this.emit('warning', stats);
            this.lastWarningTime = now;
        }
    }

    /**
     * 启动自动垃圾回收
     */
    private startAutoGC(): void {
        setInterval(() => {
            const stats = this.getMemoryStats();
            
            // 如果内存使用率超过阈值，触发垃圾回收
            if (stats.usagePercent >= this.config.warningThreshold) {
                this.triggerGC();
            }
        }, this.config.autoGCInterval);
    }

    /**
     * 获取内存使用趋势
     */
    getMemoryTrend(windowMs: number = 60000): {
        current: number;
        average: number;
        min: number;
        max: number;
    } {
        // 这里可以扩展为记录历史数据
        const current = this.getMemoryStats().usagePercent;
        
        return {
            current,
            average: current,
            min: current,
            max: current,
        };
    }

    /**
     * 优化建议
     */
    getOptimizationSuggestions(): string[] {
        const suggestions: string[] = [];
        const stats = this.getMemoryStats();

        if (stats.usagePercent >= this.config.criticalThreshold) {
            suggestions.push('内存使用率严重超标，建议：');
            suggestions.push('  - 立即减少并发任务数');
            suggestions.push('  - 检查是否有内存泄漏');
            suggestions.push('  - 增加最大内存限制');
        } else if (stats.usagePercent >= this.config.warningThreshold) {
            suggestions.push('内存使用率偏高，建议：');
            suggestions.push('  - 监控内存使用趋势');
            suggestions.push('  - 优化图像缓存策略');
            suggestions.push('  - 减少不必要的对象创建');
        }

        if (stats.gcTime > 1000) {
            suggestions.push('垃圾回收耗时过长，建议：');
            suggestions.push('  - 减少单次处理的图像数量');
            suggestions.push('  - 使用流式处理代替批量处理');
        }

        return suggestions;
    }
}

/**
 * 图像缓存清理器
 * 定期清理图像缓存，释放内存
 */
export class ImageCacheCleaner {
    private cleanInterval?: NodeJS.Timeout;
    private cleanCallbacks: Array<() => number> = [];

    /**
     * 注册清理回调
     */
    registerCleaner(callback: () => number): void {
        this.cleanCallbacks.push(callback);
    }

    /**
     * 启动定期清理
     */
    startCleaning(intervalMs: number = 2 * 60 * 1000): void {
        console.log('[ImageCacheCleaner] 启动定期清理...');
        
        this.cleanInterval = setInterval(() => {
            let totalCleaned = 0;
            
            this.cleanCallbacks.forEach(callback => {
                try {
                    const cleaned = callback();
                    totalCleaned += cleaned;
                } catch (error) {
                    console.error('[ImageCacheCleaner] 清理失败:', error);
                }
            });

            if (totalCleaned > 0) {
                console.log(`[ImageCacheCleaner] 清理完成，共清理 ${totalCleaned} 个缓存`);
            }
        }, intervalMs);
    }

    /**
     * 停止清理
     */
    stopCleaning(): void {
        if (this.cleanInterval) {
            clearInterval(this.cleanInterval);
            this.cleanInterval = undefined;
        }
        console.log('[ImageCacheCleaner] 停止清理');
    }

    /**
     * 立即清理
     */
    cleanNow(): number {
        let totalCleaned = 0;
        
        this.cleanCallbacks.forEach(callback => {
            try {
                const cleaned = callback();
                totalCleaned += cleaned;
            } catch (error) {
                console.error('[ImageCacheCleaner] 清理失败:', error);
            }
        });

        return totalCleaned;
    }
}

/**
 * 单例内存优化器
 */
export const defaultMemoryOptimizer = new MemoryOptimizer({
    warningThreshold: 70,
    criticalThreshold: 85,
    autoGCInterval: 5 * 60 * 1000,
    enableAutoGC: true,
    maxMemory: 2048,
});

export const defaultImageCacheCleaner = new ImageCacheCleaner();
