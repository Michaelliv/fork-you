import { Command } from "commander";
import { buildDb } from "../db.js";
import {
  deleteRecord,
  newId,
  readConfig,
  readOne,
  requireRoot,
  writeRecord,
} from "../store.js";
import type { Deal } from "../types.js";
import type { OutputOptions } from "../utils/output.js";
import { bold, dim, error, info, output, success } from "../utils/output.js";
import { resolveCompanyId } from "../utils/resolve.js";

function getOutputOptions(cmd: Command): OutputOptions {
  const root = cmd.optsWithGlobals();
  return { json: root.json, quiet: root.quiet };
}

export const dealCommand = new Command("deal");

dealCommand
  .command("add")
  .requiredOption("--title <title>", "Deal title")
  .option("--company <id-or-name>", "Company ID or name")
  .option(
    "--contact <id>",
    "Contact ID (repeatable)",
    (val: string, prev: string[]) => [...prev, val],
    [] as string[],
  )
  .option("--stage <stage>", "Pipeline stage")
  .option("--value <value>", "Deal value", parseFloat)
  .option("--currency <currency>", "Currency code")
  .option("--probability <pct>", "Win probability %", parseFloat)
  .option("--close-date <date>", "Expected close date")
  .action((opts, cmd) => {
    const options = getOutputOptions(cmd);
    const root = requireRoot();
    const config = readConfig(root);

    const company = opts.company
      ? resolveCompanyId(root, opts.company)
      : undefined;

    const stage = opts.stage || config.stages[0];
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
      title: opts.title,
      company,
      contacts: opts.contact,
      stage,
      value: opts.value,
      currency: opts.currency || config.currency,
      probability: opts.probability,
      closeDate: opts.closeDate,
      created: now,
      updated: now,
    };

    writeRecord(root, "deals", deal);

    output(options, {
      json: () => ({ success: true, deal }),
      human: () =>
        success(`Deal added: ${deal.title} (${deal.id}) [${deal.stage}]`),
    });
  });

dealCommand.command("list").action(async (_opts, cmd) => {
  const options = getOutputOptions(cmd);
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
});

dealCommand
  .command("show")
  .argument("<id>", "Deal ID")
  .action(async (id, _opts, cmd) => {
    const options = getOutputOptions(cmd);
    const root = requireRoot();

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
  });

dealCommand
  .command("edit")
  .argument("<id>", "Deal ID")
  .option("--title <title>", "Deal title")
  .option("--company <id-or-name>", "Company ID or name")
  .option(
    "--contact <id>",
    "Contact ID (repeatable)",
    (val: string, prev: string[]) => [...prev, val],
    [] as string[],
  )
  .option("--stage <stage>", "Pipeline stage")
  .option("--value <value>", "Deal value", parseFloat)
  .option("--currency <currency>", "Currency code")
  .option("--probability <pct>", "Win probability %", parseFloat)
  .option("--close-date <date>", "Expected close date")
  .action((id, opts, cmd) => {
    const options = getOutputOptions(cmd);
    const root = requireRoot();

    const deal = readOne<Deal>(root, "deals", id);
    if (!deal) {
      output(options, {
        json: () => ({ success: false, error: "not_found", id }),
        human: () => error(`Deal not found: ${id}`),
      });
      process.exit(1);
    }

    if (opts.stage) {
      const config = readConfig(root);
      if (!config.stages.includes(opts.stage)) {
        output(options, {
          json: () => ({
            success: false,
            error: "invalid_stage",
            stage: opts.stage,
            valid: config.stages,
          }),
          human: () =>
            error(
              `Invalid stage: ${opts.stage}. Valid: ${config.stages.join(", ")}`,
            ),
        });
        process.exit(1);
      }
    }

    const company = opts.company
      ? resolveCompanyId(root, opts.company)
      : undefined;

    const updated: Deal = {
      ...deal,
      ...(opts.title !== undefined && { title: opts.title }),
      ...(company !== undefined && { company }),
      ...(opts.contact.length > 0 && { contacts: opts.contact }),
      ...(opts.stage !== undefined && { stage: opts.stage }),
      ...(opts.value !== undefined && { value: opts.value }),
      ...(opts.currency !== undefined && { currency: opts.currency }),
      ...(opts.probability !== undefined && { probability: opts.probability }),
      ...(opts.closeDate !== undefined && { closeDate: opts.closeDate }),
      updated: new Date().toISOString(),
    };

    writeRecord(root, "deals", updated);

    output(options, {
      json: () => ({ success: true, deal: updated }),
      human: () => success(`Deal updated: ${updated.title} (${updated.id})`),
    });
  });

dealCommand
  .command("move")
  .argument("<id>", "Deal ID")
  .argument("<stage>", "Target stage")
  .action((id, stage, _opts, cmd) => {
    const options = getOutputOptions(cmd);
    const root = requireRoot();

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
  });

dealCommand
  .command("rm")
  .argument("<id>", "Deal ID")
  .action((id, _opts, cmd) => {
    const options = getOutputOptions(cmd);
    const root = requireRoot();

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
  });

dealCommand
  .command("search")
  .argument("<query>", "Search query")
  .action(async (query, _opts, cmd) => {
    const options = getOutputOptions(cmd);
    const root = requireRoot();

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
  });
