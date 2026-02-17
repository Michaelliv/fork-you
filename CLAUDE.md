<fork-you>
Use `fork-you` for CRM operations. Data is stored in `.forkyou/` as JSON files (one per record), tracked by git.

<commands>
- `fork-you contact add --name <n> [--email <e>] [--phone <p>] [--company <id>] [--role <r>]`
- `fork-you contact list` / `fork-you contact show <id>` / `fork-you contact search <query>`
- `fork-you contact edit <id> --name <n> --email <e> ...`
- `fork-you contact rm <id>`
- `fork-you company add --name <n> [--domain <d>] [--industry <i>] [--size <s>]`
- `fork-you company list` / `fork-you company show <id>` / `fork-you company search <query>`
- `fork-you deal add --title <t> [--company <id>] [--contact <id>]... [--stage <s>] [--value <v>] [--probability <p>] [--close-date <d>]`
- `fork-you deal list` / `fork-you deal show <id>` / `fork-you deal search <query>`
- `fork-you deal move <id> <stage>`
- `fork-you activity add --type <call|email|meeting|note> --subject <s> [--body <b>] [--contact <id>] [--deal <id>] [--company <id>]`
- `fork-you activity list` / `fork-you activity show <id>`
- `fork-you task add --title <t> [--contact <id>] [--deal <id>] [--due <date>]`
- `fork-you task list` / `fork-you task done <id>`
- `fork-you pipeline` - Show pipeline summary
- `fork-you config stages` - Show/set pipeline stages
</commands>

<rules>
- ALWAYS use `--json` flag to get structured output for parsing
- IDs are short strings (e.g. "abc12345") — use them to link contacts, companies, deals
- When creating a deal, link it to a company and contacts by their IDs
- When logging activities, link them to the relevant contact and/or deal
- Pipeline stages default to: lead, qualified, proposal, negotiation, closed-won, closed-lost
- All data lives in `.forkyou/` and should be committed to git
</rules>
</fork-you>
