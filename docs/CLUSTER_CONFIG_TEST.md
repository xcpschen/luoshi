# 集群配置功能测试指南

## 问题诊断

### 已修复的问题

1. **IPC 通信桥接缺失**
   - **问题**: 前端调用 `window.$mapi.clusterConfig.addNode` 时找不到方法
   - **原因**: 缺少 render 进程桥接层
   - **修复**: 创建了 `electron/mapi/clusterConfig/render.ts`
   - **文件**: 
     - `electron/mapi/clusterConfig/render.ts` - 新增
     - `electron/mapi/render.ts` - 注册 clusterConfig 模块

2. **TypeScript 类型错误**
   - **问题**: `init(env: typeof AppEnv = null)` 类型不匹配
   - **修复**: 改为 `init(env: typeof AppEnv | null = null)`

## 测试步骤

### 1. 访问设置页面
```
1. 打开应用 http://localhost:5173/
2. 点击左侧导航栏 "设置"
3. 点击 "集群配置"
```

### 2. 测试添加工作节点

```
1. 选择"分布式部署"或"集群部署"模式
2. 点击"+ 添加节点"按钮
3. 填写节点信息:
   - 节点名称：Test Worker 1
   - 主机地址：192.168.1.100
   - 端口：8080
   - GPU 数量：4
   - 启用：☑ 勾选
4. 点击"确定"
```

**预期结果**:
- ✅ 显示成功提示："Node added"
- ✅ 节点出现在列表中
- ✅ 显示节点信息卡片

### 3. 验证数据库存储

在开发者工具的控制台中执行：
```javascript
const result = await window.$mapi.clusterConfig.get();
console.log('Cluster Config:', result);
console.log('Workers:', result.workers);
```

**预期输出**:
```javascript
Workers: [
  {
    id: "uuid-xxx",
    name: "Test Worker 1",
    role: "worker",
    host: "192.168.1.100",
    port: 8080,
    gpuCount: 4,
    enabled: true
  }
]
```

### 4. 测试编辑节点

```
1. 点击节点卡片上的"编辑"按钮
2. 修改节点名称为：Test Worker 1 (Edited)
3. 点击"确定"
```

**预期结果**:
- ✅ 显示成功提示："Node updated"
- ✅ 列表中显示更新后的名称

### 5. 测试连接测试

```
1. 点击节点卡片上的"测试连接"按钮
2. 等待结果
```

**预期结果**:
- ❌ 失败（因为节点不存在）：显示 "连接失败：Connection refused"
- 或
- ✅ 成功（如果节点真实存在）：显示 "连接成功，响应时间：XXms"

### 6. 测试删除节点

```
1. 点击节点卡片上的"删除"按钮
2. 确认删除
```

**预期结果**:
- ✅ 显示成功提示："Node deleted"
- ✅ 节点从列表消失

## 常见问题排查

### 问题 1: 点击"添加节点"无反应

**检查步骤**:
1. 打开浏览器开发者工具 (F12)
2. 查看 Console 标签页
3. 查找错误信息

**可能原因**:
- `window.$mapi.clusterConfig` 未定义
- IPC 处理器未注册

**解决方案**:
```javascript
// 在控制台检查
console.log(window.$mapi.clusterConfig);
// 应该输出对象，包含 addNode, updateNode 等方法
```

### 问题 2: 提示"Failed to save node"

**检查步骤**:
1. 查看 Electron 主进程日志
2. 检查数据库是否正常创建

**可能原因**:
- 数据库迁移未执行
- SQLite 表未创建

**解决方案**:
```javascript
// 在控制台检查数据库版本
const result = await window.$mapi.db.exec(`
  SELECT name FROM sqlite_master 
  WHERE type='table' AND name='server_node'
`);
console.log('Table exists:', result);
// 应该输出：[{ name: 'server_node' }]
```

### 问题 3: 节点保存后刷新消失

**检查步骤**:
1. 确认保存成功
2. 重启应用后检查

**可能原因**:
- 配置未正确保存到数据库
- 加载配置时未读取节点

**解决方案**:
```javascript
// 手动加载配置检查
const config = await window.$mapi.clusterConfig.get();
console.log('Config:', config);
```

## 调试命令

### 在控制台执行测试

```javascript
// 1. 获取当前配置
const config = await window.$mapi.clusterConfig.get();
console.log('Current config:', config);

// 2. 添加测试节点
const testNode = {
    id: crypto.randomUUID(),
    name: 'Test Node',
    role: 'worker',
    host: '127.0.0.1',
    port: 8080,
    enabled: true,
    gpuCount: 2
};
await window.$mapi.clusterConfig.addNode(testNode);

// 3. 验证添加
const config2 = await window.$mapi.clusterConfig.get();
console.log('Workers after add:', config2.workers);

// 4. 删除测试节点
await window.$mapi.clusterConfig.deleteNode(testNode.id);

// 5. 验证删除
const config3 = await window.$mapi.clusterConfig.get();
console.log('Workers after delete:', config3.workers);
```

## 数据库检查

### 使用 SQLite 客户端检查

```bash
# 找到数据库文件位置
cd ~/Library/Application Support/easylinkandroid/

# 使用 sqlite3 查看
sqlite3 app.db ".tables"
sqlite3 app.db "SELECT * FROM server_node;"
sqlite3 app.db "SELECT * FROM cluster_config;"
```

### 预期数据库内容

```sql
-- server_node 表应该有数据
SELECT * FROM server_node;
-- id | name | role | host | port | enabled | config_json | created_at | updated_at

-- cluster_config 表应该有配置
SELECT * FROM cluster_config;
-- config_key | config_value | updated_at
```

## 成功标志

✅ 所有测试通过后，您应该看到：
- 可以添加、编辑、删除节点
- 节点数据持久化到数据库
- 重启应用后数据不丢失
- 配置界面根据部署模式正确显示/隐藏

## 下一步

测试通过后，继续实现：
1. 节点状态实时监控
2. WebSocket 通信
3. 任务调度系统
4. 负载均衡器配置
