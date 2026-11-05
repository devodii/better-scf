import { AppError, assertNever } from '../errors';

export type DbErrorKind = 'invalid-payload' | 'missing-migration';

export class DbError extends AppError<DbErrorKind> {
  private constructor(kind: DbErrorKind, message: string) {
    super({ name: 'DbError', kind, message });
  }

  static invalidPayload(messageType: string, issues: string): DbError {
    return new DbError('invalid-payload', `Invalid payload for ${messageType}: ${issues}`);
  }

  static missingMigration(fromVersion: number): DbError {
    return new DbError('missing-migration', `No migration from database version ${fromVersion}`);
  }

  userMessage(): string {
    switch (this.kind) {
      case 'invalid-payload':
        return 'Saved data could not be read because it was malformed.';
      case 'missing-migration':
        return 'Saved data could not be upgraded to this version of the extension.';
      default:
        return assertNever(this.kind);
    }
  }
}
