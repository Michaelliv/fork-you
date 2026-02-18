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

function parseCompanyFlags(args: string[]): Partial<Company> {
  const fields: Partial<Company> = {};
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    const val = args[i + 1];
    if (!val) continue;
    switch (flag) {
      case "--name":
        fields.name = val;
        i++;
        break;
      case "--domain":
        fields.domain = val;
        i++;
        break;
      case "--industry":
        fields.industry = val;
        i++;
        break;
      case "--size":
        fields.size = val;
        i++;
        break;
    }
  }
  return fields;
}

export async function companyAdd(
  args: string[],
  options: OutputOptions,
): Promise<void> {
  const root = requireRoot();
  const fields = parseCompanyFlags(args);

  if (!fields.name) {
    output(options, {
      json: () => ({ success: false, error: "missing_name" }),
      human: () => error("--name is required"),
    });
    process.exit(1);
  }

  const now = new Date().toISOString();
  const company: Company = {
    id: newId(),
    name: fields.name,
    domain: fields.domain,
    industry: fields.industry,
    size: fields.size,
    created: now,
    updated: now,
  };

  writeRecord(root, "companies", company);

  output(options, {
    json: () => ({ success: true, company }),
    human: () => success(`Company added: ${company.name} (${company.id})`),
  });
}

export async function companyList(
  _args: string[],
  options: OutputOptions,
): Promise<void> {
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
}

export async function companyShow(
  args: string[],
  options: OutputOptions,
): Promise<void> {
  const root = requireRoot();
  const id = args[0];

  if (!id) {
    output(options, {
      json: () => ({ success: false, error: "missing_id" }),
      human: () => error("Company ID required"),
    });
    process.exit(1);
  }

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
}

export async function companyEdit(
  args: string[],
  options: OutputOptions,
): Promise<void> {
  const root = requireRoot();
  const id = args[0];

  if (!id) {
    output(options, {
      json: () => ({ success: false, error: "missing_id" }),
      human: () => error("Company ID required"),
    });
    process.exit(1);
  }

  const company = readOne<Company>(root, "companies", id);
  if (!company) {
    output(options, {
      json: () => ({ success: false, error: "not_found", id }),
      human: () => error(`Company not found: ${id}`),
    });
    process.exit(1);
  }

  const fields = parseCompanyFlags(args.slice(1));
  const updated: Company = {
    ...company,
    ...Object.fromEntries(
      Object.entries(fields).filter(([, v]) => v !== undefined),
    ),
    updated: new Date().toISOString(),
  };

  writeRecord(root, "companies", updated);

  output(options, {
    json: () => ({ success: true, company: updated }),
    human: () => success(`Company updated: ${updated.name} (${updated.id})`),
  });
}

export async function companyRm(
  args: string[],
  options: OutputOptions,
): Promise<void> {
  const root = requireRoot();
  const id = args[0];

  if (!id) {
    output(options, {
      json: () => ({ success: false, error: "missing_id" }),
      human: () => error("Company ID required"),
    });
    process.exit(1);
  }

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
}

export async function companySearch(
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
}
