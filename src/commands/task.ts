import { Command } from "commander";
import { buildDb } from "../db.js";
import {
  deleteRecord,
  newId,
  readOne,
  requireRoot,
  writeRecord,
} from "../store.js";
import type { Task } from "../types.js";
import type { OutputOptions } from "../utils/output.js";
import { bold, dim, error, info, output, success } from "../utils/output.js";
import { resolveCompanyId } from "../utils/resolve.js";

function getOutputOptions(cmd: Command): OutputOptions {
  const root = cmd.optsWithGlobals();
  return { json: root.json, quiet: root.quiet };
}

export const taskCommand = new Command("task");

taskCommand
  .command("add")
  .requiredOption("--title <title>", "Task title")
  .option("--contact <id>", "Contact ID")
  .option("--deal <id>", "Deal ID")
  .option("--company <id-or-name>", "Company ID or name")
  .option("--due <date>", "Due date")
  .action((opts, cmd) => {
    const options = getOutputOptions(cmd);
    const root = requireRoot();

    const company = opts.company
      ? resolveCompanyId(root, opts.company)
      : undefined;

    const now = new Date().toISOString();
    const task: Task = {
      id: newId(),
      title: opts.title,
      contact: opts.contact,
      deal: opts.deal,
      company,
      due: opts.due,
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
  });

taskCommand.command("list").action(async (_opts, cmd) => {
  const options = getOutputOptions(cmd);
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
});

taskCommand
  .command("done")
  .argument("<id>", "Task ID")
  .action((id, _opts, cmd) => {
    const options = getOutputOptions(cmd);
    const root = requireRoot();

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
  });

taskCommand
  .command("rm")
  .argument("<id>", "Task ID")
  .action((id, _opts, cmd) => {
    const options = getOutputOptions(cmd);
    const root = requireRoot();

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
  });
