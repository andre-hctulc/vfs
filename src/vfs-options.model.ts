import { z } from "zod";

// #### Base ####

export const VFSOperationOptionsSchema = z.object({
    metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe("Optional options metadata, useful for extensibility"),
});
export type VFSOperationOptions = z.infer<typeof VFSOperationOptionsSchema>;

export const VFSBaseRemoveOptionsSchema = VFSOperationOptionsSchema.extend({
    force: z.boolean().optional().describe("Don't throw error if the target doesn't exist"),
}).describe("Base options for VFS removal operations");
export type VFSBaseRemoveOptions = z.infer<typeof VFSBaseRemoveOptionsSchema>;

export const VFSQueryOptionsSchema = VFSOperationOptionsSchema.extend({
    limit: z.number().optional().describe("Maximum number of entries to return"),
    offset: z.number().optional().describe("Number of entries to skip for pagination"),
    nextToken: z.string().optional().describe("Token for fetching the next page of results"),
}).describe("Query/Pagination options");
export type VFSQueryOptions = z.infer<typeof VFSQueryOptionsSchema>;

// #### stat ####

export const VFSStatOptionsSchema = VFSOperationOptionsSchema.extend({}).describe(
    "Options for getting file/directory statistics",
);
export type VFSStatOptions = z.infer<typeof VFSStatOptionsSchema>;

// #### stats ####

export const VFSStatsOptionsSchema = VFSStatOptionsSchema.extend({
    queryOptions: VFSQueryOptionsSchema.optional(),
}).describe("Options for getting multiple file statistics");
export type VFSStatsOptions = z.infer<typeof VFSStatsOptionsSchema>;

// #### getDir ####

export const VFSGetDirOptionsSchema = VFSOperationOptionsSchema.extend({}).describe(
    "Options for getting a directory",
);
export type VFSGetDirOptions = z.infer<typeof VFSGetDirOptionsSchema>;

// #### readFile ####

export const VFSReadFileOptionsSchema = VFSOperationOptionsSchema.extend({}).describe(
    "Options for reading files",
);
export type VFSReadFileOptions = z.infer<typeof VFSReadFileOptionsSchema>;

// #### readJSON ####

export const VFSReadJSONOptionsSchema = VFSOperationOptionsSchema.extend({
    skipMimeCheck: z.boolean().optional().describe("Skip MIME type validation before parsing JSON"),
}).describe("Options for reading and parsing JSON files");
export type VFSReadJSONOptions = z.infer<typeof VFSReadJSONOptionsSchema>;

// #### readText ####

export const VFSReadTextOptionsSchema = VFSOperationOptionsSchema.extend({
    skipMimeCheck: z.boolean().optional().describe("Skip MIME type validation before reading as text"),
}).describe("Options for reading files as text");
export type VFSReadTextOptions = z.infer<typeof VFSReadTextOptionsSchema>;

// #### readTextRepresentation ####

export const VFSReadTextRepresentationOptionsSchema = VFSOperationOptionsSchema.extend({}).describe(
    "Options for reading the text representation of files",
);
export type VFSReadTextRepresentationOptions = z.infer<typeof VFSReadTextRepresentationOptionsSchema>;

// #### read ####

export const VFSReadOptionsSchema = VFSOperationOptionsSchema.describe(
    "Options for generic file reading operations",
);
export type VFSReadOptions = z.infer<typeof VFSReadOptionsSchema>;

// #### readdir ####

export const VFSReaddirOptionsSchema = VFSOperationOptionsSchema.extend({
    checkIsDir: z.boolean().optional().describe("Verify the path is a directory before reading"),
    includeHidden: z.boolean().optional().describe("Include hidden files and directories in results"),
    recursive: z.boolean().optional().describe("Read subdirectories recursively"),
    queryOptions: VFSQueryOptionsSchema.optional(),
}).describe("Options for reading directory contents");
export type VFSReaddirOptions = z.infer<typeof VFSReaddirOptionsSchema>;

// #### glob ####

