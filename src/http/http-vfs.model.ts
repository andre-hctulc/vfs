import { z } from "zod";
import { VFSContentSchema, VFSEntrySchema } from "../vfs.model.js";
import {
    VFSGlobOptionsSchema,
    VFSMkdirOptionsSchema,
    VFSReaddirOptionsSchema,
    VFSReadFileOptionsSchema,
    VFSReadTextRepresentationOptionsSchema,
    VFSRenameOptionsSchema,
    VFSRmOptionsSchema,
    VFSStatOptionsSchema,
    VFSStatsOptionsSchema,
    VFSWriteFileOptionsSchema,
} from "../vfs-options.model.js";

/// #### Base ####

export const BaseRequestSchema = z
    .object({
        metadata: z
            .record(z.string(), z.any())
            .optional()
            .describe("Optional metadata for the request, useful for extensibility"),
    })
    .describe("Base schema for all VFS HTTP requests");
export type BaseRequest = z.infer<typeof BaseRequestSchema>;

export const StreamRequestSchema = BaseRequestSchema.extend({
    limit: z.number().optional().describe("Maximum number of items to return"),
    offset: z.number().optional().describe("Number of items to skip from the start"),
    next_token: z.string().optional().describe("Token for pagination continuation"),
}).describe("Base schema for paginated VFS HTTP requests");
export type StreamRequest = z.infer<typeof StreamRequestSchema>;

export const BaseResponseSchema = z
    .object({
        metadata: z
            .record(z.string(), z.any())
            .optional()
            .describe("Optional response metadata, useful for extensibility"),
    })
    .describe("Base schema for all VFS HTTP responses");
export type BaseResponse = z.infer<typeof BaseResponseSchema>;

export const ErrorResponseSchema = BaseResponseSchema.extend({
    error: z
        .object({
            code: z.string().describe("Error code identifier"),
            message: z.string().describe("Human-readable error message"),
            details: z.any().optional().describe("Additional error details"),
        })
        .describe("Error information if the operation failed"),
}).describe("Base schema for all VFS HTTP responses");
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

export const StreamResponseSchema = BaseResponseSchema.extend({
    is_truncated: z
        .boolean()
        .optional()
        .describe("Whether the response has been truncated due to size limits"),
    next_token: z.string().optional().describe("Token to fetch the next page of results"),
}).describe("Base schema for paginated VFS HTTP responses");
export type StreamResponse = z.infer<typeof StreamResponseSchema>;

// #### Endpoints ####

// ## read_dir

export const ReaddirRequestSchema = StreamRequestSchema.extend({
    operation: z.literal("read_dir").describe("Operation type identifier"),
    path: z.string().describe("Directory path to read"),
    options: VFSReaddirOptionsSchema.optional(),
}).describe("Request schema for reading directory contents");
export type ReaddirRequest = z.infer<typeof ReaddirRequestSchema>;

export const ReaddirResponseSchema = StreamResponseSchema.extend({
    entries: VFSEntrySchema.array().describe("Array of directory entries"),
}).describe("Response schema for directory listing operations");
export type ReaddirResponse = z.infer<typeof ReaddirResponseSchema>;

// ## read_file

export const ReadFileRequestSchema = BaseRequestSchema.extend({
    operation: z.literal("read_file").describe("Operation type identifier"),
    path: z.string().describe("File path to read"),
    options: VFSReadFileOptionsSchema.optional(),
}).describe("Request schema for reading file contents");
export type ReadFileRequest = z.infer<typeof ReadFileRequestSchema>;

export const ReadFileResponseSchema = BaseResponseSchema.extend({
    file: VFSContentSchema.describe("Content of the requested file"),
})
    .extend({})
    .describe("Response schema for file reading operations");
export type ReadFileResponse = z.infer<typeof ReadFileResponseSchema>;

// ## read_text_representation

export const ReadTextRepresentationRequestSchema = BaseRequestSchema.extend({
    operation: z.literal("read_text_representation").describe("Operation type identifier"),
    path: z.string().describe("File path to read text representation for"),
    options: VFSReadTextRepresentationOptionsSchema.optional(),
}).describe("Request schema for reading files as text representation (including binary files)");
export type ReadTextRepresentationRequest = z.infer<typeof ReadTextRepresentationRequestSchema>;

export const ReadTextRepresentationResponseSchema = BaseResponseSchema.extend({
    text: z.string().describe("Text representation of the file content"),
})
    .extend({})
    .describe("Response schema for text representation reading operations");
export type ReadTextRepresentationResponse = z.infer<typeof ReadTextRepresentationResponseSchema>;

// ## stat

export const StatRequestSchema = BaseRequestSchema.extend({
    operation: z.literal("stat").describe("Operation type identifier"),
    path: z.string().describe("File or directory path to get statistics for"),
    options: VFSStatOptionsSchema.optional(),
}).describe("Request schema for getting file/directory statistics");
export type StatRequest = z.infer<typeof StatRequestSchema>;

export const StatResponseSchema = BaseResponseSchema.extend({
    entry: VFSEntrySchema.describe("File or directory entry"),
}).describe("Response schema for stat operations");
export type StatResponse = z.infer<typeof StatResponseSchema>;

// ## stats

export const StatsRequestSchema = StreamRequestSchema.extend({
    operation: z.literal("stats").describe("Operation type identifier"),
    paths: z.string().array().describe("Array of file/directory paths to get statistics for"),
    options: VFSStatsOptionsSchema.optional(),
}).describe("Request schema for getting statistics of multiple files/directories");
export type StatsRequest = z.infer<typeof StatsRequestSchema>;

