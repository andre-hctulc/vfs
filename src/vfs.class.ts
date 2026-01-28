import type { VFSEngine } from "./vfs-engine.interface.js";
import {
    VFSNotFoundError,
    VFSNotADirectoryError,
    VFSNotAFileError,
    VFSInvalidPathError,
} from "./vfs.errors.js";
import { DynCache, type DynCacheConfig, type SetOptions } from "@dre44/dyncache";
import type {
    VFSStatOptions,
    VFSGetDirOptions,
    VFSReadFileOptions,
    VFSReadOptions,
    VFSReaddirOptions,
    VFSRmdirOptions,
    VFSUnlinkOptions,
    VFSRmOptions,
    VFSGlobOptions,
    VFSWriteFileOptions,
    VFSMkdirOptions,
    VFSRenameOptions,
    VFSExistsOptions,
    VFSReadJSONOptions,
    VFSWriteJSONOptions,
    VFSReadTextOptions,
    VFSReadTextRepresentationOptions,
    VFSWriteTextOptions,
} from "./vfs-options.model.js";
import type { VFSEntry, VFSEntryStream } from "./vfs.model.js";
import { collectAsync } from "@dre44/util/streams";
import { attachStats, basename } from "./vfs.util.js";

/**
 * Time to live for cached items: `5min`
 */
const HEAD_TTL_MS = 5 * 60 * 1000;
/**
 * Maximum cache size in bytes: `100MB`
 */
const MAX_CACHE_SIZE_BYTES = 100 * 1024 * 1024;

type Cache = DynCache<CacheKey, File | VFSEntry[] | VFSEntry | string>;

export interface VFSConfiguration {
    cache?: {
        head?: DynCacheConfig;
        files?: DynCacheConfig;
        handle?: (cache: Cache) => void;
    };
}

type CacheKey = {
    /** Normalized (item) path */
    np: string;
    typ: "stat" | "file" | "dir" | "txt";
};

const EXOTIC_TEXT_MIME_TYPES = [
    "application/json",
    "application/xml",
    "application/x-yaml",
    "text/csv",
    "text/markdown",
    "application/xhtml+xml",
    "application/javascript",
];

const JSON_MIME_TYPES = ["application/json", "text/json"];

// TODO concurrent access handling

interface SystemOptions {
    cache_options?: SetOptions;
}

/**
 * In memory {@link VFSInterface}.
 */
export class VFS {
    #cache: Cache;
    #conf: VFSConfiguration;
    #engine: VFSEngine;

