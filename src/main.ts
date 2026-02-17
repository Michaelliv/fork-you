#!/usr/bin/env bun

import { version } from "../package.json";
import {
  activityAdd,
  activityList,
  activityRm,
  activityShow,
} from "./commands/activity";
import {
  companyAdd,
  companyEdit,
  companyList,
  companyRm,
  companySearch,
  companyShow,
} from "./commands/company";
import { configStages } from "./commands/config";
import {
  contactAdd,
  contactEdit,
  contactList,
  contactRm,
  contactSearch,
  contactShow,
} from "./commands/contact";
import {
  dealAdd,
  dealEdit,
  dealList,
  dealMove,
  dealRm,
  dealSearch,
  dealShow,
} from "./commands/deal";
import { init } from "./commands/init";
import { onboard } from "./commands/onboard";
import { pipeline } from "./commands/pipeline";
import { taskAdd, taskDone, taskList, taskRm } from "./commands/task";

const HELP = `
fork-you - git-based CRM

INIT
  fork-you init                                 Create .forkyou/ in current repo
  fork-you onboard                              Add agent instructions to CLAUDE.md or AGENTS.md

CONTACTS
  fork-you contact add --name <n> [--email <e>] [--phone <p>] [--company <id>] [--role <r>]
  fork-you contact list
  fork-you contact show <id>
  fork-you contact edit <id> [--name <n>] [--email <e>] [--phone <p>] [--company <id>] [--role <r>]
  fork-you contact rm <id>
  fork-you contact search <query>

COMPANIES
  fork-you company add --name <n> [--domain <d>] [--industry <i>] [--size <s>]
  fork-you company list
  fork-you company show <id>
  fork-you company edit <id> [--name <n>] [--domain <d>] [--industry <i>] [--size <s>]
  fork-you company rm <id>
  fork-you company search <query>

DEALS
  fork-you deal add --title <t> [--company <id>] [--contact <id>]... [--stage <s>] [--value <v>] [--probability <p>] [--close-date <d>]
  fork-you deal list
  fork-you deal show <id>
  fork-you deal edit <id> [--title <t>] [--stage <s>] [--value <v>] ...
  fork-you deal move <id> <stage>
  fork-you deal rm <id>
  fork-you deal search <query>

ACTIVITIES
  fork-you activity add --type <call|email|meeting|note> --subject <s> [--body <b>] [--contact <id>] [--deal <id>] [--company <id>] [--date <d>]
  fork-you activity list
  fork-you activity show <id>
  fork-you activity rm <id>

TASKS
  fork-you task add --title <t> [--contact <id>] [--deal <id>] [--company <id>] [--due <date>]
  fork-you task list
  fork-you task done <id>
  fork-you task rm <id>

PIPELINE
  fork-you pipeline                             Show pipeline summary

CONFIG
  fork-you config stages                        Show pipeline stages
  fork-you config stages --set <s1,s2,s3,...>   Set pipeline stages

OPTIONS
  -h, --help                    Show help
  -v, --version                 Show version
  --json                        Output as JSON
  -q, --quiet                   Suppress output
`;

async function main() {
  const args = process.argv.slice(2);

  const json = args.includes("--json");
  const quiet = args.includes("--quiet") || args.includes("-q");
  const options = { json, quiet };

  const cleanArgs = args.filter((a) => {
    if (a === "--json" || a === "--quiet" || a === "-q") return false;
    return true;
  });

  if (
    cleanArgs.length === 0 ||
    cleanArgs[0] === "--help" ||
    cleanArgs[0] === "-h"
  ) {
    if (!quiet) console.log(HELP);
    process.exit(0);
  }

  if (cleanArgs[0] === "--version" || cleanArgs[0] === "-v") {
    if (json) {
      console.log(JSON.stringify({ version }));
    } else if (!quiet) {
      console.log(`fork-you ${version}`);
    }
    process.exit(0);
  }

  const command = cleanArgs[0];
  const sub = cleanArgs[1];
  const rest = cleanArgs.slice(2);

  switch (command) {
    case "init":
      await init(cleanArgs.slice(1), options);
      break;

    case "onboard":
      await onboard(cleanArgs.slice(1), options);
      break;

    case "contact":
      switch (sub) {
        case "add":
          await contactAdd(rest, options);
          break;
        case "list":
          await contactList(rest, options);
          break;
        case "show":
          await contactShow(rest, options);
          break;
        case "edit":
          await contactEdit(rest, options);
          break;
        case "rm":
          await contactRm(rest, options);
          break;
        case "search":
          await contactSearch(rest, options);
          break;
        default:
          console.error(
            sub
              ? `Unknown subcommand: contact ${sub}`
              : "Subcommand required: add, list, show, edit, rm, search",
          );
          process.exit(1);
      }
      break;

    case "company":
      switch (sub) {
        case "add":
          await companyAdd(rest, options);
          break;
        case "list":
          await companyList(rest, options);
          break;
        case "show":
          await companyShow(rest, options);
          break;
        case "edit":
          await companyEdit(rest, options);
          break;
        case "rm":
          await companyRm(rest, options);
          break;
        case "search":
          await companySearch(rest, options);
          break;
        default:
          console.error(
            sub
              ? `Unknown subcommand: company ${sub}`
              : "Subcommand required: add, list, show, edit, rm, search",
          );
          process.exit(1);
      }
      break;

    case "deal":
      switch (sub) {
        case "add":
          await dealAdd(rest, options);
          break;
        case "list":
          await dealList(rest, options);
          break;
        case "show":
          await dealShow(rest, options);
          break;
        case "edit":
          await dealEdit(rest, options);
          break;
        case "move":
          await dealMove(rest, options);
          break;
        case "rm":
          await dealRm(rest, options);
          break;
        case "search":
          await dealSearch(rest, options);
          break;
        default:
          console.error(
            sub
              ? `Unknown subcommand: deal ${sub}`
              : "Subcommand required: add, list, show, edit, move, rm, search",
          );
          process.exit(1);
      }
      break;

    case "activity":
      switch (sub) {
        case "add":
          await activityAdd(rest, options);
          break;
        case "list":
          await activityList(rest, options);
          break;
        case "show":
          await activityShow(rest, options);
          break;
        case "rm":
          await activityRm(rest, options);
          break;
        default:
          console.error(
            sub
              ? `Unknown subcommand: activity ${sub}`
              : "Subcommand required: add, list, show, rm",
          );
          process.exit(1);
      }
      break;

    case "task":
      switch (sub) {
        case "add":
          await taskAdd(rest, options);
          break;
        case "list":
          await taskList(rest, options);
          break;
        case "done":
          await taskDone(rest, options);
          break;
        case "rm":
          await taskRm(rest, options);
          break;
        default:
          console.error(
            sub
              ? `Unknown subcommand: task ${sub}`
              : "Subcommand required: add, list, done, rm",
          );
          process.exit(1);
      }
      break;

    case "pipeline":
      await pipeline(cleanArgs.slice(1), options);
      break;

    case "config":
      switch (sub) {
        case "stages":
          await configStages(rest, options);
          break;
        default:
          console.error(
            sub
              ? `Unknown subcommand: config ${sub}`
              : "Subcommand required: stages",
          );
          process.exit(1);
      }
      break;

    default:
      if (json) {
        console.log(
          JSON.stringify({ success: false, error: "unknown_command", command }),
        );
      } else {
        console.error(`Unknown command: ${command}`);
        console.log(HELP);
      }
      process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
