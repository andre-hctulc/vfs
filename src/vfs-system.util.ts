import { VFSNotFoundError, VFSOperationNotSupportedError } from "./vfs.errors.js";
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

function snakeCase(code: string): string {
    return code.replace(/([A-Z])/g, "_$1").toLowerCase();
}

export function errorCodeToError(errorCode: string, details: any): Error | null {
    if (!errorCode) return null;

    const err_code = snakeCase(errorCode);
    const path = typeof details?.path === "string" ? details.path : undefined;
    
    if (
        ["operation_not_supported", "unsupported_operation", "unsupported", "not_implemented"].includes(
            err_code,
        )
    ) {
        return new VFSOperationNotSupportedError(String(details?.operation || "unknown"));
    }

    if (["not_found", "no_entry", "notfound"].includes(err_code)) {
        return new VFSNotFoundError(path);
    }
    return null;
}
