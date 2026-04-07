/**
 * 模板缓存类
 * 用于缓存预处理后的图像模板，避免重复加载和预处理
 */
export class TemplateCache {
    private cache = new Map<string, {
        data: Uint8Array;
        lastUsed: number;
        hitCount: number;
    }>();
    
    private maxSize = 100;
    private maxMemoryMB = 50;
    
    /**
     * 获取或加载模板
     */
    async getOrLoad(templatePath: string): Promise<Uint8Array> {
        const cached = this.cache.get(templatePath);
        
        // 缓存命中
        if (cached && Date.now() - cached.lastUsed < 5 * 60 * 1000) {
            cached.lastUsed = Date.now();
            cached.hitCount++;
            return cached.data;
        }
        
        // 缓存未命中，加载模板
        const data = await this.loadTemplate(templatePath);
        
        // 保存到缓存
        this.cache.set(templatePath, {
            data,
            lastUsed: Date.now(),
            hitCount: 0,
        });
        
        // 清理旧缓存
        this.evictIfNeeded();
        
        return data;
    }
    
    /**
     * 加载模板
     */
    private async loadTemplate(templatePath: string): Promise<Uint8Array> {
        const fs = await import('fs');
        const data = fs.readFileSync(templatePath);
        return new Uint8Array(data);
    }
    
    /**
     * 清理缓存
     */
    private evictIfNeeded() {
        if (this.cache.size <= this.maxSize) {
            return;
        }
        
        // 按最后使用时间排序，删除最旧的
        const entries = Array.from(this.cache.entries())
            .sort((a, b) => a[1].lastUsed - b[1].lastUsed);
        
        const toDelete = Math.floor(this.cache.size * 0.2); // 删除 20%
        for (let i = 0; i < toDelete; i++) {
            const [key] = entries[i];
            this.cache.delete(key);
        }
    }
    
    /**
     * 清空缓存
     */
    clear() {
        this.cache.clear();
    }
    
    /**
     * 获取缓存统计
     */
    getStats() {
        return {
            size: this.cache.size,
            totalHits: Array.from(this.cache.values()).reduce((sum, v) => sum + v.hitCount, 0),
        };
    }
}

// 单例
export const templateCache = new TemplateCache();
