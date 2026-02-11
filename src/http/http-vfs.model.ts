import { z } from "zod";
import { VFSEntrySchema } from "../vfs.model.js";
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

export const ContentSchema = z
    .object({
        content: z.base64().describe("Base64 encoded content of the file"),
        mime_type: z.string().describe("The MIME type of the content"),
        size: z.number().describe("The size of the content in bytes"),
    })
    .describe("VFS Content Payload");
export type Content = z.infer<typeof ContentSchema>;

export const BaseRequestSchema = z.object({
    /**
     * Optional request ID.
     */
    request_id: z.string().optional(),
});
export type BaseRequest = z.infer<typeof BaseRequestSchema>;

export const StreamRequestSchema = BaseRequestSchema.extend({
    limit: z.number().optional(),
    offset: z.number().optional(),
    next_token: z.string().optional(),
});
export type StreamRequest = z.infer<typeof StreamRequestSchema>;

export const BaseResponseSchema = z.object({
    /**
     * Optional request ID to correlate with the request.
     */
    request_id: z.string().optional(),
    error: z
        .object({
            code: z.string(),
            message: z.string(),
            details: z.any().optional(),
        })
        .optional(),
});
export type BaseResponse = z.infer<typeof BaseResponseSchema>;

export const StreamResponseSchema = BaseResponseSchema.extend({
    is_truncated: z.boolean().optional(),
    next_token: z.string().optional(),
});
export type StreamResponse = z.infer<typeof StreamResponseSchema>;

// #### Endpoints ####

// ## read_dir

export const ReaddirRequestSchema = StreamRequestSchema.extend({
    operation: z.literal("read_dir"),
    path: z.string(),
    options: VFSReaddirOptionsSchema.optional(),
});
export type ReaddirRequest = z.infer<typeof ReaddirRequestSchema>;

export const ReaddirResponseSchema = StreamResponseSchema.extend({
    entries: VFSEntrySchema.array(),
});
export type ReaddirResponse = z.infer<typeof ReaddirResponseSchema>;

// ## read_file

export const ReadFileRequestSchema = BaseRequestSchema.extend({
    operation: z.literal("read_file"),
    path: z.string(),
    options: VFSReadFileOptionsSchema.optional(),
});
export type ReadFileRequest = z.infer<typeof ReadFileRequestSchema>;

export const ReadFileResponseSchema = BaseResponseSchema.extend({ file: ContentSchema }).extend({});
export type ReadFileResponse = z.infer<typeof ReadFileResponseSchema>;

// ## read_text_representation

export const ReadTextRepresentationRequestSchema = BaseRequestSchema.extend({
    operation: z.literal("read_text_representation"),
    path: z.string(),
    options: VFSReadTextRepresentationOptionsSchema.optional(),
});
export type ReadTextRepresentationRequest = z.infer<typeof ReadTextRepresentationRequestSchema>;

export const ReadTextRepresentationResponseSchema = BaseResponseSchema.extend({ text: z.string() }).extend(
    {},
);
export type ReadTextRepresentationResponse = z.infer<typeof ReadTextRepresentationResponseSchema>;

// ## stat

export const StatRequestSchema = BaseRequestSchema.extend({
    operation: z.literal("stat"),
    path: z.string(),
    options: VFSStatOptionsSchema.optional(),
});
export type StatRequest = z.infer<typeof StatRequestSchema>;

export const StatResponseSchema = BaseResponseSchema.extend({ entry: VFSEntrySchema });
export type StatResponse = z.infer<typeof StatResponseSchema>;

// ## stats

export const StatsRequestSchema = StreamRequestSchema.extend({
    operation: z.literal("stats"),
    paths: z.string().array(),
    options: VFSStatsOptionsSchema.optional(),
});
export type StatsRequest = z.infer<typeof StatsRequestSchema>;

