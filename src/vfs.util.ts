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

export function getStats(target: object): VFSEntry | undefined {
    return (target as any)[StatsSymbol];
}
