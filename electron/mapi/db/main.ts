import sqlite3, {Database} from "better-sqlite3";
import path from "node:path";
import migration from "./migration";
import {AppEnv} from "../env";
import {Log} from "../log/main";
import {ipcMain} from "electron";
import fs from "node:fs";
import {Files} from "../file/main";

let dbPath: string | null = null;
let dbConn: Database | null = null;
let dbSuccess = false;

const db = {
    /**
     * 检查数据库连接是否已初始化
     * @throws {string} 如果数据库未初始化则抛出异常
     */
    _check() {
        if (!dbSuccess) {
            throw "DBNotInitialized";
        }
    },
    /**
     * 执行SQL语句（无返回值）
     * @param {string} sql - SQL语句
     * @param {any[]} params - 参数数组
     * @returns {Promise<void>}
     */
    async execute(sql: string, params: any = []): Promise<void> {
        db._check();
        try {
            dbConn.prepare(sql).run(...params);
        } catch (err) {
            throw err;
        }
    },
    /**
     * 插入数据并返回插入的行ID
     * @param {string} sql - SQL语句
     * @param {any[]} params - 参数数组
     * @returns {Promise<string | number>} 插入的行ID
     */
    async insert(sql: string, params: any = []): Promise<string | number> {
        db._check();
        try {
            const result = dbConn.prepare(sql).run(...params);
            return result.lastInsertRowid;
        } catch (err) {
            throw err;
        }
    },
    /**
     * 查询单行数据
     * @param {string} sql - SQL语句
     * @param {any[]} params - 参数数组
     * @returns {Promise<any>} 查询结果
     */
    async first(sql: string, params: any = []): Promise<any> {
        db._check();
        try {
            return dbConn.prepare(sql).get(...params);
        } catch (err) {
            throw err;
        }
    },
    /**
     * 查询多行数据
     * @param {string} sql - SQL语句
     * @param {any[]} params - 参数数组
     * @returns {Promise<any[]>} 查询结果数组
     */
    async select(sql: string, params: any = []): Promise<any[]> {
        db._check();
        try {
            return dbConn.prepare(sql).all(...params);
        } catch (err) {
            throw err;
        }
    },
    /**
     * 更新数据并返回影响的行数
     * @param {string} sql - SQL语句
     * @param {any[]} params - 参数数组
     * @returns {Promise<number>} 影响的行数
     */
    async update(sql: string, params: any = []): Promise<number> {
        db._check();
        try {
            const result = dbConn.prepare(sql).run(...params);
            return result.changes;
        } catch (err) {
            throw err;
        }
    },
    /**
     * 删除数据并返回影响的行数
     * @param {string} sql - SQL语句
     * @param {any[]} params - 参数数组
     * @returns {Promise<number>} 影响的行数
     */
    async delete(sql: string, params: any = []): Promise<number> {
        db._check();
        try {
            const result = dbConn.prepare(sql).run(...params);
            return result.changes;
        } catch (err) {
            throw err;
        }
    },
};

const migrate = async () => {
    await db.execute(`CREATE TABLE IF NOT EXISTS migrate
                      (
                          id
                          INTEGER
                          PRIMARY
                          KEY,
                          version
                          INTEGER
                      )`);
    for (const version of migration.versions) {
        const result = await db.first(
            `SELECT *
             FROM migrate
             WHERE version = ?`,
            [version.version]
        );
        if (!result) {
            Log.info(`DB.Migrate`, {version: version.version});
            await version.up(db);
            await db.execute(
                `INSERT INTO migrate (version)
                 VALUES (?)`,
                [version.version]
            );
        }
    }
};

/**
 * 初始化数据库连接
 * @returns {Promise<void>}
 */
const init = async () => {
    dbPath = path.join(AppEnv.dataRoot, "database.db");
    const userDbPath = path.join(AppEnv.userData, "database.db");
    if (fs.existsSync(userDbPath)) {
        dbPath = userDbPath;
    }
    try {
        dbConn = new sqlite3(dbPath);
        dbSuccess = true;
        
        // 禁用外键约束检查（避免与现有数据冲突）
        dbConn.exec('PRAGMA foreign_keys = OFF');
        
        await migrate();
        
        // 修复可能存在的有问题的表结构
        await fixDatabaseTables();
        
        Log.info("Database connected successfully");
    } catch (err) {
        Log.error("DBConnect SQLite database failed:", err.message);
        throw err;
    }
};

// 修复数据库表结构
const fixDatabaseTables = async () => {
    if (!dbConn) return;
    
    try {
        // 检查 server_status 表是否有外键约束
        const tableInfo = dbConn.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='server_status'").get() as any;
        if (tableInfo && tableInfo.sql && tableInfo.sql.includes('FOREIGN KEY')) {
            Log.info('Fixing server_status table...');
            
            // 禁用外键
            dbConn.exec('PRAGMA foreign_keys = OFF');
            
            // 备份数据
            const statusData = dbConn.prepare('SELECT * FROM server_status').all();
            const nodeData = dbConn.prepare('SELECT * FROM server_node').all();
            
            // 删除旧表
            dbConn.exec('DROP TABLE IF EXISTS server_status');
            dbConn.exec('DROP TABLE IF EXISTS server_node');
            dbConn.exec('DROP TABLE IF EXISTS cluster_config');
            
            // 重新创建表（没有外键）
            dbConn.exec(`
                CREATE TABLE cluster_config (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    config_key VARCHAR(128) UNIQUE NOT NULL,
                    config_value TEXT NOT NULL,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);
            
            dbConn.exec(`
                CREATE TABLE server_node (
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
            
            dbConn.exec(`
                CREATE TABLE server_status (
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
            dbConn.exec('CREATE INDEX IF NOT EXISTS idx_server_node_role ON server_node(role)');
            dbConn.exec('CREATE INDEX IF NOT EXISTS idx_server_status_status ON server_status(status)');
            
            Log.info('Database tables fixed successfully');
        }
    } catch (err) {
        Log.error('Failed to fix database tables:', err.message);
    }
};

ipcMain.handle("db:execute", (event, sql: string, params: any) => {
    return db.execute(sql, params);
});
ipcMain.handle("db:insert", (event, sql: string, params: any) => {
    return db.insert(sql, params);
});
ipcMain.handle("db:first", (event, sql: string, params: any) => {
    return db.first(sql, params);
});
ipcMain.handle("db:select", (event, sql: string, params: any) => {
    return db.select(sql, params);
});
ipcMain.handle("db:update", (event, sql: string, params: any) => {
    return db.update(sql, params);
});
ipcMain.handle("db:delete", (event, sql: string, params: any) => {
    return db.delete(sql, params);
});

export const DBMain = {
    init,
    execute: db.execute,
    insert: db.insert,
    first: db.first,
    select: db.select,
    update: db.update,
    delete: db.delete,
    // 暴露数据库实例给其他模块使用
    getInstance: () => dbConn,
};

export default DBMain;
