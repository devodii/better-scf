export interface ToolErrorResult<Kind extends string> {
  error: Kind;
  message: string;
}

export interface AppErrorInit<Kind extends string> {
  name: string;
  kind: Kind;
  message: string;
  cause?: unknown;
}

const MAX_MESSAGE_CHARS = 240;

export abstract class AppError<Kind extends string> extends Error {
  readonly kind: Kind;

  protected constructor({ name, kind, message, cause }: AppErrorInit<Kind>) {
    super(message.slice(0, MAX_MESSAGE_CHARS), cause === undefined ? undefined : { cause });
    this.name = name;
    this.kind = kind;
  }

  abstract userMessage(): string;

  toToolResult(): ToolErrorResult<Kind> {
    return { error: this.kind, message: this.message };
  }
}

export function isAppError(value: unknown): value is AppError<string> {
  return value instanceof AppError;
}

export function assertNever(value: never): never {
  throw new Error(`Unhandled case: ${String(value)}`);
}
