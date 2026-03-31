// 测试 clusterConfig 初始化
const { app } = require('electron');
const path = require('path');

// 模拟环境变量
process.env.NODE_ENV = 'development';

app.whenReady().then(async () => {
    console.log('App ready, testing clusterConfig...');
    
    // 导入 MAPI
    const { MAPI } = require('./electron/mapi/main');
    
    try {
        // 初始化
        console.log('Starting MAPI init...');
        await MAPI.init();
        console.log('✅ MAPI init successful!');
        
        // 测试获取配置
        console.log('Testing cluster-config:get...');
        const config = await require('electron').ipcMain.handle('cluster-config:get');
        console.log('Config:', config);
        
        console.log('✅ All tests passed!');
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
    
    app.quit();
});
