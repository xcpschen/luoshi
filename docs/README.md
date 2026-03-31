# 项目文档索引

本文档索引包含了项目的所有技术文档，按功能和模块分类。

---

## 📋 设备管理功能

### 网络设备导入功能
- [导入功能完整说明](./IMPORT_FEATURE_COMPLETE.md) - 网络设备导入功能的完整使用说明
- [导入功能使用指南](./IMPORT_FEATURE_GUIDE.md) - 快速上手指南
- [导入对话框 UI 设计](./IMPORT_DIALOG_UI.md) - 界面布局和设计规范
- [导入对话框最终布局](./IMPORT_DIALOG_LAYOUT_FINAL.md) - 最终界面布局说明
- [导入功能调试说明](./TEST_IMPORT_DEBUG.md) - 调试和测试指南

### 设备管理核心功能
- [设备管理完整功能](./DEVICE_MANAGE_COMPLETE_FEATURES.md) - 设备管理页面完整功能说明
- [设备管理功能增强](./DEVICE_MANAGE_FEATURES_ENHANCEMENT.md) - 功能增强设计
- [设备管理实时同步](./DEVICE_MANAGE_REALTIME_SYNC.md) - 设备状态实时同步机制
- [设备管理评估](./DEVICE_MANAGEMENT_EVALUATION.md) - 功能评估报告

### 设备信息管理
- [设备管理字段说明](./DEVICE_MANAGEMENT_FIELDS.md) - 设备信息字段详解
- [设备信息缓存优化](./DEVICE_INFO_CACHE_OPTIMIZATION.md) - 缓存优化策略
- [设备信息降级策略](./DEVICE_INFO_FALLBACK_STRATEGY.md) - 信息获取降级方案
- [设备信息调试](./DEVICE_INFO_DEBUGGING.md) - 调试方法和问题排查
- [设备信息修复](./DEVICE_INFO_FIXES.md) - 常见问题修复

### 设备连接管理
- [设备删除功能](./DEVICE_DELETE_FEATURE.md) - 删除设备和连接功能
- [设备身份标识重构](./DEVICE_IDENTITY_REFACTOR.md) - MAC 地址唯一标识重构

---

## 🏗️ 项目架构

### 整体架构
- [项目架构设计](./PROJECT_ARCHITECTURE.md) - 整体架构说明
- [最终技术文档](./FINAL_TECHNICAL_DOCUMENTATION.md) - 项目技术总结

### IP 地址管理模块
- [IP 架构设计](./IP_ARCHITECTURE.md) - IP 地址管理架构
- [IP 模块使用说明](./IP_MODULE_USAGE.md) - IP 地址模块使用指南

### 集群配置
- [集群配置实现](./CLUSTER_CONFIG_IMPLEMENTATION.md) - 集群配置功能实现
- [集群配置测试](./CLUSTER_CONFIG_TEST.md) - 配置测试报告

---

## 🎯 图像识别

- [图像识别抽象](./IMAGE_RECOGNITION_ABSTRACTION.md) - 图像识别模块抽象设计

---

## ⚡ 性能优化

- [性能优化方案](./PERFORMANCE_OPTIMIZATION.md) - 性能优化策略和实现

---

## 📐 功能设计

- [功能增强设计](./FEATURE_ENHANCEMENT_DESIGN.md) - 功能增强设计方案
- [功能增强设计 V2](./FEATURE_ENHANCEMENT_DESIGN_V2.md) - 第二版设计方案

---

## 📅 开发周报

### 第 89 周
- [第 89 周开发总结](./WEEK89_DEVELOPMENT_SUMMARY.md)

### 第 57 周
- [第 57 周开发计划](./WEEK57_DEVELOPMENT_PLAN.md)
- [第 57 周开发总结](./WEEK57_DEVELOPMENT_SUMMARY.md)

### 第 34 周
- [第 34 周开发总结](./WEEK34_DEVELOPMENT_SUMMARY.md)
- [第 34 周验证报告](./WEEK34_VERIFICATION_REPORT.md)

### 第 2 周
- [第 2 周开发总结](./WEEK2_DEVELOPMENT_SUMMARY.md)
- [第 2 周验证报告](./WEEK2_VERIFICATION_REPORT.md)

### 第 1 周
- [第 1 周开发总结](./WEEK1_DEVELOPMENT_SUMMARY.md)
- [第 1 周验证报告](./WEEK1_VERIFICATION_REPORT.md)

---

## 📊 阶段报告

- [第一阶段完成报告](./PHASE1_COMPLETION_REPORT.md)
- [第二阶段完成报告](./PHASE2_COMPLETION_REPORT.md)

---

## 📚 文档维护

- [文档维护指南](./DOCUMENTATION_GUIDE.md) - 文档管理和维护规范

---

## 📝 文档维护说明

### 新增文档规范

1. **文档命名**：使用英文大写字母和下划线，如 `FEATURE_NAME.md`
2. **文档分类**：根据功能模块放入对应分类
3. **索引更新**：新增文档后，必须更新此索引文件

### 文档结构建议

```markdown
# 文档标题

## 功能概述
简要说明功能或模块的作用

## 技术实现
详细的技术实现说明

## 使用方法
如何使用该功能

## 注意事项
使用中需要注意的问题

## 相关文档
链接到相关文档
```

### 维护责任

- 每次新增文档时，由文档作者负责更新索引
- 索引文件应保持在 docs 目录根路径
- 定期清理过时文档

---

## 🔗 快速链接

- [设备管理功能](#-设备管理功能)
- [项目架构](#-项目架构)
- [图像识别](#-图像识别)
- [性能优化](#-性能优化)
- [功能设计](#-功能设计)
- [开发周报](#-开发周报)
- [阶段报告](#-阶段报告)
- [文档维护](#-文档维护)

---

## 📊 文档统计

- **文档总数**: 41 篇
- **分类数量**: 8 个
- **最后更新**: 2026-03-30

---

**最后更新时间**: 2026-03-30
