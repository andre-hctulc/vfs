import type {
    VFSGlobOptions,
    VFSReaddirOptions,
    VFSReadFileOptions,
    VFSReadTextRepresentationOptions,
    VFSRenameOptions,
    VFSRmOptions,
    VFSStatOptions,
    VFSWriteFileOptions,
} from "./vfs-options.model.js";
import type { VFSEntry, VFSEntryStream } from "./vfs.model.js";

export interface VFSEngine {
    /** Normalize path */
    normalizePath?(path: string): string;
    /** Get entry metadata */
    stat(path: string, options: VFSStatOptions): Promise<VFSEntry | null>;
    /** Get entries metadata */
    stats(paths: string[], options: VFSStatOptions): VFSEntryStream;
    /** Glob pattern matching */
    glob(patterns: string[], options: VFSGlobOptions): VFSEntryStream;
    /** Load file */
    readFile(path: string, options: VFSReadFileOptions): Promise<File>;
    /** Read text representation */
    readTextRepresentation(path: string, options: VFSReadTextRepresentationOptions): Promise<string>;
    /** List directory entries */
    readdir(path: string, options: VFSReaddirOptions): VFSEntryStream;
    /** write any file */
    writeFile(path: string, file: File, options: VFSWriteFileOptions): Promise<VFSEntry>;
    /** Write many files */
    writeFiles(files: { path: string; file: File }[], options: VFSWriteFileOptions): VFSEntryStream;
    /** Remove a file or a directory */
    rm(path: string, options: VFSRmOptions): Promise<void>;
    /** Rename/Move a file or a directory */
    rename(oldPath: string, newPath: string, options: VFSRenameOptions): Promise<VFSEntry>;
}
