// 在浏览器控制台中运行此脚本诊断问题

console.log('=== 集群配置诊断工具 ===\n');

// 1. 检查 API 是否可用
console.log('1. 检查 clusterConfig API:');
console.log('window.$mapi.clusterConfig:', window.$mapi.clusterConfig);

// 2. 测试获取配置
console.log('\n2. 测试获取配置:');
window.$mapi.clusterConfig.get()
    .then(config => {
        console.log('✅ 获取配置成功:', config);
        console.log('工作节点数量:', config.workers.length);
        console.log('协调器数量:', config.coordinators.length);
        console.log('负载均衡器数量:', config.loadBalancers.length);
    })
    .catch(error => {
        console.error('❌ 获取配置失败:', error);
    });

// 3. 测试添加节点
console.log('\n3. 测试添加节点:');
const testNode = {
    id: crypto.randomUUID(),
    name: 'Test Node ' + Date.now(),
    role: 'worker',
    host: '127.0.0.1',
    port: 8080,
    enabled: true,
    gpuCount: 1
};
console.log('测试节点数据:', testNode);

window.$mapi.clusterConfig.addNode(testNode)
    .then(success => {
        if (success) {
            console.log('✅ 添加节点成功!');
            // 验证添加
            return window.$mapi.clusterConfig.get();
        } else {
            console.error('❌ 添加节点失败：返回 false');
            return null;
        }
    })
    .then(config => {
        if (config) {
            const addedNode = config.workers.find(w => w.id === testNode.id);
            if (addedNode) {
                console.log('✅ 验证成功：节点已保存到数据库');
                console.log('保存的节点:', addedNode);
            } else {
                console.error('❌ 验证失败：节点未出现在配置中');
            }
        }
    })
    .catch(error => {
        console.error('❌ 添加节点异常:', error);
        console.error('错误堆栈:', error.stack);
    });

// 4. 检查数据库连接
console.log('\n4. 检查数据库:');
window.$mapi.db.exec('SELECT name FROM sqlite_master WHERE type="table" AND name="server_node"')
    .then(result => {
        if (result && result.length > 0) {
            console.log('✅ server_node 表存在');
        } else {
            console.error('❌ server_node 表不存在');
        }
    })
    .catch(error => {
        console.error('❌ 数据库检查失败:', error);
    });

console.log('\n=== 诊断完成 ===');
