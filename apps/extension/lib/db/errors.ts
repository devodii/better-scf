import { AppError, assertNever } from "../errors";

export type DbErrorKind = "invalid-payload";

export class DbError extends AppError<DbErrorKind> {
  private constructor(kind: DbErrorKind, message: string) {
    super({ name: "DbError", kind, message });
  }

  static invalidPayload(messageType: string, issues: string): DbError {
    return new DbError(
      "invalid-payload",
      `Invalid payload for ${messageType}: ${issues}`,
    );
  }

  userMessage(): string {
    switch (this.kind) {
      case "invalid-payload":
        return "Saved data could not be read because it was malformed.";
      default:
        return assertNever(this.kind);
    }
  }
}
