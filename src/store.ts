import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { nanoid } from "nanoid";
import type { Config } from "./types.js";
import { DEFAULT_CONFIG } from "./types.js";

const FORKYOU_DIR = ".forkyou";

const COLLECTIONS = [
  "contacts",
  "companies",
  "deals",
  "activities",
  "tasks",
] as const;
type Collection = (typeof COLLECTIONS)[number];

/**
 * Find the .forkyou directory by walking up from cwd.
 */
export function findRoot(): string | null {
  let dir = process.cwd();
  while (true) {
    if (existsSync(join(dir, FORKYOU_DIR))) {
      return join(dir, FORKYOU_DIR);
    }
    const parent = join(dir, "..");
    if (parent === dir) return null;
    dir = parent;
  }
}

export function requireRoot(): string {
  const root = findRoot();
  if (!root) {
    console.error("Not a fu project. Run: fu init");
    process.exit(1);
  }
  return root;
}

/**
 * Initialize a new .forkyou directory.
 */
export function initStore(): string {
  const root = join(process.cwd(), FORKYOU_DIR);
  if (existsSync(root)) {
    return root;
  }
  mkdirSync(root, { recursive: true });
  for (const col of COLLECTIONS) {
    mkdirSync(join(root, col), { recursive: true });
  }
  writeFileSync(
    join(root, "config.json"),
    `${JSON.stringify(DEFAULT_CONFIG, null, 2)}\n`,
  );
  return root;
}

/**
 * Read config.
 */
export function readConfig(root: string): Config {
  const configPath = join(root, "config.json");
  if (!existsSync(configPath)) return { ...DEFAULT_CONFIG };
  return JSON.parse(readFileSync(configPath, "utf-8"));
}

/**
 * Write config.
 */
export function writeConfig(root: string, config: Config): void {
  writeFileSync(
    join(root, "config.json"),
    `${JSON.stringify(config, null, 2)}\n`,
  );
}

/**
 * Generate a short ID.
 */
export function newId(): string {
  return nanoid(8);
}

/**
 * Read all records from a collection.
 */
export function readAll<T>(root: string, collection: Collection): T[] {
  const dir = join(root, collection);
  if (!existsSync(dir)) return [];
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  return files.map((f) => JSON.parse(readFileSync(join(dir, f), "utf-8")));
}

/**
 * Read a single record by ID.
 */
export function readOne<T>(
  root: string,
  collection: Collection,
  id: string,
): T | null {
  const filePath = join(root, collection, `${id}.json`);
  if (!existsSync(filePath)) return null;
  return JSON.parse(readFileSync(filePath, "utf-8"));
}

/**
 * Write a record to a collection.
 */
export function writeRecord<T extends { id: string }>(
  root: string,
  collection: Collection,
  record: T,
): void {
  const dir = join(root, collection);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, `${record.id}.json`),
    `${JSON.stringify(record, null, 2)}\n`,
  );
}

/**
 * Delete a record by ID.
 */
export function deleteRecord(
  root: string,
  collection: Collection,
  id: string,
): boolean {
  const filePath = join(root, collection, `${id}.json`);
  if (!existsSync(filePath)) return false;
  unlinkSync(filePath);
  return true;
}
