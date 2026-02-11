import { VFSError, VFSOperationNotSupportedError } from "./vfs.errors.js";
import type { VFSEntry } from "./vfs.model.js";

export function basename(path: string): string {
    const parts = path.split("/").filter(Boolean);
    return parts.pop() || "";
}

const StatsSymbol = Symbol("stats");

export function attachStats(target: object, metadata: VFSEntry) {
    Object.defineProperty(target, StatsSymbol, {
        value: metadata,
        enumerable: false,
        configurable: false,
        writable: false,
    });
}

export function gatAttachedStats(target: object): VFSEntry | undefined {
    return (target as any)[StatsSymbol];
}

export function errorCodeToError(errorCode: string, details: any): Error | null {
    if (
        errorCode === "unsupported_operation" ||
        errorCode === "unsupported" ||
        errorCode === "not_implemented"
    ) {
        return new VFSOperationNotSupportedError(String(details?.operation || "unknown"));
    }
    return null;
}
