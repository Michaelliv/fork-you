<fork-you>
Use `fu` for CRM operations. Data is stored in `.forkyou/` as JSON files (one per record), tracked by git.

<commands>
- `fu contact add --name <n> [--email <e>] [--phone <p>] [--company <id>] [--role <r>]`
- `fu contact list` / `fu contact show <id>` / `fu contact search <query>`
- `fu contact edit <id> --name <n> --email <e> ...`
- `fu contact rm <id>`
- `fu company add --name <n> [--domain <d>] [--industry <i>] [--size <s>]`
- `fu company list` / `fu company show <id>` / `fu company search <query>`
- `fu deal add --title <t> [--company <id>] [--contact <id>]... [--stage <s>] [--value <v>] [--probability <p>] [--close-date <d>]`
- `fu deal list` / `fu deal show <id>` / `fu deal search <query>`
- `fu deal move <id> <stage>`
- `fu activity add --type <call|email|meeting|note> --subject <s> [--body <b>] [--contact <id>] [--deal <id>] [--company <id>]`
- `fu activity list` / `fu activity show <id>`
- `fu task add --title <t> [--contact <id>] [--deal <id>] [--due <date>]`
- `fu task list` / `fu task done <id>`
- `fu pipeline` - Show pipeline summary
- `fu config stages` - Show/set pipeline stages
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
