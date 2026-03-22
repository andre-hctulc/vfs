import { deserializeFile, serializeFile } from "../util/vfs.util.js";
import type { VFSEngine } from "../vfs-engine.interface.js";
import type {
    VFSGlobOptions,
    VFSMkdirOptions,
    VFSQueryOptions,
    VFSReaddirOptions,
    VFSReadFileOptions,
    VFSReadTextRepresentationOptions,
    VFSRenameOptions,
    VFSRmOptions,
    VFSStatOptions,
    VFSStatsOptions,
    VFSWriteFileOptions,
    VFSWriteFilesOptions,
} from "../vfs-options.model.js";
import { knownError } from "../vfs-system.util.js";
import { VFSError } from "../vfs.errors.js";
import type { VFSEntry, VFSEntryStream } from "../vfs.model.js";
import {
    ReadFileResponseSchema,
    StatResponseSchema,
    type ReaddirRequest,
    type ReaddirResponse,
    type ReadFileResponse,
    type StatResponse,
    type GlobRequest,
    type StatsRequest,
    type StatsResponse,
    type WriteFileResponse,
    type WriteFilesRequest,
    type RmResponse,
    type RenameResponse,
    RenameResponseSchema,
    RmResponseSchema,
    WriteFilesResponseSchema,
    WriteFileResponseSchema,
    GlobResponseSchema,
    StatsResponseSchema,
    type GlobResponse,
    type StreamRequest,
    type StreamResponse,
    ReaddirResponseSchema,
    type WriteFilesResponse,
    ReadTextRepresentationResponseSchema,
    type ReadTextRepresentationResponse,
    MkdirResponseSchema,
    type MkdirResponse,
    ErrorResponseSchema,
    type ErrorResponse,
    type VFSRequest,
} from "./http-vfs.model.js";
import type { ZodType } from "zod";

interface EntriesResponse extends StreamResponse {
    entries: VFSEntry[];
}

export interface VFSHttpEngineOptions {
    requestInit?: Omit<RequestInit, "method" | "body" | "signal">;
    /**
     * Fetch timeout in milliseconds. If the request takes longer than this, it will be aborted and an error will be thrown.
     * @default 30000 (30 seconds)
     */
    timeout?: number;
    /**
     * Metadata added to each request
     */
    metadata?: Record<string, string>;
}

interface FetchOptions<T> {
    responseSchema: ZodType<T>;
    body: VFSRequest;
}

export class HttpVFSEngine implements VFSEngine {
    #options: VFSHttpEngineOptions;
    #endpoint: string | URL;
    #reqMetadata: Record<string, string>;

    constructor(endpoint: string | URL, options: VFSHttpEngineOptions) {
        this.#options = options;
        this.#endpoint = endpoint;
        this.#reqMetadata = options.metadata || {};
        if (typeof this.#options.timeout === "number" && this.#options.timeout < 0) {
            throw new Error("Timeout must be a positive integer");
        }
    }

    async #fetchJson<T>(options: FetchOptions<T>): Promise<T> {
        const abortController = new AbortController();
        const timeout = this.#options.timeout || 30000;
        const to = setTimeout(() => {
            abortController.abort();
        }, timeout);

        const headers = new Headers(this.#options.requestInit?.headers);
        headers.set("Content-Type", "application/json");
        let response: Response;

        try {
            response = await fetch(this.#endpoint, {
                ...this.#options.requestInit,
                method: "POST",
                headers,
                body: JSON.stringify(options.body),
                signal: abortController.signal,
            });
        } catch (error) {
            if (error instanceof Error && error.name === "AbortError") {
                throw new VFSError(`Request timeout after ${timeout}ms`, { code: "REQUEST_TIMEOUT" });
            }

            throw new VFSError(`Network Error: ${(error as Error).message}`, {
                code: "NETWORK_ERROR",
                cause: error,
            });
        } finally {
            clearTimeout(to);
        }

        if (!response.ok) {
            let resText: string;
            let errRes: ErrorResponse | null = null;
            const isJSONResponse = response.headers.get("Content-Type")?.includes("application/json");

            if (isJSONResponse) {
                try {
                    const errorData = await response.json();
                    const { success, data } = ErrorResponseSchema.loose().safeParse(errorData);
                    if (success) {
                        errRes = data;
                        resText = data.error.message || "<no error message provided>";
                    } else {
                        resText = "<invalid error response format>";
                    }
                } catch {
                    resText = "<unable to parse error response>";
                }
            } else {
                try {
                    resText = await response.text();
                } catch {
                    resText = "<unable to read response body>";
                }
            }

            if (errRes?.error?.code) {
                const err = knownError(errRes.error.code, errRes.error.details);
                if (err) {
                    throw err;
                }
            }

            throw new VFSError(`Response not ok (${response.status}): ${resText}`, {
                code: errRes?.error?.code,
                details: {},
            });
        }

        const responseData = await response.json();

        // Check is error
        const errRes = ErrorResponseSchema.safeParse(responseData);
        if (errRes.success) {
            const err = knownError(errRes.data.error.code, errRes.data.error.details);
            if (err) {
                throw err;
            }
            throw new VFSError(errRes.data.error.message, {
                code: errRes.data.error.code,
                details: errRes.data.error.details,
            });
        }

