import { buildDb } from "../db";
import {
  deleteRecord,
  newId,
  readOne,
  requireRoot,
  writeRecord,
} from "../store";
import type { Contact } from "../types";
import type { OutputOptions } from "../utils/output";
import { bold, dim, error, info, output, success } from "../utils/output";

function parseContactFlags(args: string[]): Partial<Contact> {
  const fields: Partial<Contact> = {};
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    const val = args[i + 1];
    if (!val) continue;
    switch (flag) {
      case "--name":
        fields.name = val;
        i++;
        break;
      case "--email":
        fields.email = val;
        i++;
        break;
      case "--phone":
        fields.phone = val;
        i++;
        break;
      case "--company":
        fields.company = val;
        i++;
        break;
      case "--role":
        fields.role = val;
        i++;
        break;
    }
  }
  return fields;
}

export async function contactAdd(
  args: string[],
  options: OutputOptions,
): Promise<void> {
  const root = requireRoot();
  const fields = parseContactFlags(args);

  if (!fields.name) {
    output(options, {
      json: () => ({ success: false, error: "missing_name" }),
      human: () => error("--name is required"),
    });
    process.exit(1);
  }

  const now = new Date().toISOString();
  const contact: Contact = {
    id: newId(),
    name: fields.name,
    email: fields.email,
    phone: fields.phone,
    company: fields.company,
    role: fields.role,
    created: now,
    updated: now,
  };

  writeRecord(root, "contacts", contact);

  output(options, {
    json: () => ({ success: true, contact }),
    human: () => success(`Contact added: ${contact.name} (${contact.id})`),
  });
}

export async function contactList(
  _args: string[],
  options: OutputOptions,
): Promise<void> {
  const root = requireRoot();
  const db = await buildDb(root);

  const stmt = db.prepare("SELECT * FROM contacts ORDER BY name");
  const contacts: Contact[] = [];
  while (stmt.step()) {
    contacts.push(stmt.getAsObject() as unknown as Contact);
  }
  stmt.free();
  db.close();

  output(options, {
    json: () => ({ success: true, contacts }),
    human: () => {
      if (contacts.length === 0) {
        info("No contacts yet");
        return;
      }
      for (const c of contacts) {
        const parts = [bold(c.name)];
        if (c.email) parts.push(dim(c.email));
        if (c.role) parts.push(dim(`(${c.role})`));
        console.log(`  ${dim(c.id)}  ${parts.join("  ")}`);
      }
      console.log(dim(`\n  ${contacts.length} contact(s)`));
    },
  });
}

export async function contactShow(
  args: string[],
  options: OutputOptions,
): Promise<void> {
  const root = requireRoot();
  const id = args[0];

  if (!id) {
    output(options, {
      json: () => ({ success: false, error: "missing_id" }),
      human: () => error("Contact ID required"),
    });
    process.exit(1);
  }

  const contact = readOne<Contact>(root, "contacts", id);
  if (!contact) {
    output(options, {
      json: () => ({ success: false, error: "not_found", id }),
      human: () => error(`Contact not found: ${id}`),
    });
    process.exit(1);
  }

  // Get linked deals and activities via db
  const db = await buildDb(root);
  const deals: Record<string, unknown>[] = [];
  const dealStmt = db.prepare(
    "SELECT id, title, stage, value FROM deals WHERE contacts LIKE ?",
  );
  dealStmt.bind([`%${id}%`]);
  while (dealStmt.step()) deals.push(dealStmt.getAsObject());
  dealStmt.free();

  const activities: Record<string, unknown>[] = [];
  const actStmt = db.prepare(
    "SELECT id, type, subject, date FROM activities WHERE contact = ? ORDER BY date DESC LIMIT 10",
  );
  actStmt.bind([id]);
  while (actStmt.step()) activities.push(actStmt.getAsObject());
  actStmt.free();

  db.close();

  output(options, {
    json: () => ({ success: true, contact, deals, activities }),
    human: () => {
      console.log();
      console.log(`  ${bold(contact.name)}  ${dim(contact.id)}`);
      if (contact.email) console.log(`  Email: ${contact.email}`);
      if (contact.phone) console.log(`  Phone: ${contact.phone}`);
      if (contact.role) console.log(`  Role:  ${contact.role}`);
      if (contact.company) console.log(`  Company: ${contact.company}`);
      if (deals.length > 0) {
        console.log(`\n  ${bold("Deals")}`);
        for (const d of deals) {
          console.log(
            `    ${dim(String(d.id))}  ${d.title}  ${dim(String(d.stage))}${d.value ? `  $${d.value}` : ""}`,
          );
        }
      }
      if (activities.length > 0) {
        console.log(`\n  ${bold("Recent Activity")}`);
        for (const a of activities) {
          console.log(`    ${dim(String(a.date))}  ${a.type}  ${a.subject}`);
        }
      }
      console.log();
    },
  });
}

