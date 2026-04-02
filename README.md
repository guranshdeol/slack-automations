# Slack Automations

![Platform](https://img.shields.io/badge/platform-Google%20Apps%20Script-1f6feb)
![Stack](https://img.shields.io/badge/stack-Slack%20%7C%20Google%20Sheets%20%7C%20Apps%20Script-4a90d9)
![License](https://img.shields.io/badge/license-MIT-green)

A collection of no-code-friendly Slack automations built entirely on **Google Sheets**, **Google Apps Script**, and **Slack Workflow Builder** — no Zapier, no Make, no external servers. Everything runs inside tools your organisation already has.

---

## Projects

| Project | What it does | Trigger |
|---|---|---|
| [kantata-timesheet-tracker](./kantata-timesheet-tracker) | Tracks weekly Kantata timesheet compliance across the team. Sends Friday reminders, escalates to manager on Sunday, and maintains a full defaulter risk tracker. | Friday 5 PM → Friday 10 PM → Sunday 9 AM |
| [weekly-work-tracker](./weekly-work-tracker) | Converts structured weekly work logs from Google Sheets into a formatted Slack summary covering accomplishments, blockers, and next steps. | Every Friday at 5 PM |

---

## Stack

| Layer | Tool |
|---|---|
| Messaging & Triggers | Slack Workflow Builder |
| Storage | Google Sheets |
| Logic & Scheduling | Google Apps Script |
| Notifications | Slack Incoming Webhooks |

---

## Design Philosophy

These automations are intentionally built without third-party connectors. Enterprise Slack environments often restrict tools like Zapier or Make — this approach routes everything through Google Sheets as the state store, with Apps Script handling logic and Slack webhooks handling delivery. The only external call is a standard webhook POST, available on all paid Slack plans.

---

## Getting Started

Each project has its own setup guide:

- [Kantata Timesheet Tracker → Setup Guide](./kantata-timesheet-tracker#setup-guide)
- [Weekly Work Tracker → Setup Guide](./weekly-work-tracker#-setup)

---

## License

MIT
