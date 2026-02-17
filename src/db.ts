import { createRequire } from "node:module";
import initSqlJs, { type Database as SqlJsDatabase } from "sql.js";
import { readAll } from "./store";
import type { Activity, Company, Contact, Deal, Task } from "./types";

const require = createRequire(import.meta.url);

function initSchema(db: SqlJsDatabase): void {
  db.run(`
    CREATE TABLE contacts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      company TEXT,
      role TEXT,
      custom TEXT,
      created TEXT,
      updated TEXT
    )
  `);

  db.run(`
    CREATE TABLE companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      domain TEXT,
      industry TEXT,
      size TEXT,
      custom TEXT,
      created TEXT,
      updated TEXT
    )
  `);

  db.run(`
    CREATE TABLE deals (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      company TEXT,
      contacts TEXT,
      stage TEXT,
      value REAL,
      currency TEXT,
      probability REAL,
      close_date TEXT,
      custom TEXT,
      created TEXT,
      updated TEXT
    )
  `);

  db.run(`
    CREATE TABLE activities (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT,
      contact TEXT,
      deal TEXT,
      company TEXT,
      date TEXT,
      created TEXT,
      updated TEXT
    )
  `);

  db.run(`
    CREATE TABLE tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      contact TEXT,
      deal TEXT,
      company TEXT,
      due TEXT,
      done INTEGER,
      created TEXT,
      updated TEXT
    )
  `);
}

function loadContacts(db: SqlJsDatabase, root: string): void {
  const contacts = readAll<Contact>(root, "contacts");
  const stmt = db.prepare(
    "INSERT INTO contacts (id, name, email, phone, company, role, custom, created, updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
  );
  for (const c of contacts) {
    stmt.run([
      c.id,
      c.name,
      c.email ?? null,
      c.phone ?? null,
      c.company ?? null,
      c.role ?? null,
      c.custom ? JSON.stringify(c.custom) : null,
      c.created,
      c.updated,
    ]);
  }
  stmt.free();
}

function loadCompanies(db: SqlJsDatabase, root: string): void {
  const companies = readAll<Company>(root, "companies");
  const stmt = db.prepare(
    "INSERT INTO companies (id, name, domain, industry, size, custom, created, updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  );
  for (const c of companies) {
    stmt.run([
      c.id,
      c.name,
      c.domain ?? null,
      c.industry ?? null,
      c.size ?? null,
      c.custom ? JSON.stringify(c.custom) : null,
      c.created,
      c.updated,
    ]);
  }
  stmt.free();
}

function loadDeals(db: SqlJsDatabase, root: string): void {
  const deals = readAll<Deal>(root, "deals");
  const stmt = db.prepare(
    "INSERT INTO deals (id, title, company, contacts, stage, value, currency, probability, close_date, custom, created, updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  );
  for (const d of deals) {
    stmt.run([
      d.id,
      d.title,
      d.company ?? null,
      JSON.stringify(d.contacts),
      d.stage,
      d.value ?? null,
      d.currency ?? null,
      d.probability ?? null,
      d.closeDate ?? null,
      d.custom ? JSON.stringify(d.custom) : null,
      d.created,
      d.updated,
    ]);
  }
  stmt.free();
}

function loadActivities(db: SqlJsDatabase, root: string): void {
  const activities = readAll<Activity>(root, "activities");
  const stmt = db.prepare(
    "INSERT INTO activities (id, type, subject, body, contact, deal, company, date, created, updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  );
  for (const a of activities) {
    stmt.run([
      a.id,
      a.type,
      a.subject,
      a.body ?? null,
      a.contact ?? null,
      a.deal ?? null,
      a.company ?? null,
      a.date,
      a.created,
      a.updated,
    ]);
  }
  stmt.free();
}

function loadTasks(db: SqlJsDatabase, root: string): void {
  const tasks = readAll<Task>(root, "tasks");
  const stmt = db.prepare(
    "INSERT INTO tasks (id, title, contact, deal, company, due, done, created, updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
  );
  for (const t of tasks) {
    stmt.run([
      t.id,
      t.title,
      t.contact ?? null,
      t.deal ?? null,
      t.company ?? null,
      t.due ?? null,
      t.done ? 1 : 0,
      t.created,
      t.updated,
    ]);
  }
  stmt.free();
}

/**
 * Build an in-memory SQLite database from all JSON files.
 */
export async function buildDb(root: string): Promise<SqlJsDatabase> {
  const wasmPath = require.resolve("sql.js/dist/sql-wasm.wasm");
  const SQL = await initSqlJs({ locateFile: () => wasmPath });
  const db = new SQL.Database();
  initSchema(db);
  loadContacts(db, root);
  loadCompanies(db, root);
  loadDeals(db, root);
  loadActivities(db, root);
  loadTasks(db, root);
  return db;
}
