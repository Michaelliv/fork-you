import { buildDb } from "../db";
import {
  deleteRecord,
  newId,
  readConfig,
  readOne,
  requireRoot,
  writeRecord,
} from "../store";
import type { Deal } from "../types";
import type { OutputOptions } from "../utils/output";
import { bold, dim, error, info, output, success } from "../utils/output";

function parseDealFlags(args: string[]): Partial<Deal> & { contact?: string } {
  const fields: Partial<Deal> & { contact?: string } = {};
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    const val = args[i + 1];
    if (!val) continue;
    switch (flag) {
      case "--title":
        fields.title = val;
        i++;
        break;
      case "--company":
        fields.company = val;
        i++;
        break;
      case "--contact":
        fields.contact = val;
        i++;
        break;
      case "--stage":
        fields.stage = val;
        i++;
        break;
      case "--value":
        fields.value = parseFloat(val);
        i++;
        break;
      case "--currency":
        fields.currency = val;
        i++;
        break;
      case "--probability":
        fields.probability = parseFloat(val);
        i++;
        break;
      case "--close-date":
        fields.closeDate = val;
        i++;
        break;
    }
  }
  return fields;
}

// Collect all --contact flags into an array
function parseContactFlags(args: string[]): string[] {
  const contacts: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--contact" && args[i + 1]) {
      contacts.push(args[i + 1]);
    }
  }
  return contacts;
}

export async function dealAdd(
  args: string[],
  options: OutputOptions,
): Promise<void> {
  const root = requireRoot();
  const fields = parseDealFlags(args);
  const contacts = parseContactFlags(args);
  const config = readConfig(root);

  if (!fields.title) {
    output(options, {
      json: () => ({ success: false, error: "missing_title" }),
      human: () => error("--title is required"),
    });
    process.exit(1);
  }

  const stage = fields.stage || config.stages[0];
  if (!config.stages.includes(stage)) {
    output(options, {
      json: () => ({
        success: false,
        error: "invalid_stage",
        stage,
        valid: config.stages,
      }),
      human: () =>
        error(`Invalid stage: ${stage}. Valid: ${config.stages.join(", ")}`),
    });
    process.exit(1);
  }

  const now = new Date().toISOString();
  const deal: Deal = {
    id: newId(),
    title: fields.title,
    company: fields.company,
    contacts,
    stage,
    value: fields.value,
    currency: fields.currency || config.currency,
    probability: fields.probability,
    closeDate: fields.closeDate,
    created: now,
    updated: now,
  };

  writeRecord(root, "deals", deal);

  output(options, {
    json: () => ({ success: true, deal }),
    human: () =>
      success(`Deal added: ${deal.title} (${deal.id}) [${deal.stage}]`),
  });
}

export async function dealList(
  _args: string[],
  options: OutputOptions,
): Promise<void> {
  const root = requireRoot();
  const config = readConfig(root);
  const db = await buildDb(root);

  const stmt = db.prepare("SELECT * FROM deals ORDER BY stage, title");
  const deals: Deal[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as Record<string, unknown>;
    deals.push({
      ...row,
      contacts: JSON.parse(String(row.contacts || "[]")),
    } as unknown as Deal);
  }
  stmt.free();
  db.close();

  output(options, {
    json: () => ({ success: true, deals }),
    human: () => {
      if (deals.length === 0) {
        info("No deals yet");
        return;
      }
      // Group by stage
      for (const stage of config.stages) {
        const stageDeals = deals.filter((d) => d.stage === stage);
        if (stageDeals.length === 0) continue;
        const total = stageDeals.reduce(
          (sum, d) => sum + (Number(d.value) || 0),
          0,
        );
        console.log(
          `\n  ${bold(stage)}${total > 0 ? dim(`  $${total.toLocaleString()}`) : ""}`,
        );
        for (const d of stageDeals) {
          console.log(
            `    ${dim(String(d.id))}  ${d.title}${d.value ? `  $${Number(d.value).toLocaleString()}` : ""}`,
          );
        }
      }
      console.log(dim(`\n  ${deals.length} deal(s)`));
    },
  });
}

