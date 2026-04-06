/**
 * OpenCV 快速测试脚本
 * 用于验证 OpenCV 是否正确安装和加载
 */

async function testOpenCV() {
    console.log('=== OpenCV 快速测试 ===\n');
    
    // 1. 测试模块导入
    console.log('1. 测试模块导入...');
    try {
        const opencv = await import('@techstark/opencv-js');
        console.log('✓ 模块导入成功');
        console.log('  导出内容:', Object.keys(opencv).join(', '));
    } catch (error: any) {
        console.log('✗ 模块导入失败:', error.message);
        console.log('\n说明：@techstark/opencv-js 未正确安装');
        console.log('建议运行：npm install @techstark/opencv-js@^4.10.0-20241015\n');
        return false;
    }
    
    // 2. 测试服务创建
    console.log('2. 测试服务创建...');
    try {
        const { LocalRecognitionService } = await import('../electron/mapi/imageRecognition/services/local.service');
        const service = new LocalRecognitionService({
            name: 'local-opencv',
            enabled: true,
            defaultThreshold: 0.8,
            defaultTimeout: 30000,
            maxRetries: 0,
            options: {},
        });
        console.log('✓ 服务创建成功');
        console.log('  服务名称:', service.name);
    } catch (error: any) {
        console.log('✗ 服务创建失败:', error.message);
        return false;
    }
    
    console.log('\n=== 测试完成 ===');
    console.log('✓ 所有检查通过\n');
    return true;
}

// 运行测试
testOpenCV()
    .then(success => {
        if (success) {
            console.log('OpenCV 已正确安装并可以使用！');
        } else {
            console.log('OpenCV 存在问题，请检查安装。');
        }
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('测试执行失败:', error);
        process.exit(1);
    });
