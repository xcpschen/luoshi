#!/usr/bin/env node

/**
 * OpenCV 快速验证脚本
 * 不依赖 vitest，直接运行
 */

async function main() {
    console.log('=== OpenCV 快速验证 ===\n');
    
    // 1. 检查模块导入
    console.log('1. 检查 OpenCV 模块...');
    try {
        const opencv = await import('@techstark/opencv-js');
        console.log('   ✓ OpenCV 模块导入成功');
        console.log('   导出内容:', Object.keys(opencv || {}).slice(0, 5).join(', '));
    } catch (error: any) {
        console.log('   ✗ OpenCV 模块导入失败');
        console.log('   错误:', error.message);
        console.log('\n建议：运行 npm install @techstark/opencv-js@^4.10.0-20241015\n');
    }
    
    // 2. 检查类型定义
    console.log('2. 检查类型定义...');
    try {
        const types = await import('../electron/mapi/imageRecognition/types');
        console.log('   ✓ 类型定义存在');
    } catch (error: any) {
        console.log('   ✗ 类型定义导入失败');
    }
    
    // 3. 检查服务实现
    console.log('3. 检查服务实现...');
    try {
        const { LocalRecognitionService } = await import('../electron/mapi/imageRecognition/services/local.service');
        console.log('   ✓ LocalRecognitionService 存在');
        
        // 创建实例
        const service = new LocalRecognitionService({
            name: 'local-opencv',
            enabled: true,
            defaultThreshold: 0.8,
            defaultTimeout: 30000,
            maxRetries: 0,
            options: {},
        });
        console.log('   ✓ 服务实例创建成功');
        console.log('   服务名称:', service.name);
    } catch (error: any) {
        console.log('   ✗ 服务实现检查失败');
        console.log('   错误:', error.message);
    }
    
    // 4. 总结
    console.log('\n=== 验证总结 ===');
    console.log('如果所有检查都通过，OpenCV 已正确安装！');
    console.log('如果有失败项，请根据错误信息修复。\n');
}

main()
    .then(() => {
        console.log('✓ 验证完成');
        process.exit(0);
    })
    .catch(error => {
        console.error('✗ 验证失败:', error);
        process.exit(1);
    });
