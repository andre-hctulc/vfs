import { base64ToFile, fileToBase64 } from "../util/vfs.util.js";
import type { VFSEngine } from "../vfs-engine.interface.js";
import type {
    VFSGlobOptions,
    VFSMkdirOptions,
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
import { basename, errorCodeToError } from "../vfs-system.util.js";
import { VFSError } from "../vfs.errors.js";
import type { VFSEntry, VFSEntryStream } from "../vfs.model.js";
import {
    ReadFileResponseSchema,
    StatResponseSchema,
    type ReaddirRequest,
    type ReaddirResponse,
    type ReadFileRequest,
    type ReadFileResponse,
    type StatRequest,
    type StatResponse,
    type GlobRequest,
    type StatsRequest,
    type StatsResponse,
    type WriteFileRequest,
    type WriteFileResponse,
    type WriteFilesRequest,
    type RmResponse,
    type RmRequest,
    type RenameRequest,
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
    type ReadTextRepresentationRequest,
    BaseResponseSchema,
    type BaseResponse,
    type MkdirRequest,
    MkdirResponseSchema,
    type MkdirResponse,
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
}

interface FetchOptions<T> {
    responseSchema: ZodType<T>;
    body: string;
}

export class HttpVFSEngine implements VFSEngine {
    #options: VFSHttpEngineOptions;
    #endpoint: string | URL;

    constructor(endpoint: string | URL, options: VFSHttpEngineOptions) {
        this.#options = options;
        this.#endpoint = endpoint;
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
                body: options.body,
                signal: abortController.signal,
            });
        } catch (error) {
            if (error instanceof Error && error.name === "AbortError") {
                throw new VFSError(`Request timeout after ${timeout}ms`);
            }

            throw error;
        } finally {
            clearTimeout(to);
        }

        if (!response.ok) {
            let resText: string;
            let res: BaseResponse | null = null;
            const isJSONResponse = response.headers.get("Content-Type")?.includes("application/json");

            if (isJSONResponse) {
                try {
                    const errorData = await response.json();
                    const { success, data } = BaseResponseSchema.loose().safeParse(errorData);
                    if (success) {
                        res = data;
                        resText = data.error?.message || "<no error message provided>";
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

            if (res?.error?.code) {
                const err = errorCodeToError(res.error.code, res.error.details);
                if (err) {
                    throw err;
                }
            }

            throw new VFSError(`HTTP Error (${response.status}): ${resText}`);
        }

        const responseData = await response.json();
        return options.responseSchema.parse(responseData);
    }

    async *#streamEntries<B extends StreamRequest, T extends EntriesResponse>(
        body: B,
        responseSchema: ZodType<T>,
        chunkSize?: number,
    ): VFSEntryStream {
        let currentOffset = 0;
        const limit = chunkSize ?? 100;
        let nextToken: string | undefined = undefined;
        let nextTokenMode = false;

        while (true) {
            const result: EntriesResponse = await this.#fetchJson({
                responseSchema,
                body: JSON.stringify({
                    ...body,
                    offset: nextTokenMode ? undefined : currentOffset,
                    limit,
                    next_token: nextToken,
                } satisfies StreamRequest),
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
                if (result.entries.length < limit || result.is_truncated === false) {
                    break;
                }
            }
        }
    }

    async stat(path: string, options: VFSStatOptions): Promise<VFSEntry | null> {
        const data = await this.#fetchJson<StatResponse>({
            responseSchema: StatResponseSchema,
            body: JSON.stringify({
                operation: "stat",
                path,
                options,
            } satisfies StatRequest),
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
        );
    }

    async readFile(path: string, options: VFSReadFileOptions): Promise<File> {
        const data = await this.#fetchJson<ReadFileResponse>({
            responseSchema: ReadFileResponseSchema,
            body: JSON.stringify({
                operation: "read_file",
                path,
                options,
            } satisfies ReadFileRequest),
        });
        return base64ToFile(data.file.content, {
            type: data.file.mime_type,
            name: basename(path),
        });
    }

    async readTextRepresentation(path: string, options: VFSReadTextRepresentationOptions): Promise<string> {
        const data = await this.#fetchJson<ReadTextRepresentationResponse>({
            responseSchema: ReadTextRepresentationResponseSchema,
            body: JSON.stringify({
                operation: "read_text_representation",
                path,
                options,
            } satisfies ReadTextRepresentationRequest),
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
        );
    }

    async writeFile(path: string, file: File, options: VFSWriteFileOptions): Promise<VFSEntry> {
        const data = await this.#fetchJson<WriteFileResponse>({
            responseSchema: WriteFileResponseSchema,
            body: JSON.stringify({
                operation: "write_file",
                path,
                file: { content: await fileToBase64(file), mime_type: file.type, size: file.size },
                options,
            } satisfies WriteFileRequest),
        });
        return data.entry;
    }

    async *writeFiles(files: { path: string; file: File }[], options: VFSWriteFilesOptions): VFSEntryStream {
        yield* this.#streamEntries<WriteFilesRequest, WriteFilesResponse>(
            {
                operation: "write_files",
                files: await Promise.all(
                    files.map(async ({ path, file }) => ({
                        path,
                        content: await fileToBase64(file),
                        mime_type: file.type,
                        size: file.size,
                    })),
                ),
                options,
            },
            WriteFilesResponseSchema,
        );
    }

    async rm(path: string, options: VFSRmOptions): Promise<void> {
        await this.#fetchJson<RmResponse>({
            responseSchema: RmResponseSchema,
            body: JSON.stringify({
                operation: "rm",
                path,
                options,
            } satisfies RmRequest),
        });
    }

    async rename(oldPath: string, newPath: string, options: VFSRenameOptions): Promise<VFSEntry> {
        const data = await this.#fetchJson<RenameResponse>({
            responseSchema: RenameResponseSchema,
            body: JSON.stringify({
                operation: "rename",
                old_path: oldPath,
                new_path: newPath,
                options,
            } as RenameRequest),
        });
        return data.entry;
    }

    async mkdir(path: string, options?: VFSMkdirOptions): Promise<VFSEntry> {
        const data = await this.#fetchJson<MkdirResponse>({
            responseSchema: MkdirResponseSchema,
            body: JSON.stringify({
                operation: "mkdir",
                path,
                options,
            } satisfies MkdirRequest),
        });

        return data.entry;
    }
}
