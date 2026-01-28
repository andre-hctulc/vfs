import { z } from "zod";

// #### Base ####

export const VFSOperationOptionsSchema = z.object({
    timeout_ms: z.number().optional(),
});
export type VFSOperationOptions = z.infer<typeof VFSOperationOptionsSchema>;

export const VFSQueryOptionsSchema = z
    .object({
        limit: z.number(),
        offset: z.number(),
        next_token: z.string(),
        sort: z.string(),
    })
    .partial();
export type VFSQueryOptions = z.infer<typeof VFSQueryOptionsSchema>;

export const VFSBaseRemoveOptionsSchema = VFSOperationOptionsSchema.extend({
    ignore_if_not_exists: z.boolean().optional(),
});
export type VFSBaseRemoveOptions = z.infer<typeof VFSBaseRemoveOptionsSchema>;

// #### stat ####

export const VFSStatOptionsSchema = VFSOperationOptionsSchema;
export type VFSStatOptions = z.infer<typeof VFSStatOptionsSchema>;

// #### getDir ####

export const VFSGetDirOptionsSchema = VFSOperationOptionsSchema;
export type VFSGetDirOptions = z.infer<typeof VFSGetDirOptionsSchema>;

// #### readFile ####

export const VFSReadFileOptionsSchema = VFSOperationOptionsSchema;
export type VFSReadFileOptions = z.infer<typeof VFSReadFileOptionsSchema>;

// #### readJSON ####

export const VFSReadJSONOptionsSchema = VFSOperationOptionsSchema.extend({
    skip_mime_check: z.boolean().optional(),
});
export type VFSReadJSONOptions = z.infer<typeof VFSReadJSONOptionsSchema>;

// #### readText ####

export const VFSReadTextOptionsSchema = VFSOperationOptionsSchema.extend({
    skip_mime_check: z.boolean().optional(),
});
export type VFSReadTextOptions = z.infer<typeof VFSReadTextOptionsSchema>;

// #### readTextRepresentation ####

export const VFSReadTextRepresentationOptionsSchema = VFSOperationOptionsSchema.extend({});
export type VFSReadTextRepresentationOptions = z.infer<typeof VFSReadTextRepresentationOptionsSchema>;

// #### read ####

export const VFSReadOptionsSchema = VFSOperationOptionsSchema;
export type VFSReadOptions = z.infer<typeof VFSReadOptionsSchema>;

// #### readdir ####

export const VFSReaddirOptionsSchema = VFSOperationOptionsSchema.extend({
    check_is_dir: z.boolean().optional(),
    include_hidden: z.boolean().optional(),
    query_options: VFSQueryOptionsSchema.optional(),
});
export type VFSReaddirOptions = z.infer<typeof VFSReaddirOptionsSchema>;

// #### glob ####

export const VFSGlobOptionsSchema = VFSOperationOptionsSchema.extend({
    ignore_patterns: z.string().array().optional(),
    case_insensitive: z.boolean().optional(),
    follow_symlinks: z.boolean().optional(),
    query_options: VFSQueryOptionsSchema.optional(),
});
export type VFSGlobOptions = z.infer<typeof VFSGlobOptionsSchema>;

// #### writeFile ####

export const VFSWriteFileOptionsSchema = VFSOperationOptionsSchema.extend({
    no_overwrite: z.boolean().optional(),
    create_dirs: z.boolean().optional(),
    encoding: z.string().optional(),
});
export type VFSWriteFileOptions = z.infer<typeof VFSWriteFileOptionsSchema>;

// #### writeJSON ####

export const VFSWriteJSONOptionsSchema = VFSWriteFileOptionsSchema;
export type VFSWriteJSONOptions = z.infer<typeof VFSWriteJSONOptionsSchema>;

// #### writeText ####

export const VFSWriteTextOptionsSchema = VFSWriteFileOptionsSchema;
export type VFSWriteTextOptions = z.infer<typeof VFSWriteTextOptionsSchema>;

// #### mkdir ####

export const VFSMkdirOptionsSchema = VFSOperationOptionsSchema.extend({
    /**
     * If true, parent directories are created as needed.
     * Also prevents errors if the directory already exists.
     */
    recursive: z.boolean().optional(),
});
export type VFSMkdirOptions = z.infer<typeof VFSMkdirOptionsSchema>;

// #### rename ####

export const VFSRenameOptionsSchema = VFSOperationOptionsSchema.extend({
    overwrite: z.boolean().optional(),
    recursive: z.boolean().optional(),
});
export type VFSRenameOptions = z.infer<typeof VFSRenameOptionsSchema>;

// #### exists ####

export const VFSExistsOptionsSchema = VFSOperationOptionsSchema.extend({
    type: z.string().optional().describe("The file type to match"),
});
export type VFSExistsOptions = z.infer<typeof VFSExistsOptionsSchema>;

// #### unlink ####

export const VFSUnlinkOptionsSchema = VFSOperationOptionsSchema.extend(VFSBaseRemoveOptionsSchema.shape);
export type VFSUnlinkOptions = z.infer<typeof VFSUnlinkOptionsSchema>;

// #### rmdir ####

export const VFSRmdirOptionsSchema = VFSBaseRemoveOptionsSchema.extend({
    recursive: z.boolean().optional(),
});
export type VFSRmdirOptions = z.infer<typeof VFSRmdirOptionsSchema>;

// #### rm ####

export const VFSRmOptionsSchema = VFSBaseRemoveOptionsSchema.extend(VFSRmdirOptionsSchema.shape);
export type VFSRmOptions = z.infer<typeof VFSRmOptionsSchema>;
