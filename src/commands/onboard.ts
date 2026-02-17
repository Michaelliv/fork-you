import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { OutputOptions } from "../utils/output";
import { output, success } from "../utils/output";

const FORKYOU_INSTRUCTIONS = `
<fork-you>
Use \`fu\` for CRM operations. Data is stored in \`.forkyou/\` as JSON files (one per record), tracked by git.

<commands>
- \`fu contact add --name <n> [--email <e>] [--phone <p>] [--company <id>] [--role <r>]\`
- \`fu contact list\` / \`fu contact show <id>\` / \`fu contact search <query>\`
- \`fu contact edit <id> --name <n> --email <e> ...\`
- \`fu contact rm <id>\`
- \`fu company add --name <n> [--domain <d>] [--industry <i>] [--size <s>]\`
- \`fu company list\` / \`fu company show <id>\` / \`fu company search <query>\`
- \`fu deal add --title <t> [--company <id>] [--contact <id>]... [--stage <s>] [--value <v>] [--probability <p>] [--close-date <d>]\`
- \`fu deal list\` / \`fu deal show <id>\` / \`fu deal search <query>\`
- \`fu deal move <id> <stage>\`
- \`fu activity add --type <call|email|meeting|note> --subject <s> [--body <b>] [--contact <id>] [--deal <id>] [--company <id>]\`
- \`fu activity list\` / \`fu activity show <id>\`
- \`fu task add --title <t> [--contact <id>] [--deal <id>] [--due <date>]\`
- \`fu task list\` / \`fu task done <id>\`
- \`fu pipeline\` - Show pipeline summary
- \`fu config stages\` - Show/set pipeline stages
</commands>

<rules>
- ALWAYS use \`--json\` flag to get structured output for parsing
- IDs are short strings (e.g. "abc12345") — use them to link contacts, companies, deals
- When creating a deal, link it to a company and contacts by their IDs
- When logging activities, link them to the relevant contact and/or deal
- Pipeline stages default to: lead, qualified, proposal, negotiation, closed-won, closed-lost
- All data lives in \`.forkyou/\` and should be committed to git
</rules>
</fork-you>
`.trim();

const MARKER = "<fork-you>";

export async function onboard(
  _args: string[],
  options: OutputOptions,
): Promise<void> {
  const cwd = process.cwd();

  // Find target file: prefer existing CLAUDE.md, then existing AGENTS.md, fallback to creating CLAUDE.md
  let targetFile: string;
  const claudeMd = join(cwd, "CLAUDE.md");
  const agentsMd = join(cwd, "AGENTS.md");

  if (existsSync(claudeMd)) {
    targetFile = claudeMd;
  } else if (existsSync(agentsMd)) {
    targetFile = agentsMd;
  } else {
    targetFile = claudeMd;
  }

  let existingContent = "";
  if (existsSync(targetFile)) {
    existingContent = readFileSync(targetFile, "utf-8");
  }

  if (existingContent.includes(MARKER)) {
    output(options, {
      json: () => ({
        success: true,
        file: targetFile,
        message: "already_onboarded",
      }),
      human: () => success(`Already onboarded (${targetFile})`),
    });
    return;
  }

  if (existingContent) {
    writeFileSync(
      targetFile,
      `${existingContent.trimEnd()}\n\n${FORKYOU_INSTRUCTIONS}\n`,
    );
  } else {
    writeFileSync(targetFile, `${FORKYOU_INSTRUCTIONS}\n`);
  }

  output(options, {
    json: () => ({ success: true, file: targetFile }),
    human: () => success(`Added fork-you instructions to ${targetFile}`),
  });
}
