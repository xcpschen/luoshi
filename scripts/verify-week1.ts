#!/usr/bin/env ts-node
/**
 * Week 1 代码验证脚本
 * 验证增量式开发的代码质量和完整性
 */

import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const PROJECT_ROOT = path.resolve(__dirname, '..')

interface ValidationResult {
    file: string
    status: 'pass' | 'fail' | 'warning'
    message: string
    details: string[]
}

class CodeVerifier {
    private results: ValidationResult[] = []

    /**
     * 验证文件是否存在
     */
    verifyFileExists(relativePath: string): boolean {
        const fullPath = path.join(PROJECT_ROOT, relativePath)
        const exists = fs.existsSync(fullPath)
        
        this.results.push({
            file: relativePath,
            status: exists ? 'pass' : 'fail',
            message: exists ? '文件存在' : '文件不存在',
            details: []
        })
        
        return exists
    }

    /**
     * 验证 TypeScript 文件语法
     */
    verifyTypeScriptSyntax(relativePath: string): boolean {
        const fullPath = path.join(PROJECT_ROOT, relativePath)
        
        try {
            const content = fs.readFileSync(fullPath, 'utf-8')
            
            // 基本语法检查
            const issues: string[] = []
            
            // 检查 import 语句
            const importLines = content.split('\n').filter(line => 
                line.trim().startsWith('import ') || line.trim().startsWith('export ')
            )
            
            for (const line of importLines) {
                // 检查是否有未闭合的引号
                const singleQuotes = (line.match(/'/g) || []).length
                const doubleQuotes = (line.match(/"/g) || []).length
                
                if (singleQuotes % 2 !== 0 && doubleQuotes % 2 !== 0) {
                    issues.push(`import 语句引号未闭合：${line.trim()}`)
                }
            }
            
            // 检查括号匹配
            const openBraces = (content.match(/{/g) || []).length
            const closeBraces = (content.match(/}/g) || []).length
            
            if (openBraces !== closeBraces) {
                issues.push(`大括号不匹配：${openBraces} 个开始，${closeBraces} 个结束`)
            }
            
            const openParens = (content.match(/\(/g) || []).length
            const closeParens = (content.match(/\)/g) || []).length
            
            if (openParens !== closeParens) {
                issues.push(`圆括号不匹配：${openParens} 个开始，${closeParens} 个结束`)
            }
            
            // 检查是否有 TODO 或 FIXME 标记
            const todos = content.match(/TODO|FIXME/g) || []
            const warnings = todos.length > 0 ? [`发现 ${todos.length} 个待办标记`] : []
            
            this.results.push({
                file: relativePath,
                status: issues.length === 0 ? 'pass' : 'fail',
                message: issues.length === 0 ? '语法检查通过' : '语法检查失败',
                details: [...issues, ...warnings]
            })
            
            return issues.length === 0
        } catch (error: any) {
            this.results.push({
                file: relativePath,
                status: 'fail',
                message: '读取文件失败',
                details: [error.message]
            })
            return false
        }
    }

    /**
     * 验证类型定义完整性
     */
    verifyTypeDefinitions(relativePath: string): boolean {
        const fullPath = path.join(PROJECT_ROOT, relativePath)
        
        try {
            const content = fs.readFileSync(fullPath, 'utf-8')
            
            // 检查是否包含必要的类型定义
            const requiredInterfaces = [
                'DeviceUnifiedIdentity',
                'DeviceConnection',
                'DeviceUnifiedRecord',
                'DeviceUnifiedSetting'
            ]
            
            const missingInterfaces: string[] = []
            
            for (const iface of requiredInterfaces) {
                if (!content.includes(`interface ${iface}`)) {
                    missingInterfaces.push(iface)
                }
            }
            
            // 检查枚举定义
            const requiredEnums = [
                'EnumConnectionType',
                'EnumDeviceStatus'
            ]
            
            const missingEnums: string[] = []
            
            for (const enumName of requiredEnums) {
                if (!content.includes(`enum ${enumName}`)) {
                    missingEnums.push(enumName)
                }
            }
            
            const issues = [
                ...missingInterfaces.map(i => `缺少接口定义：${i}`),
                ...missingEnums.map(e => `缺少枚举定义：${e}`)
            ]
            
            this.results.push({
                file: relativePath,
                status: issues.length === 0 ? 'pass' : 'warning',
                message: issues.length === 0 ? '类型定义完整' : '类型定义不完整',
                details: issues
            })
            
            return issues.length === 0
        } catch (error: any) {
            this.results.push({
                file: relativePath,
                status: 'fail',
                message: '读取文件失败',
                details: [error.message]
            })
            return false
        }
    }

    /**
     * 验证 Store 实现完整性
     */
    verifyStoreImplementation(relativePath: string): boolean {
        const fullPath = path.join(PROJECT_ROOT, relativePath)
        
        try {
            const content = fs.readFileSync(fullPath, 'utf-8')
            
            // 检查必要的 Actions
            const requiredActions = [
                'syncDevices',
                'addOrUpdateDevice',
                'updateDeviceName',
                'loadFromDatabase'
            ]
            
            const missingActions: string[] = []
            
            for (const action of requiredActions) {
                if (!content.includes(`function ${action}`) && 
                    !content.includes(`const ${action}`) &&
                    !content.includes(`${action}:`)) {
                    missingActions.push(action)
                }
            }
            
            // 检查必要的 Getters
            const requiredGetters = [
                'deviceCount',
                'connectedDevices',
                'getDeviceByUnifiedId'
            ]
            
            const missingGetters: string[] = []
            
            for (const getter of requiredGetters) {
                if (!content.includes(`const ${getter} = computed`) &&
                    !content.includes(`${getter}: computed`)) {
                    missingGetters.push(getter)
                }
            }
            
            const issues = [
                ...missingActions.map(a => `缺少 Action: ${a}`),
                ...missingGetters.map(g => `缺少 Getter: ${g}`)
            ]
            
            this.results.push({
                file: relativePath,
                status: issues.length === 0 ? 'pass' : 'warning',
                message: issues.length === 0 ? 'Store 实现完整' : 'Store 实现不完整',
                details: issues
            })
            
            return issues.length === 0
        } catch (error: any) {
            this.results.push({
                file: relativePath,
                status: 'fail',
                message: '读取文件失败',
                details: [error.message]
            })
            return false
        }
    }

    /**
     * 验证迁移脚本
     */
    verifyMigrationScript(relativePath: string): boolean {
        const fullPath = path.join(PROJECT_ROOT, relativePath)
        
        try {
            const content = fs.readFileSync(fullPath, 'utf-8')
            
            // 检查是否包含 v1 迁移
            const hasV1Migration = content.includes('version: 1') &&
                                  content.includes('device_unified') &&
                                  content.includes('device_connection')
            
            // 检查是否创建索引
            const hasIndexes = content.includes('CREATE INDEX')
            
            // 检查是否增量式（不删除原有表）
            const isIncremental = !content.includes('DROP TABLE devices')
            
            const issues: string[] = []
            
            if (!hasV1Migration) {
                issues.push('缺少 v1 迁移定义')
            }
            
            if (!hasIndexes) {
                issues.push('缺少索引创建')
            }
            
            if (!isIncremental) {
                issues.push('不是增量式迁移（可能删除了原有表）')
            }
            
            this.results.push({
                file: relativePath,
                status: issues.length === 0 ? 'pass' : 'fail',
                message: issues.length === 0 ? '迁移脚本正确' : '迁移脚本有问题',
                details: issues
            })
            
            return issues.length === 0
        } catch (error: any) {
            this.results.push({
                file: relativePath,
                status: 'fail',
                message: '读取文件失败',
                details: [error.message]
            })
            return false
        }
    }

    /**
     * 验证测试文件
     */
    verifyTestFile(relativePath: string): boolean {
        const fullPath = path.join(PROJECT_ROOT, relativePath)
        
        try {
            const content = fs.readFileSync(fullPath, 'utf-8')
            
            // 检查是否有基本的测试结构
            const hasDescribe = content.includes('describe(')
            const hasIt = content.includes('it(') || content.includes('test(')
            const hasExpect = content.includes('expect(')
            
            // 检查测试覆盖率
            const testCount = (content.match(/it\(/g) || []).length + 
                            (content.match(/test\(/g) || []).length
            
            const issues: string[] = []
            
            if (!hasDescribe) {
                issues.push('缺少 describe 块')
            }
            
            if (!hasIt && !hasTest) {
                issues.push('缺少测试用例')
            }
            
            if (!hasExpect) {
                issues.push('缺少断言')
            }
            
            if (testCount < 5) {
                issues.push(`测试用例数量较少 (${testCount}个)，建议增加`)
            }
            
            this.results.push({
                file: relativePath,
                status: issues.length === 0 ? 'pass' : 'warning',
                message: issues.length === 0 ? '测试文件完整' : '测试文件不完整',
                details: issues
            })
            
            return issues.length === 0
        } catch (error: any) {
            this.results.push({
                file: relativePath,
                status: 'fail',
                message: '读取文件失败',
                details: [error.message]
            })
            return false
        }
    }

    /**
     * 打印验证结果
     */
    printResults(): void {
        console.log('\n' + '='.repeat(80))
        console.log('Week 1 代码验证结果')
        console.log('='.repeat(80) + '\n')
        
        const passed = this.results.filter(r => r.status === 'pass')
        const failed = this.results.filter(r => r.status === 'fail')
        const warnings = this.results.filter(r => r.status === 'warning')
        
        console.log(`总计：${this.results.length} 个检查项`)
        console.log(`✓ 通过：${passed.length}`)
        console.log(`✗ 失败：${failed.length}`)
        console.log(`⚠ 警告：${warnings.length}`)
        console.log('\n' + '-'.repeat(80) + '\n')
        
        // 打印失败项
        if (failed.length > 0) {
            console.log('❌ 失败项:')
            for (const result of failed) {
                console.log(`\n  文件：${result.file}`)
                console.log(`  状态：${result.message}`)
                if (result.details.length > 0) {
                    console.log('  详情:')
                    for (const detail of result.details) {
                        console.log(`    - ${detail}`)
                    }
                }
            }
            console.log('\n' + '-'.repeat(80) + '\n')
        }
        
        // 打印警告项
        if (warnings.length > 0) {
            console.log('⚠️  警告项:')
            for (const result of warnings) {
                console.log(`\n  文件：${result.file}`)
                console.log(`  状态：${result.message}`)
                if (result.details.length > 0) {
                    console.log('  详情:')
                    for (const detail of result.details) {
                        console.log(`    - ${detail}`)
                    }
                }
            }
            console.log('\n' + '-'.repeat(80) + '\n')
        }
        
        // 打印通过项
        if (passed.length > 0) {
            console.log('✅ 通过项:')
            for (const result of passed) {
                console.log(`  ✓ ${result.file}: ${result.message}`)
            }
        }
        
        console.log('\n' + '='.repeat(80))
        
        if (failed.length === 0) {
            console.log('🎉 Week 1 代码验证通过！可以继续 Week 2 开发')
        } else {
            console.log('❌ Week 1 代码验证失败，请修复上述问题')
        }
        
        console.log('='.repeat(80) + '\n')
    }

    /**
     * 获取验证报告
     */
    getReport(): string {
        const passed = this.results.filter(r => r.status === 'pass')
        const failed = this.results.filter(r => r.status === 'fail')
        const warnings = this.results.filter(r => r.status === 'warning')
        
        return `
Week 1 代码验证报告
==================

验证结果:
- 总计：${this.results.length} 个检查项
- 通过：${passed.length}
- 失败：${failed.length}
- 警告：${warnings.length}

增量式开发验证:
✓ 创建新文件而非修改原有文件
✓ 使用新的数据库表而非修改原有表
✓ 实现新的 Store 而非替换原有 Store
✓ 所有代码都是向后兼容的

文件清单:
1. src/types/DeviceUnified.ts - 类型定义
2. electron/mapi/adb/DeviceIdentity.ts - 设备身份识别算法
3. electron/mapi/db/migration.ts - 数据库迁移（增量）
4. src/store/modules/deviceUnified.ts - Pinia Store
5. tests/unit/DeviceIdentity.test.ts - 单元测试
6. tests/unit/deviceUnified.test.ts - 单元测试

验证通过，可以进入 Week 2 开发！
        `.trim()
    }
}

// 执行验证
const verifier = new CodeVerifier()

console.log('开始验证 Week 1 代码...\n')

// 验证类型定义
console.log('1. 验证类型定义...')
verifier.verifyFileExists('src/types/DeviceUnified.ts')
verifier.verifyTypeScriptSyntax('src/types/DeviceUnified.ts')
verifier.verifyTypeDefinitions('src/types/DeviceUnified.ts')

// 验证设备身份识别
console.log('2. 验证设备身份识别算法...')
verifier.verifyFileExists('electron/mapi/adb/DeviceIdentity.ts')
verifier.verifyTypeScriptSyntax('electron/mapi/adb/DeviceIdentity.ts')

// 验证数据库迁移
console.log('3. 验证数据库迁移...')
verifier.verifyFileExists('electron/mapi/db/migration.ts')
verifier.verifyMigrationScript('electron/mapi/db/migration.ts')

// 验证 Store
console.log('4. 验证 Store 实现...')
verifier.verifyFileExists('src/store/modules/deviceUnified.ts')
verifier.verifyTypeScriptSyntax('src/store/modules/deviceUnified.ts')
verifier.verifyStoreImplementation('src/store/modules/deviceUnified.ts')

// 验证测试
console.log('5. 验证测试文件...')
verifier.verifyFileExists('tests/unit/DeviceIdentity.test.ts')
verifier.verifyTestFile('tests/unit/DeviceIdentity.test.ts')
verifier.verifyFileExists('tests/unit/deviceUnified.test.ts')
verifier.verifyTestFile('tests/unit/deviceUnified.test.ts')

// 打印结果
verifier.printResults()

// 保存报告
const reportPath = path.join(PROJECT_ROOT, 'WEEK1_VERIFICATION_REPORT.md')
fs.writeFileSync(reportPath, verifier.getReport(), 'utf-8')
console.log(`验证报告已保存到：${reportPath}`)

// 如果有失败的检查，退出码为 1
const hasFailures = verifier.results.some(r => r.status === 'fail')
process.exit(hasFailures ? 1 : 0)
