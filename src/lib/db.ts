import postgres, { type Sql, type TransactionSql } from "postgres";

declare global {
  var __nhatrangSql__: Sql | undefined;
}

function getDatabaseUrl(): string {
  const value = process.env.DATABASE_URL?.trim();
  if (!value) {
    throw new Error("DATABASE_URL is not configured");
  }

  return value;
}

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function isDatabaseOptionalInCurrentMode(): boolean {
  return process.env.NODE_ENV !== "production" && !isDatabaseConfigured();
}

export function assertDatabaseConfigured(message = "DATABASE_URL is not configured"): void {
  if (!isDatabaseConfigured()) {
    throw new Error(message);
  }
}

export function getDb(): Sql {
  if (!global.__nhatrangSql__) {
    global.__nhatrangSql__ = postgres(getDatabaseUrl(), {
      max: process.env.NODE_ENV === "production" ? 10 : 5,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
    });
  }

  return global.__nhatrangSql__;
}

export async function withTransaction<T>(callback: (sql: TransactionSql) => Promise<T>): Promise<T> {
  const db = getDb();
  return db.begin(async (sql) => callback(sql)) as unknown as T;
}

export async function closeDb() {
  if (!global.__nhatrangSql__) {
    return;
  }

  await global.__nhatrangSql__.end({ timeout: 5 });
  global.__nhatrangSql__ = undefined;
}

export function normalizeTimestamp(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string") {
    return value;
  }

  return new Date(String(value)).toISOString();
}

export function normalizeBoolean(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

export function buildInClause<T extends string | number>(values: T[], startAt = 1): {
  placeholders: string;
  params: T[];
} {
  return {
    placeholders: values.map((_, index) => `$${startAt + index}`).join(", "),
    params: values,
  };
}

export async function execute<T = Record<string, unknown>>(sql: string, values: unknown[] = []): Promise<T[]> {
  const db = getDb();
  return db.unsafe<T[]>(sql, values as never[]) as unknown as T[];
}
