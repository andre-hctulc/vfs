export interface VFSErrorDetails {
    path?: string;
    paths?: string[];
    operation?: string;
    [key: string]: any;
}

interface VFSErrorOptions extends ErrorOptions {
    code?: string;
    details?: VFSErrorDetails;
}

export class VFSError extends Error {
    protected static _opts(
        options: VFSErrorOptions | undefined,
        options2: VFSErrorOptions | undefined,
    ): VFSErrorOptions {
        return {
            ...options,
            ...options2,
            details: {
                code: "VFS_ERROR",
                ...options?.details,
                ...options2?.details,
            },
        };
    }

    readonly details: VFSErrorDetails;

    constructor(message: string, options?: VFSErrorOptions) {
        super(message, options);
        this.details = options?.details || {};
    }
}

export class VFSIOError extends VFSError {
    constructor(message: string, options?: VFSErrorOptions) {
        super(`IO Error: ${message}`, VFSError._opts({ code: "IO_ERROR", details: {} }, options));
    }
}

export class VFSNotADirectoryError extends VFSError {
    constructor(path: string, options?: VFSErrorOptions) {
        super(
            `Not a directory: ${path}`,
            VFSError._opts({ code: "NOT_A_DIRECTORY", details: { path } }, options),
        );
    }
}

export class VFSNotAFileError extends VFSError {
    constructor(path: string, options?: VFSErrorOptions) {
        super(`Not a file: ${path}`, VFSError._opts({  code: "NOT_A_FILE", details: {path } }, options));
    }
}

export class VFSNotFoundError extends VFSIOError {
    constructor(path: string | undefined, options?: VFSErrorOptions) {
        super(
            path ? `Not found: ${path}` : "Not found",
            VFSError._opts({ code: "NOT_FOUND", details: { path } }, options),
        );
    }
}

export class VFSOperationNotSupportedError extends VFSError {
    constructor(
        readonly operation: string,
        options?: VFSErrorOptions,
    ) {
        super(
            `Operation not supported: ${operation}`,
            VFSError._opts({ code: "OPERATION_NOT_SUPPORTED", details: { operation } }, options),
        );
    }
}

export class VFSInvalidPathError extends VFSError {
    constructor(path: string, options?: VFSErrorOptions) {
        super(`Invalid path: ${path}`, VFSError._opts({ code: "INVALID_PATH", details: { path } }, options));
    }
}

export class VFSPermissionDeniedError extends VFSIOError {
    constructor(path: string, options?: VFSErrorOptions) {
        super(
            `Permission denied: ${path}`,
            VFSError._opts({ code: "PERMISSION_DENIED", details: { path } }, options),
        );
    }
}

export class VFSAlreadyExistsError extends VFSIOError {
    constructor(path: string, options?: VFSErrorOptions) {
        super(
            `Item already exists: ${path}`,
            VFSError._opts({ code: "ALREADY_EXISTS", details: { path } }, options),
        );
    }
}

export class VFSDirectoryNotEmptyError extends VFSIOError {
    constructor(path: string, options?: VFSErrorOptions) {
        super(
            `Directory not empty: ${path}`,
            VFSError._opts({ code: "DIRECTORY_NOT_EMPTY", details: { path } }, options),
        );
    }
}

export class VFSInsufficientSpaceError extends VFSIOError {
    constructor(path: string, options?: VFSErrorOptions) {
        super(
            `Insufficient space for operation at: ${path}`,
            VFSError._opts({ code: "INSUFFICIENT_SPACE", details: { path } }, options),
        );
    }
}

export class VFSUnknownError extends VFSError {
    constructor(message: string, options?: VFSErrorOptions) {
        super(`Unknown VFS Error: ${message}`, VFSError._opts({ code: "UNKNOWN_ERROR", details: {} }, options));
    }
}

export class VFSInvalidOperationError extends VFSError {
    constructor(operation: string, reason: string, options?: VFSErrorOptions) {
        super(
            `Invalid operation ${operation}: ${reason}`,
            VFSError._opts({ code: "INVALID_OPERATION", details: { operation, reason } }, options),
        );
    }
}

export class VFSConflictError extends VFSError {
    constructor(path: string, conflictMessage: string, options?: VFSErrorOptions) {
        super(
            `Conflict at ${path}: ${conflictMessage} `,
            VFSError._opts({ code: "CONFLICT", details: { path, conflictMessage } }, options),
        );
    }
}

export class VFSTypeMismatchError extends VFSConflictError {
    constructor(path: string, options?: VFSErrorOptions) {
        super(path, "Type mismatch", VFSError._opts({ code: "TYPE_MISMATCH", details: { path } }, options));
    }
}
