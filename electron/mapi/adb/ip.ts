/**
 * IP 命令解析工具
 * 用于执行 `ip -d a s` 命令并解析输出，获取网络接口的 MAC 地址
 */

import adb from './render';

/**
 * 网络接口数据结构
 */
export interface NetworkInterface {
    ifindex: string;           // 接口索引
    ifname: string;            // 接口名称（如 wlan0, eth0）
    flags: string[];           // 接口标志
    link_type: string;         // 链路类型（如 ether）
    address: string;           // MAC 地址
    operstate?: string;        // 操作状态
    [key: string]: any;        // 其他动态属性
}

/**
 * 解析 `ip -d a s` 命令输出
 * 
 * @param output 命令输出的原始文本
 * @returns 网络接口数组
 */
export function parseIpOutput(output: string): NetworkInterface[] {
    const netdevs: NetworkInterface[] = [];
    
    if (!output || output.trim() === '') {
        return netdevs;
    }
    
    const lines = output.split('\n');
    let currentInterface: Partial<NetworkInterface> = {};
    
    // 正则表达式模式
    const NIC_PATTERN = /^(\d+)\:\s+(\S+)\:\s+<(\S+)>\s+(.*)/;
    const LINK_PATTERN = /^\s+link\/(\S+)\s+(\S+)\s*(.*)/;
    
    for (const pline of lines) {
        // 匹配网络接口行（如：2: wlan0: <BROADCAST,MULTICAST,UP> ...）
        const nicMatch = regexMatch(NIC_PATTERN, pline);
        if (nicMatch) {
            // 保存上一个接口
            if (Object.keys(currentInterface).length > 0) {
                netdevs.push(currentInterface as NetworkInterface);
                currentInterface = {};
            }
            
            // 创建新接口
            currentInterface = {
                ifindex: nicMatch.groups[0],
                ifname: nicMatch.groups[1],
                flags: nicMatch.groups[2].split(','),
            };
            
            // 解析参数字段
            const params = nicMatch.groups[3].split(' ').filter(p => p.trim());
            if (params.length % 2 === 0) {
                for (let i = 0; i < params.length; i += 2) {
                    const key = params[i];
                    const value = params[i + 1];
                    if (key === 'state') {
                        currentInterface.operstate = value;
                    } else {
                        currentInterface[key] = value;
                    }
                }
            }
            continue;
        }
        
        // 匹配链路层信息行（如：link/ether aa:bb:cc:dd:ee:ff ...）
        const linkMatch = regexMatch(LINK_PATTERN, pline);
        if (linkMatch && Object.keys(currentInterface).length > 0) {
            currentInterface.link_type = linkMatch.groups[0];
            currentInterface.address = linkMatch.groups[1];
            
            // 解析额外的链路参数
            const params = linkMatch.groups[2].split(' ').filter(p => p.trim());
            if (params.length % 2 === 0) {
                for (let i = 0; i < params.length; i += 2) {
                    currentInterface[params[i]] = params[i + 1];
                }
            }
        }
    }
    
    // 添加最后一个接口
    if (Object.keys(currentInterface).length > 0) {
        netdevs.push(currentInterface as NetworkInterface);
    }
    
    return netdevs;
}

/**
 * 从指定网络接口获取 MAC 地址
 * 
 * @param output `ip -d a s` 命令输出
 * @param ifname 网络接口名称（如 'wlan0'）
 * @returns MAC 地址（小写），未找到返回 null
 */
export function getMACFromIpOutput(output: string, ifname: string = 'wlan0'): string | null {
    const interfaces = parseIpOutput(output);
    const targetInterface = interfaces.find(iface => iface.ifname === ifname);
    
    if (targetInterface && targetInterface.address && isValidMACAddress(targetInterface.address)) {
        return targetInterface.address.toLowerCase();
    }
    
    return null;
}

/**
 * 验证 MAC 地址格式
 * 
 * @param mac MAC 地址字符串
 * @returns 是否为有效的 MAC 地址
 */
export function isValidMACAddress(mac: string): boolean {
    // 匹配标准 MAC 地址格式：aa:bb:cc:dd:ee:ff 或 aa-bb-cc-dd-ee-ff
    const macPattern = /^([0-9a-fA-F]{2}[:-]){5}([0-9a-fA-F]{2})$/;
    return macPattern.test(mac);
}

/**
 * 正则表达式匹配辅助函数
 */
function regexMatch(pattern: RegExp, text: string): { groups: string[] } | null {
    const match = pattern.exec(text);
    
    if (!match) {
        return null;
    }
    
    // 移除完整匹配（第一个元素），只保留捕获组
    const groups = match.slice(1);
    
    return { groups };
}

/**
 * 获取设备的指定网卡的 MAC 地址
 * 
 * @param deviceId 设备 ID
 * @param ifname 网络接口名称（默认 'wlan0'）
 * @returns MAC 地址（小写），获取失败返回 null
 */
export async function getDeviceMAC(deviceId: string, ifname: string = 'wlan0'): Promise<string | null> {
    try {
        console.log(`[IP] 开始获取设备 ${deviceId} 的 ${ifname} MAC 地址`);
        
        // 执行 ip -d a s <ifname> 命令
        const output = await adb.shell(deviceId, `ip -d a s ${ifname}`);
        console.log(`[IP] 命令输出：${output}`);
        
        // 解析输出获取 MAC 地址
        const mac = getMACFromIpOutput(output, ifname);
        
        if (mac) {
            console.log(`[IP] 获取 MAC 地址成功：${mac}`);
            return mac;
        } else {
            console.warn(`[IP] 未找到 ${ifname} 的 MAC 地址`);
        }
        
        return null;
    } catch (error) {
        console.error(`[IP] 获取设备 ${deviceId} 的 MAC 地址失败:`, error);
        return null;
    }
}

/**
 * 获取设备的所有网络接口信息
 * 
 * @param deviceId 设备 ID
 * @returns 网络接口数组
 */
export async function getDeviceNetworkInterfaces(deviceId: string): Promise<NetworkInterface[]> {
    try {
        // 执行 ip -d a s 命令（不带参数，获取所有接口）
        const output = await adb.shell(deviceId, 'ip -d a s');
        return parseIpOutput(output);
    } catch (error) {
        console.error(`[IP] 获取设备 ${deviceId} 的网络接口失败:`, error);
        return [];
    }
}
