"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRepository = exports.isPgsql = void 0;
const fs_1 = __importDefault(require("fs"));
const typeorm_1 = require("typeorm");
const DB_SSL_PREFIX = 'DB_SSL_';
function boolFromEnv(envVar, defaultVal = false) {
    if (process.env[envVar]) {
        return process.env[envVar]?.toLowerCase() === 'true';
    }
    return defaultVal;
}
function intFromEnv(envVar, defaultVal) {
    const val = process.env[envVar];
    if (val) {
        const parsed = parseInt(val, 10);
        return isNaN(parsed) ? defaultVal : parsed;
    }
    return defaultVal;
}
function stringOrReadFileFromEnv(envVar) {
    if (process.env[envVar]) {
        return process.env[envVar];
    }
    const filePath = process.env[`${envVar}_FILE`];
    if (filePath) {
        return fs_1.default.readFileSync(filePath);
    }
    return undefined;
}
function buildSslConfig() {
    if (process.env.DB_USE_SSL?.toLowerCase() !== 'true') {
        return undefined;
    }
    return {
        rejectUnauthorized: boolFromEnv(`${DB_SSL_PREFIX}REJECT_UNAUTHORIZED`, true),
        ca: stringOrReadFileFromEnv(`${DB_SSL_PREFIX}CA`),
        key: stringOrReadFileFromEnv(`${DB_SSL_PREFIX}KEY`),
        cert: stringOrReadFileFromEnv(`${DB_SSL_PREFIX}CERT`),
    };
}
const testConfig = {
    type: 'sqlite',
    database: ':memory:',
    synchronize: true,
    dropSchema: true,
    logging: boolFromEnv('DB_LOG_QUERIES'),
    entities: ['server/entity/**/*.ts'],
    migrations: ['server/migration/sqlite/**/*.ts'],
    subscribers: ['server/subscriber/**/*.ts'],
};
const devConfig = {
    type: 'sqlite',
    database: process.env.CONFIG_DIRECTORY
        ? `${process.env.CONFIG_DIRECTORY}/db/db.sqlite3`
        : 'config/db/db.sqlite3',
    synchronize: true,
    migrationsRun: false,
    logging: boolFromEnv('DB_LOG_QUERIES'),
    enableWAL: true,
    entities: ['server/entity/**/*.ts'],
    migrations: ['server/migration/sqlite/**/*.ts'],
    subscribers: ['server/subscriber/**/*.ts'],
};
const prodConfig = {
    type: 'sqlite',
    database: process.env.CONFIG_DIRECTORY
        ? `${process.env.CONFIG_DIRECTORY}/db/db.sqlite3`
        : 'config/db/db.sqlite3',
    synchronize: false,
    migrationsRun: false,
    logging: boolFromEnv('DB_LOG_QUERIES'),
    enableWAL: true,
    entities: ['dist/entity/**/*.js'],
    migrations: ['dist/migration/sqlite/**/*.js'],
    subscribers: ['dist/subscriber/**/*.js'],
};
const postgresDevConfig = {
    type: 'postgres',
    host: process.env.DB_SOCKET_PATH || process.env.DB_HOST,
    port: process.env.DB_SOCKET_PATH
        ? undefined
        : parseInt(process.env.DB_PORT ?? '5432'),
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME ?? 'seerr',
    ssl: buildSslConfig(),
    poolSize: intFromEnv('DB_POOL_SIZE'),
    synchronize: false,
    migrationsRun: true,
    logging: boolFromEnv('DB_LOG_QUERIES'),
    entities: ['server/entity/**/*.ts'],
    migrations: ['server/migration/postgres/**/*.ts'],
    subscribers: ['server/subscriber/**/*.ts'],
};
const postgresProdConfig = {
    type: 'postgres',
    host: process.env.DB_SOCKET_PATH || process.env.DB_HOST,
    port: process.env.DB_SOCKET_PATH
        ? undefined
        : parseInt(process.env.DB_PORT ?? '5432'),
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME ?? 'seerr',
    ssl: buildSslConfig(),
    poolSize: intFromEnv('DB_POOL_SIZE'),
    synchronize: false,
    migrationsRun: false,
    logging: boolFromEnv('DB_LOG_QUERIES'),
    entities: ['dist/entity/**/*.js'],
    migrations: ['dist/migration/postgres/**/*.js'],
    subscribers: ['dist/subscriber/**/*.js'],
};
exports.isPgsql = process.env.DB_TYPE === 'postgres';
function getDataSource() {
    if (process.env.NODE_ENV === 'test') {
        return testConfig;
    }
    else if (process.env.NODE_ENV === 'production') {
        return exports.isPgsql ? postgresProdConfig : prodConfig;
    }
    else {
        return exports.isPgsql ? postgresDevConfig : devConfig;
    }
}
const dataSource = new typeorm_1.DataSource(getDataSource());
const getRepository = (target) => {
    return dataSource.getRepository(target);
};
exports.getRepository = getRepository;
exports.default = dataSource;