export const StatsResponseSchema = StreamResponseSchema.extend({ entries: VFSEntrySchema.array() });
export type StatsResponse = z.infer<typeof StatsResponseSchema>;

// ## glob

export const GlobRequestSchema = StreamRequestSchema.extend({
    operation: z.literal("glob"),
    patterns: z.string().array(),
    options: VFSGlobOptionsSchema.optional(),
});
export type GlobRequest = z.infer<typeof GlobRequestSchema>;

export const GlobResponseSchema = StreamResponseSchema.extend({ entries: VFSEntrySchema.array() });
export type GlobResponse = z.infer<typeof GlobResponseSchema>;

// ## write_file

export const WriteFileRequestSchema = BaseRequestSchema.extend({
    operation: z.literal("write_file"),
    path: z.string(),
    file: ContentSchema,
    options: VFSWriteFileOptionsSchema.optional(),
});
export type WriteFileRequest = z.infer<typeof WriteFileRequestSchema>;

export const WriteFileResponseSchema = BaseResponseSchema.extend({ entry: VFSEntrySchema });
export type WriteFileResponse = z.infer<typeof WriteFileResponseSchema>;

// ## write_files

export const WriteFilesRequestSchema = StreamRequestSchema.extend({
    operation: z.literal("write_files"),
    files: ContentSchema.extend({ path: z.string() }).array(),
    options: VFSWriteFileOptionsSchema.optional(),
});
export type WriteFilesRequest = z.infer<typeof WriteFilesRequestSchema>;

export const WriteFilesResponseSchema = StreamResponseSchema.extend({ entries: VFSEntrySchema.array() });
export type WriteFilesResponse = z.infer<typeof WriteFilesResponseSchema>;

// ## rm

export const RmRequestSchema = BaseRequestSchema.extend({
    operation: z.literal("rm"),
    path: z.string(),
    options: VFSRmOptionsSchema.optional(),
});
export type RmRequest = z.infer<typeof RmRequestSchema>;

export const RmResponseSchema = BaseResponseSchema.extend({});
export type RmResponse = z.infer<typeof RmResponseSchema>;

// ## rename

export const RenameRequestSchema = BaseRequestSchema.extend({
    operation: z.literal("rename"),
    old_path: z.string(),
    new_path: z.string(),
    options: VFSRenameOptionsSchema.optional(),
});
export type RenameRequest = z.infer<typeof RenameRequestSchema>;

export const RenameResponseSchema = BaseResponseSchema.extend({
    entry: VFSEntrySchema,
});
export type RenameResponse = z.infer<typeof RenameResponseSchema>;

// ## mkdir

export const MkdirRequestSchema = BaseRequestSchema.extend({
    operation: z.literal("mkdir"),
    path: z.string(),
    options: VFSMkdirOptionsSchema.optional(),
});
export type MkdirRequest = z.infer<typeof MkdirRequestSchema>;

export const MkdirResponseSchema = BaseResponseSchema.extend({
    entry: VFSEntrySchema,
});
export type MkdirResponse = z.infer<typeof MkdirResponseSchema>;

// ## Union

export const VFSRequestSchema = z.discriminatedUnion("operation", [
    ReaddirRequestSchema,
    ReadFileRequestSchema,
    StatRequestSchema,
    StatsRequestSchema,
    GlobRequestSchema,
    WriteFileRequestSchema,
    WriteFilesRequestSchema,
    RmRequestSchema,
    RenameRequestSchema,
]);
export type VFSRequest = z.infer<typeof VFSRequestSchema>;

export const VFSResponseSchema = z.discriminatedUnion("operation", [
    ReaddirResponseSchema,
    ReadFileResponseSchema,
    StatResponseSchema,
    StatsResponseSchema,
    GlobResponseSchema,
    WriteFileResponseSchema,
    WriteFilesResponseSchema,
    RmResponseSchema,
    RenameResponseSchema,
]);
export type VFSResponse = z.infer<typeof VFSResponseSchema>;