export async function dealShow(
  args: string[],
  options: OutputOptions,
): Promise<void> {
  const root = requireRoot();
  const id = args[0];

  if (!id) {
    output(options, {
      json: () => ({ success: false, error: "missing_id" }),
      human: () => error("Deal ID required"),
    });
    process.exit(1);
  }

  const deal = readOne<Deal>(root, "deals", id);
  if (!deal) {
    output(options, {
      json: () => ({ success: false, error: "not_found", id }),
      human: () => error(`Deal not found: ${id}`),
    });
    process.exit(1);
  }

  const db = await buildDb(root);

  const activities: Record<string, unknown>[] = [];
  const actStmt = db.prepare(
    "SELECT id, type, subject, date FROM activities WHERE deal = ? ORDER BY date DESC LIMIT 10",
  );
  actStmt.bind([id]);
  while (actStmt.step()) activities.push(actStmt.getAsObject());
  actStmt.free();

  db.close();

  output(options, {
    json: () => ({ success: true, deal, activities }),
    human: () => {
      console.log();
      console.log(`  ${bold(deal.title)}  ${dim(deal.id)}`);
      console.log(`  Stage:       ${deal.stage}`);
      if (deal.value)
        console.log(
          `  Value:       $${deal.value.toLocaleString()} ${deal.currency || ""}`,
        );
      if (deal.probability != null)
        console.log(`  Probability: ${deal.probability}%`);
      if (deal.closeDate) console.log(`  Close date:  ${deal.closeDate}`);
      if (deal.company) console.log(`  Company:     ${deal.company}`);
      if (deal.contacts.length > 0)
        console.log(`  Contacts:    ${deal.contacts.join(", ")}`);
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

export async function dealEdit(
  args: string[],
  options: OutputOptions,
): Promise<void> {
  const root = requireRoot();
  const id = args[0];

  if (!id) {
    output(options, {
      json: () => ({ success: false, error: "missing_id" }),
      human: () => error("Deal ID required"),
    });
    process.exit(1);
  }

  const deal = readOne<Deal>(root, "deals", id);
  if (!deal) {
    output(options, {
      json: () => ({ success: false, error: "not_found", id }),
      human: () => error(`Deal not found: ${id}`),
    });
    process.exit(1);
  }

  const fields = parseDealFlags(args.slice(1));
  const contacts = parseContactFlags(args.slice(1));

  if (fields.stage) {
    const config = readConfig(root);
    if (!config.stages.includes(fields.stage)) {
      output(options, {
        json: () => ({
          success: false,
          error: "invalid_stage",
          stage: fields.stage,
          valid: config.stages,
        }),
        human: () =>
          error(
            `Invalid stage: ${fields.stage}. Valid: ${config.stages.join(", ")}`,
          ),
      });
      process.exit(1);
    }
  }

  const updated: Deal = {
    ...deal,
    ...Object.fromEntries(
      Object.entries(fields).filter(
        ([k, v]) => v !== undefined && k !== "contact",
      ),
    ),
    contacts: contacts.length > 0 ? contacts : deal.contacts,
    updated: new Date().toISOString(),
  };

  writeRecord(root, "deals", updated);

  output(options, {
    json: () => ({ success: true, deal: updated }),
    human: () => success(`Deal updated: ${updated.title} (${updated.id})`),
  });
}

export async function dealMove(
  args: string[],
  options: OutputOptions,
): Promise<void> {
  const root = requireRoot();
  const id = args[0];
  const stage = args[1];

  if (!id || !stage) {
    output(options, {
      json: () => ({ success: false, error: "missing_args" }),
      human: () => error("Usage: fork-you deal move <id> <stage>"),
    });
    process.exit(1);
  }

  const deal = readOne<Deal>(root, "deals", id);
  if (!deal) {
    output(options, {
      json: () => ({ success: false, error: "not_found", id }),
      human: () => error(`Deal not found: ${id}`),
    });
    process.exit(1);
  }

  const config = readConfig(root);
  if (!config.stages.includes(stage)) {
    output(options, {
      json: () => ({
        success: false,
        error: "invalid_stage",
        stage,
        valid: config.stages,
      }),
      human: () =>
        error(`Invalid stage: ${stage}. Valid: ${config.stages.join(", ")}`),
    });
    process.exit(1);
  }

  const prev = deal.stage;
  deal.stage = stage;
  deal.updated = new Date().toISOString();
  writeRecord(root, "deals", deal);

  output(options, {
    json: () => ({ success: true, deal, previousStage: prev }),
    human: () => success(`${deal.title}: ${prev} → ${stage}`),
  });
}

export async function dealRm(
  args: string[],
  options: OutputOptions,
): Promise<void> {
  const root = requireRoot();
  const id = args[0];

  if (!id) {
    output(options, {
      json: () => ({ success: false, error: "missing_id" }),
      human: () => error("Deal ID required"),
    });
    process.exit(1);
  }

  const deleted = deleteRecord(root, "deals", id);
  if (!deleted) {
    output(options, {
      json: () => ({ success: false, error: "not_found", id }),
      human: () => error(`Deal not found: ${id}`),
    });
    process.exit(1);
  }

  output(options, {
    json: () => ({ success: true, id }),
    human: () => success(`Deal removed: ${id}`),
  });
}

export async function dealSearch(
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
    "SELECT * FROM deals WHERE title LIKE ? OR stage LIKE ? ORDER BY title",
  );
  const pattern = `%${query}%`;
  stmt.bind([pattern, pattern]);

  const results: Deal[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as Record<string, unknown>;
    results.push({
      ...row,
      contacts: JSON.parse(String(row.contacts || "[]")),
    } as unknown as Deal);
  }
  stmt.free();
  db.close();

  output(options, {
    json: () => ({ success: true, query, results }),
    human: () => {
      if (results.length === 0) {
        info(`No deals matching "${query}"`);
        return;
      }
      for (const d of results) {
        console.log(
          `  ${dim(String(d.id))}  ${bold(d.title)}  ${dim(d.stage)}${d.value ? `  $${Number(d.value).toLocaleString()}` : ""}`,
        );
      }
      console.log(dim(`\n  ${results.length} result(s)`));
    },
  });
}
