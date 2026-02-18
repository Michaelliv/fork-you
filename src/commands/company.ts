import { Command } from "commander";
import { buildDb } from "../db.js";
import {
  deleteRecord,
  newId,
  readOne,
  requireRoot,
  writeRecord,
} from "../store.js";
import type { Company } from "../types.js";
import type { OutputOptions } from "../utils/output.js";
import { bold, dim, error, info, output, success } from "../utils/output.js";

function getOutputOptions(cmd: Command): OutputOptions {
  const root = cmd.optsWithGlobals();
  return { json: root.json, quiet: root.quiet };
}

export const companyCommand = new Command("company");

companyCommand
  .command("add")
  .requiredOption("--name <name>", "Company name")
  .option("--domain <domain>", "Website domain")
  .option("--industry <industry>", "Industry")
  .option("--size <size>", "Company size")
  .action((opts, cmd) => {
    const options = getOutputOptions(cmd);
    const root = requireRoot();

    const now = new Date().toISOString();
    const company: Company = {
      id: newId(),
      name: opts.name,
      domain: opts.domain,
      industry: opts.industry,
      size: opts.size,
      created: now,
      updated: now,
    };

    writeRecord(root, "companies", company);

    output(options, {
      json: () => ({ success: true, company }),
      human: () => success(`Company added: ${company.name} (${company.id})`),
    });
  });

companyCommand.command("list").action(async (_opts, cmd) => {
  const options = getOutputOptions(cmd);
  const root = requireRoot();
  const db = await buildDb(root);

  const stmt = db.prepare("SELECT * FROM companies ORDER BY name");
  const companies: Company[] = [];
  while (stmt.step()) {
    companies.push(stmt.getAsObject() as unknown as Company);
  }
  stmt.free();
  db.close();

  output(options, {
    json: () => ({ success: true, companies }),
    human: () => {
      if (companies.length === 0) {
        info("No companies yet");
        return;
      }
      for (const c of companies) {
        const parts = [bold(c.name)];
        if (c.domain) parts.push(dim(c.domain));
        if (c.industry) parts.push(dim(`(${c.industry})`));
        console.log(`  ${dim(c.id)}  ${parts.join("  ")}`);
      }
      console.log(dim(`\n  ${companies.length} company(ies)`));
    },
  });
});

companyCommand
  .command("show")
  .argument("<id>", "Company ID")
  .action(async (id, _opts, cmd) => {
    const options = getOutputOptions(cmd);
    const root = requireRoot();

    const company = readOne<Company>(root, "companies", id);
    if (!company) {
      output(options, {
        json: () => ({ success: false, error: "not_found", id }),
        human: () => error(`Company not found: ${id}`),
      });
      process.exit(1);
    }

    const db = await buildDb(root);

    const contacts: Record<string, unknown>[] = [];
    const cStmt = db.prepare(
      "SELECT id, name, role, email FROM contacts WHERE company = ?",
    );
    cStmt.bind([id]);
    while (cStmt.step()) contacts.push(cStmt.getAsObject());
    cStmt.free();

    const deals: Record<string, unknown>[] = [];
    const dStmt = db.prepare(
      "SELECT id, title, stage, value FROM deals WHERE company = ?",
    );
    dStmt.bind([id]);
    while (dStmt.step()) deals.push(dStmt.getAsObject());
    dStmt.free();

    db.close();

    output(options, {
      json: () => ({ success: true, company, contacts, deals }),
      human: () => {
        console.log();
        console.log(`  ${bold(company.name)}  ${dim(company.id)}`);
        if (company.domain) console.log(`  Domain:   ${company.domain}`);
        if (company.industry) console.log(`  Industry: ${company.industry}`);
        if (company.size) console.log(`  Size:     ${company.size}`);
        if (contacts.length > 0) {
          console.log(`\n  ${bold("Contacts")}`);
          for (const c of contacts) {
            console.log(
              `    ${dim(String(c.id))}  ${c.name}${c.role ? `  ${dim(String(c.role))}` : ""}`,
            );
          }
        }
        if (deals.length > 0) {
          console.log(`\n  ${bold("Deals")}`);
          for (const d of deals) {
            console.log(
              `    ${dim(String(d.id))}  ${d.title}  ${dim(String(d.stage))}${d.value ? `  $${d.value}` : ""}`,
            );
          }
        }
        console.log();
      },
    });
  });

companyCommand
  .command("edit")
  .argument("<id>", "Company ID")
  .option("--name <name>", "Company name")
  .option("--domain <domain>", "Website domain")
  .option("--industry <industry>", "Industry")
  .option("--size <size>", "Company size")
  .action((id, opts, cmd) => {
    const options = getOutputOptions(cmd);
    const root = requireRoot();

    const company = readOne<Company>(root, "companies", id);
    if (!company) {
      output(options, {
        json: () => ({ success: false, error: "not_found", id }),
        human: () => error(`Company not found: ${id}`),
      });
      process.exit(1);
    }

    const updated: Company = {
      ...company,
      ...(opts.name !== undefined && { name: opts.name }),
      ...(opts.domain !== undefined && { domain: opts.domain }),
      ...(opts.industry !== undefined && { industry: opts.industry }),
      ...(opts.size !== undefined && { size: opts.size }),
      updated: new Date().toISOString(),
    };

    writeRecord(root, "companies", updated);

    output(options, {
      json: () => ({ success: true, company: updated }),
      human: () => success(`Company updated: ${updated.name} (${updated.id})`),
    });
  });

companyCommand
  .command("rm")
  .argument("<id>", "Company ID")
  .action((id, _opts, cmd) => {
    const options = getOutputOptions(cmd);
    const root = requireRoot();

    const deleted = deleteRecord(root, "companies", id);
    if (!deleted) {
      output(options, {
        json: () => ({ success: false, error: "not_found", id }),
        human: () => error(`Company not found: ${id}`),
      });
      process.exit(1);
    }

    output(options, {
      json: () => ({ success: true, id }),
      human: () => success(`Company removed: ${id}`),
    });
  });

companyCommand
  .command("search")
  .argument("<query>", "Search query")
  .action(async (query, _opts, cmd) => {
    const options = getOutputOptions(cmd);
    const root = requireRoot();

    const db = await buildDb(root);
    const stmt = db.prepare(
      "SELECT * FROM companies WHERE name LIKE ? OR domain LIKE ? OR industry LIKE ? ORDER BY name",
    );
    const pattern = `%${query}%`;
    stmt.bind([pattern, pattern, pattern]);

    const results: Company[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as Company);
    }
    stmt.free();
    db.close();

    output(options, {
      json: () => ({ success: true, query, results }),
      human: () => {
        if (results.length === 0) {
          info(`No companies matching "${query}"`);
          return;
        }
        for (const c of results) {
          const parts = [bold(c.name)];
          if (c.domain) parts.push(dim(c.domain));
          if (c.industry) parts.push(dim(`(${c.industry})`));
          console.log(`  ${dim(c.id)}  ${parts.join("  ")}`);
        }
        console.log(dim(`\n  ${results.length} result(s)`));
      },
    });
  });