        return options.responseSchema.parse(responseData);
    }

    async *#streamEntries<B extends VFSRequest & StreamRequest, T extends EntriesResponse>(
        body: B,
        responseSchema: ZodType<T>,
        queryOptions: VFSQueryOptions,
    ): VFSEntryStream {
        let currentOffset = queryOptions?.offset ?? 0;
        const chunkSize = Math.min(queryOptions?.limit ?? 100, 100);
        const limit = queryOptions?.limit ?? Infinity;
        let nextToken: string | undefined = queryOptions?.next_token;
        let nextTokenMode = false;
        let loadCount = 0;

        while (true) {
            const result: EntriesResponse = await this.#fetchJson({
                responseSchema,
                body: {
                    ...body,
                    offset: nextTokenMode ? undefined : currentOffset,
                    limit: chunkSize,
                    next_token: nextToken,
                    metadata: { ...this.#reqMetadata, ...body.metadata },
                } satisfies B,
            });

            // Yield all entries from this batch
            for (const entry of result.entries) {
                yield entry;
            }

            if (result.next_token || nextTokenMode) {
                nextTokenMode = true;
                nextToken = result.next_token;
                if (!nextToken) {
                    break;
                }
            } else {
                currentOffset += result.entries.length;
                loadCount += result.entries.length;
                if (
                    loadCount >= limit ||
                    result.entries.length < chunkSize ||
                    result.is_truncated === false
                ) {
                    break;
                }
            }
        }
    }

    async stat(path: string, options: VFSStatOptions): Promise<VFSEntry | null> {
        const data = await this.#fetchJson<StatResponse>({
            responseSchema: StatResponseSchema,
            body: {
                operation: "stat",
                path,
                options,
            },
        });
        return data.entry;
    }

    stats(paths: string[], options: VFSStatsOptions): VFSEntryStream {
        return this.#streamEntries<StatsRequest, StatsResponse>(
            {
                operation: "stats",
                paths,
                options,
            },
            StatsResponseSchema,
            options.query_options || {},
        );
    }

    glob(patterns: string[], options: VFSGlobOptions): VFSEntryStream {
        return this.#streamEntries<GlobRequest, GlobResponse>(
            {
                operation: "glob",
                patterns,
                options,
            },
            GlobResponseSchema,
            options.query_options || {},
        );
    }

    async readFile(path: string, options: VFSReadFileOptions): Promise<File> {
        const data = await this.#fetchJson<ReadFileResponse>({
            responseSchema: ReadFileResponseSchema,
            body: {
                operation: "read_file",
                path,
                options,
            },
        });
        return deserializeFile(data.file, path);
    }

    async readTextRepresentation(path: string, options: VFSReadTextRepresentationOptions): Promise<string> {
        const data = await this.#fetchJson<ReadTextRepresentationResponse>({
            responseSchema: ReadTextRepresentationResponseSchema,
            body: {
                operation: "read_text_representation",
                path,
                options,
            },
        });
        return data.text;
    }

    readdir(path: string, options: VFSReaddirOptions): VFSEntryStream {
        return this.#streamEntries<ReaddirRequest, ReaddirResponse>(
            {
                operation: "read_dir",
                path,
                options,
            },
            ReaddirResponseSchema,
            options.query_options || {},
        );
    }

    async writeFile(path: string, file: File, options: VFSWriteFileOptions): Promise<VFSEntry> {
        const data = await this.#fetchJson<WriteFileResponse>({
            responseSchema: WriteFileResponseSchema,
            body: {
                operation: "write_file",
                path,
                file: await serializeFile(file),
                options,
            },
        });
        return data.entry;
    }

    async *writeFiles(files: { path: string; file: File }[], options: VFSWriteFilesOptions): VFSEntryStream {
        yield* this.#streamEntries<WriteFilesRequest, WriteFilesResponse>(
            {
                operation: "write_files",
                files: await Promise.all(
                    files.map(async ({ path, file }) => {
                        return {
                            path,
                            ...(await serializeFile(file)),
                        };
                    }),
                ),
                options,
            },
            WriteFilesResponseSchema,
            {},
        );
    }

    async rm(path: string, options: VFSRmOptions): Promise<void> {
        await this.#fetchJson<RmResponse>({
            responseSchema: RmResponseSchema,
            body: {
                operation: "rm",
                path,
                options,
            },
        });
    }

    async rename(oldPath: string, newPath: string, options: VFSRenameOptions): Promise<VFSEntry> {
        const data = await this.#fetchJson<RenameResponse>({
            responseSchema: RenameResponseSchema,
            body: {
                operation: "rename",
                old_path: oldPath,
                new_path: newPath,
                options,
            },
        });
        return data.entry;
    }

    async mkdir(path: string, options?: VFSMkdirOptions): Promise<VFSEntry> {
        const data = await this.#fetchJson<MkdirResponse>({
            responseSchema: MkdirResponseSchema,
            body: {
                operation: "mkdir",
                path,
                options,
            },
        });

        return data.entry;
    }
}
