import { buildDb } from "../db";
import {
  deleteRecord,
  newId,
  readOne,
  requireRoot,
  writeRecord,
} from "../store";
import type { Activity, ActivityType } from "../types";
import type { OutputOptions } from "../utils/output";
import { bold, dim, error, info, output, success } from "../utils/output";

const VALID_TYPES: ActivityType[] = ["call", "email", "meeting", "note"];

function parseActivityFlags(args: string[]): Partial<Activity> {
  const fields: Partial<Activity> = {};
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    const val = args[i + 1];
    if (!val) continue;
    switch (flag) {
      case "--type":
        fields.type = val as ActivityType;
        i++;
        break;
      case "--subject":
        fields.subject = val;
        i++;
        break;
      case "--body":
        fields.body = val;
        i++;
        break;
      case "--contact":
        fields.contact = val;
        i++;
        break;
      case "--deal":
        fields.deal = val;
        i++;
        break;
      case "--company":
        fields.company = val;
        i++;
        break;
      case "--date":
        fields.date = val;
        i++;
        break;
    }
  }
  return fields;
}

export async function activityAdd(
  args: string[],
  options: OutputOptions,
): Promise<void> {
  const root = requireRoot();
  const fields = parseActivityFlags(args);

  if (!fields.type) {
    output(options, {
      json: () => ({
        success: false,
        error: "missing_type",
        valid: VALID_TYPES,
      }),
      human: () =>
        error(`--type is required. Valid: ${VALID_TYPES.join(", ")}`),
    });
    process.exit(1);
  }

  if (!VALID_TYPES.includes(fields.type)) {
    output(options, {
      json: () => ({
        success: false,
        error: "invalid_type",
        type: fields.type,
        valid: VALID_TYPES,
      }),
      human: () =>
        error(`Invalid type: ${fields.type}. Valid: ${VALID_TYPES.join(", ")}`),
    });
    process.exit(1);
  }

  if (!fields.subject) {
    output(options, {
      json: () => ({ success: false, error: "missing_subject" }),
      human: () => error("--subject is required"),
    });
    process.exit(1);
  }

  const now = new Date().toISOString();
  const activity: Activity = {
    id: newId(),
    type: fields.type,
    subject: fields.subject,
    body: fields.body,
    contact: fields.contact,
    deal: fields.deal,
    company: fields.company,
    date: fields.date || now,
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
}

export async function activityList(
  _args: string[],
  options: OutputOptions,
): Promise<void> {
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
}

export async function activityShow(
  args: string[],
  options: OutputOptions,
): Promise<void> {
  const root = requireRoot();
  const id = args[0];

  if (!id) {
    output(options, {
      json: () => ({ success: false, error: "missing_id" }),
      human: () => error("Activity ID required"),
    });
    process.exit(1);
  }

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
}

export async function activityRm(
  args: string[],
  options: OutputOptions,
): Promise<void> {
  const root = requireRoot();
  const id = args[0];

  if (!id) {
    output(options, {
      json: () => ({ success: false, error: "missing_id" }),
      human: () => error("Activity ID required"),
    });
    process.exit(1);
  }

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
}
