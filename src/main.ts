#!/usr/bin/env node

import { createRequire } from "node:module";
import { Command } from "commander";
import { activityCommand } from "./commands/activity.js";
import { companyCommand } from "./commands/company.js";
import { configStages } from "./commands/config.js";
import { contactCommand } from "./commands/contact.js";
import { dealCommand } from "./commands/deal.js";
import { init } from "./commands/init.js";
import { onboard } from "./commands/onboard.js";
import { pipeline } from "./commands/pipeline.js";
import { taskCommand } from "./commands/task.js";
import { error as outputError } from "./utils/output.js";
import { ResolveError } from "./utils/resolve.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json");

const program = new Command();

program
  .name("fu")
  .description("🤌 git-based CRM — your pipeline lives in your repo")
  .version(`fu 🤌 ${version}`, "-v, --version")
  .option("--json", "Output as JSON")
  .option("-q, --quiet", "Suppress output");

// Simple commands (keep their original (args, options) signature)
program
  .command("init")
  .description("Create .forkyou/ in current repo")
  .action(async (_opts, cmd) => {
    const root = cmd.optsWithGlobals();
    await init([], { json: root.json, quiet: root.quiet });
  });

program
  .command("onboard")
  .description("Add agent instructions to CLAUDE.md or AGENTS.md")
  .action(async (_opts, cmd) => {
    const root = cmd.optsWithGlobals();
    await onboard([], { json: root.json, quiet: root.quiet });
  });

program
  .command("pipeline")
  .description("Show pipeline summary")
  .action(async (_opts, cmd) => {
    const root = cmd.optsWithGlobals();
    await pipeline([], { json: root.json, quiet: root.quiet });
  });

// Config subcommand
const configCommand = program
  .command("config")
  .description("Manage configuration");

configCommand
  .command("stages")
  .description("Show/set pipeline stages")
  .option("--set <stages>", "Comma-separated list of stages")
  .action(async (opts, cmd) => {
    const root = cmd.optsWithGlobals();
    const options = { json: root.json, quiet: root.quiet };
    const args = opts.set ? ["--set", opts.set] : [];
    await configStages(args, options);
  });

// Entity commands (Commander subcommands)
program.addCommand(contactCommand);
program.addCommand(companyCommand);
program.addCommand(dealCommand);
program.addCommand(activityCommand);
program.addCommand(taskCommand);

// Global error handler for ResolveError
function handleError(err: unknown): never {
  if (err instanceof ResolveError) {
    outputError(err.message);
    process.exit(1);
  }
  if (err instanceof Error) {
    console.error("Fatal error:", err.message);
  }
  process.exit(1);
}

// Wrap parseAsync to catch resolve errors
program.parseAsync(process.argv).catch(handleError);
