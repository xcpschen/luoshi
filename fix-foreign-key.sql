-- 修复数据库外键约束问题
-- 在 SQLite 控制台运行：sqlite3 ~/Library/Application\ Support/easylinkandroid/database.db < fix-foreign-key.sql

-- 禁用外键
PRAGMA foreign_keys = OFF;

-- 删除有问题的表
DROP TABLE IF EXISTS server_status;
DROP TABLE IF EXISTS server_node;
DROP TABLE IF EXISTS cluster_config;

-- 重新创建表（没有外键约束）
CREATE TABLE IF NOT EXISTS cluster_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    config_key VARCHAR(128) UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

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
);

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
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_server_node_role ON server_node(role);
CREATE INDEX IF NOT EXISTS idx_server_status_status ON server_status(status);

-- 恢复外键
PRAGMA foreign_keys = ON;

-- 验证表是否创建成功
SELECT name FROM sqlite_master WHERE type='table' AND name IN ('cluster_config', 'server_node', 'server_status');