export const VFSGlobOptionsSchema = VFSOperationOptionsSchema.extend({
    ignorePatterns: z
        .string()
        .array()
        .optional()
        .describe("Array of glob patterns to ignore during matching"),
    caseInsensitive: z.boolean().optional().describe("Perform case-insensitive pattern matching"),
    followSymlinks: z.boolean().optional().describe("Follow symbolic links during glob matching"),
    queryOptions: VFSQueryOptionsSchema.optional(),
}).describe("Options for glob pattern matching");
export type VFSGlobOptions = z.infer<typeof VFSGlobOptionsSchema>;

// #### writeFile ####

export const VFSWriteFileOptionsSchema = VFSOperationOptionsSchema.extend({
    noOverwrite: z.boolean().optional().describe("Prevent overwriting existing files"),
    createDirs: z.boolean().optional().describe("Create parent directories if they don't exist"),
    encoding: z.string().optional().describe("Character encoding for the file content"),
}).describe("Options for writing files");
export type VFSWriteFileOptions = z.infer<typeof VFSWriteFileOptionsSchema>;

// #### writeFiles ####

export const VFSWriteFilesOptionsSchema = VFSWriteFileOptionsSchema.extend({}).describe(
    "Options for writing multiple files in batch operations",
);
export type VFSWriteFilesOptions = z.infer<typeof VFSWriteFilesOptionsSchema>;

// #### writeJSON ####

export const VFSWriteJSONOptionsSchema = VFSWriteFileOptionsSchema.describe(
    "Options for writing JSON files with serialization",
);
export type VFSWriteJSONOptions = z.infer<typeof VFSWriteJSONOptionsSchema>;

// #### writeText ####

export const VFSWriteTextOptionsSchema = VFSWriteFileOptionsSchema.describe(
    "Options for writing text files with encoding support",
);
export type VFSWriteTextOptions = z.infer<typeof VFSWriteTextOptionsSchema>;

// #### mkdir ####

export const VFSMkdirOptionsSchema = VFSOperationOptionsSchema.extend({
    /**
     * If true, parent directories are created as needed.
     * Also prevents errors if the directory already exists.
     */
    recursive: z
        .boolean()
        .optional()
        .describe("Create parent directories as needed and don't error if directory exists"),
}).describe("Options for creating directories");
export type VFSMkdirOptions = z.infer<typeof VFSMkdirOptionsSchema>;

// #### rename ####

export const VFSRenameOptionsSchema = VFSOperationOptionsSchema.extend({
    overwrite: z.boolean().optional().describe("Allow overwriting the destination if it exists"),
    recursive: z.boolean().optional().describe("Rename directories and their contents recursively"),
}).describe("Options for renaming/moving files and directories");
export type VFSRenameOptions = z.infer<typeof VFSRenameOptionsSchema>;

// #### exists ####

export const VFSExistsOptionsSchema = VFSOperationOptionsSchema.extend({
    type: z.string().optional().describe("The file type to match"),
}).describe("Options for checking existence of files or directories");
export type VFSExistsOptions = z.infer<typeof VFSExistsOptionsSchema>;

// #### unlink ####

export const VFSUnlinkOptionsSchema = VFSOperationOptionsSchema.extend(
    VFSBaseRemoveOptionsSchema.shape,
).describe("Options for removing files (unlinking)");
export type VFSUnlinkOptions = z.infer<typeof VFSUnlinkOptionsSchema>;

// #### rmdir ####

export const VFSRmdirOptionsSchema = VFSBaseRemoveOptionsSchema.extend({
    recursive: z.boolean().optional().describe("Remove directory and all its contents recursively"),
}).describe("Options for removing directories");
export type VFSRmdirOptions = z.infer<typeof VFSRmdirOptionsSchema>;

// #### rm ####

export const VFSRmOptionsSchema = VFSBaseRemoveOptionsSchema.extend(VFSRmdirOptionsSchema.shape).describe(
    "Options for removing files or directories (generic removal)",
);
export type VFSRmOptions = z.infer<typeof VFSRmOptionsSchema>;
