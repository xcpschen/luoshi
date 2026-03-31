#!/bin/bash

# 自动修复数据库外键约束问题

DB_PATH="$HOME/Library/Application Support/easylinkandroid/database.db"

echo "Checking database: $DB_PATH"

if [ ! -f "$DB_PATH" ]; then
    echo "Database not found at $DB_PATH"
    exit 1
fi

echo "Fixing foreign key constraints..."

sqlite3 "$DB_PATH" <<EOF
-- 禁用外键
PRAGMA foreign_keys = OFF;

-- 删除旧表
DROP TABLE IF EXISTS server_status;
DROP TABLE IF EXISTS server_node;
DROP TABLE IF EXISTS cluster_config;

-- 重新创建表
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

-- 验证
SELECT 'Tables created successfully:' as message;
SELECT name FROM sqlite_master WHERE type='table' AND name IN ('cluster_config', 'server_node', 'server_status');
EOF

echo "✅ Database fixed!"
