"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = __importDefault(require("../logger"));
const customProxyAgent_1 = require("../utils/customProxyAgent");
const axios_1 = __importDefault(require("axios"));
const axios_rate_limit_1 = __importDefault(require("axios-rate-limit"));
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const mime_1 = __importDefault(require("mime"));
const path_1 = __importStar(require("path"));
const baseCacheDirectory = process.env.CONFIG_DIRECTORY
    ? `${process.env.CONFIG_DIRECTORY}/cache/images`
    : path_1.default.join(__dirname, '../../config/cache/images');
class ImageProxy {
    static async clearCache(key) {
        let deletedImages = 0;
        const cacheDirectory = path_1.default.join(baseCacheDirectory, key);
        try {
            const files = await fs_1.promises.readdir(cacheDirectory);
            for (const file of files) {
                const filePath = path_1.default.join(cacheDirectory, file);
                const stat = await fs_1.promises.lstat(filePath);
                if (stat.isDirectory()) {
                    const imageFiles = await fs_1.promises.readdir(filePath);
                    for (const imageFile of imageFiles) {
                        const [, expireAtSt] = imageFile.split('.');
                        const expireAt = Number(expireAtSt);
                        const now = Date.now();
                        if (now > expireAt) {
                            await fs_1.promises.rm(path_1.default.join(filePath), {
                                recursive: true,
                            });
                            deletedImages += 1;
                        }
                    }
                }
            }
        }
        catch (e) {
            if (e.code === 'ENOENT') {
                return;
            }
            logger_1.default.error('Failed to read directory', {
                label: 'Image Cache',
                message: e.message,
            });
        }
        logger_1.default.info(`Cleared ${deletedImages} stale image(s) from cache '${key}'`, {
            label: 'Image Cache',
        });
    }
    static async getImageStats(key) {
        const cacheDirectory = path_1.default.join(baseCacheDirectory, key);
        const imageTotalSize = await ImageProxy.getDirectorySize(cacheDirectory);
        const imageCount = await ImageProxy.getImageCount(cacheDirectory);
        return {
            size: imageTotalSize,
            imageCount,
        };
    }
    static async getDirectorySize(dir) {
        try {
            const files = await fs_1.promises.readdir(dir, {
                withFileTypes: true,
            });
            const paths = files.map(async (file) => {
                const path = (0, path_1.join)(dir, file.name);
                if (file.isDirectory())
                    return await ImageProxy.getDirectorySize(path);
                if (file.isFile()) {
                    const { size } = await fs_1.promises.stat(path);
                    return size;
                }
                return 0;
            });
            return (await Promise.all(paths))
                .flat(Infinity)
                .reduce((i, size) => i + size, 0);
        }
        catch (e) {
            if (e.code === 'ENOENT') {
                return 0;
            }
        }
        return 0;
    }
    static async getImageCount(dir) {
        try {
            const files = await fs_1.promises.readdir(dir);
            return files.length;
        }
        catch (e) {
            if (e.code === 'ENOENT') {
                return 0;
            }
        }
        return 0;
    }
    constructor(key, baseUrl, options = {}) {
        this.cacheVersion = options.cacheVersion ?? 1;
        this.key = key;
        this.axios = axios_1.default.create({
            baseURL: baseUrl,
            headers: options.headers,
        });
        this.axios.interceptors.request.use(customProxyAgent_1.proxyRequestInterceptor);
        if (options.rateLimitOptions) {
            this.axios = (0, axios_rate_limit_1.default)(this.axios, options.rateLimitOptions);
        }
    }
    async getImage(path, fallbackPath) {
        const cacheKey = this.getCacheKey(path);
        const imageResponse = await this.get(cacheKey);
        if (!imageResponse) {
            const newImage = await this.set(path, cacheKey);
            if (!newImage) {
                if (fallbackPath) {
                    return await this.getImage(fallbackPath);
                }
                else {
                    throw new Error('Failed to load image');
                }
            }
            return newImage;
        }
        // If the image is stale, we will revalidate it in the background.
        if (imageResponse.meta.isStale) {
            this.set(path, cacheKey);
        }
        return imageResponse;
    }
    async clearCachedImage(path) {
        // find cacheKey
        const cacheKey = this.getCacheKey(path);
        const directory = (0, path_1.join)(this.getCacheDirectory(), cacheKey);
        try {
            await fs_1.promises.access(directory);
        }
        catch (e) {
            if (e.code === 'ENOENT') {
                logger_1.default.debug(`Cache directory '${cacheKey}' does not exist; nothing to clear.`, {
                    label: 'Image Cache',
                });
                return;
            }
            else {
                logger_1.default.error('Error checking cache directory existence', {
                    label: 'Image Cache',
                    message: e.message,
                });
                return;
            }
        }
        try {
            const files = await fs_1.promises.readdir(directory);
            await fs_1.promises.rm(directory, { recursive: true });
            logger_1.default.debug(`Cleared ${files[0]} from cache 'avatar'`, {
                label: 'Image Cache',
            });
        }
        catch (e) {
            logger_1.default.error('Failed to clear cached image', {
                label: 'Image Cache',
                message: e.message,
            });
        }
    }
    async get(cacheKey) {
        try {
            const directory = (0, path_1.join)(this.getCacheDirectory(), cacheKey);
            const files = await fs_1.promises.readdir(directory);
            const now = Date.now();
            for (const file of files) {
                const [maxAgeSt, expireAtSt, etag, extension] = file.split('.');
                const buffer = await fs_1.promises.readFile((0, path_1.join)(directory, file));
                const expireAt = Number(expireAtSt);
                const maxAge = Number(maxAgeSt);
                return {
                    meta: {
                        curRevalidate: maxAge,
                        revalidateAfter: maxAge * 1000 + now,
                        isStale: now > expireAt,
                        etag,
                        extension,
                        cacheKey,
                        cacheMiss: false,
                    },
                    imageBuffer: buffer,
                };
            }
        }
        catch {
            // No files. Treat as empty cache.
        }
        return null;
    }
    async set(path, cacheKey) {
        try {
            const directory = (0, path_1.join)(this.getCacheDirectory(), cacheKey);
            const response = await this.axios.get(path, {
                responseType: 'arraybuffer',
            });
            const buffer = Buffer.from(response.data, 'binary');
            const contentType = response.headers['content-type'] || '';
            const extension = mime_1.default.getExtension(contentType) || '';
            let maxAge = Number((response.headers['cache-control'] ?? '0').split('=')[1]);
            if (!maxAge)
                maxAge = 86400;
            const expireAt = Date.now() + maxAge * 1000;
            const etag = (response.headers.etag ?? '').replace(/"/g, '');
            await this.writeToCacheDir(directory, extension, maxAge, expireAt, buffer, etag);
            return {
                meta: {
                    curRevalidate: maxAge,
                    revalidateAfter: expireAt,
                    isStale: false,
                    etag,
                    extension,
                    cacheKey,
                    cacheMiss: true,
                },
                imageBuffer: buffer,
            };
        }
        catch (e) {
            logger_1.default.debug('Something went wrong caching image.', {
                label: 'Image Cache',
                errorMessage: e.message,
            });
            return null;
        }
    }
    async writeToCacheDir(dir, extension, maxAge, expireAt, buffer, etag) {
        const filename = (0, path_1.join)(dir, `${maxAge}.${expireAt}.${etag}.${extension}`);
        await fs_1.promises.rm(dir, { force: true, recursive: true }).catch(() => {
            // do nothing
        });
        await fs_1.promises.mkdir(dir, { recursive: true });
        await fs_1.promises.writeFile(filename, buffer);
    }
    getCacheKey(path) {
        return this.getHash([this.key, this.cacheVersion, path]);
    }
    getHash(items) {
        const hash = (0, crypto_1.createHash)('sha256');
        for (const item of items) {
            if (typeof item === 'number')
                hash.update(String(item));
            else {
                hash.update(item);
            }
        }
        // See https://en.wikipedia.org/wiki/Base64#Filenames
        return hash.digest('base64').replace(/\//g, '-');
    }
    getCacheDirectory() {
        return path_1.default.join(baseCacheDirectory, this.key);
    }
}
exports.default = ImageProxy;
