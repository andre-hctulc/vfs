import { z } from "zod";

export const VFSEntrySchema = z
    .object({
        path: z.string().describe("The full path of the entry"),
        type: z.enum(["file", "directory", "symlink", "other"]).describe("The type of the entry"),
        mime_type: z.string().describe("The MIME type of the entry. For directories, it's 'inode/directory'"),
        size: z.number().describe("The size of the entry in bytes"),
        modified_at: z.iso.datetime().describe("The last modified date of the entry"),
        additional_data: z
            .record(z.string(), z.any())
            .optional()
            .describe("Additional metadata associated with the entry"),
    })
    .describe("VFS Entry");
export type VFSEntry = z.infer<typeof VFSEntrySchema>;

export type VFSEntryStream = AsyncGenerator<VFSEntry, void, unknown>;