    constructor(engine: VFSEngine, configuration: VFSConfiguration = {}) {
        this.#engine = engine;
        this.#conf = { ...configuration };

        this.#cache = new DynCache({
            maxSize: MAX_CACHE_SIZE_BYTES,
            baseCacheOptions: {
                ttl: HEAD_TTL_MS,
                refresh: true,
            },
            ...configuration?.cache?.head,
        });

        configuration?.cache?.handle?.(this.#cache);
    }

    /**
     * Normalizes and validates a path.
     * Uses the underlying {@link VFSEngine.normalizePath} method if available.
     */
    normalizePath(path: string): string {
        if (this.#engine.normalizePath) {
            return this.#engine.normalizePath(path);
        }
        if (!path || typeof path !== "string") {
            throw new VFSInvalidPathError(String(path));
        }
        const trimmed = path.trim();
        if (!trimmed) {
            throw new VFSInvalidPathError("Path cannot be empty or whitespace only");
        }
        return trimmed;
    }

    private _clearPathFromCache(path: string): string {
        this.#cache.remove({ np: path, typ: "stat" });
        this.#cache.remove({ np: path, typ: "file" });
        this.#cache.remove({ np: path, typ: "dir" });
        this.#cache.remove({ np: path, typ: "txt" });
        return path;
    }

    private async _statOrNull(np: string, options: VFSStatOptions & SystemOptions): Promise<VFSEntry | null> {
        const { cache_options, ...engineOptions } = options;
        const key: CacheKey = { np, typ: "stat" };
        const cached = this.#cache.get(key);
        if (cached) {
            return cached as VFSEntry;
        }
        const stats = await this.#engine.stat(np, engineOptions);
        if (stats) {
            this.#cache.set(key, stats, cache_options);
        }
        return stats;
    }

    private async _loadFile(np: string, options: VFSReadFileOptions & SystemOptions): Promise<File | null> {
        const { cache_options, ...engineOptions } = options;
        const key: CacheKey = { np, typ: "file" };
        const cached = this.#cache.get(key);
        if (cached) {
            return cached as File;
        }
        const file = await this.#engine.readFile(np, engineOptions);
        if (!file) {
            return null;
        }
        this.#cache.set(key, file, cache_options);

        const stats = await this._statOrNull(np, options);
        if (stats) {
            attachStats(file, stats);
        }

        return file;
    }

    async stat(path: string, options?: VFSStatOptions & SystemOptions): Promise<VFSEntry> {
        const head = await this._statOrNull(this.normalizePath(path), options || {});
        if (!head) {
            throw new VFSNotFoundError(path);
        }
        return head;
    }

    async statOrNull(path: string, options?: VFSStatOptions & SystemOptions): Promise<VFSEntry | null> {
        return this._statOrNull(this.normalizePath(path), options || {});
    }

    async getDir(path: string, options?: VFSGetDirOptions & SystemOptions): Promise<File> {
        const np = this.normalizePath(path);

        const file = await this._loadFile(np, options || {});
        if (!file) {
            throw new VFSNotFoundError(path);
        }

        if (file.type !== "directory") {
            throw new VFSNotADirectoryError(path);
        }

        return file;
    }

    /**
     * Read a file at the given path.
     */
    async readFile(path: string, options?: VFSReadFileOptions & SystemOptions): Promise<File> {
        const np = this.normalizePath(path);

        const file = await this._loadFile(np, options || {});
        if (!file) {
            throw new VFSNotFoundError(path);
        }

        if (file.type === "directory") {
            throw new VFSNotAFileError(path);
        }

        return file;
    }

    /**
     * Read and parse a JSON file at the given path.
     */
    async readJSON<T>(path: string, options?: VFSReadJSONOptions & SystemOptions): Promise<T> {
        const file = await this.readFile(path, options);
        if (!options?.skip_mime_check && !JSON_MIME_TYPES.includes(file.type)) {
            throw new VFSInvalidPathError(
                `File at path ${path} is not a JSON file (mime type: ${file.type})`,
            );
        }
        const text = await file.text();
        try {
            return JSON.parse(text) as T;
        } catch (error) {
            throw new VFSInvalidPathError(
                `File at path ${path} contains invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
            );
        }
    }

    /**
     * Read text from a file at the given path.
     */
    async readText(path: string, options?: VFSReadTextOptions): Promise<string> {
        const file = await this.readFile(path, options);
        if (
            !options?.skip_mime_check &&
            !(file.type.startsWith("text/") || EXOTIC_TEXT_MIME_TYPES.includes(file.type))
        ) {
            throw new VFSInvalidPathError(
                `File at path ${path} is not a text file (mime type: ${file.type})`,
            );
        }
        return file.text();
    }

    /**
     * Read a file or a directory file at the given path.
     */
    async read(path: string, options?: VFSReadOptions & SystemOptions): Promise<File> {
        const np = this.normalizePath(path);

        const file = await this._loadFile(np, options || {});
        if (!file) {
            throw new VFSNotFoundError(path);
        }

        return file;
    }

    /**
     * Read the contents of a directory.
     */
    async readdir(path: string, options?: VFSReaddirOptions & SystemOptions): Promise<VFSEntry[]> {
        const np = this.normalizePath(path);

        const cached = this.#cache.get({ np, typ: "dir" });
        if (cached) {
            return cached as VFSEntry[];
        }

        if (options?.check_is_dir) {
            const item = await this._statOrNull(np, options || {});
            if (!item) {
                throw new VFSNotFoundError(path);
            }

            if (item.type !== "directory") {
                throw new VFSNotADirectoryError(path);
            }
        }

        const entries = await collectAsync(this.streamDir(np, options));
        this.#cache.set({ np, typ: "dir" }, entries, options?.cache_options);

        return entries;
    }

    /**
     * Stream the entries of a directory.
     */
    async *streamDir(path: string, options?: VFSReaddirOptions & SystemOptions): VFSEntryStream {
        const np = this.normalizePath(path);
        const { cache_options, ...engineOptions } = options || {};

        for await (const entry of this.#engine.readdir(np, engineOptions)) {
            const entryNp = this.normalizePath(entry.path);
            this.#cache.set({ np: entryNp, typ: "stat" }, entry, cache_options);
            yield entry;
        }
    }

    /**
     * Remove an item (file or directory) at the given path.
     */
    async rm(path: string, options?: VFSRmOptions & SystemOptions): Promise<void> {
        const np = this.normalizePath(path);
        const { cache_options, ...engineOptions } = options || {};
        await this.#engine.rm(np, engineOptions);
        this._clearPathFromCache(np);
    }

    /**
     * Remove a file at the given path.
     */
    async unlink(path: string, options?: VFSUnlinkOptions & SystemOptions): Promise<void> {
        const np = this.normalizePath(path);

        const item = await this._statOrNull(np, options || {});
        if (!item) {
            if (options?.ignore_if_not_exists) {
                return;
            }
            throw new VFSNotFoundError(path);
        }

        if (item.type !== "file") {
            throw new VFSNotAFileError(path);
        }

        const { cache_options, ...engineOptions } = options || {};
        await this.#engine.rm(np, engineOptions);
        this._clearPathFromCache(np);
    }

    /**
     * Remove a directory at the given path.
     */
    async rmdir(path: string, options?: VFSRmdirOptions & SystemOptions): Promise<void> {
        const np = this.normalizePath(path);

        const item = await this._statOrNull(np, options || {});
        if (!item) {
            if (options?.ignore_if_not_exists) {
                return;
            }
            throw new VFSNotFoundError(path);
        }

        if (item.type !== "directory") {
            throw new VFSNotADirectoryError(path);
        }

        const { cache_options, ...engineOptions } = options || {};
        await this.#engine.rm(np, engineOptions);
        this._clearPathFromCache(np);
    }

    /**
     * Stream for items matching the given patterns.
     */
    async *streamGlob(
        includePatterns: string | string[],
        options?: VFSGlobOptions & SystemOptions,
    ): VFSEntryStream {
        const { cache_options, ...engineOptions } = options || {};
        const entries = await this.#engine.glob(
            Array.isArray(includePatterns) ? includePatterns : [includePatterns],
            engineOptions,
        );

        for await (const entry of entries) {
            const np = this.normalizePath(entry.path);
            this.#cache.set({ np, typ: "stat" }, entry, cache_options);
            yield entry;
        }
    }

    /**
     * Glob for items matching the given patterns.
     */
    async glob(
        includePatterns: string | string[],
        options?: VFSGlobOptions & SystemOptions,
    ): Promise<VFSEntry[]> {
        return collectAsync(this.streamGlob(includePatterns, options));
    }

    /**
     * Write a file at the given path.
     */
    async writeFile(
        path: string,
        file: File,
        options?: VFSWriteFileOptions & SystemOptions,
    ): Promise<VFSEntry> {
        const np = this.normalizePath(path);
        const { cache_options, ...engineOptions } = options || {};

        const newEntry = await this.#engine.writeFile(np, file, engineOptions);

        this._clearPathFromCache(np);
        this.#cache.set({ typ: "stat", np }, newEntry, cache_options);
        this.#cache.set({ typ: "file", np }, file, cache_options);

        attachStats(file, newEntry);

        return newEntry;
    }

    /**
     * Write multiple files in a stream.
     */
    async *writeStream(
        files: { path: string; file: File }[],
        options?: VFSWriteFileOptions & SystemOptions,
    ): VFSEntryStream {
        const { cache_options, ...engineOptions } = options || {};
        const fileMap = new Map<string, File>();
        const inputList = files.map((f) => {
            const np = this.normalizePath(f.path);
            fileMap.set(np, f.file);
            return { file: f.file, path: np };
        });

        for await (const newEntry of this.#engine.writeFiles(inputList, engineOptions)) {
            const np = this.normalizePath(newEntry.path);
            const file = fileMap.get(np);

            this._clearPathFromCache(np);
            if (file) {
                this.#cache.set({ np, typ: "file" }, file, cache_options);
                attachStats(file, newEntry);
            }
            this.#cache.set({ np, typ: "stat" }, newEntry, cache_options);

            yield newEntry;
        }
    }

    /**
     * Write multiple files.
     */
    async writeFiles(
        files: { path: string; file: File }[],
        options?: VFSWriteFileOptions & SystemOptions,
    ): Promise<VFSEntry[]> {
        return collectAsync(this.writeStream(files, options));
    }

    /**
     * Write JSON data to a file.
     */
    async writeJSON<T>(
        path: string,
        data: T,
        options?: VFSWriteJSONOptions & SystemOptions,
    ): Promise<VFSEntry> {
        const jsonString = JSON.stringify(data, null, 2);
        const file = new File([jsonString], basename(path), { type: "application/json" });
        return this.writeFile(path, file, options);
    }

    /**
     * Write text to a file.
     */
    async writeText(
        path: string,
        text: string,
        options?: VFSWriteTextOptions & SystemOptions,
    ): Promise<VFSEntry> {
        const file = new File([text], basename(path), { type: "text/plain" });
        return this.writeFile(path, file, options);
    }

    /**
     * Create a directory.
     */
    async mkdir(path: string, options?: VFSMkdirOptions & SystemOptions): Promise<VFSEntry> {
        const np = this.normalizePath(path);
        const { cache_options, ...engineOptions } = options || {};

        const file = new File([], "", { type: "inode/directory" });
        const newEntry = await this.#engine.writeFile(np, file, engineOptions);

        this._clearPathFromCache(np);
        this.#cache.set({ np, typ: "file" }, file, cache_options);
        this.#cache.set({ np, typ: "stat" }, newEntry, cache_options);

        return newEntry;
    }

    /**
     * Rename (move) an item.
     */
    async rename(
        oldPath: string,
        newPath: string,
        options?: VFSRenameOptions & SystemOptions,
    ): Promise<void> {
        const onp = this.normalizePath(oldPath);
        const nnp = this.normalizePath(newPath);
        const { cache_options, ...engineOptions } = options || {};
        const newStats = await this.#engine.rename(onp, nnp, engineOptions);
        this._clearPathFromCache(onp);
        this._clearPathFromCache(nnp);
        this.#cache.set({ np: nnp, typ: "stat" }, newStats, cache_options);
    }

    /**
     * Check if an item exists at the given path.
     */
    async exists(path: string, options?: VFSExistsOptions & SystemOptions): Promise<boolean> {
        const np = this.normalizePath(path);

        const item = await this._statOrNull(np, options || {});
        if (!item) {
            return false;
        }

        if (options?.type !== undefined && item.type !== options.type) {
            return false;
        }

        return true;
    }

    /**
     * Get the text representation of an item.
     */
    async readTextRepresentation(
        path: string,
        options?: VFSReadTextRepresentationOptions & SystemOptions,
    ): Promise<string> {
        const np = this.normalizePath(path);
        const { cache_options, ...engineOptions } = options || {};
        const key: CacheKey = { np, typ: "txt" };

        const cached = this.#cache.get(key);
        if (cached) {
            return cached as string;
        }

        const text = await this.#engine.readTextRepresentation(np, engineOptions);
        this.#cache.set(key, text, cache_options);

        return text;
    }
}
