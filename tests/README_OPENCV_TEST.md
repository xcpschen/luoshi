# OpenCV 测试指南

## 概述

本文档说明如何测试本地 OpenCV 图像识别服务是否正常工作。

## 测试方法

### 方法 1：运行单元测试

```bash
# 运行所有单元测试
npm run test:unit

# 或单独运行 OpenCV 测试
npm run test -- tests/unit/LocalRecognition.test.ts
```

**测试内容**：
- ✅ 服务初始化
- ✅ 降级模式（OpenCV 不可用时）
- ✅ 识别功能
- ✅ 批量识别
- ✅ 错误处理
- ✅ 配置管理
- ✅ 生命周期管理

### 方法 2：运行手动测试脚本

```bash
# 运行 OpenCV 功能测试
npm run test:opencv
```

**测试内容**：
- ✅ OpenCV 加载状态
- ✅ 图像解码能力
- ✅ 模板匹配功能
- ✅ 性能测试（10 次迭代）
- ✅ 批量识别性能
- ✅ 资源清理

**预期输出**：

```
=== OpenCV 功能测试 ===

1. 创建服务实例...
✓ 服务实例创建成功

2. 初始化服务...
服务名称：local-opencv
是否可用：是/否
成功率：100%

3. 测试图像加载...
✓ 测试图像创建成功

4. 测试识别功能...
识别结果:
  - 找到匹配：否
  - 匹配度：0
  - 响应时间：XXms
  - 引擎：local-opencv

5. 性能测试...
性能统计 (10 次迭代):
  - 平均响应时间：XX.XXms
  - 最小响应时间：Xms
  - 最大响应时间：Xms

6. 批量识别测试...
批量识别 (5 个请求):
  - 总耗时：XXms
  - 平均每个请求：XX.XXms
  - 成功数：5

7. 清理资源...
✓ 服务已销毁

=== 测试总结 ===
服务状态：✓ 正常 / ⚠️ 降级模式
基本功能：✓ 正常
错误处理：✓ 正常
性能表现：优秀/良好/一般

测试完成！
✓ 所有测试通过
```

### 方法 3：在应用中测试

1. **启动应用**
   ```bash
   npm run dev
   ```

2. **打开设置页面**
   - 导航到 设置 → 图像识别设置

3. **配置本地 OpenCV**
   - 启用图像识别：ON
   - 识别服务类型：本地 OpenCV
   - 调整阈值：0.8
   - 超时时间：30000ms

4. **保存配置**
   - 点击"保存"按钮
   - 确认重启服务

5. **观察日志**
   ```
   [LocalRecognition] OpenCV initialized  ← 成功加载
   或
   [LocalRecognition] OpenCV not available, using fallback mode  ← 降级模式
   ```

## 测试结果解读

### OpenCV 可用（✓ 正常）

```
服务状态：✓ 正常
是否可用：是
性能表现：优秀/良好
```

**说明**：OpenCV 已正确安装并可以正常使用。

### OpenCV 不可用（⚠️ 降级模式）

```
服务状态：⚠️ 降级模式
是否可用：否
```

**说明**：OpenCV 未正确安装，但服务仍然可以运行（使用降级模式）。

**解决方案**：
```bash
# 1. 清理并重新安装
rm -rf node_modules/@techstark/opencv-js
npm install @techstark/opencv-js@^4.10.0-20241015

# 2. 验证安装
ls -la node_modules/@techstark/opencv-js/

# 3. 重新运行测试
npm run test:opencv
```

## 性能基准

### 降级模式（无 OpenCV）
- 平均响应时间：< 10ms
- 成功率：100%（总是返回"未找到"）

### OpenCV 模式
- 平均响应时间：< 500ms
- 成功率：> 95%
- 批量识别效率：比串行快 30%

## 常见问题

### Q1: 测试失败 "Cannot find module '@techstark/opencv-js'"
**A**: OpenCV 未安装。运行：
```bash
npm install @techstark/opencv-js@^4.10.0-20241015
```

### Q2: 服务初始化卡住
**A**: OpenCV 加载可能很慢。检查：
- 网络连接（如果需要下载）
- 磁盘空间
- 内存使用

### Q3: 性能测试响应时间很长
**A**: 可能是：
- CPU 负载过高
- 内存不足
- OpenCV 初始化中

### Q4: 单元测试失败
**A**: 确保安装了测试依赖：
```bash
npm install --save-dev vitest tsx
```

## 下一步

测试通过后，可以：

1. **启用图像识别服务**
   - 在设置页面启用
   - 选择"本地 OpenCV"

2. **实际场景测试**
   - 使用真实的设备截图
   - 使用真实的模板图像
   - 测试识别准确率

3. **性能优化**
   - 调整阈值
   - 调整超时时间
   - 考虑使用远程 Worker 集群

## 相关文件

- 测试文件：`tests/unit/LocalRecognition.test.ts`
- 手动测试：`tests/manual/test-opencv.ts`
- 服务实现：`electron/mapi/imageRecognition/services/local.service.ts`
- 类型定义：`electron/mapi/imageRecognition/types.ts`