export const StatsResponseSchema = StreamResponseSchema.extend({
    entries: VFSEntrySchema.array().describe("Array of file/directory entries"),
}).describe("Response schema for batch stats operations");
export type StatsResponse = z.infer<typeof StatsResponseSchema>;

// ## glob

export const GlobRequestSchema = StreamRequestSchema.extend({
    operation: z.literal("glob").describe("Operation type identifier"),
    patterns: z.string().array().describe("Array of glob patterns to match files against"),
    options: VFSGlobOptionsSchema.optional(),
}).describe("Request schema for glob pattern matching in the filesystem");
export type GlobRequest = z.infer<typeof GlobRequestSchema>;

export const GlobResponseSchema = StreamResponseSchema.extend({
    entries: VFSEntrySchema.array().describe("Array of matching file/directory entries"),
}).describe("Response schema for glob pattern matching operations");
export type GlobResponse = z.infer<typeof GlobResponseSchema>;

// ## write_file

export const WriteFileRequestSchema = BaseRequestSchema.extend({
    operation: z.literal("write_file").describe("Operation type identifier"),
    path: z.string().describe("Target file path to write to"),
    file: VFSContentSchema.describe("File to write"),
    options: VFSWriteFileOptionsSchema.optional(),
}).describe("Request schema for writing a single file");
export type WriteFileRequest = z.infer<typeof WriteFileRequestSchema>;

export const WriteFileResponseSchema = BaseResponseSchema.extend({
    entry: VFSEntrySchema.describe("Written file entry"),
}).describe("Response schema for file writing operations");
export type WriteFileResponse = z.infer<typeof WriteFileResponseSchema>;

// ## write_files

export const WriteFilesRequestSchema = StreamRequestSchema.extend({
    operation: z.literal("write_files").describe("Operation type identifier"),
    files: VFSContentSchema.extend({ path: z.string().describe("Target file path for this content") })
        .array()
        .describe("Array of files to write with their paths and content"),
    options: VFSWriteFileOptionsSchema.optional(),
}).describe("Request schema for writing multiple files in a batch operation");
export type WriteFilesRequest = z.infer<typeof WriteFilesRequestSchema>;

export const WriteFilesResponseSchema = StreamResponseSchema.extend({
    entries: VFSEntrySchema.array().describe("Array of written file entries"),
}).describe("Response schema for batch file writing operations");
export type WriteFilesResponse = z.infer<typeof WriteFilesResponseSchema>;

// ## rm

export const RmRequestSchema = BaseRequestSchema.extend({
    operation: z.literal("rm").describe("Operation type identifier"),
    path: z.string().describe("File or directory path to remove"),
    options: VFSRmOptionsSchema.optional(),
}).describe("Request schema for removing files or directories");
export type RmRequest = z.infer<typeof RmRequestSchema>;

export const RmResponseSchema = BaseResponseSchema.extend({}).describe(
    "Response schema for file/directory removal operations",
);
export type RmResponse = z.infer<typeof RmResponseSchema>;

// ## rename

export const RenameRequestSchema = BaseRequestSchema.extend({
    operation: z.literal("rename").describe("Operation type identifier"),
    old_path: z.string().describe("Current path of the file/directory to rename"),
    new_path: z.string().describe("New path for the file/directory"),
    options: VFSRenameOptionsSchema.optional(),
}).describe("Request schema for renaming/moving files or directories");
export type RenameRequest = z.infer<typeof RenameRequestSchema>;

export const RenameResponseSchema = BaseResponseSchema.extend({
    entry: VFSEntrySchema.describe("Renamed file/directory entry"),
}).describe("Response schema for rename/move operations");
export type RenameResponse = z.infer<typeof RenameResponseSchema>;

// ## mkdir

export const MkdirRequestSchema = BaseRequestSchema.extend({
    operation: z.literal("mkdir").describe("Operation type identifier"),
    path: z.string().describe("Directory path to create"),
    options: VFSMkdirOptionsSchema.optional(),
}).describe("Request schema for creating directories");
export type MkdirRequest = z.infer<typeof MkdirRequestSchema>;

export const MkdirResponseSchema = BaseResponseSchema.extend({
    entry: VFSEntrySchema.describe("Created directory entry"),
}).describe("Response schema for directory creation operations");
export type MkdirResponse = z.infer<typeof MkdirResponseSchema>;

// ## Union

export const VFSRequestSchema = z
    .discriminatedUnion("operation", [
        ReaddirRequestSchema,
        ReadFileRequestSchema,
        StatRequestSchema,
        StatsRequestSchema,
        GlobRequestSchema,
        WriteFileRequestSchema,
        WriteFilesRequestSchema,
        RmRequestSchema,
        RenameRequestSchema,
        MkdirRequestSchema,
        ReadTextRepresentationRequestSchema,
    ])
    .describe("Union of all possible VFS HTTP request types");
export type VFSRequest = z.infer<typeof VFSRequestSchema>;

export const VFSResponseSchema = z
    .discriminatedUnion("operation", [
        ReaddirResponseSchema,
        ReadFileResponseSchema,
        StatResponseSchema,
        StatsResponseSchema,
        GlobResponseSchema,
        WriteFileResponseSchema,
        WriteFilesResponseSchema,
        RmResponseSchema,
        RenameResponseSchema,
        MkdirResponseSchema,
        ReadTextRepresentationResponseSchema,
    ])
    .describe("Union of all possible VFS HTTP response types");
export type VFSResponse = z.infer<typeof VFSResponseSchema>;
