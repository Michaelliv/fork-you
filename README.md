# fork-you 🍴

[![License](https://img.shields.io/badge/License-MIT-yellow)](https://opensource.org/licenses/MIT)

**Git-based CRM. Your pipeline lives in your repo.**

---

## Why

Every CRM wants you to sign up, sync, pay, and pray your data doesn't get locked in.

What if your CRM was just files in a git repo?

```
.forkyou/
├── contacts/
│   └── abc123.json       ← one file per record
├── companies/
│   └── def456.json
├── deals/
│   └── ghi789.json
├── activities/
│   └── jkl012.json
└── tasks/
    └── mno345.json
```

- **Full history** — git tracks every change, who made it, when
- **Team-friendly** — one file per record means no merge conflicts
- **Works offline** — it's just files
- **No vendor lock-in** — it's just JSON
- **Agent-native** — every command supports `--json` output

---

## Installation

```bash
npm install -g fork-you
```

---

## Quick Start

```bash
# Initialize CRM in your repo
fork-you init

# Add a company
fork-you company add --name "Acme Corp" --domain acme.com --industry SaaS

# Add a contact (use the company ID from above)
fork-you contact add --name "Jane Smith" --email jane@acme.com --role CTO --company <company-id>

# Create a deal
fork-you deal add --title "Enterprise License" --company <company-id> --contact <contact-id> --value 50000 --probability 60

# Log an activity
fork-you activity add --type call --subject "Discovery call" --contact <contact-id> --deal <deal-id>

# Add a follow-up task
fork-you task add --title "Send proposal" --contact <contact-id> --deal <deal-id> --due 2026-03-01

# Check the pipeline
fork-you pipeline
```

```
  Pipeline

  lead              —
  qualified         —
  proposal          ██ 1 deal(s)  $50,000  weighted: $30,000
  negotiation       —
  closed-won        —
  closed-lost       —

  Total: 1 deal(s)  $50,000  weighted: $30,000
```

---

## For Agents

fork-you is designed to be used by AI agents. Onboard your agent:

```bash
fork-you onboard
```

This adds fork-you instructions to your `CLAUDE.md` or `AGENTS.md`, teaching your agent how to manage your CRM.

Every command supports `--json` for structured output:

```bash
fork-you contact list --json
```

```json
{
  "success": true,
  "contacts": [
    {
      "id": "abc123",
      "name": "Jane Smith",
      "email": "jane@acme.com",
      "role": "CTO",
      "company": "def456"
    }
  ]
}
```

Agents can create contacts, log activities, move deals through the pipeline, and check status — all through CLI flags and JSON responses.

---

## Commands

### Contacts

```bash
fork-you contact add --name <n> [--email <e>] [--phone <p>] [--company <id>] [--role <r>]
fork-you contact list
fork-you contact show <id>
fork-you contact edit <id> [--name <n>] [--email <e>] [--phone <p>] [--company <id>] [--role <r>]
fork-you contact rm <id>
fork-you contact search <query>
```

### Companies

```bash
fork-you company add --name <n> [--domain <d>] [--industry <i>] [--size <s>]
fork-you company list
fork-you company show <id>
fork-you company edit <id> [--name <n>] [--domain <d>] [--industry <i>] [--size <s>]
fork-you company rm <id>
fork-you company search <query>
```

### Deals

```bash
fork-you deal add --title <t> [--company <id>] [--contact <id>]... [--stage <s>] [--value <v>] [--probability <p>] [--close-date <d>]
fork-you deal list
fork-you deal show <id>
fork-you deal edit <id> [--title <t>] [--stage <s>] [--value <v>] ...
fork-you deal move <id> <stage>
fork-you deal rm <id>
fork-you deal search <query>
```

Deals are grouped by pipeline stage. Move them forward:

```bash
fork-you deal move abc123 proposal
# ✓ Enterprise License: lead → proposal
```

### Activities

```bash
fork-you activity add --type <call|email|meeting|note> --subject <s> [--body <b>] [--contact <id>] [--deal <id>] [--company <id>] [--date <d>]
fork-you activity list
fork-you activity show <id>
fork-you activity rm <id>
```

### Tasks

```bash
fork-you task add --title <t> [--contact <id>] [--deal <id>] [--company <id>] [--due <date>]
fork-you task list
fork-you task done <id>
fork-you task rm <id>
```

### Pipeline

```bash
fork-you pipeline              # Summary with deal counts, values, weighted forecast
fork-you pipeline --json       # Structured output
```

### Config

```bash
fork-you config stages                              # Show pipeline stages
fork-you config stages --set lead,qualified,won,lost # Customize stages
```

### Global Flags

All commands support:

```bash
--json          # Structured JSON output (for agents)
-q, --quiet     # Suppress output, use exit codes
```

---

## How It Works

### Storage

Every record is a single JSON file in `.forkyou/`:

```json
{
  "id": "abc123",
  "name": "Jane Smith",
  "email": "jane@acme.com",
  "company": "def456",
  "role": "CTO",
  "created": "2026-02-17T15:00:00.000Z",
  "updated": "2026-02-17T15:00:00.000Z"
}
```

**One file per record** means two people editing different contacts never conflict in git. IDs are short random strings (nanoid), so renames don't change filenames.

Records reference each other by ID — a deal's `contacts` field is an array of contact IDs, a contact's `company` field is a company ID.

### Querying

fork-you uses **sql.js** (SQLite compiled to WASM) as an in-memory query engine. On every command:

1. Read all JSON files from `.forkyou/`
2. Build an in-memory SQLite database
3. Run the query
4. Throw the database away

No cache, no sync, no stale data. `git pull` and you're immediately up to date. At CRM scale (hundreds to low thousands of records), this takes single-digit milliseconds.

### Team Workflow

```bash
# Alice adds a contact
fork-you contact add --name "Bob Client" --email bob@client.com
git add .forkyou/ && git commit -m "Add Bob Client"
git push

# Bob adds a deal (on another branch, no conflict)
fork-you deal add --title "Bob's Deal" --value 10000
git add .forkyou/ && git commit -m "Add deal"
git push

# No merge conflicts — different files entirely
```

---

## Development

```bash
# Install dependencies
bun install

# Run locally
bun run src/main.ts --help

# Build single binary
bun run build

# Run tests
bun test

# Lint & format
bun run check
```

---

## License

MIT

---

<p align="center">
  <b>fork-you</b> — <i>your pipeline, your repo, your data</i>
</p>
