# 导入功能调试说明

## 测试步骤

### 1. 打开开发者工具
1. 启动应用
2. 按 `Ctrl+Shift+I` (Windows/Linux) 或 `Cmd+Option+I` (Mac) 打开开发者工具
3. 切换到 Console（控制台）标签

### 2. 测试文件上传
1. 进入"设备管理"页面
2. 点击"导入网络设备"按钮
3. 选择测试文件（CSV 或 Excel）

### 3. 查看控制台输出

选择文件后，应该看到以下日志：

```
[DeviceImport] onFileChange Object {...}
[DeviceImport] fileList: Array[1]
[DeviceImport] fileItem: Object {...} originFileObj: File {...}
[DeviceImport] newFiles: 1 newUploadList: Array[1]
[DeviceImport] selectedFiles: 1 uploadFileList: 1
```

### 4. 预期界面变化

选择文件后，界面应该显示：

```
┌────────────────────────────────┐
│ [⬆️ 上传图标]                 │
│ 点击或拖拽文件到此处上传        │
│ 支持格式：CSV, Excel           │
│                                │
│ ──────────────────────────────│
│ [📄] test_import.csv   [🗑️]  │ ← 文件列表
│ ──────────────────────────────│
│              [📥 导入]         │ ← 导入按钮
└────────────────────────────────┘
```

### 5. 可能的问题

#### 问题 A: 没有日志输出
**原因**: 文件选择事件未触发
**解决**: 检查文件选择对话框是否正常打开

#### 问题 B: 有日志但文件列表不显示
**原因**: `selectedFiles` 变量未正确更新
**解决**: 检查控制台日志中的 `selectedFiles` 数量

#### 问题 C: 文件列表显示但导入按钮不显示
**原因**: 条件判断 `selectedFiles.length > 0` 未满足
**解决**: 检查 `selectedFiles` 的值

### 6. 调试命令

在控制台执行以下命令查看状态：

```javascript
// 查看选中的文件数量
console.log('selectedFiles:', selectedFiles.value);

// 查看上传列表
console.log('uploadFileList:', uploadFileList.value);

// 手动触发更新（如果需要）
selectedFiles.value = [...selectedFiles.value];
```

## 文件要求

### CSV 文件示例
```csv
IP 地址，端口
192.168.0.104,5555
192.168.0.105,5555
```

### Excel 文件示例
| IP 地址 | 端口 |
|--------|------|
| 192.168.0.104 | 5555 |
| 192.168.0.105 | 5555 |

## 常见问题

### Q: 选择文件后界面没有变化
**A**: 
1. 检查控制台是否有错误
2. 确认文件格式正确（.csv, .xlsx, .xls）
3. 查看 `selectedFiles.length` 是否大于 0

### Q: 文件列表显示了，但导入按钮不显示
**A**:
1. 检查按钮的条件判断
2. 查看 `isImporting` 是否为 false
3. 尝试刷新页面重新选择文件

### Q: 导入按钮显示了，但点击没反应
**A**:
1. 检查控制台是否有错误
2. 确认 `deviceList` 是否有数据
3. 查看 `totalDevices` 是否大于 0

## 成功标志

✅ 选择文件后，文件名显示在列表中
✅ 每个文件右侧有删除按钮
✅ 文件列表下方有导入按钮
✅ 点击导入按钮后开始处理
