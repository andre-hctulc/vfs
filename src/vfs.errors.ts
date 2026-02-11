export class VFSError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}

export class VFSNotADirectoryError extends VFSError {
    constructor(path: string) {
        super(`Not a directory: ${path}`);
    }
}

export class VFSNotAFileError extends VFSError {
    constructor(path: string) {
        super(`Not a file: ${path}`);
    }
}

export class VFSNotFoundError extends VFSError {
    constructor(path: string) {
        super(`<n>ot found: ${path}`);
    }
}

export class VFSOperationNotSupportedError extends VFSError {
    constructor(readonly operation: string) {
        super(`Operation not supported: ${operation}`);
    }
}

export class VFSInvalidPathError extends VFSError {
    constructor(path: string) {
        super(`Invalid path: ${path}`);
    }
}

export class VFSPermissionDeniedError extends VFSError {
    constructor(path: string) {
        super(`Permission denied: ${path}`);
    }
}

export class VFSAlreadyExistsError extends VFSError {
    constructor(path: string) {
        super(`Item already exists: ${path}`);
    }
}

export class VFSDirectoryNotEmptyError extends VFSError {
    constructor(path: string) {
        super(`Directory not empty: ${path}`);
    }
}

export class VFSInsufficientSpaceError extends VFSError {
    constructor(path: string) {
        super(`Insufficient space for operation at: ${path}`);
    }
}

export class VFSUnknownError extends VFSError {
    constructor(message: string) {
        super(`Unknown VFS error: ${message}`);
    }
}
4;

export class VFSIOError extends VFSError {
    constructor(path: string, operation: string) {
        super(`IO error during ${operation} at: ${path}`);
    }
}

export class VFSInvalidOperationError extends VFSError {
    constructor(operation: string, reason: string) {
        super(`Invalid operation ${operation}: ${reason}`);
    }
}

export class VFSConflictError extends VFSError {
    constructor(path: string, conflictMessage: string) {
        super(`Conflict at ${path}: ${conflictMessage} `);
    }
}

export class VFSTypeMismatchError extends VFSConflictError {
    constructor(path: string) {
        super(path, "Type mismatch");
    }
}