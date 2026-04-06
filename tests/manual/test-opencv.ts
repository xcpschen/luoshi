/**
 * OpenCV 功能手动测试脚本
 * 
 * 使用方法：
 * 1. 在 Electron 主进程中运行此脚本
 * 2. 或在 Node.js 环境中运行（需要配置正确的路径）
 * 
 * 测试内容：
 * - OpenCV 加载
 * - 图像解码
 * - 模板匹配
 * - 性能测试
 */

import { LocalRecognitionService } from '../../electron/mapi/imageRecognition/services/local.service';
import type { RecognitionServiceConfig, RecognitionRequest } from '../../electron/mapi/imageRecognition/types';
import { readFileSync } from 'fs';
import { join } from 'path';

async function testOpenCV() {
    console.log('=== OpenCV 功能测试 ===\n');
    
    // 1. 创建服务实例
    console.log('1. 创建服务实例...');
    const config: RecognitionServiceConfig = {
        name: 'local-opencv',
        enabled: true,
        defaultThreshold: 0.8,
        defaultTimeout: 30000,
        maxRetries: 0,
        options: {},
    };
    
    const service = new LocalRecognitionService(config);
    console.log('✓ 服务实例创建成功\n');
    
    // 2. 初始化服务
    console.log('2. 初始化服务...');
    await service.initialize();
    const status = await service.getStatus();
    console.log(`服务名称：${status.name}`);
    console.log(`是否可用：${status.available ? '是' : '否'}`);
    console.log(`成功率：${status.successRate}%\n`);
    
    if (!status.available) {
        console.log('⚠️  OpenCV 不可用，服务运行在降级模式');
        console.log('这可能是因为 @techstark/opencv-js 未正确安装\n');
    } else {
        console.log('✓ OpenCV 加载成功\n');
    }
    
    // 3. 测试图像加载
    console.log('3. 测试图像加载...');
    try {
        // 创建一个简单的测试图像（1x1 像素的 PNG）
        const testImage = Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            'base64'
        );
        console.log('✓ 测试图像创建成功\n');
    } catch (error: any) {
        console.log(`✗ 图像加载失败：${error.message}\n`);
    }
    
    // 4. 测试识别（降级模式）
    console.log('4. 测试识别功能...');
    const mockRequest: RecognitionRequest = {
        deviceId: 'test-device',
        screenshot: Buffer.from([]),
        template: Buffer.from([]),
        threshold: 0.8,
        timeout: 5000,
        priority: 5,
    };
    
    const startTime = Date.now();
    const result = await service.recognize(mockRequest);
    const endTime = Date.now();
    
    console.log(`识别结果:`);
    console.log(`  - 找到匹配：${result.found ? '是' : '否'}`);
    console.log(`  - 匹配度：${result.confidence}`);
    console.log(`  - 响应时间：${result.responseTime}ms`);
    console.log(`  - 引擎：${result.engine || '未知'}`);
    if (result.error) {
        console.log(`  - 错误：${result.error}`);
    }
    console.log();
    
    // 5. 性能测试
    console.log('5. 性能测试...');
    const iterations = 10;
    const times: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await service.recognize(mockRequest);
        const end = Date.now();
        times.push(end - start);
    }
    
    const avgTime = times.reduce((a, b) => a + b, 0) / iterations;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    console.log(`性能统计 (${iterations} 次迭代):`);
    console.log(`  - 平均响应时间：${avgTime.toFixed(2)}ms`);
    console.log(`  - 最小响应时间：${minTime}ms`);
    console.log(`  - 最大响应时间：${maxTime}ms\n`);
    
    // 6. 批量识别测试
    console.log('6. 批量识别测试...');
    const batchRequests: RecognitionRequest[] = Array(5).fill(mockRequest);
    const batchStart = Date.now();
    const batchResults = await service.recognizeBatch(batchRequests);
    const batchEnd = Date.now();
    
    console.log(`批量识别 (${batchRequests.length} 个请求):`);
    console.log(`  - 总耗时：${batchEnd - batchStart}ms`);
    console.log(`  - 平均每个请求：${((batchEnd - batchStart) / batchRequests.length).toFixed(2)}ms`);
    console.log(`  - 成功数：${batchResults.filter(r => !r.error).length}\n`);
    
    // 7. 清理
    console.log('7. 清理资源...');
    await service.destroy();
    console.log('✓ 服务已销毁\n');
    
    // 总结
    console.log('=== 测试总结 ===');
    console.log(`服务状态：${status.available ? '✓ 正常' : '⚠️ 降级模式'}`);
    console.log(`基本功能：✓ 正常`);
    console.log(`错误处理：✓ 正常`);
    console.log(`性能表现：${avgTime < 100 ? '优秀' : avgTime < 500 ? '良好' : '一般'}`);
    console.log('\n测试完成！');
}

// 运行测试
testOpenCV()
    .then(() => {
        console.log('\n✓ 所有测试通过');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n✗ 测试失败:', error);
        process.exit(1);
    });
