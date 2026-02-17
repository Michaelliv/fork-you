import { expect, test, beforeEach, afterEach } from "bun:test";
import { mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { initStore, findRoot, readAll, readOne, writeRecord, deleteRecord, newId, readConfig } from "./store";
import type { Contact } from "./types";

const TEST_DIR = join(import.meta.dir, "..", ".test-tmp");

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
  process.chdir(TEST_DIR);
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

test("initStore creates .forkyou directory structure", () => {
  const root = initStore();
  expect(existsSync(join(root, "config.json"))).toBe(true);
  expect(existsSync(join(root, "contacts"))).toBe(true);
  expect(existsSync(join(root, "companies"))).toBe(true);
  expect(existsSync(join(root, "deals"))).toBe(true);
  expect(existsSync(join(root, "activities"))).toBe(true);
  expect(existsSync(join(root, "tasks"))).toBe(true);
});

test("findRoot finds .forkyou directory", () => {
  initStore();
  const root = findRoot();
  expect(root).not.toBeNull();
  expect(root!.endsWith(".forkyou")).toBe(true);
});

test("readConfig returns default config", () => {
  const root = initStore();
  const config = readConfig(root);
  expect(config.stages).toContain("lead");
  expect(config.currency).toBe("USD");
});

test("writeRecord and readOne roundtrip", () => {
  const root = initStore();
  const contact: Contact = {
    id: newId(),
    name: "Test User",
    email: "test@example.com",
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
  };
  writeRecord(root, "contacts", contact);
  const result = readOne<Contact>(root, "contacts", contact.id);
  expect(result).not.toBeNull();
  expect(result!.name).toBe("Test User");
  expect(result!.email).toBe("test@example.com");
});

test("readAll returns all records", () => {
  const root = initStore();
  for (let i = 0; i < 3; i++) {
    writeRecord(root, "contacts", {
      id: newId(),
      name: `User ${i}`,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    });
  }
  const all = readAll<Contact>(root, "contacts");
  expect(all.length).toBe(3);
});

test("deleteRecord removes file", () => {
  const root = initStore();
  const id = newId();
  writeRecord(root, "contacts", {
    id,
    name: "To Delete",
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
  });
  expect(deleteRecord(root, "contacts", id)).toBe(true);
  expect(readOne(root, "contacts", id)).toBeNull();
});

test("deleteRecord returns false for nonexistent", () => {
  const root = initStore();
  expect(deleteRecord(root, "contacts", "nonexistent")).toBe(false);
});
