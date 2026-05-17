import { basename } from "../vfs-system.util.js";
import type { VFSContent } from "../vfs.model.js";

export function base64ToFile(base64: string, options: { name: string; type: string }): File {
    const byteString = atob(base64);
    const byteArray = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
        byteArray[i] = byteString.charCodeAt(i);
    }
    return new File([byteArray], options.name, { type: options.type });
}

export function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result;
            if (typeof result === "string") {
                // Remove the data URL prefix if present
                const base64 = result.split(",")[1] || result;
                resolve(base64);
            } else {
                reject(new Error("Unexpected result type from FileReader"));
            }
        };
        reader.onerror = () => {
            reject(new Error("Failed to read file as base64"));
        };
        reader.readAsDataURL(file);
    });
}

export async function serializeFile(file: File): Promise<VFSContent> {
    const base64Content = await fileToBase64(file);
    return {
        content: base64Content,
        mimeType: file.type,
        size: file.size,
    };
}

export function deserializeFile(content: VFSContent, path: string): File {
    return base64ToFile(content.content, { name: basename(path), type: content.mimeType });
}
