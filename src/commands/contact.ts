import { Command } from "commander";
import { buildDb } from "../db.js";
import {
  deleteRecord,
  newId,
  readOne,
  requireRoot,
  writeRecord,
} from "../store.js";
import type { Contact } from "../types.js";
import type { OutputOptions } from "../utils/output.js";
import { bold, dim, error, info, output, success } from "../utils/output.js";
import { resolveCompanyId } from "../utils/resolve.js";

function getOutputOptions(cmd: Command): OutputOptions {
  const root = cmd.optsWithGlobals();
  return { json: root.json, quiet: root.quiet };
}

function resolveCompanyIfNeeded(
  root: string,
  company: string | undefined,
): string | undefined {
  if (!company) return undefined;
  return resolveCompanyId(root, company);
}

export const contactCommand = new Command("contact");

contactCommand
  .command("add")
  .requiredOption("--name <name>", "Contact name")
  .option("--email <email>", "Email address")
  .option("--phone <phone>", "Phone number")
  .option("--company <id-or-name>", "Company ID or name")
  .option("--role <role>", "Role / job title")
  .action((opts, cmd) => {
    const options = getOutputOptions(cmd);
    const root = requireRoot();

    const company = resolveCompanyIfNeeded(root, opts.company);

    const now = new Date().toISOString();
    const contact: Contact = {
      id: newId(),
      name: opts.name,
      email: opts.email,
      phone: opts.phone,
      company,
      role: opts.role,
      created: now,
      updated: now,
    };

    writeRecord(root, "contacts", contact);

    output(options, {
      json: () => ({ success: true, contact }),
      human: () => success(`Contact added: ${contact.name} (${contact.id})`),
    });
  });

contactCommand.command("list").action(async (_opts, cmd) => {
  const options = getOutputOptions(cmd);
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
});

contactCommand
  .command("show")
  .argument("<id>", "Contact ID")
  .action(async (id, _opts, cmd) => {
    const options = getOutputOptions(cmd);
    const root = requireRoot();

    const contact = readOne<Contact>(root, "contacts", id);
    if (!contact) {
      output(options, {
        json: () => ({ success: false, error: "not_found", id }),
        human: () => error(`Contact not found: ${id}`),
      });
      process.exit(1);
    }

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
  });

contactCommand
  .command("edit")
  .argument("<id>", "Contact ID")
  .option("--name <name>", "Contact name")
  .option("--email <email>", "Email address")
  .option("--phone <phone>", "Phone number")
  .option("--company <id-or-name>", "Company ID or name")
  .option("--role <role>", "Role / job title")
  .action((id, opts, cmd) => {
    const options = getOutputOptions(cmd);
    const root = requireRoot();

    const contact = readOne<Contact>(root, "contacts", id);
    if (!contact) {
      output(options, {
        json: () => ({ success: false, error: "not_found", id }),
        human: () => error(`Contact not found: ${id}`),
      });
      process.exit(1);
    }

    const company = opts.company
      ? resolveCompanyId(root, opts.company)
      : undefined;

    const updated: Contact = {
      ...contact,
      ...(opts.name !== undefined && { name: opts.name }),
      ...(opts.email !== undefined && { email: opts.email }),
      ...(opts.phone !== undefined && { phone: opts.phone }),
      ...(company !== undefined && { company }),
      ...(opts.role !== undefined && { role: opts.role }),
      updated: new Date().toISOString(),
    };

    writeRecord(root, "contacts", updated);

    output(options, {
      json: () => ({ success: true, contact: updated }),
      human: () => success(`Contact updated: ${updated.name} (${updated.id})`),
    });
  });

contactCommand
  .command("rm")
  .argument("<id>", "Contact ID")
  .action((id, _opts, cmd) => {
    const options = getOutputOptions(cmd);
    const root = requireRoot();

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
  });

contactCommand
  .command("search")
  .argument("<query>", "Search query")
  .action(async (query, _opts, cmd) => {
    const options = getOutputOptions(cmd);
    const root = requireRoot();

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
  });
