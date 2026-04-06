# OpenCV 测试使用指南

## 快速测试

### 方法 1：简单测试（推荐）

```bash
# 运行快速测试，验证 OpenCV 是否正确安装
npm run test:opencv:simple
```

**预期输出**：
```
=== OpenCV 快速测试 ===

1. 测试模块导入...
✓ 模块导入成功
  导出内容：cv, default, ...
2. 测试服务创建...
✓ 服务创建成功
  服务名称：local-opencv

=== 测试完成 ===
✓ 所有检查通过

OpenCV 已正确安装并可以使用！
```

### 方法 2：详细测试

```bash
# 运行完整的 OpenCV 功能测试
npm run test:opencv
```

**测试内容**：
- OpenCV 加载状态
- 图像解码能力
- 模板匹配功能
- 性能测试
- 批量识别测试

### 方法 3：单元测试

```bash
# 运行所有单元测试
npm run test:unit

# 或只运行 OpenCV 相关测试
npm run test -- tests/unit/LocalRecognition.test.ts
```

## 安装测试依赖

如果测试命令失败，请先安装依赖：

```bash
# 安装测试框架
npm install --save-dev vitest tsx @types/node

# 安装 OpenCV
npm install @techstark/opencv-js@^4.10.0-20241015
```

## 测试结果解读

### ✅ 成功（OpenCV 可用）

```
✓ 模块导入成功
✓ 服务创建成功
OpenCV 已正确安装并可以使用！
```

**说明**：OpenCV 已正确安装，可以正常使用图像识别功能。

### ⚠️ 降级模式（OpenCV 不可用）

```
✗ 模块导入失败：Cannot find module '@techstark/opencv-js'
说明：@techstark/opencv-js 未正确安装
```

**说明**：OpenCV 未安装，但服务仍可运行（降级模式，总是返回"未找到匹配"）。

**解决方案**：
```bash
# 重新安装 OpenCV
npm install @techstark/opencv-js@^4.10.0-20241015

# 验证安装
ls -la node_modules/@techstark/opencv-js/

# 重新运行测试
npm run test:opencv:simple
```

## 常见问题

### Q: 测试命令找不到 (tsx not found)
**A**: 确保已安装 tsx：
```bash
npm install --save-dev tsx
```

### Q: 模块导入失败
**A**: OpenCV 未正确安装：
```bash
# 清理并重装
rm -rf node_modules/@techstark/opencv-js
npm install @techstark/opencv-js@^4.10.0-20241015
```

### Q: 测试卡住或很慢
**A**: OpenCV 初始化可能需要时间，这是正常的。如果超过 30 秒，可能是网络或磁盘问题。

### Q: 单元测试失败
**A**: 确保已安装 vitest：
```bash
npm install --save-dev vitest
```

## 在应用中使用

测试通过后，可以在应用中使用图像识别功能：

1. **启动应用**
   ```bash
   npm run dev
   ```

2. **打开设置**
   - 导航到 设置 → 图像识别设置

3. **配置服务**
   - 启用图像识别：ON
   - 识别服务类型：本地 OpenCV
   - 保存配置

4. **观察日志**
   ```
   [LocalRecognition] OpenCV initialized  ← 成功加载
   ```

## 性能参考

### 降级模式（无 OpenCV）
- 响应时间：< 10ms
- 功能：总是返回"未找到匹配"
- 用途：开发和测试

### OpenCV 模式
- 响应时间：50-500ms（取决于图像大小）
- 准确率：> 95%
- 用途：生产环境

## 相关文件

- 简单测试脚本：`scripts/test-opencv-simple.ts`
- 详细测试脚本：`tests/manual/test-opencv.ts`
- 单元测试：`tests/unit/LocalRecognition.test.ts`
- 服务实现：`electron/mapi/imageRecognition/services/local.service.ts`

## 下一步

测试通过后，可以：

1. ✅ 在设置页面启用图像识别
2. ✅ 使用真实的截图和模板进行测试
3. ✅ 调整阈值优化识别效果
4. ✅ 考虑使用远程 Worker 集群提升性能
