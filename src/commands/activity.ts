import { Command } from "commander";
import { buildDb } from "../db.js";
import {
  deleteRecord,
  newId,
  readOne,
  requireRoot,
  writeRecord,
} from "../store.js";
import type { Activity, ActivityType } from "../types.js";
import type { OutputOptions } from "../utils/output.js";
import { bold, dim, error, info, output, success } from "../utils/output.js";
import { resolveCompanyId } from "../utils/resolve.js";

const VALID_TYPES: ActivityType[] = ["call", "email", "meeting", "note"];

function getOutputOptions(cmd: Command): OutputOptions {
  const root = cmd.optsWithGlobals();
  return { json: root.json, quiet: root.quiet };
}

export const activityCommand = new Command("activity");

activityCommand
  .command("add")
  .requiredOption("--type <type>", "Activity type (call, email, meeting, note)")
  .requiredOption("--subject <subject>", "Subject line")
  .option("--body <body>", "Body / notes")
  .option("--contact <id>", "Contact ID")
  .option("--deal <id>", "Deal ID")
  .option("--company <id-or-name>", "Company ID or name")
  .option("--date <date>", "Activity date (ISO)")
  .action((opts, cmd) => {
    const options = getOutputOptions(cmd);
    const root = requireRoot();

    if (!VALID_TYPES.includes(opts.type)) {
      output(options, {
        json: () => ({
          success: false,
          error: "invalid_type",
          type: opts.type,
          valid: VALID_TYPES,
        }),
        human: () =>
          error(`Invalid type: ${opts.type}. Valid: ${VALID_TYPES.join(", ")}`),
      });
      process.exit(1);
    }

    const company = opts.company
      ? resolveCompanyId(root, opts.company)
      : undefined;

    const now = new Date().toISOString();
    const activity: Activity = {
      id: newId(),
      type: opts.type,
      subject: opts.subject,
      body: opts.body,
      contact: opts.contact,
      deal: opts.deal,
      company,
      date: opts.date || now,
      created: now,
      updated: now,
    };

    writeRecord(root, "activities", activity);

    output(options, {
      json: () => ({ success: true, activity }),
      human: () =>
        success(
          `Activity logged: ${activity.type} - ${activity.subject} (${activity.id})`,
        ),
    });
  });

activityCommand.command("list").action(async (_opts, cmd) => {
  const options = getOutputOptions(cmd);
  const root = requireRoot();
  const db = await buildDb(root);

  const stmt = db.prepare("SELECT * FROM activities ORDER BY date DESC");
  const activities: Activity[] = [];
  while (stmt.step()) {
    activities.push(stmt.getAsObject() as unknown as Activity);
  }
  stmt.free();
  db.close();

  output(options, {
    json: () => ({ success: true, activities }),
    human: () => {
      if (activities.length === 0) {
        info("No activities yet");
        return;
      }
      for (const a of activities) {
        const parts = [bold(a.subject)];
        if (a.contact) parts.push(dim(`contact:${a.contact}`));
        if (a.deal) parts.push(dim(`deal:${a.deal}`));
        console.log(
          `  ${dim(String(a.date).slice(0, 10))}  ${dim(a.type.padEnd(7))}  ${parts.join("  ")}  ${dim(a.id)}`,
        );
      }
      console.log(dim(`\n  ${activities.length} activity(ies)`));
    },
  });
});

activityCommand
  .command("show")
  .argument("<id>", "Activity ID")
  .action((id, _opts, cmd) => {
    const options = getOutputOptions(cmd);
    const root = requireRoot();

    const activity = readOne<Activity>(root, "activities", id);
    if (!activity) {
      output(options, {
        json: () => ({ success: false, error: "not_found", id }),
        human: () => error(`Activity not found: ${id}`),
      });
      process.exit(1);
    }

    output(options, {
      json: () => ({ success: true, activity }),
      human: () => {
        console.log();
        console.log(`  ${bold(activity.subject)}  ${dim(activity.id)}`);
        console.log(`  Type: ${activity.type}`);
        console.log(`  Date: ${activity.date}`);
        if (activity.body) console.log(`  Body: ${activity.body}`);
        if (activity.contact) console.log(`  Contact: ${activity.contact}`);
        if (activity.deal) console.log(`  Deal:    ${activity.deal}`);
        if (activity.company) console.log(`  Company: ${activity.company}`);
        console.log();
      },
    });
  });

activityCommand
  .command("rm")
  .argument("<id>", "Activity ID")
  .action((id, _opts, cmd) => {
    const options = getOutputOptions(cmd);
    const root = requireRoot();

    const deleted = deleteRecord(root, "activities", id);
    if (!deleted) {
      output(options, {
        json: () => ({ success: false, error: "not_found", id }),
        human: () => error(`Activity not found: ${id}`),
      });
      process.exit(1);
    }

    output(options, {
      json: () => ({ success: true, id }),
      human: () => success(`Activity removed: ${id}`),
    });
  });
