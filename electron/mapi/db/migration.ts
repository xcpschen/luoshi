const versions = [
    {
        version: 0,
        up: async (db: DB) => {
            // 初始版本，暂无操作
        },
    },
    {
        version: 1,
        up: async (db: DB) => {
            // 创建统一设备表（增量开发，不影响原有 devices 表）
            await db.execute(`
                CREATE TABLE IF NOT EXISTS device_unified (
                    unified_id VARCHAR(64) PRIMARY KEY,
                    hardware_id VARCHAR(128) NOT NULL,
                    model VARCHAR(128),
                    brand VARCHAR(128),
                    android_version VARCHAR(32),
                    sdk_version INTEGER,
                    fingerprint VARCHAR(256),
                    name VARCHAR(255),
                    avatar TEXT,
                    setting TEXT,
                    tags TEXT,
                    total_connections INTEGER DEFAULT 0,
                    first_connected_at DATETIME,
                    last_connected_at DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(hardware_id)
                )
            `);
            
            // 创建设备连接表
            await db.execute(`
                CREATE TABLE IF NOT EXISTS device_connection (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    unified_id VARCHAR(64) NOT NULL,
                    connection_id VARCHAR(128) NOT NULL,
                    connection_type VARCHAR(32) NOT NULL,
                    status VARCHAR(32),
                    address VARCHAR(128),
                    connected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_active_at DATETIME,
                    is_default BOOLEAN DEFAULT 0,
                    FOREIGN KEY (unified_id) REFERENCES device_unified(unified_id),
                    UNIQUE(unified_id, connection_id)
                )
            `);
            
            // 创建索引
            await db.execute(`
                CREATE INDEX IF NOT EXISTS idx_device_connection_unified 
                ON device_connection(unified_id)
            `);
            
            await db.execute(`
                CREATE INDEX IF NOT EXISTS idx_device_connection_status 
                ON device_connection(status)
            `);
            
            await db.execute(`
                CREATE INDEX IF NOT EXISTS idx_device_hardware_id 
                ON device_unified(hardware_id)
            `);
            
            console.log('Database migration v1: device_unified tables created');
        },
    },
    {
        version: 2,
        up: async (db: DB) => {
            // 禁用外键约束检查（避免与现有数据冲突）
            await db.execute('PRAGMA foreign_keys = OFF');
            
            // 创建集群配置表
            await db.execute(`
                CREATE TABLE IF NOT EXISTS cluster_config (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    config_key VARCHAR(128) UNIQUE NOT NULL,
                    config_value TEXT NOT NULL,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);
            
            // 创建服务器节点表（移除外键依赖）
            await db.execute(`
                CREATE TABLE IF NOT EXISTS server_node (
                    id VARCHAR(64) PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    role VARCHAR(32) NOT NULL,
                    host VARCHAR(128) NOT NULL,
                    port INTEGER NOT NULL,
                    enabled BOOLEAN DEFAULT 1,
                    config_json TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);
            
            // 创建服务器状态表（移除外键约束，使用普通字段）
            await db.execute(`
                CREATE TABLE IF NOT EXISTS server_status (
                    node_id VARCHAR(64) PRIMARY KEY,
                    status VARCHAR(32) NOT NULL,
                    last_seen DATETIME,
                    response_time INTEGER,
                    active_connections INTEGER,
                    cpu_usage REAL,
                    memory_usage REAL,
                    gpu_usage REAL,
                    error_message TEXT,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);
            
            // 创建索引
            await db.execute(`
                CREATE INDEX IF NOT EXISTS idx_server_node_role 
                ON server_node(role)
            `);
            
            await db.execute(`
                CREATE INDEX IF NOT EXISTS idx_server_status_status 
                ON server_status(status)
            `);
            
            // 恢复外键约束检查
            await db.execute('PRAGMA foreign_keys = ON');
            
            console.log('Database migration v2: cluster_config tables created');
        },
    },
];

export default {
    versions,
};
