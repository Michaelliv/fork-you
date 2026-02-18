import { readAll, readOne } from "../store.js";
import type { Company } from "../types.js";

/**
 * Resolve a company by ID or name.
 * - If a record with that exact ID exists, return the ID.
 * - Otherwise, do a case-insensitive exact name match.
 * - 0 matches → throw. Multiple matches → throw.
 */
export function resolveCompanyId(root: string, value: string): string {
  // Try direct ID lookup first
  const byId = readOne<Company>(root, "companies", value);
  if (byId) return value;

  // Search by name (case-insensitive exact match)
  const all = readAll<Company>(root, "companies");
  const matches = all.filter(
    (c) => c.name.toLowerCase() === value.toLowerCase(),
  );

  if (matches.length === 1) return matches[0].id;

  if (matches.length === 0) {
    throw new ResolveError(
      `No company found matching "${value}". Run: fu company list`,
    );
  }

  const ids = matches.map((c) => `${c.name} (${c.id})`).join(", ");
  throw new ResolveError(
    `Multiple companies match "${value}": ${ids}. Use an ID instead.`,
  );
}

export class ResolveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResolveError";
  }
}