export async function contactEdit(
  args: string[],
  options: OutputOptions,
): Promise<void> {
  const root = requireRoot();
  const id = args[0];

  if (!id) {
    output(options, {
      json: () => ({ success: false, error: "missing_id" }),
      human: () => error("Contact ID required"),
    });
    process.exit(1);
  }

  const contact = readOne<Contact>(root, "contacts", id);
  if (!contact) {
    output(options, {
      json: () => ({ success: false, error: "not_found", id }),
      human: () => error(`Contact not found: ${id}`),
    });
    process.exit(1);
  }

  const fields = parseContactFlags(args.slice(1));
  const updated: Contact = {
    ...contact,
    ...Object.fromEntries(
      Object.entries(fields).filter(([, v]) => v !== undefined),
    ),
    updated: new Date().toISOString(),
  };

  writeRecord(root, "contacts", updated);

  output(options, {
    json: () => ({ success: true, contact: updated }),
    human: () => success(`Contact updated: ${updated.name} (${updated.id})`),
  });
}

export async function contactRm(
  args: string[],
  options: OutputOptions,
): Promise<void> {
  const root = requireRoot();
  const id = args[0];

  if (!id) {
    output(options, {
      json: () => ({ success: false, error: "missing_id" }),
      human: () => error("Contact ID required"),
    });
    process.exit(1);
  }

  const deleted = deleteRecord(root, "contacts", id);
  if (!deleted) {
    output(options, {
      json: () => ({ success: false, error: "not_found", id }),
      human: () => error(`Contact not found: ${id}`),
    });
    process.exit(1);
  }

  output(options, {
    json: () => ({ success: true, id }),
    human: () => success(`Contact removed: ${id}`),
  });
}

export async function contactSearch(
  args: string[],
  options: OutputOptions,
): Promise<void> {
  const root = requireRoot();
  const query = args[0];

  if (!query) {
    output(options, {
      json: () => ({ success: false, error: "missing_query" }),
      human: () => error("Search query required"),
    });
    process.exit(1);
  }

  const db = await buildDb(root);
  const stmt = db.prepare(
    "SELECT * FROM contacts WHERE name LIKE ? OR email LIKE ? OR role LIKE ? ORDER BY name",
  );
  const pattern = `%${query}%`;
  stmt.bind([pattern, pattern, pattern]);

  const results: Contact[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as unknown as Contact);
  }
  stmt.free();
  db.close();

  output(options, {
    json: () => ({ success: true, query, results }),
    human: () => {
      if (results.length === 0) {
        info(`No contacts matching "${query}"`);
        return;
      }
      for (const c of results) {
        const parts = [bold(c.name)];
        if (c.email) parts.push(dim(c.email));
        if (c.role) parts.push(dim(`(${c.role})`));
        console.log(`  ${dim(c.id)}  ${parts.join("  ")}`);
      }
      console.log(dim(`\n  ${results.length} result(s)`));
    },
  });
}
