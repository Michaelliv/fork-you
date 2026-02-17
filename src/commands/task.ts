import { buildDb } from "../db";
import {
  deleteRecord,
  newId,
  readOne,
  requireRoot,
  writeRecord,
} from "../store";
import type { Task } from "../types";
import type { OutputOptions } from "../utils/output";
import { bold, dim, error, info, output, success } from "../utils/output";

function parseTaskFlags(args: string[]): Partial<Task> {
  const fields: Partial<Task> = {};
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    const val = args[i + 1];
    if (!val) continue;
    switch (flag) {
      case "--title":
        fields.title = val;
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
      case "--due":
        fields.due = val;
        i++;
        break;
    }
  }
  return fields;
}

export async function taskAdd(
  args: string[],
  options: OutputOptions,
): Promise<void> {
  const root = requireRoot();
  const fields = parseTaskFlags(args);

  if (!fields.title) {
    output(options, {
      json: () => ({ success: false, error: "missing_title" }),
      human: () => error("--title is required"),
    });
    process.exit(1);
  }

  const now = new Date().toISOString();
  const task: Task = {
    id: newId(),
    title: fields.title,
    contact: fields.contact,
    deal: fields.deal,
    company: fields.company,
    due: fields.due,
    done: false,
    created: now,
    updated: now,
  };

  writeRecord(root, "tasks", task);

  output(options, {
    json: () => ({ success: true, task }),
    human: () =>
      success(
        `Task added: ${task.title} (${task.id})${task.due ? ` due ${task.due}` : ""}`,
      ),
  });
}

export async function taskList(
  _args: string[],
  options: OutputOptions,
): Promise<void> {
  const root = requireRoot();
  const db = await buildDb(root);

  const stmt = db.prepare(
    "SELECT * FROM tasks ORDER BY done ASC, due ASC, created DESC",
  );
  const tasks: Task[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as Record<string, unknown>;
    tasks.push({ ...row, done: Boolean(row.done) } as unknown as Task);
  }
  stmt.free();
  db.close();

  output(options, {
    json: () => ({ success: true, tasks }),
    human: () => {
      if (tasks.length === 0) {
        info("No tasks yet");
        return;
      }
      const pending = tasks.filter((t) => !t.done);
      const completed = tasks.filter((t) => t.done);

      if (pending.length > 0) {
        for (const t of pending) {
          const due = t.due ? dim(` due ${t.due}`) : "";
          console.log(`  ○ ${bold(t.title)}${due}  ${dim(t.id)}`);
        }
      }
      if (completed.length > 0) {
        console.log();
        for (const t of completed) {
          console.log(`  ${dim("●")} ${dim(t.title)}  ${dim(t.id)}`);
        }
      }
      console.log(
        dim(`\n  ${pending.length} pending, ${completed.length} done`),
      );
    },
  });
}

export async function taskDone(
  args: string[],
  options: OutputOptions,
): Promise<void> {
  const root = requireRoot();
  const id = args[0];

  if (!id) {
    output(options, {
      json: () => ({ success: false, error: "missing_id" }),
      human: () => error("Task ID required"),
    });
    process.exit(1);
  }

  const task = readOne<Task>(root, "tasks", id);
  if (!task) {
    output(options, {
      json: () => ({ success: false, error: "not_found", id }),
      human: () => error(`Task not found: ${id}`),
    });
    process.exit(1);
  }

  task.done = true;
  task.updated = new Date().toISOString();
  writeRecord(root, "tasks", task);

  output(options, {
    json: () => ({ success: true, task }),
    human: () => success(`Task completed: ${task.title}`),
  });
}

export async function taskRm(
  args: string[],
  options: OutputOptions,
): Promise<void> {
  const root = requireRoot();
  const id = args[0];

  if (!id) {
    output(options, {
      json: () => ({ success: false, error: "missing_id" }),
      human: () => error("Task ID required"),
    });
    process.exit(1);
  }

  const deleted = deleteRecord(root, "tasks", id);
  if (!deleted) {
    output(options, {
      json: () => ({ success: false, error: "not_found", id }),
      human: () => error(`Task not found: ${id}`),
    });
    process.exit(1);
  }

  output(options, {
    json: () => ({ success: true, id }),
    human: () => success(`Task removed: ${id}`),
  });
}
